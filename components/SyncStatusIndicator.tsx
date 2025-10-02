import React from 'react';
import { SyncStatus } from '../types';
import { SpinnerIcon, CloudArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon } from './icons';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  onSync: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ status, onSync }) => {
  const statusConfig = {
    idle: {
      Icon: CloudArrowUpIcon,
      text: 'Sync Now',
      color: 'text-medium hover:text-primary',
      action: onSync,
    },
    syncing: {
      Icon: SpinnerIcon,
      text: 'Syncing...',
      color: 'text-primary',
      action: () => {},
    },
    synced: {
      Icon: CheckCircleIcon,
      text: 'All changes saved',
      color: 'text-success',
      action: () => {},
    },
    error: {
      Icon: ExclamationCircleIcon,
      text: 'Sync Failed',
      color: 'text-danger',
      action: onSync,
    },
  };

  const { Icon, text, color, action } = statusConfig[status];

  return (
    <button
      onClick={action}
      disabled={status === 'syncing' || status === 'synced'}
      className={`flex items-center space-x-2 text-sm font-medium transition-colors disabled:cursor-default ${color}`}
    >
      <Icon className="h-5 w-5" />
      <span>{text}</span>
    </button>
  );
};
