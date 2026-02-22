
import React, { useRef } from 'react';
import { CubeIcon, SparklesIcon, ClipboardDocumentListIcon, FolderIcon, ShieldCheckIcon, ArrowDownTrayIcon } from './icons.tsx';
import { useAppState, useSyncStatus } from '../context/AppContext.tsx';
import { SyncStatusIndicator } from './SyncStatusIndicator.tsx';

interface HeaderProps {
    activeTab: 'evidence' | 'inventory' | 'claim';
    onNavigate: (tab: 'evidence' | 'inventory' | 'claim') => void;
    onAskGemini: () => void;
    onSave: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    activeTab,
    onNavigate,
    onAskGemini,
    onSave
}) => {
  const syncStatus = useSyncStatus();
  
  const getTabClass = (tabName: string) => {
      const baseClass = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200";
      if (activeTab === tabName) {
          return `${baseClass} bg-primary text-white shadow-md ring-1 ring-primary-dark/20`;
      }
      return `${baseClass} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-18 py-3">
          {/* Logo Area */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onNavigate('inventory')}>
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
                <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
                <span className="block text-xl font-extrabold text-slate-900 tracking-tight font-heading leading-none">
                VeritasVault
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                Forensic Claim System
                </span>
            </div>
          </div>

          {/* Main Workflow Navigation */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60 backdrop-blur-sm">
            <button onClick={() => onNavigate('evidence')} className={getTabClass('evidence')}>
                <FolderIcon className="h-4 w-4"/>
                <span>Evidence Locker</span>
            </button>
            <button onClick={() => onNavigate('inventory')} className={getTabClass('inventory')}>
                <ClipboardDocumentListIcon className="h-4 w-4"/>
                <span>Schedule of Loss</span>
            </button>
            <button onClick={() => onNavigate('claim')} className={getTabClass('claim')}>
                <ShieldCheckIcon className="h-4 w-4"/>
                <span>Claim Strategy</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
             {/* Sync Indicator */}
             <div className="hidden sm:block">
                <SyncStatusIndicator status={syncStatus || 'idle'} />
             </div>

             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

             <button
                onClick={onSave}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                title="Save & Export"
             >
                <ArrowDownTrayIcon className="h-5 w-5"/>
                <span className="hidden sm:inline">Export</span>
             </button>
             
             <button
                onClick={onAskGemini}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary bg-white border border-primary/20 rounded-full shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-200 group"
             >
                <SparklesIcon className="h-4 w-4 transition-transform group-hover:scale-110"/>
                <span className="hidden sm:inline">AI Assistant</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Nav (Simplified) */}
        <div className="md:hidden flex justify-around py-3 border-t border-slate-100">
             <button onClick={() => onNavigate('evidence')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'evidence' ? 'text-primary' : 'text-slate-400'}`}>
                <FolderIcon className="h-5 w-5"/> Evidence
             </button>
             <button onClick={() => onNavigate('inventory')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'inventory' ? 'text-primary' : 'text-slate-400'}`}>
                <ClipboardDocumentListIcon className="h-5 w-5"/> Schedule
             </button>
             <button onClick={() => onNavigate('claim')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'claim' ? 'text-primary' : 'text-slate-400'}`}>
                <ShieldCheckIcon className="h-5 w-5"/> Strategy
             </button>
        </div>
      </div>
    </header>
  );
};
