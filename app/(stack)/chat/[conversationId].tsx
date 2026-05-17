import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/Colors";
import { AuthContext } from "@/context/AuthContext";
import {
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
  ChatPoll,
  ChatReaction,
  ChatUser,
  createPoll,
  deleteMessage,
  getChatUsers,
  getConversationDetail,
  getConversationMembers,
  getChatWebSocketUrl,
  getMessages,
  markConversationRead,
  sendMessage,
  toggleMessageReaction,
  updateConversationMembers,
  votePoll,
} from "@/hooks/chatApi";
import { useFetchWithAuth } from "@/hooks/fetchWithAuth";

const PAGE_SIZE = 30;
const EMOJIS = ["👍", "❤️", "😂", "👏", "😮", "😢"];
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

type ReactionGroup = {
  emoji: string;
  reactions: ChatReaction[];
};

type SelectedReactionGroup = ReactionGroup & {
  messageId: number;
};

export default function ConversationDetailScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const numericConversationId = Number(conversationId);

  const { fetchWithAuth } = useFetchWithAuth();
  const { accessToken, refreshAccessToken, userDetails } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isLoadingInitialRef = useRef(false);
  const isMarkingReadRef = useRef(false);
  const isReloadingMessagesRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const socketClosedByUnmountRef = useRef(false);

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeMessageId, setNextBeforeMessageId] = useState<number | null>(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<ChatConversationMember[]>([]);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<number | null>(null);
  const [selectedReactionGroup, setSelectedReactionGroup] =
    useState<SelectedReactionGroup | null>(null);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [votingPollId, setVotingPollId] = useState<number | null>(null);

  const currentMembership = conversation?.members.find(
    (member) => member.user === userDetails?.id
  );
  const canEditMembers = conversation?.type === "group" && Boolean(currentMembership?.is_admin);
  const inputBottomPadding = Platform.OS === "ios"
    ? Math.max(insets.bottom, 22)
    : Math.max(insets.bottom, 16);
  const modalBottomPadding = Math.max(insets.bottom + 16, Platform.OS === "ios" ? 28 : 20);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const markRead = useCallback(async () => {
    if (isMarkingReadRef.current) return;

    try {
      if (!numericConversationId || Number.isNaN(numericConversationId)) return;

      isMarkingReadRef.current = true;
      await markConversationRead(fetchWithAuth, numericConversationId);
      DeviceEventEmitter.emit("refreshChatUnread");
    } catch (error) {
      console.log("MARK_CHAT_READ_ERROR:", error);
    } finally {
      isMarkingReadRef.current = false;
    }
  }, [fetchWithAuth, numericConversationId]);

  const loadConversation = useCallback(async () => {
    try {
      if (!numericConversationId || Number.isNaN(numericConversationId)) return;

      const data = await getConversationDetail(fetchWithAuth, numericConversationId);
      setConversation(data);
    } catch (error) {
      console.log("CONVERSATION_DETAIL_ERROR:", error);
    }
  }, [fetchWithAuth, numericConversationId]);

  const loadInitialMessages = useCallback(
    async (showLoader = true) => {
      if (isLoadingInitialRef.current) return;

      try {
        isLoadingInitialRef.current = true;
        if (showLoader) setLoading(true);

        if (!numericConversationId || Number.isNaN(numericConversationId)) {
          Alert.alert("Chyba", "Neplatná konverzácia.");
          return;
        }

        const [conversationData, messagesData] = await Promise.all([
          getConversationDetail(fetchWithAuth, numericConversationId),
          getMessages(fetchWithAuth, numericConversationId, PAGE_SIZE),
        ]);

        setConversation(conversationData);
        setMessages(messagesData.results);
        setHasMore(messagesData.has_more);
        setNextBeforeMessageId(messagesData.next_before_message_id);

        await markConversationRead(fetchWithAuth, numericConversationId);
        DeviceEventEmitter.emit("refreshChatUnread");
        scrollToEnd();
      } catch (error) {
        console.log("LOAD_CHAT_MESSAGES_ERROR:", error);
        Alert.alert(
          "Chyba",
          error instanceof Error
            ? error.message
            : "Nepodarilo sa načítať správy."
        );
      } finally {
        isLoadingInitialRef.current = false;
        setLoading(false);
      }
    },
    [fetchWithAuth, numericConversationId, scrollToEnd]
  );

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMore) return;

    try {
      setLoadingOlder(true);

      if (!numericConversationId || Number.isNaN(numericConversationId)) return;

      const data = await getMessages(
        fetchWithAuth,
        numericConversationId,
        PAGE_SIZE,
        nextBeforeMessageId
      );

      setMessages((prev) => [...data.results, ...prev]);
      setHasMore(data.has_more);
      setNextBeforeMessageId(data.next_before_message_id);
    } catch (error) {
      console.log("LOAD_OLDER_MESSAGES_ERROR:", error);
      Alert.alert("Chyba", "Nepodarilo sa načítať staršie správy.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const reloadMessagesSilent = async () => {
    if (isReloadingMessagesRef.current) return;

    try {
      isReloadingMessagesRef.current = true;
      if (!numericConversationId || Number.isNaN(numericConversationId)) return;

      const limit = Math.min(Math.max(messages.length, PAGE_SIZE), 50);
      const data = await getMessages(fetchWithAuth, numericConversationId, limit);
      setMessages(data.results);
      setHasMore(data.has_more);
      setNextBeforeMessageId(data.next_before_message_id);
      await loadConversation();
    } catch (error) {
      console.log("RELOAD_MESSAGES_SILENT_ERROR:", error);
    } finally {
      isReloadingMessagesRef.current = false;
    }
  };

  useEffect(() => {
    loadInitialMessages(true);
  }, [loadInitialMessages]);

  useFocusEffect(
    useCallback(() => {
      markRead();
    }, [markRead])
  );

  useEffect(() => {
    if (!accessToken || !numericConversationId || Number.isNaN(numericConversationId)) return;

    let socket: WebSocket | null = null;
    socketClosedByUnmountRef.current = false;

    const connect = () => {
      socket = new WebSocket(getChatWebSocketUrl(numericConversationId, accessToken));

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            payload?: ChatMessage;
          };

          if (!data.type || !data.payload) return;

          const incomingMessage: ChatMessage = {
            ...data.payload,
            is_own: data.payload.sender === userDetails?.id,
          };

          if (data.type === "message.created") {
            setMessages((prev) => {
              if (prev.some((message) => message.id === incomingMessage.id)) {
                return prev.map((message) =>
                  message.id === incomingMessage.id ? incomingMessage : message
                );
              }

              return [...prev, incomingMessage];
            });

            if (incomingMessage.sender !== userDetails?.id) {
              void markRead();
            }
            scrollToEnd();
          }

          if (data.type === "message.updated") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === incomingMessage.id ? incomingMessage : message
              )
            );
          }
        } catch (error) {
          console.log("CHAT_WEBSOCKET_MESSAGE_ERROR:", error);
        }
      };

      socket.onerror = (error) => {
        console.log("CHAT_WEBSOCKET_ERROR:", error);
      };

      socket.onclose = (event) => {
        if (socketClosedByUnmountRef.current) return;

        if (event.code === 4401) {
          void refreshAccessToken();
          return;
        }

        const attempts = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempts;
        const delay = Math.min(1000 * attempts, 10000);

        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      socketClosedByUnmountRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socket?.close();
    };
  }, [accessToken, markRead, numericConversationId, refreshAccessToken, scrollToEnd, userDetails?.id]);

  const handleSend = async () => {
    const trimmed = text.trim();

    if (!trimmed || sending) return;

    try {
      setSending(true);

      if (!numericConversationId || Number.isNaN(numericConversationId)) {
        Alert.alert("Chyba", "Neplatná konverzácia.");
        return;
      }

      const newMessage = await sendMessage(
        fetchWithAuth,
        numericConversationId,
        trimmed,
        replyTo?.id ?? null
      );

      setMessages((prev) => [...prev, newMessage]);
      setText("");
      setReplyTo(null);
      await markRead();
      scrollToEnd();
    } catch (error) {
      console.log("SEND_CHAT_MESSAGE_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Správu sa nepodarilo odoslať."
      );
    } finally {
      setSending(false);
    }
  };

  const copyMessage = async (message: ChatMessage) => {
    if (message.is_deleted || !message.text) return;

    await Clipboard.setStringAsync(message.text);
    Alert.alert("Skopírované", "Správa bola skopírovaná.");
  };

  const reactToMessage = async (message: ChatMessage, emoji: string) => {
    if (reactingMessageId === message.id) return;

    try {
      setReactingMessageId(message.id);
      setActiveMessageId(null);
      await toggleMessageReaction(fetchWithAuth, message.id, emoji);
      await reloadMessagesSilent();
    } catch (error) {
      console.log("REACTION_ERROR:", error);
      Alert.alert("Chyba", "Reakciu sa nepodarilo uložiť.");
    } finally {
      setReactingMessageId(null);
    }
  };

  const removeMessage = async (message: ChatMessage) => {
    try {
      await deleteMessage(fetchWithAuth, message.id);

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                text: "",
                deleted_at: new Date().toISOString(),
                is_deleted: true,
              }
            : item
        )
      );
    } catch (error) {
      console.log("DELETE_MESSAGE_ERROR:", error);
      Alert.alert("Chyba", "Správu sa nepodarilo odstrániť.");
    }
  };

  const loadMembers = useCallback(async () => {
    if (!numericConversationId || Number.isNaN(numericConversationId)) return;
    if (conversation?.type !== "group") return;

    try {
      setLoadingMembers(true);
      const members = await getConversationMembers(fetchWithAuth, numericConversationId);
      setGroupMembers(members);
      setSelectedMemberIds(
        members
          .filter((member) => member.user !== userDetails?.id)
          .map((member) => member.user)
      );

      if (canEditMembers) {
        const users = await getChatUsers(fetchWithAuth);
        setAllUsers(users);
      }
    } catch (error) {
      console.log("LOAD_GROUP_MEMBERS_ERROR:", error);
      Alert.alert("Chyba", "Nepodarilo sa načítať členov skupiny.");
    } finally {
      setLoadingMembers(false);
    }
  }, [canEditMembers, conversation?.type, fetchWithAuth, numericConversationId, userDetails?.id]);

  const openMembersModal = async () => {
    setMembersModalVisible(true);
    await loadMembers();
  };

  const toggleSelectedMember = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const saveMembers = async () => {
    if (!numericConversationId || Number.isNaN(numericConversationId)) return;

    try {
      setSavingMembers(true);
      const updatedConversation = await updateConversationMembers(
        fetchWithAuth,
        numericConversationId,
        selectedMemberIds
      );
      setConversation(updatedConversation);
      setGroupMembers(updatedConversation.members);
      setMembersModalVisible(false);
    } catch (error) {
      console.log("SAVE_GROUP_MEMBERS_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Nepodarilo sa uložiť členov skupiny."
      );
    } finally {
      setSavingMembers(false);
    }
  };

  const openLink = async (url: string) => {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    try {
      const canOpen = await Linking.canOpenURL(normalizedUrl);
      if (!canOpen) {
        Alert.alert("Chyba", "Tento odkaz sa nepodarilo otvoriť.");
        return;
      }

      await Linking.openURL(normalizedUrl);
    } catch (error) {
      console.log("OPEN_CHAT_LINK_ERROR:", error);
      Alert.alert("Chyba", "Odkaz sa nepodarilo otvoriť.");
    }
  };

  const renderMessageText = (message: ChatMessage, isOwn: boolean) => {
    if (message.is_deleted) {
      return (
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
            styles.messageTextDeleted,
          ]}
        >
          Správa bola odstránená
        </Text>
      );
    }

    const parts = message.text.split(URL_PATTERN).filter(Boolean);

    return (
      <Text
        style={[
          styles.messageText,
          isOwn ? styles.messageTextOwn : styles.messageTextOther,
        ]}
      >
        {parts.map((part, index) => {
          const isLink = URL_PATTERN.test(part);
          URL_PATTERN.lastIndex = 0;

          if (!isLink) {
            return <Text key={`${message.id}-text-${index}`}>{part}</Text>;
          }

          return (
            <Text
              key={`${message.id}-link-${index}`}
              style={[styles.messageLink, isOwn && styles.messageLinkOwn]}
              onPress={() => openLink(part)}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const openMessageActions = (message: ChatMessage) => {
    if (message.is_deleted) return;
    setActiveMessageId((current) => (current === message.id ? null : message.id));
  };

  const confirmRemoveMessage = (message: ChatMessage) => {
    setActiveMessageId(null);
    Alert.alert(
      "Odstrániť správu?",
      "Správa sa odstráni iba vizuálne, záznam ostane v databáze ako odstránený.",
      [
        { text: "Zrušiť", style: "cancel" },
        {
          text: "Odstrániť",
          style: "destructive",
          onPress: () => removeMessage(message),
        },
      ]
    );
  };

  const startReply = (message: ChatMessage) => {
    setActiveMessageId(null);
    setReplyTo(message);
  };

  const copyAndClose = async (message: ChatMessage) => {
    setActiveMessageId(null);
    await copyMessage(message);
  };

  const updatePollOptionText = (index: number, value: string) => {
    setPollOptions((prev) =>
      prev.map((option, optionIndex) => optionIndex === index ? value : option)
    );
  };

  const addPollOption = () => {
    setPollOptions((prev) => prev.length >= 6 ? prev : [...prev, ""]);
  };

  const removePollOption = (index: number) => {
    setPollOptions((prev) => prev.length <= 2 ? prev : prev.filter((_, optionIndex) => optionIndex !== index));
  };

  const resetPollForm = () => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowMultiple(false);
  };

  const submitPoll = async () => {
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (!question) {
      Alert.alert("Chýba otázka", "Zadaj otázku ankety.");
      return;
    }

    if (options.length < 2) {
      Alert.alert("Málo možností", "Anketa musí mať aspoň dve možnosti.");
      return;
    }

    try {
      setCreatingPoll(true);

      if (!numericConversationId || Number.isNaN(numericConversationId)) {
        Alert.alert("Chyba", "Neplatná konverzácia.");
        return;
      }

      const pollMessage = await createPoll(
        fetchWithAuth,
        numericConversationId,
        question,
        options,
        pollAllowMultiple
      );

      setMessages((prev) => [...prev, pollMessage]);
      setPollModalVisible(false);
      resetPollForm();
      await markRead();
      scrollToEnd();
    } catch (error) {
      console.log("CREATE_CHAT_POLL_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Anketu sa nepodarilo vytvoriť."
      );
    } finally {
      setCreatingPoll(false);
    }
  };

  const handlePollVote = async (poll: ChatPoll, optionId: number) => {
    if (votingPollId === poll.id || poll.is_closed) return;

    const selected = poll.user_option_ids.includes(optionId);
    const nextOptionIds = poll.allow_multiple
      ? selected
        ? poll.user_option_ids.filter((id) => id !== optionId)
        : [...poll.user_option_ids, optionId]
      : selected
        ? []
        : [optionId];

    try {
      setVotingPollId(poll.id);
      const updatedPoll = await votePoll(fetchWithAuth, poll.id, nextOptionIds);

      setMessages((prev) =>
        prev.map((message) =>
          message.poll?.id === updatedPoll.id
            ? { ...message, poll: updatedPoll }
            : message
        )
      );
    } catch (error) {
      console.log("CHAT_POLL_VOTE_ERROR:", error);
      Alert.alert(
        "Chyba",
        error instanceof Error
          ? error.message
          : "Hlas sa nepodarilo uložiť."
      );
    } finally {
      setVotingPollId(null);
    }
  };

  const getReactionGroups = (reactions: ChatReaction[]): ReactionGroup[] => {
    const groups: ReactionGroup[] = [];

    reactions.forEach((reaction) => {
      const existing = groups.find((group) => group.emoji === reaction.emoji);
      if (existing) {
        existing.reactions.push(reaction);
      } else {
        groups.push({ emoji: reaction.emoji, reactions: [reaction] });
      }
    });

    return groups;
  };

  const openReactionGroup = (message: ChatMessage, group: ReactionGroup) => {
    setActiveMessageId(null);
    setSelectedReactionGroup({
      messageId: message.id,
      emoji: group.emoji,
      reactions: group.reactions,
    });
  };

  const formatMessageTime = (value: string) => {
    const date = new Date(value);

    return date.toLocaleTimeString("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPoll = (poll: ChatPoll) => {
    const totalVotes = Math.max(poll.total_votes, 0);

    return (
      <View style={styles.pollCard}>
        <View style={styles.pollHeader}>
          <View style={styles.pollIcon}>
            <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
          </View>
          <View style={styles.pollTitleWrap}>
            <Text style={styles.pollLabel}>Anketa</Text>
            <Text style={styles.pollQuestion}>{poll.question}</Text>
          </View>
        </View>

        <View style={styles.pollOptionsList}>
          {poll.options.map((option) => {
            const selected = poll.user_option_ids.includes(option.id);
            const percent = totalVotes > 0
              ? Math.round((option.votes_count / totalVotes) * 100)
              : 0;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.pollOption,
                  selected && styles.pollOptionSelected,
                ]}
                activeOpacity={0.82}
                onPress={() => handlePollVote(poll, option.id)}
                disabled={votingPollId === poll.id || poll.is_closed}
              >
                <View
                  style={[
                    styles.pollOptionFill,
                    { width: `${percent}%` },
                    selected && styles.pollOptionFillSelected,
                  ]}
                />
                <View style={styles.pollOptionContent}>
                  <View style={[styles.pollCheck, selected && styles.pollCheckSelected]}>
                    {selected && (
                      <Ionicons name="checkmark" size={14} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.pollOptionText} numberOfLines={2}>
                    {option.text}
                  </Text>
                  <Text style={styles.pollOptionVotes}>
                    {percent}% · {option.votes_count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.pollMeta}>
          {poll.allow_multiple ? "Viac možností" : "Jedna možnosť"} · {totalVotes} hlasov
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.is_own;
    const isActive = activeMessageId === item.id;
    const reactionGroups = getReactionGroups(item.reactions);

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          if (activeMessageId !== null) setActiveMessageId(null);
        }}
        onLongPress={() => openMessageActions(item)}
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowOther,
        ]}
      >
        <View style={[styles.messageStack, isOwn ? styles.messageStackOwn : styles.messageStackOther]}>
          {isActive && (
            <View style={styles.quickReactionBar}>
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={`${item.id}-${emoji}`}
                  style={styles.quickReactionButton}
                  activeOpacity={0.78}
                  onPress={() => reactToMessage(item, emoji)}
                  disabled={reactingMessageId === item.id}
                >
                  {reactingMessageId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
              item.is_deleted && styles.messageBubbleDeleted,
              isActive && styles.messageBubbleActive,
            ]}
          >
            {!isOwn && conversation?.type === "group" && (
              <Text style={styles.senderName} numberOfLines={1}>
                {item.sender_detail.full_name || item.sender_detail.username}
              </Text>
            )}

            {item.reply_to_message && (
              <View
                style={[
                  styles.replyPreview,
                  isOwn ? styles.replyPreviewOwn : styles.replyPreviewOther,
                ]}
              >
                <Text
                  style={[
                    styles.replySender,
                    isOwn ? styles.replyTextOwn : styles.replyTextOther,
                  ]}
                  numberOfLines={1}
                >
                  {item.reply_to_message.sender_name}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    isOwn ? styles.replyTextOwn : styles.replyTextOther,
                  ]}
                  numberOfLines={1}
                >
                  {item.reply_to_message.deleted_at
                    ? "Odstránená správa"
                    : item.reply_to_message.text}
                </Text>
              </View>
            )}

            {item.poll ? renderPoll(item.poll) : renderMessageText(item, isOwn)}

            <View style={styles.messageMetaRow}>
              <Text
                style={[
                  styles.messageTime,
                  isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
                ]}
              >
                {formatMessageTime(item.created_at)}
              </Text>
            </View>

          </View>

          {reactionGroups.length > 0 && (
            <View
              style={[
                styles.reactionsCornerRow,
                isOwn ? styles.reactionsCornerRowOwn : styles.reactionsCornerRowOther,
              ]}
            >
              {reactionGroups.map((group) => {
                const reactedByCurrentUser = group.reactions.some(
                  (reaction) => reaction.user === userDetails?.id
                );

                return (
                  <TouchableOpacity
                    key={`${item.id}-${group.emoji}`}
                    style={[
                      styles.reactionPill,
                      reactedByCurrentUser && styles.reactionPillSelected,
                    ]}
                    activeOpacity={0.78}
                    onPress={() => openReactionGroup(item, group)}
                  >
                    <Text style={styles.reactionEmoji}>{group.emoji}</Text>
                    {group.reactions.length > 1 && (
                      <Text
                        style={[
                          styles.reactionCount,
                          reactedByCurrentUser && styles.reactionCountSelected,
                        ]}
                      >
                        {group.reactions.length}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {isActive && (
            <View
              style={[
                styles.quickActionsRow,
                isOwn ? styles.quickActionsRowOwn : styles.quickActionsRowOther,
              ]}
            >
              <TouchableOpacity
                style={styles.quickActionButton}
                activeOpacity={0.82}
                onPress={() => startReply(item)}
              >
                <Ionicons name="return-up-back" size={16} color={COLORS.text} />
                <Text style={styles.quickActionText}>Odpoveď</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                activeOpacity={0.82}
                onPress={() => copyAndClose(item)}
              >
                <Ionicons name="copy-outline" size={16} color={COLORS.text} />
                <Text style={styles.quickActionText}>Kopírovať</Text>
              </TouchableOpacity>

              {item.is_own && !item.is_deleted && (
                <TouchableOpacity
                  style={[styles.quickActionButton, styles.quickActionDanger]}
                  activeOpacity={0.82}
                  onPress={() => confirmRemoveMessage(item)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={[styles.quickActionText, styles.quickActionTextDanger]}>
                    Zmazať
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Načítavam chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {conversation?.type === "group" && (
        <TouchableOpacity
          style={styles.membersBar}
          activeOpacity={0.85}
          onPress={openMembersModal}
        >
          <View style={styles.membersBarIcon}>
            <Ionicons name="people" size={17} color={COLORS.primary} />
          </View>
          <View style={styles.membersBarTextWrap}>
            <Text style={styles.membersBarTitle}>Členovia skupiny</Text>
            <Text style={styles.membersBarSubtitle}>
              {conversation.members.length} členov
              {canEditMembers ? " · upraviť" : " · zobraziť"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: 14 + inputBottomPadding },
          messages.length === 0 && styles.messagesEmptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length <= PAGE_SIZE) {
            scrollToEnd();
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons
              name="chatbubble-outline"
              size={44}
              color={COLORS.primary}
            />
            <Text style={styles.emptyTitle}>Zatiaľ žiadne správy</Text>
            <Text style={styles.emptyText}>
              Napíš prvú správu a začni konverzáciu.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loadingOlder}
            onRefresh={loadOlderMessages}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />

      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarTitle}>
              Odpoveď na {replyTo.sender_detail.full_name || replyTo.sender_detail.username}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyTo.is_deleted ? "Odstránená správa" : replyTo.text}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputWrap, { paddingBottom: inputBottomPadding }]}>
        {conversation?.type === "group" && (
          <TouchableOpacity
            style={styles.pollButton}
            activeOpacity={0.85}
            onPress={() => setPollModalVisible(true)}
          >
            <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Napíš správu..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          multiline
          maxLength={5000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={pollModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPollModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPollModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.pollModal, { paddingBottom: modalBottomPadding }]}
            activeOpacity={1}
            onPress={() => undefined}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nová anketa</Text>
                <Text style={styles.modalSubtitle}>
                  Vytvor otázku pre členov skupiny.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPollModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                value={pollQuestion}
                onChangeText={setPollQuestion}
                placeholder="Otázka ankety"
                placeholderTextColor={COLORS.textMuted}
                style={styles.pollQuestionInput}
                multiline
                maxLength={240}
              />

              <Text style={styles.pollModalSectionTitle}>Možnosti</Text>
              {pollOptions.map((option, index) => (
                <View key={`poll-option-${index}`} style={styles.pollOptionInputRow}>
                  <TextInput
                    value={option}
                    onChangeText={(value) => updatePollOptionText(index, value)}
                    placeholder={`Možnosť ${index + 1}`}
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.pollOptionInput}
                    maxLength={120}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOption(index)}>
                      <Ionicons name="remove-circle-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 6 && (
                <TouchableOpacity
                  style={styles.addPollOptionButton}
                  activeOpacity={0.85}
                  onPress={addPollOption}
                >
                  <Ionicons name="add" size={18} color={COLORS.primary} />
                  <Text style={styles.addPollOptionText}>Pridať možnosť</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.pollMultipleRow}
                activeOpacity={0.85}
                onPress={() => setPollAllowMultiple((value) => !value)}
              >
                <View>
                  <Text style={styles.pollMultipleTitle}>Povoliť viac odpovedí</Text>
                  <Text style={styles.pollMultipleSubtitle}>
                    Členovia môžu vybrať viac možností naraz.
                  </Text>
                </View>
                <View style={[styles.pollToggle, pollAllowMultiple && styles.pollToggleActive]}>
                  {pollAllowMultiple && <View style={styles.pollToggleKnob} />}
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.createPollButton, creatingPoll && styles.createPollButtonDisabled]}
              activeOpacity={0.85}
              onPress={submitPoll}
              disabled={creatingPoll}
            >
              {creatingPoll ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.createPollButtonText}>Vytvoriť anketu</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={selectedReactionGroup !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedReactionGroup(null)}
      >
        <TouchableOpacity
          style={styles.reactionModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedReactionGroup(null)}
        >
          <TouchableOpacity
            style={[styles.reactionModal, { paddingBottom: modalBottomPadding }]}
            activeOpacity={1}
            onPress={() => undefined}
          >
            <View style={styles.reactionModalHandle} />
            <View style={styles.reactionModalHeader}>
              <Text style={styles.reactionModalEmoji}>
                {selectedReactionGroup?.emoji}
              </Text>
              <View style={styles.reactionModalTitleWrap}>
                <Text style={styles.reactionModalTitle}>Reakcie</Text>
                <Text style={styles.reactionModalSubtitle}>
                  {selectedReactionGroup?.reactions.length ?? 0} používateľov
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReactionGroup(null)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.reactionUsersList}
              showsVerticalScrollIndicator={false}
            >
              {selectedReactionGroup?.reactions.map((reaction) => (
                <View key={reaction.id} style={styles.reactionUserRow}>
                  <View style={styles.reactionUserAvatar}>
                    <Text style={styles.reactionUserAvatarText}>
                      {(reaction.user_name || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.reactionUserName} numberOfLines={1}>
                    {reaction.user_name || "Používateľ"}
                  </Text>
                  <Text style={styles.reactionUserEmoji}>
                    {selectedReactionGroup.emoji}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={membersModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.membersModal, { paddingBottom: modalBottomPadding }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Členovia skupiny</Text>
                <Text style={styles.modalSubtitle}>
                  {canEditMembers ? "Vyber, kto má byť v skupine." : "Zoznam členov konverzácie."}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingMembers ? (
              <View style={styles.membersLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.membersLoadingText}>Načítavam členov...</Text>
              </View>
            ) : canEditMembers ? (
              <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                {allUsers.map((user) => {
                  const selected = selectedMemberIds.includes(user.id);
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.memberEditRow, selected && styles.memberEditRowSelected]}
                      activeOpacity={0.85}
                      onPress={() => toggleSelectedMember(user.id)}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {(user.full_name || user.username || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{user.full_name || user.username}</Text>
                        <Text style={styles.memberUsername}>@{user.username}</Text>
                      </View>
                      <View style={[styles.memberCheck, selected && styles.memberCheckSelected]}>
                        {selected && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                {groupMembers.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(member.user_detail.full_name || member.user_detail.username || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.user_detail.full_name || member.user_detail.username}
                      </Text>
                      <Text style={styles.memberUsername}>
                        @{member.user_detail.username}{member.is_admin ? " · admin" : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {canEditMembers && (
              <TouchableOpacity
                style={[styles.saveMembersButton, savingMembers && styles.saveMembersButtonDisabled]}
                activeOpacity={0.85}
                onPress={saveMembers}
                disabled={savingMembers}
              >
                {savingMembers ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveMembersButtonText}>Uložiť členov</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },

  messagesEmptyContent: {
    flexGrow: 1,
  },

  membersBar: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  membersBarIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  membersBarTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  membersBarTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  membersBarSubtitle: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },

  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
  },

  messageRowOwn: {
    justifyContent: "flex-end",
  },

  messageRowOther: {
    justifyContent: "flex-start",
  },

  messageStack: {
    maxWidth: "82%",
  },

  messageStackOwn: {
    alignItems: "flex-end",
  },

  messageStackOther: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "100%",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  messageBubbleOwn: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },

  messageBubbleOther: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6,
  },

  messageBubbleDeleted: {
    opacity: 0.7,
  },

  messageBubbleActive: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  quickReactionBar: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  quickReactionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  quickReactionEmoji: {
    fontSize: 22,
  },

  quickActionsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  quickActionsRowOwn: {
    justifyContent: "flex-end",
  },

  quickActionsRowOther: {
    justifyContent: "flex-start",
  },

  quickActionButton: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  quickActionDanger: {
    borderColor: "rgba(225,37,37,0.28)",
    backgroundColor: "rgba(225,37,37,0.08)",
  },

  quickActionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },

  quickActionTextDanger: {
    color: COLORS.danger,
  },

  senderName: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },

  messageTextOwn: {
    color: COLORS.white,
  },

  messageTextOther: {
    color: COLORS.text,
  },

  messageTextDeleted: {
    fontStyle: "italic",
  },

  messageLink: {
    color: COLORS.primary,
    textDecorationLine: "underline",
    fontWeight: "900",
  },

  messageLinkOwn: {
    color: COLORS.white,
  },

  messageMetaRow: {
    marginTop: 5,
    alignItems: "flex-end",
  },

  messageTime: {
    fontSize: 10,
    fontWeight: "700",
  },

  messageTimeOwn: {
    color: "rgba(255,255,255,0.75)",
  },

  messageTimeOther: {
    color: COLORS.textMuted,
  },

  replyPreview: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginBottom: 8,
    borderLeftWidth: 3,
  },

  replyPreviewOwn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderLeftColor: COLORS.white,
  },

  replyPreviewOther: {
    backgroundColor: COLORS.neutralSoft,
    borderLeftColor: COLORS.primary,
  },

  replySender: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
  },

  replyText: {
    fontSize: 12,
    fontWeight: "600",
  },

  replyTextOwn: {
    color: COLORS.white,
  },

  replyTextOther: {
    color: COLORS.textMuted,
  },

  reactionsCornerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: -7,
    paddingHorizontal: 9,
    maxWidth: "100%",
  },

  reactionsCornerRowOwn: {
    justifyContent: "flex-end",
  },

  reactionsCornerRowOther: {
    justifyContent: "flex-start",
  },

  reactionPill: {
    minWidth: 34,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  reactionPillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  reactionEmoji: {
    fontSize: 14,
  },

  reactionCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },

  reactionCountSelected: {
    color: COLORS.primary,
  },

  reactionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "flex-end",
  },

  reactionModal: {
    maxHeight: "58%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  reactionModalHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },

  reactionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  reactionModalEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 24,
    lineHeight: 42,
    marginRight: 11,
  },

  reactionModalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  reactionModalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },

  reactionModalSubtitle: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  reactionUsersList: {
    maxHeight: 320,
  },

  reactionUserRow: {
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  reactionUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  reactionUserAvatarText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
  },

  reactionUserName: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  reactionUserEmoji: {
    marginLeft: 10,
    fontSize: 20,
  },

  pollCard: {
    minWidth: 240,
  },

  pollHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  pollIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  pollTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  pollLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  pollQuestion: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  pollOptionsList: {
    gap: 7,
  },

  pollOption: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },

  pollOptionSelected: {
    borderColor: COLORS.primary,
  },

  pollOptionFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.neutralSoft,
  },

  pollOptionFillSelected: {
    backgroundColor: COLORS.primarySoft,
  },

  pollOptionContent: {
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  pollCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  pollCheckSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  pollOptionText: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  pollOptionVotes: {
    marginLeft: 8,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },

  pollMeta: {
    marginTop: 9,
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },

  replyBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  replyBarContent: {
    flex: 1,
    minWidth: 0,
  },

  replyBarTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.primary,
  },

  replyBarText: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  pollButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(211,47,47,0.18)",
  },

  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  pollModal: {
    maxHeight: "86%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  pollQuestionInput: {
    minHeight: 74,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    textAlignVertical: "top",
  },

  pollModalSectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  pollOptionInputRow: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  pollOptionInput: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 10,
  },

  addPollOptionButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  addPollOptionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
  },

  pollMultipleRow: {
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  pollMultipleTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  pollMultipleSubtitle: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  pollToggle: {
    width: 42,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    padding: 3,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  pollToggleActive: {
    backgroundColor: COLORS.primary,
    alignItems: "flex-end",
  },

  pollToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },

  createPollButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  createPollButtonDisabled: {
    opacity: 0.55,
  },

  createPollButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },

  membersModal: {
    maxHeight: "82%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },

  modalSubtitle: {
    marginTop: 3,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  membersLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  membersLoadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontWeight: "700",
  },

  membersList: {
    maxHeight: 420,
  },

  memberRow: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  memberEditRow: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  memberEditRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },

  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  memberAvatarText: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 15,
  },

  memberInfo: {
    flex: 1,
    minWidth: 0,
  },

  memberName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  memberUsername: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  memberCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  memberCheckSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  saveMembersButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  saveMembersButtonDisabled: {
    opacity: 0.55,
  },

  saveMembersButtonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 16,
  },
});
