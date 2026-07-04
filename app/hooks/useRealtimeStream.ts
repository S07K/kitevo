"use client";

import { useEffect, useRef } from "react";

type StreamEvent =
  | { type: "connected"; payload: { at: string } }
  | { type: "messages"; payload: { conversationId: string; messages: unknown[] } }
  | { type: "conversations_updated"; payload: Record<string, never> }
  | { type: "ping"; payload: { at: string } };

type Handlers = {
  onMessages?: (conversationId: string, messages: unknown[]) => void;
  onConversationsUpdated?: () => void;
};

export function useRealtimeStream(handlers: Handlers, enabled = true) {
  // Keep handlers stable across renders without restarting the stream
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let sinceTimestamp = new Date().toISOString();

    function connect() {
      const url = `/api/social/stream?since=${encodeURIComponent(sinceTimestamp)}`;
      es = new EventSource(url);

      es.onmessage = (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data) as StreamEvent;
          sinceTimestamp = new Date().toISOString();

          if (event.type === "messages") {
            handlersRef.current.onMessages?.(
              event.payload.conversationId,
              event.payload.messages
            );
          } else if (event.type === "conversations_updated") {
            handlersRef.current.onConversationsUpdated?.();
          }
        } catch {}
      };

      es.onerror = () => {
        es?.close();
        es = null;
        // Exponential-ish backoff capped at 10s
        reconnectTimer = setTimeout(connect, Math.min(10_000, 3_000));
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled]);
}
