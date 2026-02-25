import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDirectory } from '../components/UserDirectory';
import { SimpleHeader } from '../components/SimpleHeader';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { toast } from '../lib/toast';

export const Users: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /**
   * Create or find a direct conversation with the target user,
   * then navigate to the messaging page
   */
  const handleMessage = useCallback(async (targetUserId: string) => {
    if (!user?.id) {
      toast.error('Please sign in to send messages');
      return;
    }

    if (targetUserId === user.id) {
      toast.error('You cannot message yourself');
      return;
    }

    try {
      const result = await apiService.post<{ conversation?: { id: string }; id?: string }>('/conversations', {
        type: 'direct',
        participantIds: [targetUserId],
        name: ''
      });
      const conversationId = result.data?.conversation?.id || result.data?.id;

      // Navigate to messages with the conversation selected
      navigate(`/messages?conversation=${conversationId}`);
      toast.success('Opening conversation...');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
    }
  }, [user, navigate]);

  /**
   * Send a connection request to another user
   * For now, this creates a connection notification/request
   */
  const handleConnect = useCallback(async (targetUserId: string) => {
    if (!user?.id) {
      toast.error('Please sign in to connect with others');
      return;
    }

    if (targetUserId === user.id) {
      toast.error('You cannot connect with yourself');
      return;
    }

    try {
      await apiService.post('/notifications', {
        type: 'connection_request',
        targetUserId,
        message: `${user.name || user.email} wants to connect with you`
      });

      toast.success('Connection request sent!');
    } catch (error) {
      console.error('Error sending connection request:', error);
      // Fallback: open direct message conversation instead
      toast.info('Opening a direct message instead');
      await handleMessage(targetUserId);
    }
  }, [user, handleMessage]);

  /**
   * Navigate to the user's profile page
   */
  const handleViewProfile = useCallback((userId: string) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

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