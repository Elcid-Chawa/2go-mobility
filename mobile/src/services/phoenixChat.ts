import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../api";

declare const process: {
  env: Record<string, string | undefined>;
};

export interface ChatMessage {
  id: string;
  trip_id?: string;
  ticket_id?: string;
  from_user_id: string;
  sender_role: string;
  body: string;
  media_url?: string;
  timestamp: string;
}

type PhoenixFrame = [
  string | null,
  string | null,
  string,
  string,
  Record<string, unknown>,
];

const MESSAGING_URL =
  process.env.EXPO_PUBLIC_MESSAGING_URL || "ws://10.0.2.2:4000";

export class PhoenixTripSocket {
  private ws: WebSocket | null = null;
  private refCounter = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private joined = false;
  private tripId: string | null = null;

  constructor(
    private hostUrl: string,
    private token: string,
  ) {}

  connect(
    tripId: string,
    onMessage: (msg: ChatMessage) => void,
    onTyping?: (isTyping: boolean, role: string) => void,
    onStatus?: (status: "connected" | "disconnected" | "error", message?: string) => void,
  ): void {
    this.tripId = tripId;
    const separator = this.hostUrl.includes("?") ? "&" : "?";
    const wsUrl = `${this.hostUrl.replace(/\/+$/, "")}/socket/websocket${separator}token=${encodeURIComponent(this.token)}&vsn=2.0.0`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        const ref = this.nextRef();
        this.push(ref, ref, `chat:trip:${tripId}`, "phx_join", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const [joinRef, ref, topic, eventName, payload] = JSON.parse(
            event.data,
          ) as PhoenixFrame;
          if (topic !== `chat:trip:${tripId}`) return;

          if (eventName === "phx_reply" && payload.status) {
            if (payload.status === "ok") {
              this.joined = true;
              onStatus?.("connected");
              this.startHeartbeat();
            } else {
              this.joined = false;
              onStatus?.(
                "error",
                typeof payload.response === "object" &&
                  payload.response !== null &&
                  "reason" in payload.response
                  ? String(payload.response.reason)
                  : "Could not join trip chat",
              );
            }
            return;
          }

          if (eventName === "new_msg") {
            onMessage(payload as unknown as ChatMessage);
          } else if (eventName === "user_typing") {
            onTyping?.(
              payload.is_typing === true,
              typeof payload.role === "string" ? payload.role : "User",
            );
          }
        } catch {
          onStatus?.("error", "Received an invalid messaging response");
        }
      };

      this.ws.onerror = () => {
        onStatus?.("error", "Unable to connect to the messaging service");
      };
      this.ws.onclose = () => {
        this.joined = false;
        this.stopHeartbeat();
        onStatus?.("disconnected");
      };
    } catch {
      onStatus?.("error", "Unable to open the messaging connection");
    }
  }

  sendMessage(body: string, mediaUrl?: string): void {
    if (!this.tripId || !this.joined) return;
    this.push(null, this.nextRef(), `chat:trip:${this.tripId}`, "new_msg", {
      body,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    });
  }

  sendTypingStatus(isTyping: boolean): void {
    if (!this.tripId || !this.joined) return;
    this.push(null, this.nextRef(), `chat:trip:${this.tripId}`, "typing", {
      is_typing: isTyping,
    });
  }

  disconnect(): void {
    if (this.tripId && this.joined) {
      this.push(
        null,
        this.nextRef(),
        `chat:trip:${this.tripId}`,
        "phx_leave",
        {},
      );
    }
    this.joined = false;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private nextRef(): string {
    this.refCounter += 1;
    return String(this.refCounter);
  }

  private push(
    joinRef: string | null,
    ref: string,
    topic: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify([joinRef, ref, topic, event, payload]));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.push(null, this.nextRef(), "phoenix", "heartbeat", {});
    }, 30_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export function useTripChat(tripId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [connection, setConnection] = useState<{
    connected: boolean;
    error: string | null;
  }>({ connected: false, error: null });
  const socketRef = useRef<PhoenixTripSocket | null>(null);

  useEffect(() => {
    if (!tripId) {
      setMessages([]);
      setConnection({ connected: false, error: null });
      return;
    }

    let cancelled = false;
    let socket: PhoenixTripSocket | null = null;
    setMessages([]);
    setConnection({ connected: false, error: null });

    getAccessToken()
      .then((token) => {
        if (cancelled) return;
        if (!token) {
          setConnection({
            connected: false,
            error: "Sign in again to use trip chat.",
          });
          return;
        }

        socket = new PhoenixTripSocket(MESSAGING_URL, token);
        socketRef.current = socket;
        socket.connect(
          tripId,
          (message) => setMessages((current) => [...current, message]),
          (typing, role) => setIsTyping(typing ? role : null),
          (status, message) => {
            if (cancelled) return;
            setConnection({
              connected: status === "connected",
              error: status === "error" ? message || "Messaging error" : null,
            });
          },
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setConnection({
            connected: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to read the login session",
          });
        }
      });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnection({ connected: false, error: null });
    };
  }, [tripId]);

  function sendMessage(body: string): void {
    socketRef.current?.sendMessage(body.trim());
  }

  function setTyping(typing: boolean): void {
    socketRef.current?.sendTypingStatus(typing);
  }

  return {
    messages,
    sendMessage,
    setTyping,
    isTyping,
    isConnected: connection.connected,
    error: connection.error,
  };
}
