import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TeamMember, roleConfig } from './teamConfig';

interface MemberDetailsModalProps {
  member: TeamMember;
  onClose: () => void;
}

export function MemberDetailsModal({ member, onClose }: MemberDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Member Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close member details"
          >
            <XCircle className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-xl">
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{member.name}</h4>
              <p className="text-gray-600 dark:text-gray-400">{member.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={cn(
                  'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border',
                  roleConfig[member.role].color
                )}>
                  <span>{roleConfig[member.role].label}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
