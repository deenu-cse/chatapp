'use client';
import { createContext, useContext, useEffect, useState } from "react";
import io from 'socket.io-client';
import { Peer } from 'peerjs'

const socketContext = createContext();

export const useSocketContext = () => {
    return useContext(socketContext);
}
const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null)
    const [peer, setPeer] = useState(null);
    const [myPeerId, setMyPeerId] = useState(null);

    useEffect(() => {
        const newSocket = io("https://chatapp-backend-o1si.onrender.com", {
            transports: ["websocket"],
            withCredentials: true,
        });

        console.log("Frontend: Trying to connect to socket...");
        newSocket.on("connect", () => {
            console.log("User connected", newSocket.id);
            setSocket(newSocket);
        });

        newSocket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, []);

    useEffect(() => {
        const peerConnection = new Peer({
            host: "chatapp-backend-o1si.onrender.com",
            secure: true,
            path: '/peerjs'
        });

        peerConnection.on('open', (id) => {
            console.log('my peer id', id);
            setMyPeerId(id)
        })

        setPeer(peerConnection);
    }, [])


    return (
        <socketContext.Provider value={{ socket, peer, myPeerId }}>
            {children}
        </socketContext.Provider>
    );
}

export default SocketProvider;