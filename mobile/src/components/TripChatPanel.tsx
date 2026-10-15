import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChatMessage, useTripChat } from "../services/phoenixChat";

const colors = {
  background: "#0e1519",
  panel: "#171e22",
  raised: "#242c31",
  line: "#263238",
  cyan: "#00d4ed",
  text: "#eaf2f4",
  muted: "#92a1a9",
};

function MessageRow({
  message,
  ownMessage,
}: {
  message: ChatMessage;
  ownMessage: boolean;
}) {
  return (
    <View style={[styles.messageRow, ownMessage && styles.ownMessageRow]}>
      <View style={[styles.bubble, ownMessage && styles.ownBubble]}>
        <Text style={styles.messageText}>{message.body}</Text>
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}

export function TripChatPanel({
  tripId,
  userId,
  title = "Trip chat",
}: {
  tripId: string;
  userId: string;
  title?: string;
}) {
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, setTyping, isTyping, isConnected, error } =
    useTripChat(tripId);

  function submitMessage() {
    const body = draft.trim();
    if (!body || !isConnected) return;
    sendMessage(body);
    setDraft("");
    setTyping(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.status}>
            {isConnected ? "Connected" : error || "Connecting to chat..."}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            isConnected ? styles.connectedDot : styles.disconnectedDot,
          ]}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => (
          <MessageRow message={item} ownMessage={item.from_user_id === userId} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isConnected
              ? "You’re connected. Send a message to the other trip participant."
              : "Trip chat will appear here once connected."}
          </Text>
        }
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
      />
      {isTyping && (
        <Text style={styles.typingText}>{isTyping} is typing...</Text>
      )}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Chat message"
          maxLength={500}
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            setTyping(Boolean(value.trim()));
          }}
          onSubmitEditing={submitMessage}
          placeholder="Message trip participants"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          style={styles.input}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!isConnected || !draft.trim()}
          onPress={submitMessage}
          style={[
            styles.sendButton,
            (!isConnected || !draft.trim()) && styles.sendDisabled,
          ]}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    minHeight: 260,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingBottom: 10,
  },
  title: { color: colors.text, fontWeight: "800", fontSize: 15 },
  status: { color: colors.muted, fontSize: 10, marginTop: 3 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  connectedDot: { backgroundColor: "#36e7bb" },
  disconnectedDot: { backgroundColor: "#f1ae50" },
  errorText: { color: "#ff8b91", fontSize: 11, marginTop: 8 },
  messageList: { maxHeight: 190, marginVertical: 8 },
  messageContent: { flexGrow: 1, justifyContent: "flex-end", paddingVertical: 4 },
  messageRow: { alignItems: "flex-start", marginVertical: 3 },
  ownMessageRow: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "86%",
    backgroundColor: colors.raised,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ownBubble: { backgroundColor: "#12434b" },
  messageText: { color: colors.text, fontSize: 13 },
  messageTime: {
    color: colors.muted,
    fontSize: 9,
    textAlign: "right",
    marginTop: 4,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    padding: 18,
    lineHeight: 17,
  },
  typingText: { color: colors.muted, fontSize: 10, marginBottom: 7 },
  composer: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  sendButton: {
    minWidth: 58,
    borderRadius: 10,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sendDisabled: { opacity: 0.45 },
  sendLabel: { color: "#071015", fontSize: 11, fontWeight: "900" },
});
