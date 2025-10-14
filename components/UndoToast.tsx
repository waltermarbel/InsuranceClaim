import React, { useState, useEffect, useMemo } from 'react';
// Fix: Added .ts extension to file path
import { UndoableAction } from '../types.ts';
import { InformationCircleIcon, XIcon } from './icons';

interface UndoToastProps {
  action: UndoableAction;
  onUndo: () => void;
  onDismiss: () => void;
}

const UNDO_DURATION = 7000; // 7 seconds

const UndoToast: React.FC<UndoToastProps> = ({ action, onUndo, onDismiss }) => {
  const [timeLeft, setTimeLeft] = useState(UNDO_DURATION);

  useEffect(() => {
    setTimeLeft(UNDO_DURATION); // Reset time on new action
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [action]);

  useEffect(() => {
    const timeout = setTimeout(onDismiss, UNDO_DURATION);
    return () => clearTimeout(timeout);
  }, [action, onDismiss]);

  const message = useMemo(() => {
    if (!action) return '';
    switch (action.type) {
      case 'DELETE_ITEM':
        return `Item "${action.payload.item.itemName}" deleted.`;
      case 'REJECT_SUGGESTION':
        return `Suggestion rejected.`;
      default:
        return 'Action performed.';
    }
  }, [action]);

  if (!action) return null;

  const progressPercentage = (timeLeft / UNDO_DURATION) * 100;

  return (
    <div
      role="alert"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md animate-fade-in-up"
    >
      <div className="bg-dark text-white rounded-lg shadow-2xl p-4 flex items-center space-x-4 relative overflow-hidden">
        <InformationCircleIcon className="h-6 w-6 text-primary-light flex-shrink-0" />
        <div className="flex-grow">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onUndo}
          className="px-3 py-1 text-sm font-bold text-dark bg-secondary rounded-md hover:opacity-90 transition-opacity"
        >
          Undo
        </button>
        <button onClick={onDismiss} className="text-slate-400 hover:text-white">
          <XIcon className="h-5 w-5" />
        </button>
        <div className="absolute bottom-0 left-0 h-1 bg-primary-light/50" style={{ width: `${progressPercentage}%`, transition: 'width 0.1s linear' }}></div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UndoToast;