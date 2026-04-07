
import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CubeIcon, SparklesIcon, ClipboardDocumentListIcon, FolderIcon, ShieldCheckIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, DocumentTextIcon, TrashIcon, BoltIcon } from './icons.tsx';
import { useAppState, useSyncStatus, useUndoRedo } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SyncStatusIndicator } from './SyncStatusIndicator.tsx';
import SystemVisionModal from './SystemVisionModal.tsx';
import UltimateBlueprintModal from './UltimateBlueprintModal.tsx';
import ResetDataModal from './ResetDataModal.tsx';

interface HeaderProps {
    activeTab: 'evidence' | 'inventory' | 'arbitrage';
    onNavigate: (tab: 'evidence' | 'inventory' | 'arbitrage') => void;
    onAskGemini: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    activeTab,
    onNavigate,
    onAskGemini
}) => {
  const syncStatus = useSyncStatus();
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { signOut } = useAuth();
  const [showVision, setShowVision] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [showReset, setShowReset] = useState(false);
  
  const getTabClass = (tabName: string) => {
      const baseClass = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200";
      if (activeTab === tabName) {
          return `${baseClass} bg-secondary text-white shadow-md ring-1 ring-secondary-dark/20`;
      }
      return `${baseClass} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
  };

  return (
    <>
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-18 py-3">
          {/* Logo Area */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => onNavigate('inventory')}
          >
            <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
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
          </motion.div>

          {/* Main Workflow Navigation */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center space-x-1 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60 backdrop-blur-sm"
          >
            <button onClick={() => onNavigate('evidence')} className={getTabClass('evidence')}>
                <FolderIcon className="h-4 w-4"/>
                <span>Evidence Locker</span>
            </button>
            <button onClick={() => onNavigate('inventory')} className={getTabClass('inventory')}>
                <ClipboardDocumentListIcon className="h-4 w-4"/>
                <span>Substitution Pool</span>
            </button>
            <button onClick={() => onNavigate('arbitrage')} className={getTabClass('arbitrage')}>
                <BoltIcon className="h-4 w-4"/>
                <span>Arbitrage Engine</span>
            </button>
          </motion.nav>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4"
          >
             {/* Sync Indicator */}
             <div className="hidden sm:block">
                <SyncStatusIndicator status={syncStatus || 'idle'} />
             </div>

             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

             <div className="flex items-center gap-1">
                 <button
                    onClick={() => setShowReset(true)}
                    className="p-2 rounded-lg transition-colors text-slate-600 hover:text-red-600 hover:bg-red-50"
                    title="Reset App Data"
                 >
                    <TrashIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={() => setShowBlueprint(true)}
                    className="p-2 rounded-lg transition-colors text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                    title="Ultimate Master Blueprint"
                 >
                    <ClipboardDocumentListIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={() => setShowVision(true)}
                    className="p-2 rounded-lg transition-colors text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                    title="System Vision & Evolution"
                 >
                    <DocumentTextIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-600 hover:text-secondary hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                    title="Undo"
                 >
                    <ArrowUturnLeftIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-600 hover:text-secondary hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                    title="Redo"
                 >
                    <ArrowUturnRightIcon className="h-5 w-5"/>
                 </button>
             </div>
             
             <button
                onClick={onAskGemini}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-secondary rounded-full shadow-sm hover:shadow-glow hover:bg-secondary-light transition-all duration-200 group"
             >
                <SparklesIcon className="h-4 w-4 transition-transform group-hover:scale-110"/>
                <span className="hidden sm:inline">AI Assistant</span>
            </button>

            <button
                onClick={signOut}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
                Sign Out
            </button>
          </motion.div>
        </div>
        
        {/* Mobile Nav (Simplified) */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:hidden flex justify-around py-3 border-t border-slate-100"
        >
             <button onClick={() => onNavigate('evidence')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'evidence' ? 'text-secondary' : 'text-slate-400'}`}>
                <FolderIcon className="h-5 w-5"/> Evidence
             </button>
             <button onClick={() => onNavigate('inventory')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'inventory' ? 'text-secondary' : 'text-slate-400'}`}>
                <ClipboardDocumentListIcon className="h-5 w-5"/> Pool
             </button>
             <button onClick={() => onNavigate('arbitrage')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'arbitrage' ? 'text-secondary' : 'text-slate-400'}`}>
                <BoltIcon className="h-5 w-5"/> Arbitrage
             </button>
        </motion.div>
      </div>
    </header>
    {showVision && <SystemVisionModal onClose={() => setShowVision(false)} />}
    {showBlueprint && <UltimateBlueprintModal onClose={() => setShowBlueprint(false)} />}
    {showReset && <ResetDataModal onClose={() => setShowReset(false)} />}
    </>
  );
};
