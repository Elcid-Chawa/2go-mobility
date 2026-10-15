'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Shield } from 'lucide-react';
import { PhoenixSocket, PhoenixChannel, PhoenixMessage } from '../lib/phoenix-client';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../lib/api';

interface LiveTripChatModalProps {
  tripId: string;
  customerName?: string;
  driverName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveTripChatModal({
  tripId,
  customerName = 'Alice Rider',
  driverName = 'Bob Chauffeur',
  isOpen,
  onClose,
}: LiveTripChatModalProps) {
  const { role } = useAuth();
  const [messages, setMessages] = useState<PhoenixMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [channel, setChannel] = useState<PhoenixChannel | null>(null);
  const [chatError, setChatError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    let socket: PhoenixSocket | null = null;
    let activeChannel: PhoenixChannel | null = null;
    setMessages([]);
    setChannel(null);
    setChatError('');
    setIsConnected(false);

    async function connect() {
      const token = getAccessToken();
      if (!token) {
        setChatError('Your session has expired. Sign in again.');
        return;
      }

      const configuredUrl = process.env.NEXT_PUBLIC_MESSAGING_URL;
      const protocol =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? 'wss:'
          : 'ws:';
      const socketUrl = configuredUrl
        ? `${configuredUrl.replace(/\/+$/, '')}/socket/websocket`
        : `${protocol}//${window.location.hostname}:4000/socket/websocket`;

      socket = new PhoenixSocket(socketUrl, { params: { token } });
      socket.connect(
        () => {
          if (!active || !socket) return;
          activeChannel = socket.channel(`chat:trip:${tripId}`);
          activeChannel
            .on('new_msg', (msg: PhoenixMessage) => {
              setMessages((current) => [...current, msg]);
            })
            .on(
              'user_typing',
              (payload: { is_typing?: boolean; role?: string }) => {
                setIsTyping(
                  payload.is_typing ? payload.role || 'User' : null,
                );
              },
            );
          activeChannel.join(
            () => {
              if (active) {
                setIsConnected(true);
                setChannel(activeChannel);
              }
            },
            (response: { reason?: string }) => {
              if (active) {
                setChatError(
                  response.reason || 'You cannot join this trip chat.',
                );
              }
            },
          );
        },
        () => {
          if (active) {
            setIsConnected(false);
            setChatError('The messaging connection was closed.');
          }
        },
      );
    }

    void connect().catch((error: unknown) => {
      if (active) {
        setChatError(
          error instanceof Error ? error.message : 'Unable to connect to chat.',
        );
      }
    });

    return () => {
      active = false;
      activeChannel?.leave();
      socket?.disconnect();
      setChannel(null);
      setIsConnected(false);
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (channel) {
      channel.push('new_msg', { body: inputText.trim() });
    }

    setInputText('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full flex flex-col h-[600px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">In-Trip Live Chat</h3>
                <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                  {tripId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {customerName} (Rider) ↔ {driverName} (Driver)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ops Intervene Banner */}
        <div className="p-2.5 bg-indigo-950/40 border-b border-indigo-900/40 px-4 text-[11px] text-indigo-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Elixir Phoenix Channel (chat:trip:{tripId}) • Operations Oversight</span>
          </div>
          <span className="font-semibold text-indigo-200">Role: {role}</span>
        </div>
        {chatError && (
          <div
            role="alert"
            className="border-b border-rose-900/50 bg-rose-950/30 px-4 py-2 text-xs text-rose-300"
          >
            {chatError}
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/30">
          {messages.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-500">
              {isConnected
                ? 'Connected. Messages sent from now on will appear here.'
                : 'Connecting to this trip chat...'}
            </p>
          )}
          {messages.map((msg) => {
            const isOps = msg.sender_role === 'ADMIN' || msg.sender_role === 'OPERATIONS';
            const isCustomer = msg.sender_role === 'CUSTOMER';
            const isDriver = msg.sender_role === 'DRIVER';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isOps ? 'items-center my-2' : isCustomer ? 'items-start' : 'items-end'
                }`}
              >
                {isOps ? (
                  <div className="bg-indigo-950/70 border border-indigo-800 text-indigo-200 text-xs px-3 py-1.5 rounded-xl max-w-sm text-center">
                    <span className="font-bold text-[10px] text-indigo-400 block mb-0.5 uppercase tracking-wider">
                      Operations Intervened
                    </span>
                    {msg.body}
                  </div>
                ) : (
                  <div
                    className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm space-y-1 ${
                      isDriver
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-100'
                        : 'bg-slate-800 border border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span className="font-semibold">
                        {isDriver ? `🚗 Driver (${driverName})` : `👤 Rider (${customerName})`}
                      </span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="leading-relaxed">{msg.body}</p>
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span>{isTyping} is typing...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
          <input
            type="text"
            maxLength={500}
            placeholder="Send message to trip participants..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputText.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
