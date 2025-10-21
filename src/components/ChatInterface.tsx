import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, Reply, Edit2, Trash2, MoreVertical, Hash, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string;
  file?: {
    id: string;
    originalName: string;
    filename: string;
    mimetype: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  };
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
}

interface ChatInterfaceProps {
  channelId: string;
  channelName: string;
  messages: Message[];
  onSendMessage: (text: string, file?: any) => void;
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  typingUsers?: string[];
}

export function ChatInterface({
  channelId,
  channelName,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  typingUsers = []
}: ChatInterfaceProps) {
  const { user, token } = useAuth();
  const [message, setMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://fluxstudio.art:3003' : 'http://localhost:3003';

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.file;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    if (message.trim() || selectedFile) {
      if (editingMessage) {
        onEditMessage?.(editingMessage.id, message);
        setEditingMessage(null);
      } else {
        let fileData = null;

        if (selectedFile) {
          setUploading(true);
          try {
            fileData = await uploadFile(selectedFile);
          } catch (error) {
            console.error('File upload failed:', error);
            setUploading(false);
            return;
          }
          setUploading(false);
        }

        onSendMessage(message, fileData);
        setSelectedFile(null);
      }
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage({ id: msg.id, text: msg.text });
    setMessage(msg.text);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessage('');
  };

  const handleReaction = (messageId: string, emoji: string) => {
    onAddReaction?.(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const quickEmojis = ['👍', '❤️', '😂', '🎉', '🤔', '👀'];

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getUserName = (email: string) => {
    return email.split('@')[0];
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Channel Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-lg">
        <div className="flex items-center space-x-2">
          <Hash className="w-5 h-5 text-white/60" />
          <h2 className="text-lg font-semibold text-white">{channelName}</h2>
        </div>
        {typingUsers.length > 0 && (
          <div className="text-sm text-white/60 mt-1">
            {typingUsers.map(u => getUserName(u)).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* User info */}
                  {!isOwn && (
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {getUserName(msg.userEmail).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-white/60">{getUserName(msg.userEmail)}</span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`relative px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                    {/* File attachment */}
                    {msg.file && (
                      <div className="mt-2">
                        {msg.file.mimetype.startsWith('image/') ? (
                          <img
                            src={`${process.env.NODE_ENV === 'production' ? 'https://fluxstudio.art:3003' : 'http://localhost:3003'}${msg.file.url}`}
                            alt={msg.file.originalName}
                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => window.open(`${process.env.NODE_ENV === 'production' ? 'https://fluxstudio.art:3003' : 'http://localhost:3003'}${msg.file.url}`, '_blank')}
                          />
                        ) : (
                          <div
                            className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
                            onClick={() => window.open(`${process.env.NODE_ENV === 'production' ? 'https://fluxstudio.art:3003' : 'http://localhost:3003'}${msg.file.url}`, '_blank')}
                          >
                            <Paperclip className="w-4 h-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.file.originalName}</p>
                              <p className="text-xs text-white/60">{(msg.file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.edited && (
                      <span className="text-xs opacity-60 ml-2">(edited)</span>
                    )}

                    {/* Message actions */}
                    <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 px-2`}>
                      {quickEmojis.slice(0, 3).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}

                      {isOwn && (
                        <>
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-white/60" />
                          </button>
                          <button
                            onClick={() => onDeleteMessage?.(msg.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.reactions.map((reaction, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleReaction(msg.id, reaction.emoji)}
                            className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${
                              reaction.users.includes(user?.id || '')
                                ? 'bg-blue-500/20 border border-blue-500'
                                : 'bg-white/10 border border-white/20'
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className={`text-xs text-white/40 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-white/10 bg-white/5 backdrop-blur-lg">
        {editingMessage && (
          <div className="flex items-center justify-between mb-2 px-3 py-2 bg-yellow-500/20 rounded-lg">
            <span className="text-sm text-yellow-400">Editing message</span>
            <button
              onClick={handleCancelEdit}
              className="text-sm text-white/60 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="mb-2 flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
            <Paperclip className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white">{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={uploading}
          >
            <Paperclip className="w-5 h-5 text-white/60" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message #${channelName}`}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Smile className="w-5 h-5 text-white/60" />
          </button>

          <button
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile) || uploading}
            className={`p-2 rounded-lg transition-colors ${
              (message.trim() || selectedFile) && !uploading
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}