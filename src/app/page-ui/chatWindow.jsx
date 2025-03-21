import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Video } from "lucide-react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useSocketContext } from "../helpers/socketcontext";
const notificationSound = "/audio/notification.mp3";

const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${formattedMinutes} ${ampm}`;
};

const ChatWindow = ({ selectedUser }) => {
    const [message, setMessage] = useState("");
    const [allMessage, setAllMessage] = useState([]);
    const { socket, peer, myPeerId } = useSocketContext();
    const messagesEndRef = useRef(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [callAccepted, setCallAccepted] = useState(false);
    const [remotePeerId, setRemotePeerId] = useState(null);
    const myVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUserId = localStorage.getItem("userId");
            setUserId(storedUserId);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessage]);

    useEffect(() => {
        if (socket && userId) {
            socket.emit("register", userId);
            socket.on("getOnline", (onlineUserIds) => {
                console.log('online-users', onlineUserIds);
                setOnlineUsers(onlineUserIds);
            });
            return () => {
                socket.off("getOnline");
            };
        }
    }, [socket, userId]);

    const sendMessage = async () => {
        if (!message.trim()) return;

        const newMessage = {
            text: message,
            senderId: userId,
            timestamp: new Date(),
        };

        try {
            await axios.post(`https://chatapp-backend-delta.vercel.app/sendmsg/${selectedUser._id}`, {
                userId,
                message,
            });

            if (socket) {
                socket.emit("send-message", {
                    receiverId: selectedUser._id,
                    message,
                    senderId: userId,
                });
            }

            setAllMessage((prevMessages) => [...prevMessages, newMessage]);
            setMessage("");
        } catch (error) {
            console.log("Error sending message:", error);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (data) => {
            console.log("Frontend received message:", data);
            setAllMessage((prevMessages) => [
                ...prevMessages,
                { text: data.message, senderId: data.senderId, timestamp: new Date() },
            ]);
        };

        socket.on("receive-message", handleMessage);

        return () => {
            socket.off("receive-message", handleMessage);
        };
    }, [socket]);

    useEffect(() => {
        const fetchMsg = async () => {
            try {
                const response = await axios.get(`https://chatapp-backend-delta.vercel.app/getmsg/${selectedUser._id}`, {
                    params: { userId },
                });
                setAllMessage(response.data);
            } catch (error) {
                console.log("Error fetching messages:", error);
            }
        };
        if (selectedUser) {
            fetchMsg();
        }
    }, [selectedUser]);

    const startCall = () => {
        if (!selectedUser || !socket || !peer || !myPeerId) return;

        socket.emit("user-call", { to: selectedUser._id, from: userId, peerId: myPeerId });
        console.log('starting....')
    };

    useEffect(() => {
        if (!socket) return;

        console.log("Listening for incoming calls...");

        socket.on('incoming-call', (data) => {
            console.log("Received 'incoming-call':", data);
            setRemotePeerId(data.peerId);
        });

        return () => {
            socket.off("incoming-call");
        };
    }, [socket]);


    const acceptCall = () => {
        if (!remotePeerId || !peer) return;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                if (myVideoRef.current) {
                    myVideoRef.current.srcObject = stream;
                }

                const call = peer.call(remotePeerId, stream);
                call.on("stream", (remoteStream) => {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                    }
                    setCallAccepted(true);
                });
            })
            .catch((err) => console.error("Error getting media:", err));
    };


    useEffect(() => {
        if (!peer) return;

        peer.on("call", (call) => {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    myVideoRef.current.srcObject = stream;
                    call.answer(stream);

                    call.on("stream", (remoteStream) => {
                        remoteVideoRef.current.srcObject = remoteStream;
                        setCallAccepted(true);
                    });
                })
                .catch((err) => console.error("Error getting media:", err));
        });
    }, [peer]);

    return (
        <div className="flex w-full flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="w-full flex justify-between items-center p-6 border-b bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center space-x-4">
                    <Avatar className="border-2 border-blue-500">
                        <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {selectedUser?.username || ""}
                        </h2>
                        {selectedUser && onlineUsers.includes(selectedUser._id) ?
                            <p className="text-sm text-green-500 dark:text-green-400">Online</p> : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
                            )
                        }
                    </div>
                </div>
                <div>
                    <Video className="cursor-pointer text-gray-400 hover:text-blue-500" onClick={startCall} />
                </div>
                {callAccepted && (
                    <div className="flex flex-col items-center">
                        <video ref={myVideoRef} autoPlay className="w-1/2 border-2 border-blue-500" />
                        <video ref={remoteVideoRef} autoPlay className="w-1/2 border-2 border-green-500" />
                        <PhoneOff className="cursor-pointer text-red-500 mt-4" onClick={() => window.location.reload()} />
                    </div>
                )}

                {!callAccepted && remotePeerId && (
                    <div className="flex justify-center mt-4">
                        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={acceptCall}>
                            Accept Call
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {Array.isArray(allMessage) && allMessage.length > 0 ? (
                    allMessage.map((msg, index) => (
                        <div key={index} className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}>
                            {msg.senderId != userId && (
                                <Avatar className="mr-1">
                                    <AvatarImage src={`https://i.pravatar.cc/150?img=1`} alt="User Avatar" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`max-w-[75%] p-3 py-1 rounded-xl shadow-sm transition-all duration-200 ${msg.senderId === userId
                                    ? "bg-blue-500 text-white rounded-br-none"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                                    }`}
                            >
                                <p className="text-sm font-medium">{msg.text}</p>
                                <span className="text-xs text-gray-600 font-medium dark:text-gray-400 block mt-1">
                                    {formatTimestamp(msg.timestamp)}
                                </span>
                            </div>
                            {msg.senderId == userId && (
                                <Avatar className="ml-1 -mb-8">
                                    <AvatarImage src={`https://i.pravatar.cc/150?img=2`} alt="User Avatar" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <Input
                        className="flex-1 rounded-full bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message..."
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button
                        size="icon"
                        className="rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
                        onClick={sendMessage}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;