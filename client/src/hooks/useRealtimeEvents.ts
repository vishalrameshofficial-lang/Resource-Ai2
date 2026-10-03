import { useEffect, useState, useRef } from 'react';

export interface RealtimeEvent {
  type: 'NEW_REQUEST' | 'REQUEST_UPDATED' | 'CALL_STARTED' | 'CALL_UPDATED' | 'CALL_COMPLETED' | 'CALL_ENDED' | 'CONNECTED';
  data: any;
  timestamp: string;
}

export function useRealtimeEvents(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState<RealtimeEvent | null>(null);

  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const parsed: RealtimeEvent = JSON.parse(e.data);
            setLatestEvent(parsed);
            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
          } catch (err) {
            console.warn('[SSE] Failed to parse message:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          // Auto reconnect after 5 seconds if disconnected
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn('[SSE] Connection error:', err);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return { isConnected, latestEvent };
}
