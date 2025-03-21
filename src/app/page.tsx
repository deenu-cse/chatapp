'use client';
import Sidebar from './page-ui/sidebar'
import ChatWindow from './page-ui/chatWindow'
import { useState } from 'react';

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <>
      <div className="flex h-screen">
        <Sidebar selectedUser={selectedUser} setSelectedUser={setSelectedUser}/>
        <ChatWindow selectedUser={selectedUser}/>
      </div>
    </>
  );
}
