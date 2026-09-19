import { useEffect, useRef, useState } from "react";
import type { SimEvent } from "./types";

export function useEvents() {
  const [events, setEvents] = useState<SimEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/events`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as SimEvent;
        setEvents((prev) => [event, ...prev].slice(0, 500));
      } catch (e) {
        console.warn("Bad WS payload:", msg.data);
      }
    };

    ws.onerror = () => { /* silent */ };
    ws.onclose = () => { /* silent */ };

    return () => ws.close();
  }, []);

  return events;
}