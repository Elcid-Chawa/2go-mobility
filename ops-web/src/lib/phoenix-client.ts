/**
 * Zero-dependency TypeScript client for Phoenix Channels (Protocol v2)
 * Compatible with Web (Next.js/React) and Mobile (React Native/Expo).
 */

export interface PhoenixMessage {
  id: string;
  trip_id?: string;
  ticket_id?: string;
  from_user_id: string;
  sender_role: string;
  body: string;
  timestamp: string;
}

export type MessageHandler = (payload: any) => void;

export class PhoenixChannel {
  private joinRef: string | null = null;

  constructor(
    public topic: string,
    private socket: PhoenixSocket,
    private params: Record<string, any> = {}
  ) {
  }

  join(onOk?: (resp: any) => void, onError?: (err: any) => void) {
    const ref = this.socket.nextRef();
    this.joinRef = ref;
    this.socket.onReply(ref, (payload) => {
      if (payload.status === 'ok') onOk?.(payload.response);
      else onError?.(payload.response);
    });
    this.socket.push(ref, ref, this.topic, 'phx_join', this.params);
    return this;
  }

  leave() {
    this.socket.push(null, this.socket.nextRef(), this.topic, 'phx_leave', {});
    this.socket.removeTopic(this.topic);
  }

  push(event: string, payload: Record<string, any> = {}) {
    this.socket.push(null, this.socket.nextRef(), this.topic, event, payload);
  }

  on(event: string, handler: MessageHandler) {
    this.socket.onEvent(this.topic, event, handler);
    return this;
  }
}

export class PhoenixSocket {
  private ws: WebSocket | null = null;
  private refCounter = 0;
  private channels = new Map<string, PhoenixChannel>();
  private eventHandlers = new Map<string, Map<string, Set<MessageHandler>>>();
  private replyHandlers = new Map<string, (payload: any) => void>();
  private heartbeatTimer: any = null;
  private isConnected = false;

  nextRef(): string {
    this.refCounter += 1;
    return String(this.refCounter);
  }

  constructor(
    private endpoint: string,
    private options: { params?: { token?: string } } = {}
  ) {}

  connect(onOpen?: () => void, onClose?: () => void) {
    const token = this.options.params?.token;
    const params = new URLSearchParams({ vsn: '2.0.0' });
    if (token) params.set('token', token);
    const separator = this.endpoint.includes('?') ? '&' : '?';
    const url = `${this.endpoint}${separator}${params.toString()}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.startHeartbeat();
        onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const [joinRef, ref, topic, eventName, payload] = JSON.parse(event.data);

          if (eventName === 'phx_reply' && ref) {
            const handler = this.replyHandlers.get(ref);
            if (handler) {
              handler(payload);
              this.replyHandlers.delete(ref);
            }
          }

          const topicHandlers = this.eventHandlers.get(topic);
          if (topicHandlers) {
            const handlers = topicHandlers.get(eventName);
            if (handlers) {
              handlers.forEach((fn) => fn(payload));
            }
          }
        } catch {
          // Ignore unparseable frames
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        onClose?.();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  channel(topic: string, params: Record<string, any> = {}): PhoenixChannel {
    let chan = this.channels.get(topic);
    if (!chan) {
      chan = new PhoenixChannel(topic, this, params);
      this.channels.set(topic, chan);
    }
    return chan;
  }

  removeTopic(topic: string) {
    this.channels.delete(topic);
    this.eventHandlers.delete(topic);
  }

  push(joinRef: string | null, ref: string, topic: string, event: string, payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const frame = JSON.stringify([joinRef, ref, topic, event, payload]);
      this.ws.send(frame);
    }
  }

  onEvent(topic: string, event: string, handler: MessageHandler) {
    if (!this.eventHandlers.has(topic)) {
      this.eventHandlers.set(topic, new Map());
    }
    const topicMap = this.eventHandlers.get(topic)!;
    if (!topicMap.has(event)) {
      topicMap.set(event, new Set());
    }
    topicMap.get(event)!.add(handler);
  }

  onReply(ref: string, handler: (payload: any) => void) {
    this.replyHandlers.set(ref, handler);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.push(null, this.nextRef(), 'phoenix', 'heartbeat', {});
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
