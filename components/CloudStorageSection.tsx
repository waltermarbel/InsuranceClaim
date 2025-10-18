import React from 'react';
import { PlusIcon, CubeIcon } from './icons'; // Assuming CubeIcon can represent Google Drive/Cloud

interface CloudStorageSectionProps {
  isConnected: boolean;
  onConnect: () => void;
  onAddFromCloud: () => void;
}

export const CloudStorageSection: React.FC<CloudStorageSectionProps> = ({ isConnected, onConnect, onAddFromCloud }) => {
  return (
    <div className="mb-10">
      <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2 mb-4">
        <CubeIcon className="h-6 w-6 text-medium"/>
        Cloud Storage
      </h3>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-center">
            <div>
                <h4 className="font-bold text-dark font-heading">
                    {isConnected ? "Connected to Google Cloud" : "Connect Your Cloud Storage"}
                </h4>
                <p className="text-sm text-medium mt-1">
                    {isConnected 
                        ? "You can now add placeholder proofs directly from your cloud." 
                        : "Link your Google Drive or Dropbox to create inventory items from existing proofs."
                    }
                </p>
            </div>
            <div className="mt-4 sm:mt-0 flex-shrink-0">
                {!isConnected ? (
                    <button 
                        onClick={onConnect}
                        className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                    >
                        Connect to Google
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-success">Connected</span>
                        <button 
                            onClick={onAddFromCloud}
                            className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                        >
                            <PlusIcon className="h-5 w-5"/>
                            <span>Add from Cloud</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};