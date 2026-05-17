import { Stack, useRouter } from "expo-router";
import { Image, Text, TouchableOpacity } from "react-native";
import { COLORS } from "@/constants/Colors";

export default function ChatLayout() {
  const router = useRouter();

  const BackButton = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{
        marginLeft: 10,
        transform: [{ translateY: -3 }],
      }}
      activeOpacity={0.8}
    >
      <Image
        source={require("@/assets/images/spravy_back.png")}
        style={{
          width: 70,
          height: 30,
          tintColor: COLORS.primary,
          resizeMode: "contain",
        }}
      />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.card,
        },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerTitleAlign: "center",
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen
        name="chat-users"
        options={{
          headerTitle: () => (
            <Image
              source={require("@/assets/images/spravy_head.png")}
              style={{
                width: 180,
                height: 27,
                resizeMode: "contain",
              }}
            />
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                marginLeft: 10,
                transform: [{ translateY: -4 }],
              }}
              activeOpacity={0.8}
            >
              <Image
                source={require("@/assets/images/spat_back.png")}
                style={{
                  width: 60,
                  height: 22,
                  tintColor: COLORS.primary,
                  resizeMode: "contain",
                }}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <Stack.Screen
        name="[conversationId]"
        options={({ route }) => {
          const params = route.params as
            | { name?: string | string[] }
            | undefined;

          const rawName = Array.isArray(params?.name)
            ? params.name[0]
            : params?.name;

          const title = decodeURIComponent(rawName || "Chat");

          return {
            headerTitle: () => (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: COLORS.text,
                  textAlign: "center",
                  maxWidth: 220,
                  transform: [{ translateY: -2 }],
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            ),
            headerLeft: () => <BackButton />,
          };
        }}
      />

      <Stack.Screen
        name="new-direct"
        options={{
          headerTitle: () => (
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: COLORS.text,
                transform: [{ translateY: -2 }],
              }}
            >
              Nový chat
            </Text>
          ),
          headerLeft: () => <BackButton />,
        }}
      />

      <Stack.Screen
        name="new-group"
        options={{
          headerTitle: () => (
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: COLORS.text,
                transform: [{ translateY: -2 }],
              }}
            >
              Nová skupina
            </Text>
          ),
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}