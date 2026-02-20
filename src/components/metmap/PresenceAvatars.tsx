/**
 * PresenceAvatars — Shows connected collaborators as avatar chips.
 *
 * Sprint 31: Avatar strip with colored rings, idle detection, overflow count.
 */

import React from 'react';
import type { MetMapPresence } from '../../services/metmapCollaboration';
import { isPeerIdle } from '../../hooks/useMetMapPresence';

interface PresenceAvatarsProps {
  peers: MetMapPresence[];
  currentUserId: string;
  maxVisible?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const PresenceAvatars = React.memo(function PresenceAvatars({
  peers,
  currentUserId,
  maxVisible = 5,
  className = '',
}: PresenceAvatarsProps) {
  if (peers.length === 0) return null;

  // Sort: self first, then active, then idle
  const sorted = [...peers].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    const aIdle = isPeerIdle(a);
    const bIdle = isPeerIdle(b);
    if (aIdle && !bIdle) return 1;
    if (!aIdle && bIdle) return -1;
    return 0;
  });

  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - maxVisible;

  return (
    <div className={`flex items-center -space-x-1.5 ${className}`}>
      {visible.map((peer) => {
        const isSelf = peer.userId === currentUserId;
        const idle = isPeerIdle(peer);

        return (
          <div
            key={peer.userId}
            className="relative group"
            title={isSelf ? `${peer.username} (you)` : peer.username}
          >
            {/* Avatar circle with colored ring */}
            <div
              className={`
                w-7 h-7 rounded-full border-2 flex items-center justify-center
                text-[10px] font-medium transition-opacity duration-300
                ${idle ? 'opacity-40' : 'opacity-100'}
              `}
              style={{
                borderColor: peer.color,
                backgroundColor: peer.avatar ? 'transparent' : `${peer.color}20`,
                color: peer.color,
              }}
            >
              {peer.avatar ? (
                <img
                  src={peer.avatar}
                  alt={peer.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(peer.username)
              )}
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-neutral-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {isSelf ? 'You' : peer.username}
              {idle && ' (idle)'}
              {peer.editingSection && !idle && (
                <span className="text-neutral-400"> — editing</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Overflow count */}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-neutral-300 bg-neutral-100 flex items-center justify-center text-[10px] font-medium text-neutral-500">
          +{overflow}
        </div>
      )}
    </div>
  );
});
