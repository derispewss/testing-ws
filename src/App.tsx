import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';

const ChatApp: React.FC = () => {
    const [userId, setUserId] = useState<string>('');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [messageInput, setMessageInput] = useState<string>('');

    // WebSocket custom hook usage
    const {
        connectedUsers,
        messages,
        currentRoom,
        isConnected: wsConnected,
        startPrivateChat,
        sendMessage,
        markMessageAsRead,
        leaveRoom
    } = useWebSocket(userId);

    const [activeChatUser, setActiveChatUser] = useState<string | null>(null); // Track the user you're chatting with

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
            setIsConnected(true);
        } else {
            // Prompt for user ID if not available in localStorage
            const promptUserId = prompt('Please enter your User ID:');
            if (promptUserId) {
                localStorage.setItem('userId', promptUserId);
                setUserId(promptUserId);
                setIsConnected(true);
            }
        }
    }, []);

    const handleSendMessage = () => {
        if (messageInput.trim()) {
            sendMessage(messageInput);
            setMessageInput('');
        }
    };

    const handleStartChat = (targetUserId: string) => {
        setActiveChatUser(targetUserId); // Set active chat user
        startPrivateChat(userId, targetUserId); // Initiate private chat with the target user
    };

    useEffect(() => {
        if (currentRoom && markMessageAsRead) {
            // Mark messages as read by passing the roomId
            markMessageAsRead(currentRoom.roomId); // Ensure this is a string
        }
    }, [currentRoom, markMessageAsRead]);

    useEffect(() => {
        if (!userId) return;

        return () => {
            localStorage.removeItem('userId');
        };
    }, [userId]);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
            <div className="max-w-6xl mx-auto backdrop-blur-sm bg-white/80 rounded-2xl shadow-2xl border border-gray-100 p-8">
                {isConnected && userId && (
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1 rounded-xl">
                            <div className="bg-white rounded-lg p-3 text-center">
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                                    Connected as {userId}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {!isConnected && (
                    <div className="min-h-[400px] flex items-center justify-center">
                        <div className="w-full max-w-md p-8 backdrop-blur-md bg-white/90 rounded-2xl shadow-xl border border-gray-100">
                            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Welcome to Chat</h2>
                            <button
                                onClick={() => {
                                    // Trigger prompt on button click
                                    const promptUserId = prompt('Please enter your User ID:');
                                    if (promptUserId) {
                                        localStorage.setItem('userId', promptUserId);
                                        setUserId(promptUserId);
                                        setIsConnected(true);
                                    }
                                }}
                                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transform hover:scale-[1.02] transition duration-300 shadow-lg hover:shadow-xl"
                            >
                                Connect to Chat
                            </button>
                        </div>
                    </div>
                )}

                {isConnected && userId && (
                    <div className="flex gap-8">
                        <div className="w-1/3 backdrop-blur-md bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6">
                            <h2 className="font-bold text-2xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                                Online Users
                            </h2>
                            <div className="space-y-3">
                                {connectedUsers
                                    .filter((user) => user.userId !== userId) // Exclude logged-in user
                                    .map((user) => (
                                        <div
                                            key={user.userId}
                                            onClick={() => handleStartChat(user.userId)} // Pass the userId of the clicked user
                                            className="group cursor-pointer"
                                        >
                                            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/0 to-purple-500/0 hover:from-indigo-500/5 hover:to-purple-500/5 transition duration-300">
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                            {user.userId[0].toUpperCase()}
                                                        </div>
                                                        <div
                                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white
                                                            ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-700 group-hover:text-gray-900">
                                                            {user.userId}
                                                        </span>
                                                        {!user.isOnline && (
                                                            <span className="text-xs text-gray-500">
                                                                Last seen: {formatTime(user.lastSeen)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="flex-1 backdrop-blur-md bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6">
                            {activeChatUser ? (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                                            Chat Room with {activeChatUser}
                                        </h2>
                                        <button
                                            onClick={leaveRoom}
                                            className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition duration-300"
                                        >
                                            Leave Chat
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="h-[500px] overflow-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-100">
                                            {messages.map((msg) => (
                                                <div
                                                    key={msg.messageId}
                                                    className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[80%] p-4 rounded-2xl shadow-md
                                                            ${msg.sender === userId
                                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                                                : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                    >
                                                        <div className="font-medium text-sm mb-1 opacity-80">
                                                            {msg.sender}
                                                        </div>
                                                        <div className="text-base">{msg.content}</div>
                                                        <div className="text-xs mt-1 opacity-60">
                                                            {formatTime(msg.createdAt)}
                                                            {msg.sender === userId && (
                                                                <span className="ml-2">• {msg.status}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl">
                                            <div className="flex gap-4 bg-white rounded-lg p-2">
                                                <input
                                                    type="text"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                    placeholder="Type your message..."
                                                    className="flex-1 px-4 py-3 bg-gray-50 rounded-lg focus:outline-none focus:bg-white transition duration-300"
                                                />
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={!wsConnected}
                                                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transform hover:scale-[1.02] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[600px] flex items-center justify-center text-gray-500">
                                    Select a user to start chatting
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatApp;
