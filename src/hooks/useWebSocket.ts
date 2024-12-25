import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  messageId: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
  createdAt: number;
}

interface Participant {
  socketId: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  lastSeen: number;
  isOnline: boolean;
}

interface User {
  userId: string;
  isOnline: boolean;
  lastSeen: number;
}

interface Room {
  roomId: string;
  participants: Participant[];
  messages: Message[];
  lastActivity: number;
}

export function useWebSocket(userId: string) {
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId) return;

    socketRef.current = io('http://localhost:3001', {
      query: { clientId: userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      setError(null);
      socketRef.current?.emit('getConnectedUsers');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection failed:', err.message);
      setError('Failed to connect to chat server');
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId]);

  // Handle incoming WebSocket events
  useEffect(() => {
    if (!socketRef.current) return;

    const handleConnectedUsersList = (data: { users: User[] }) => setConnectedUsers(data.users);
    const handleUserStatusChanged = (data: { userId: string; isOnline: boolean; lastSeen: number }) =>
      setConnectedUsers((prev) => prev.map((user) =>
        user.userId === data.userId
          ? { ...user, isOnline: data.isOnline, lastSeen: data.lastSeen }
          : user
      ));

    const handleChatRoomJoined = (room: Room) => {
      setCurrentRoom(room);
      setMessages(room.messages);
    };

    const handleReceiveMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
      socketRef.current?.emit('messageRead', {
        messageId: message.messageId,
        roomId: currentRoom?.roomId,
        userId: userId,
      });
    };

    const handleMessageStatusUpdated = (data: { messageId: string; status: 'sent' | 'delivered' | 'read'; userId: string }) =>
      setMessages((prev) => prev.map((msg) =>
        msg.messageId === data.messageId ? { ...msg, status: data.status } : msg
      ));

    const handleParticipantStatusChanged = (data: { roomId: string; userId: string; isOnline: boolean; lastSeen: number }) => {
      if (currentRoom?.roomId === data.roomId) {
        setCurrentRoom((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((participant) =>
                  participant.userId === data.userId
                    ? { ...participant, isOnline: data.isOnline, lastSeen: data.lastSeen }
                    : participant
                ),
              }
            : null
        );
      }
    };

    // Listen for the necessary socket events
    socketRef.current.on('connectedUsersList', handleConnectedUsersList);
    socketRef.current.on('userStatusChanged', handleUserStatusChanged);
    socketRef.current.on('chatRoomJoined', handleChatRoomJoined);
    socketRef.current.on('receiveMessage', handleReceiveMessage);
    socketRef.current.on('messageStatusUpdated', handleMessageStatusUpdated);
    socketRef.current.on('participantStatusChanged', handleParticipantStatusChanged);

    return () => {
      socketRef.current?.off('connectedUsersList', handleConnectedUsersList);
      socketRef.current?.off('userStatusChanged', handleUserStatusChanged);
      socketRef.current?.off('chatRoomJoined', handleChatRoomJoined);
      socketRef.current?.off('receiveMessage', handleReceiveMessage);
      socketRef.current?.off('messageStatusUpdated', handleMessageStatusUpdated);
      socketRef.current?.off('participantStatusChanged', handleParticipantStatusChanged);
    };
  }, [userId, currentRoom?.roomId]);

  // Start a private chat
  const startPrivateChat = useCallback((userId: string, otherUserId: string) => {
    socketRef.current?.emit('startPrivateChat', { userId, otherUserId });
  }, []);

  // Send a message
  const sendMessage = useCallback((content: string) => {
    if (!currentRoom?.roomId || !content.trim()) return;

    socketRef.current?.emit('sendMessage', {
      roomId: currentRoom.roomId,
      userId: userId,
      message: content,
    });
  }, [currentRoom?.roomId, userId]);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    if (!currentRoom?.roomId) return;

    socketRef.current?.emit('messageRead', {
      messageId,
      roomId: currentRoom.roomId,
      userId: userId,
    });
  }, [currentRoom?.roomId, userId]);

  // Leave current room
  const leaveRoom = useCallback(() => {
    if (!currentRoom?.roomId) return;

    setCurrentRoom(null);
    setMessages([]);
  }, [currentRoom?.roomId]);

  return {
    connectedUsers,
    messages,
    currentRoom,
    isConnected,
    error,
    startPrivateChat,
    sendMessage,
    markMessageAsRead,
    leaveRoom,
  };
}
