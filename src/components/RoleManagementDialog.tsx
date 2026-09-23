import React from 'react';
import { UserRole, UserProfile } from '../types.ts';
import { Crown, Shield, User, Check, X } from 'lucide-react';

interface RoleManagementDialogProps {
  isOpen: boolean;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSelectUser?: (user: UserProfile) => void;
  onClose: () => void;
}

export const RoleManagementDialog: React.FC<RoleManagementDialogProps> = ({
  isOpen,
  currentUser,
  availableUsers,
  onSelectUser,
  onClose,
}) => {
  if (!isOpen) return null;

  const getRoleDetails = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          title: 'Super Admin',
          icon: Crown,
          badgeColor: 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/30',
          permissions: 'Full tactical control: User account management, playbook editing, role assignments, system-wide administration.',
        };
      case 'HEAD_COACH':
        return {
          title: 'Head Coach',
          icon: Crown,
          badgeColor: 'text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/30',
          permissions: 'Full tactical control: AI drill generation, playbook editing, fast adjustments, team assignments.',
        };
      case 'ASSISTANT_COACH':
        return {
          title: 'Assistant Coach',
          icon: Shield,
          badgeColor: 'text-[#00E676] bg-[#00E676]/10 border-[#00E676]/30',
          permissions: 'Collaborative control: Telestrator drawing, pinning tactical notes, drill playback, voice feedback.',
        };
      case 'CLIENT':
        return {
          title: 'Tactical Client',
          icon: User,
          badgeColor: 'text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/30',
          permissions: 'Personal training builder: Clean slate dashboard with contextual AI suggestions to craft drill plans.',
        };
      case 'PLAYER':
        return {
          title: 'Player (Squad Member)',
          icon: User,
          badgeColor: 'text-[#FF6E40] bg-[#FF6E40]/10 border-[#FF6E40]/30',
          permissions: 'Tactical study mode: 60fps playback, personal movement highlights, coaching cue checklist.',
        };
    }
  };

  return (
    <div
      id="role-management-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="role-management-dialog-card"
        className="w-full max-w-md bg-[#0D1826] border border-[#1F334A] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white"
      >
        <div className="flex items-center justify-between border-b border-[#1A2C40] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Your account</h3>
            <p className="text-xs text-gray-400">
              Your role and what it allows. Roles are assigned by a super administrator.
            </p>
          </div>
          <button
            id="role-dialog-close-btn"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1A2C40]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {availableUsers.map((user) => {
            const isSelected = user.id === currentUser.id;
            const details = getRoleDetails(user.role);
            const Icon = details.icon;

            return (
              <div
                key={user.id}
                id={`role-card-${user.id}`}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#15273C] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'bg-[#101D2D] border-[#1C2F45] hover:border-[#2C4666]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#0A131F] flex-shrink-0"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{user.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${details.badgeColor} flex items-center gap-1`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{details.title}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{user.team}</p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      {details.permissions}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#00E5FF] text-[#0A131F] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
