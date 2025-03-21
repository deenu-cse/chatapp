import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from 'axios';
import { useSocketContext } from "../helpers/socketcontext";

const Sidebar = ({ selectedUser, setSelectedUser }) => {
    const [users, setUsers] = useState([]);
    const { socket } = useSocketContext();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUserId = localStorage.getItem("userId");
            setUserId(storedUserId);
        }
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('https://chatapp-backend-delta.vercel.app/getallusers', {
                    params: { userId }
                });
                setUsers(response.data);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (!socket || !userId) return;

        socket.emit("register", userId);

        socket.on("getOnline", (onlineUserIds) => {
            console.log('online-users', onlineUserIds);
            setOnlineUsers(onlineUserIds);
        });

        return () => {
            socket.off("getOnline");
        };
    }, [socket, userId]);

    return (
        <Card className="w-64 h-screen bg-gray-50 p-4">
            <CardHeader>
                <CardTitle>Chats</CardTitle>
                <CardDescription>Recent conversations</CardDescription>
            </CardHeader>
            <div className="space-y-2">
                {users.length > 0 ? users.map((user) => {
                    const isOnline = onlineUsers.includes(user._id);

                    return (
                        <div
                            key={user._id}
                            className={`flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg cursor-pointer ${selectedUser && selectedUser._id === user._id ? "bg-blue-200" : ""
                                }`}
                            onClick={() => setSelectedUser(user)}
                        >
                            <Avatar>
                                <AvatarImage src={`https://i.pravatar.cc/150?img=${user._id}`} />
                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{user.username}</p>
                                <p className={`text-xs font-medium rounded-full ${isOnline ? "text-green-600" : "text-gray-500"}`}>
                                    {isOnline ? "Online" : ""}
                                </p>
                            </div>
                        </div>
                    );
                }) : (
                    <p className="text-center text-gray-500">No users found</p>
                )}
            </div>
        </Card>
    );
};

export default Sidebar;
