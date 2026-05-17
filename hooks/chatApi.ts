import { BASE_URL } from "@/hooks/api";

export function getChatWebSocketUrl(conversationId: number, token: string): string {
  const apiBaseUrl = BASE_URL.replace(/\/+$/, "");
  const serverBaseUrl = apiBaseUrl.endsWith("/api")
    ? apiBaseUrl.slice(0, -4)
    : apiBaseUrl;
  const wsBaseUrl = serverBaseUrl
    .replace(/^https:\/\//i, "wss://")
    .replace(/^http:\/\//i, "ws://");

  return `${wsBaseUrl}/ws/chat/conversations/${conversationId}/?token=${encodeURIComponent(token)}`;
}

export type ChatUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  number?: string | null;
};

export type ChatReaction = {
  id: number;
  user: number;
  user_name: string;
  emoji: string;
  created_at: string;
};

export type ChatPollVoter = {
  id: number;
  name: string;
  username: string;
};

export type ChatPollOption = {
  id: number;
  text: string;
  position: number;
  votes_count: number;
  voted_by_current_user: boolean;
  voters: ChatPollVoter[];
};

export type ChatPoll = {
  id: number;
  message: number;
  question: string;
  allow_multiple: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  closed_at: string | null;
  is_closed: boolean;
  total_votes: number;
  user_option_ids: number[];
  options: ChatPollOption[];
};

export type ChatMessage = {
  id: number;
  conversation: number;
  sender: number;
  sender_detail: ChatUser;
  text: string;
  reply_to: number | null;
  reply_to_message: {
    id: number;
    text: string;
    sender_name: string;
    deleted_at: string | null;
  } | null;
  client_message_id: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  is_own: boolean;
  reactions: ChatReaction[];
  poll: ChatPoll | null;
};

export type ChatConversationMember = {
  id: number;
  user: number;
  user_detail: ChatUser;
  is_admin: boolean;
  is_muted: boolean;
  is_archived: boolean;
  last_read_at: string | null;
  joined_at: string;
};

export type ChatConversation = {
  id: number;
  club: number;
  type: "direct" | "group";
  name: string;
  title: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  members: ChatConversationMember[];
  last_message: {
    id: number;
    text: string;
    sender_id: number;
    sender_name: string;
    created_at: string;
    deleted_at: string | null;
  } | null;
  unread_count: number;
};

export type ChatMessagesResponse = {
  results: ChatMessage[];
  limit: number;
  before_message_id: string | null;
  has_more: boolean;
  next_before_message_id: number | null;
};

export type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;
type ChatAuth = string | AuthFetch;

async function requestJson<T>(
  endpoint: string,
  auth: ChatAuth,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response =
    typeof auth === "string"
      ? await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${auth}`,
          },
        })
      : await auth(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });

  const text = await response.text();

  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.detail
        ? data.detail
        : typeof data === "object" && data?.error
          ? data.error
          : "Nepodarilo sa spracovať požiadavku.";

    throw new Error(message);
  }

  return data as T;
}

export async function getChatUsers(
  auth: ChatAuth,
  search?: string
): Promise<ChatUser[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return requestJson<ChatUser[]>(`/chat/users/${query}`, auth);
}

export async function getConversations(
  auth: ChatAuth
): Promise<ChatConversation[]> {
  return requestJson<ChatConversation[]>("/chat/conversations/", auth);
}

export async function getConversationDetail(
  auth: ChatAuth,
  conversationId: number
): Promise<ChatConversation> {
  return requestJson<ChatConversation>(
    `/chat/conversations/${conversationId}/`,
    auth
  );
}

export async function getConversationMembers(
  auth: ChatAuth,
  conversationId: number
): Promise<ChatConversationMember[]> {
  return requestJson<ChatConversationMember[]>(
    `/chat/conversations/${conversationId}/members/`,
    auth
  );
}

export async function updateConversationMembers(
  auth: ChatAuth,
  conversationId: number,
  memberIds: number[]
): Promise<ChatConversation> {
  return requestJson<ChatConversation>(
    `/chat/conversations/${conversationId}/members/`,
    auth,
    {
      method: "PATCH",
      body: JSON.stringify({
        member_ids: memberIds,
      }),
    }
  );
}

export async function createDirectConversation(
  auth: ChatAuth,
  userId: number
): Promise<ChatConversation> {
  return requestJson<ChatConversation>(
    "/chat/conversations/direct/",
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
      }),
    }
  );
}

export async function createGroupConversation(
  auth: ChatAuth,
  name: string,
  memberIds: number[]
): Promise<ChatConversation> {
  return requestJson<ChatConversation>(
    "/chat/conversations/group/",
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        member_ids: memberIds,
      }),
    }
  );
}

export async function getMessages(
  auth: ChatAuth,
  conversationId: number,
  limit = 30,
  beforeMessageId?: number | null
): Promise<ChatMessagesResponse> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (beforeMessageId) {
    query.set("before_message_id", String(beforeMessageId));
  }

  return requestJson<ChatMessagesResponse>(
    `/chat/conversations/${conversationId}/messages/?${query.toString()}`,
    auth
  );
}

export async function sendMessage(
  auth: ChatAuth,
  conversationId: number,
  text: string,
  replyTo?: number | null
): Promise<ChatMessage> {
  const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return requestJson<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        text,
        reply_to: replyTo ?? null,
        client_message_id: clientMessageId,
      }),
    }
  );
}

export async function createPoll(
  auth: ChatAuth,
  conversationId: number,
  question: string,
  options: string[],
  allowMultiple: boolean
): Promise<ChatMessage> {
  return requestJson<ChatMessage>(
    `/chat/conversations/${conversationId}/polls/`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        question,
        options,
        allow_multiple: allowMultiple,
      }),
    }
  );
}

export async function markConversationRead(
  auth: ChatAuth,
  conversationId: number
): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(
    `/chat/conversations/${conversationId}/read/`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export async function toggleMessageReaction(
  auth: ChatAuth,
  messageId: number,
  emoji: string
): Promise<
  | {
      deleted: true;
    }
  | {
      id: number;
      message: number;
      user: number;
      emoji: string;
      created_at: string;
    }
> {
  return requestJson(
    `/chat/messages/${messageId}/reactions/`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        emoji,
      }),
    }
  );
}

export async function votePoll(
  auth: ChatAuth,
  pollId: number,
  optionIds: number[]
): Promise<ChatPoll> {
  return requestJson<ChatPoll>(
    `/chat/polls/${pollId}/vote/`,
    auth,
    {
      method: "POST",
      body: JSON.stringify({
        option_ids: optionIds,
      }),
    }
  );
}

export async function deleteMessage(
  auth: ChatAuth,
  messageId: number
): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>(
    `/chat/messages/${messageId}/`,
    auth,
    {
      method: "DELETE",
    }
  );
}
