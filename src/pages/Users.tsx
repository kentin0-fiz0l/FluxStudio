import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDirectory } from '../components/UserDirectory';
import { SimpleHeader } from '../components/SimpleHeader';
import { useAuth } from '@/store/slices/authSlice';
import { buildApiUrl } from '../config/environment';
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
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create or find existing direct conversation
      const response = await fetch(buildApiUrl('/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'direct',
          participantIds: [targetUserId],
          name: '' // Direct conversations don't need a name
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      const result = await response.json();
      const conversationId = result.conversation?.id || result.id;

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
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Send connection request via notifications/activity system
      const response = await fetch(buildApiUrl('/notifications'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'connection_request',
          targetUserId,
          message: `${user.name || user.email} wants to connect with you`
        })
      });

      if (!response.ok) {
        // If notification endpoint doesn't exist, fall back to messaging
        await handleMessage(targetUserId);
        return;
      }

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