import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useToastStore } from "../store/useToastStore";
import api from "../lib/axios";
import type { ChatMessage } from "../store/useChatStore";

export const useChat = () => {
  const { token, user } = useAuthStore();
  const { 
    addMessage, 
    setIsConnected, 
    activeRecipientId, 
    updateUnreadCount,
    fetchUnreadCounts 
  } = useChatStore();
  
  const toast = useToastStore();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use a ref for activeRecipientId to avoid re-creating the callback and re-connecting
  const activeRecipientIdRef = useRef(activeRecipientId);
  useEffect(() => {
    activeRecipientIdRef.current = activeRecipientId;
  }, [activeRecipientId]);

  const connect = useCallback(function connectSocket() {
    if (!token || socketRef.current?.readyState === WebSocket.OPEN) return;

    // Build WS URL from VITE_API_URL or fallback to current hostname
    const defaultBaseUrl = `http://${window.location.hostname}:8000/api/v1`;
    const apiUrl = import.meta.env.VITE_API_URL || defaultBaseUrl;
    const wsUrl = apiUrl.replace("http", "ws") + `/chat/ws/${token}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setIsConnected(true);
      fetchUnreadCounts();
      
      // Auto-refresh active chat history on reconnect to catch missed messages
      if (activeRecipientIdRef.current) {
        useChatStore.getState().fetchHistory(activeRecipientIdRef.current);
        useChatStore.getState().markAsRead(activeRecipientIdRef.current);
      }
    };

    socket.onmessage = (event) => {
      const message: ChatMessage = JSON.parse(event.data);
      const currentActiveId = activeRecipientIdRef.current;
      const isPaneOpen = useChatStore.getState().isPaneOpen;
      const isCurrentlyViewing = isPaneOpen && currentActiveId === message.sender_id;
      
      // If the message is part of the active conversation, add it
      if (
        message.sender_id === currentActiveId || 
        message.recipient_id === currentActiveId ||
        message.sender_id === user?.id // Own message echo
      ) {
        addMessage(message);
      }

      // If it's a new message for a different conversation or even the active one but received while window is closed, notify
      if (message.recipient_id === user?.id) {
        if (!isCurrentlyViewing) {
          updateUnreadCount(message.sender_id, 1);
          toast.info(`Nouveau message reçu`, 5000);
        } else {
          // Si on est en train de lire activament, on marque lu sur le serveur au vol
          useChatStore.getState().markAsRead(message.sender_id);
        }
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connectSocket, 3000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      socket.close();
    };

    socketRef.current = socket;
  }, [token, user?.id, addMessage, setIsConnected, updateUnreadCount, fetchUnreadCounts, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = async (recipientId: string, content: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        recipient_id: recipientId,
        content: content
      }));
    } else {
      // Fallback HTTP
      try {
        const res = await api.post("/chat/message", {
          recipient_id: recipientId,
          content: content
        });
        addMessage(res.data);
      } catch (err) {
        console.error("Failed to send message via HTTP fallback", err);
        toast.error("Impossible d'envoyer le message pour le moment.");
      }
    }
  };

  return { sendMessage };
};
