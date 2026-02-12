/**
 * Helper sub-components for ChatMessageBubble
 * Extracted from the original monolithic ChatMessageBubble.tsx
 */

import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Download,
  File,
  Play,
  Pause,
  Volume2,
  Maximize2,
} from 'lucide-react';
import type { MessageUser, MessageAttachment, LinkPreview, ReactionCount } from '../types';
import { getInitials } from '../utils';

// ============================================================================
// MessageStatusIcon
// ============================================================================

export const MessageStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'sent':
      return <Check className="w-3.5 h-3.5 text-white/70" />;
    case 'delivered':
      return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;
    case 'read':
      return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-white/50" />;
    case 'failed':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return null;
  }
};

// ============================================================================
// ChatAvatar
// ============================================================================

export const ChatAvatar: React.FC<{
  user: MessageUser;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden`}
      title={user.name}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
          {getInitials(user.name)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LinkPreviewCard
// ============================================================================

export const LinkPreviewCard: React.FC<{ preview: LinkPreview }> = ({ preview }) => (
  <a
    href={preview.url}
    target="_blank"
    rel="noopener noreferrer"
    className="block mt-2 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
  >
    {'image' in preview && (preview as { image?: string }).image && (
      <img src={(preview as { image: string }).image} alt="" className="w-full h-32 object-cover" />
    )}
    <div className="p-3">
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
        {preview.title}
      </p>
      {preview.description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
          {preview.description}
        </p>
      )}
      <p className="text-[10px] text-neutral-400 mt-1">{'domain' in preview ? (preview as { domain: string }).domain : preview.url}</p>
    </div>
  </a>
);

// ============================================================================
// AttachmentPreview
// ============================================================================

export const AttachmentPreview: React.FC<{
  attachment: MessageAttachment;
  onView: () => void;
  onDownload: () => void;
}> = ({ attachment, onView, onDownload }) => {
  if (attachment.type === 'image') {
    return (
      <div className="mt-2 relative group/attach">
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.name}
          className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onView}
        />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/attach:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/20">
      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
        <File className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs opacity-70">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button onClick={onDownload} className="p-2 hover:bg-white/10 rounded-lg">
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// VoiceMessagePlayer
// ============================================================================

interface VoiceMessage {
  url: string;
  duration: number;
  waveform?: number[];
}

export const VoiceMessagePlayer: React.FC<{ voiceMessage: VoiceMessage }> = ({ voiceMessage }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = voiceMessage.duration > 0
    ? (currentTime / voiceMessage.duration) * 100
    : 0;

  return (
    <div className="flex items-center gap-3 py-1">
      <audio
        ref={audioRef}
        src={voiceMessage.url}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onLoadedMetadata={() => {
          if (audioRef.current) audioRef.current.playbackRate = playbackRate;
        }}
      />

      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform visualization */}
        <div className="flex items-end gap-[2px] h-8 mb-1">
          {(voiceMessage.waveform || Array.from({ length: 40 }, () => Math.random())).map(
            (amplitude, i, arr) => {
              const isActive = (i / arr.length) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isActive ? 'bg-white' : 'bg-white/30'
                  }`}
                  style={{ height: `${Math.max(4, amplitude * 32)}px` }}
                />
              );
            }
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] opacity-70">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(voiceMessage.duration)}</span>
        </div>
      </div>

      {/* Playback rate control */}
      <button
        onClick={() => {
          const rates = [1, 1.5, 2];
          const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
          const newRate = rates[nextIdx];
          setPlaybackRate(newRate);
          if (audioRef.current) audioRef.current.playbackRate = newRate;
        }}
        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
      >
        {playbackRate}x
      </button>

      <Volume2 className="w-4 h-4 opacity-50 flex-shrink-0" />
    </div>
  );
};

// ============================================================================
// ReactionBadge
// ============================================================================

export const ReactionBadge: React.FC<{
  reaction: ReactionCount;
  onClick: () => void;
  currentUserId: string;
}> = ({ reaction, onClick, currentUserId }) => {
  const hasReacted = reaction.userIds?.includes(currentUserId);

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
        hasReacted
          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
          : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`}
    >
      <span>{reaction.emoji}</span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  );
};
