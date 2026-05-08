import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url: string | null) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs((prev) => [...prev, data]);
      if (data.type === 'done') {
        setIsDone(true);
        socket.close();
      }
    };
    socket.onclose = () => setIsConnected(false);
    socket.onerror = () => setIsConnected(false);

    return () => {
      socket.close();
    };
  }, [url]);

  return { logs, isConnected, isDone };
};
