import React from 'react';
import { ActivityLogEntry } from '../types';
import { XIcon, CubeIcon } from './icons';

interface ActivityLogViewProps {
  log: ActivityLogEntry[];
  onClose: () => void;
}

const ActivityLogView: React.FC<ActivityLogViewProps> = ({ log, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
          <h2 className="text-xl font-bold text-dark font-heading">Activity Log</h2>
          <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-center py-12 text-medium">
              <p>No activity has been logged yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {[...log].reverse().map(entry => (
                <li key={entry.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-slate-100 rounded-full p-2 mt-1">
                    <CubeIcon className="h-5 w-5 text-medium" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dark capitalize">{entry.action.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-medium">{entry.details}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(entry.timestamp).toLocaleString()} - {entry.app}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogView;
