/**
 * MobileContextMenu - Floating context menu shown on long-press of a performer
 */

import React, { useEffect, useRef } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';

export interface MobileContextMenuProps {
  isOpen: boolean;
  /** Viewport position (px) where the menu should appear */
  position: { x: number; y: number };
  /** The performer targeted by the long-press */
  performer: { id: string; name: string } | null;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const MobileContextMenu: React.FC<MobileContextMenuProps> = ({
  isOpen,
  position,
  performer,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Dismiss on tap/click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use a timeout so the triggering long-press event doesn't immediately close the menu
    const id = setTimeout(() => {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }, 0);

    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, onClose]);

  // Keep menu within viewport bounds
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (rect.right > vw) adjustedX = vw - rect.width - 8;
    if (rect.bottom > vh) adjustedY = vh - rect.height - 8;
    if (adjustedX < 8) adjustedX = 8;
    if (adjustedY < 8) adjustedY = 8;

    if (adjustedX !== position.x || adjustedY !== position.y) {
      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [isOpen, position]);

  if (!isOpen || !performer) return null;

  const actions = [
    { label: 'Edit', icon: Pencil, action: () => { onEdit(performer.id); onClose(); } },
    { label: 'Duplicate', icon: Copy, action: () => { onDuplicate(performer.id); onClose(); } },
    { label: 'Delete', icon: Trash2, action: () => { onDelete(performer.id); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${performer.name}`}
      className="fixed z-50 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 truncate border-b border-gray-100 dark:border-gray-700">
        {performer.name}
      </div>
      {actions.map(({ label, icon: Icon, action, danger }) => (
        <button
          key={label}
          role="menuitem"
          onClick={action}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${
            danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
};
