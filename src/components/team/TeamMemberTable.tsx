import { Mail, Edit, Trash2, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TeamMember, roleConfig, statusConfig, formatLastActive, getUtilizationColor } from './teamConfig';

interface TeamMemberTableProps {
  members: TeamMember[];
  currentUser: TeamMember;
  canManageTeam: boolean;
  onViewDetails: (member: TeamMember) => void;
  onResendInvite: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}

export function TeamMemberTable({
  members,
  currentUser,
  canManageTeam,
  onViewDetails,
  onResendInvite,
  onRemoveMember,
}: TeamMemberTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Member
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Workload
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => {
              const roleInfo = roleConfig[member.role];
              const statusInfo = statusConfig[member.status];
              const RoleIcon = roleInfo.icon;
              const StatusIcon = statusInfo.icon;

              return (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium text-sm">
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className={cn(
                      'inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border',
                      roleInfo.color
                    )}>
                      <RoleIcon className="w-3 h-3" aria-hidden="true" />
                      <span>{roleInfo.label}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className={cn('flex items-center space-x-2', statusInfo.color)}>
                      <StatusIcon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-medium">{statusInfo.label}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Utilization:</span>
                        <span className={cn(
                          'font-medium px-2 py-1 rounded-full text-xs',
                          getUtilizationColor(member.workload.utilization)
                        )}>
                          {member.workload.utilization}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {member.workload.activeProjects} active projects
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatLastActive(member.lastActive)}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewDetails(member)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label={`View details for ${member.name}`}
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>

                      {canManageTeam && member.id !== currentUser.id && (
                        <>
                          {member.status === 'pending' && (
                            <button
                              onClick={() => onResendInvite(member.id)}
                              className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                              aria-label="Resend invite"
                            >
                              <Mail className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}

                          <button
                            onClick={() => {/* Handle edit */}}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label={`Edit ${member.name}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            aria-label={`Remove ${member.name}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
