// src/useEvents.ts
import { useState } from "react";
import type { SimEvent } from "./types";

export function useEvents(): SimEvent[] {
  const [events] = useState<SimEvent[]>([]);
  // Backend not wired yet — return empty stream.
  // When ready, uncomment the WebSocket code below.

  /*
  useEffect(() => {
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/events`;
    const ws = new WebSocket(url);
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as SimEvent;
        setEvents((prev) => [event, ...prev].slice(0, 500));
      } catch {}
    };
    return () => ws.close();
  }, []);
  */

  return events;
}