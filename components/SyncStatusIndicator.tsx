
import React from 'react';
import { SyncStatus } from '../types.ts';
import { SpinnerIcon, CloudArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon } from './icons.tsx';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ status }) => {
  const statusConfig = {
    idle: {
      Icon: CloudArrowUpIcon,
      text: 'Saved',
      color: 'text-slate-400',
    },
    syncing: {
      Icon: SpinnerIcon,
      text: 'Saving...',
      color: 'text-primary',
    },
    synced: {
      Icon: CheckCircleIcon,
      text: 'Synced',
      color: 'text-emerald-500',
    },
    error: {
      Icon: ExclamationCircleIcon,
      text: 'Sync Error',
      color: 'text-rose-500',
    },
  };

  // Default to idle if status is undefined
  const { Icon, text, color } = statusConfig[status || 'idle'];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors duration-300 ${color}`} title="Data Persistence Status">
      <Icon className={`h-3.5 w-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
};
