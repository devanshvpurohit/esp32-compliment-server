import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState({ seconds: null, enabled: true });
  const [scheduledList, setScheduledList] = useState([]);
  
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('status', (data) => {
      setEsp32Connected(data.esp32Connected);
      setClientsCount(data.clients);
    });

    socket.on('currentMessage', (data) => {
      setCurrentMessage(data);
    });

    socket.on('history', (data) => {
      setHistory(data);
    });

    socket.on('countdown', (data) => {
      setCountdown(data);
    });

    socket.on('scheduledList', (data) => {
      setScheduledList(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleAuto = (enabled) => {
    if (socketRef.current) {
      socketRef.current.emit('toggleAuto', enabled);
    }
  };

  const triggerRandom = () => {
    if (socketRef.current) {
      socketRef.current.emit('triggerRandom');
    }
  };

  const scheduleMessage = (text, delaySeconds) => {
    if (socketRef.current) {
      socketRef.current.emit('scheduleMessage', { text, delaySeconds });
    }
  };

  const sendCustomMessage = async (text) => {
    try {
      const response = await fetch(`${SOCKET_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await response.json();
    } catch (err) {
      console.error("Error sending custom message:", err);
      throw err;
    }
  };

  const clearMsgHistory = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/history/clear`, {
        method: 'POST'
      });
      return await response.json();
    } catch (err) {
      console.error("Error clearing history:", err);
      throw err;
    }
  };

  return {
    isConnected,
    esp32Connected,
    clientsCount,
    currentMessage,
    history,
    countdown,
    scheduledList,
    toggleAuto,
    triggerRandom,
    scheduleMessage,
    sendCustomMessage,
    clearMsgHistory
  };
}
