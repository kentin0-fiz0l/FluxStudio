import React from 'react';
import { UserDirectory } from '../components/UserDirectory';
import { SimpleHeader } from '../components/SimpleHeader';
import { useAuth } from '../contexts/AuthContext';

export const Users: React.FC = () => {
  const { user } = useAuth();

  const handleConnect = (userId: string) => {
    console.log('Connecting to user:', userId);
    // In a real app, this would send a connection request
    alert(`Connection request sent to user ${userId}`);
  };

  const handleMessage = (userId: string) => {
    console.log('Messaging user:', userId);
    // In a real app, this would open a chat or redirect to messaging
    alert(`Opening chat with user ${userId}`);
  };

  const handleViewProfile = (userId: string) => {
    console.log('Viewing profile:', userId);
    // In a real app, this would navigate to the user's detailed profile page
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleHeader />
      <UserDirectory
        currentUserId={user?.id}
        onConnect={handleConnect}
        onMessage={handleMessage}
        onViewProfile={handleViewProfile}
      />
    </div>
  );
};