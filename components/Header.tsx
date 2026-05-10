
import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CubeIcon, SparklesIcon, ClipboardDocumentListIcon, FolderIcon, ShieldCheckIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, DocumentTextIcon, DocumentMagnifyingGlassIcon, ClockIcon, BriefcaseIcon } from './icons.tsx';
import { useAppState, useSyncStatus, useUndoRedo } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SyncStatusIndicator } from './SyncStatusIndicator.tsx';
import SystemVisionModal from './SystemVisionModal.tsx';

interface HeaderProps {
    activeTab: 'evidence' | 'timeline' | 'collaborators' | 'inventory' | 'claim' | 'policy-ingestor' | 'simulation' | 'audit' | 'scribe';
    onNavigate: (tab: 'evidence' | 'timeline' | 'collaborators' | 'inventory' | 'claim' | 'policy-ingestor' | 'simulation' | 'audit' | 'scribe') => void;
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
  
  const getTabClass = (tabName: string) => {
      const baseClass = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200";
      if (activeTab === tabName) {
          return `${baseClass} bg-primary text-white shadow-md ring-1 ring-primary-dark/20`;
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
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
                <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
                <span className="block text-xl font-extrabold text-slate-900 tracking-tight font-heading leading-none">
                Assert
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                Strategic Claims Management
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
                <span>Evidence Vault</span>
            </button>
            <button onClick={() => onNavigate('timeline')} className={getTabClass('timeline')}>
                <ClockIcon className="h-4 w-4"/>
                <span>Timeline</span>
            </button>
            <button onClick={() => onNavigate('collaborators')} className={getTabClass('collaborators')}>
                <BriefcaseIcon className="h-4 w-4"/>
                <span>Collaborators</span>
            </button>
            <button onClick={() => onNavigate('inventory')} className={getTabClass('inventory')}>
                <ClipboardDocumentListIcon className="h-4 w-4"/>
                <span>Schedule of Loss</span>
            </button>
            <button onClick={() => onNavigate('claim')} className={getTabClass('claim')}>
                <ShieldCheckIcon className="h-4 w-4"/>
                <span>Arbitrage Engine</span>
            </button>
            <button onClick={() => onNavigate('policy-ingestor')} className={getTabClass('policy-ingestor')}>
                <DocumentTextIcon className="h-4 w-4"/>
                <span>Policy Ingestor</span>
            </button>
            <button onClick={() => onNavigate('simulation')} className={getTabClass('simulation')}>
                <ShieldCheckIcon className="h-4 w-4"/>
                <span>Simulations</span>
            </button>
            <button onClick={() => onNavigate('audit')} className={getTabClass('audit')}>
                <DocumentMagnifyingGlassIcon className="h-4 w-4"/>
                <span>Audit Log</span>
            </button>
            <button onClick={() => onNavigate('scribe')} className={getTabClass('scribe')}>
                <DocumentTextIcon className="h-4 w-4"/>
                <span>Scribe</span>
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
                    onClick={() => setShowVision(true)}
                    className="p-2 rounded-lg transition-colors text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                    title="System Vision & Evolution"
                 >
                    <DocumentTextIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-600 hover:text-primary hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                    title="Undo"
                 >
                    <ArrowUturnLeftIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-600 hover:text-primary hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                    title="Redo"
                 >
                    <ArrowUturnRightIcon className="h-5 w-5"/>
                 </button>
             </div>
             
             <button
                onClick={onAskGemini}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary bg-white border border-primary/20 rounded-full shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-200 group"
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
             <button onClick={() => onNavigate('evidence')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'evidence' ? 'text-primary' : 'text-slate-400'}`}>
                <FolderIcon className="h-5 w-5"/> Evidence
             </button>
             <button onClick={() => onNavigate('timeline')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'timeline' ? 'text-primary' : 'text-slate-400'}`}>
                <ClockIcon className="h-5 w-5"/> Timeline
             </button>
             <button onClick={() => onNavigate('collaborators')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'collaborators' ? 'text-primary' : 'text-slate-400'}`}>
                <BriefcaseIcon className="h-5 w-5"/> Persons
             </button>
             <button onClick={() => onNavigate('inventory')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'inventory' ? 'text-primary' : 'text-slate-400'}`}>
                <ClipboardDocumentListIcon className="h-5 w-5"/> Schedule
             </button>
             <button onClick={() => onNavigate('claim')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'claim' ? 'text-primary' : 'text-slate-400'}`}>
                <ShieldCheckIcon className="h-5 w-5"/> Arbitrage
             </button>
             <button onClick={() => onNavigate('policy-ingestor')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'policy-ingestor' ? 'text-primary' : 'text-slate-400'}`}>
                <DocumentTextIcon className="h-5 w-5"/> Ingestor
             </button>
             <button onClick={() => onNavigate('audit')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'audit' ? 'text-primary' : 'text-slate-400'}`}>
                <DocumentMagnifyingGlassIcon className="h-5 w-5"/> Audit
             </button>
             <button onClick={() => onNavigate('scribe')} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${activeTab === 'scribe' ? 'text-primary' : 'text-slate-400'}`}>
                <DocumentTextIcon className="h-5 w-5"/> Scribe
             </button>
        </motion.div>
      </div>
    </header>
    {showVision && <SystemVisionModal onClose={() => setShowVision(false)} />}
    </>
  );
};
