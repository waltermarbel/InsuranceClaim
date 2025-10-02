import React from 'react';
import { CubeIcon, QueueListIcon } from './icons';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncStatus } from '../types';

interface HeaderProps {
    onReset: () => void;
    onShowGuide: () => void;
    onShowLog: () => void;
    onSync: () => void;
    syncStatus: SyncStatus;
}

export const Header: React.FC<HeaderProps> = ({ onReset, onShowGuide, onShowLog, onSync, syncStatus }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
            <CubeIcon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-dark tracking-tight font-heading">
              VeritasVault
            </span>
          </div>
          <div className="flex items-center space-x-4">
             <SyncStatusIndicator status={syncStatus} onSync={onSync} />
             <button
                onClick={onShowLog}
                className="flex items-center space-x-2 text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                <QueueListIcon className="h-5 w-5" />
                <span>Log</span>
              </button>
             <button
                onClick={onShowGuide}
                className="text-sm font-medium text-medium hover:text-primary transition-colors"
              >
                Claim Guide
              </button>
            <button
              onClick={onReset}
              className="text-sm font-medium text-medium hover:text-primary transition-colors"
            >
              New Inventory
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
