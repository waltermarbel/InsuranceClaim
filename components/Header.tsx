
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CubeIcon, SparklesIcon, ClipboardDocumentListIcon, FolderIcon, ShieldCheckIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, DocumentTextIcon, DocumentMagnifyingGlassIcon, ClockIcon, BriefcaseIcon } from './icons.tsx';
import { useSyncStatus, useUndoRedo } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { SyncStatusIndicator } from './SyncStatusIndicator.tsx';
import SystemVisionModal from './SystemVisionModal.tsx';

interface HeaderProps {
    activeTab: 'evidence' | 'timeline' | 'collaborators' | 'inventory' | 'claim' | 'policy-ingestor' | 'simulation' | 'audit' | 'scribe' | 'policy-comparison';
    onNavigate: (tab: 'evidence' | 'timeline' | 'collaborators' | 'inventory' | 'claim' | 'policy-ingestor' | 'simulation' | 'audit' | 'scribe' | 'policy-comparison') => void;
    onAskGemini: () => void;
    searchTerm?: string;
    onSearchTermChange?: (term: string) => void;
}

export const Header = React.memo<HeaderProps>(({ 
    activeTab,
    onNavigate,
    onAskGemini,
    searchTerm = '',
    onSearchTermChange
}) => {
  const syncStatus = useSyncStatus();
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { signOut } = useAuth();
  const [showVision, setShowVision] = useState(false);
  
  const getTabClass = (tabName: string) => {
      const baseClass = "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200";
      if (activeTab === tabName) {
          return `${baseClass} bg-indigo-50 text-indigo-700 shadow-sm`;
      }
      return `${baseClass} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
  };

  return (
    <>
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-3 items-center h-20 py-3 relative z-10 bg-white/80 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-200/50 my-2">
          {/* Logo Area (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-3 cursor-pointer group justify-self-start" 
            onClick={() => onNavigate('inventory')}
          >
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-0.5">
                <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
                <span className="block text-xl font-bold text-slate-900 tracking-tight font-heading leading-none">
                Assert
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">
                Strategic Claims
                </span>
            </div>
          </motion.div>

          {/* Main Workflow Navigation (Center) */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden xl:flex items-center space-x-1 justify-self-center bg-slate-100/80 backdrop-blur-sm border border-slate-200/60 p-1.5 rounded-full shadow-inner"
          >
            <button onClick={() => onNavigate('evidence')} className={getTabClass('evidence')}>
                <span>Vault</span>
            </button>
            <button onClick={() => onNavigate('timeline')} className={getTabClass('timeline')}>
                <span>Timeline</span>
            </button>
            <button onClick={() => onNavigate('collaborators')} className={getTabClass('collaborators')}>
                <span>Persons</span>
            </button>
            <button onClick={() => onNavigate('inventory')} className={getTabClass('inventory')}>
                <span>Schedule</span>
            </button>
            <button onClick={() => onNavigate('claim')} className={getTabClass('claim')}>
                <span>Arbitrage</span>
            </button>
            <button onClick={() => onNavigate('policy-ingestor')} className={getTabClass('policy-ingestor')}>
                <span>Ingestor</span>
            </button>
            <button onClick={() => onNavigate('policy-comparison')} className={getTabClass('policy-comparison')}>
                <span>Compare Policies</span>
            </button>
            <button onClick={() => onNavigate('simulation')} className={getTabClass('simulation')}>
                <span>Simulations</span>
            </button>
          </motion.nav>

          {/* Actions (Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4 justify-self-end"
          >
             {/* Global Search */}
             <div className="relative group hidden lg:block w-48">
                 <input
                     type="text"
                     placeholder="Search..."
                     value={searchTerm}
                     onChange={(e) => {
                         if (onSearchTermChange) onSearchTermChange(e.target.value);
                         if (activeTab !== 'inventory') onNavigate('inventory');
                     }}
                     className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-full focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all outline-none text-slate-700 placeholder-slate-400"
                 />
                 <DocumentMagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" />
             </div>

             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

             <div className="flex items-center gap-1">
                 <button
                    onClick={undo}
                    disabled={!canUndo}
                    className={`p-2 rounded-full transition-all duration-200 ${canUndo ? 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer' : 'text-slate-300 opacity-40 cursor-not-allowed bg-slate-50 grayscale'}`}
                    title="Undo"
                 >
                    <ArrowUturnLeftIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={redo}
                    disabled={!canRedo}
                    className={`p-2 rounded-full transition-all duration-200 ${canRedo ? 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer' : 'text-slate-300 opacity-40 cursor-not-allowed bg-slate-50 grayscale'}`}
                    title="Redo"
                 >
                    <ArrowUturnRightIcon className="h-5 w-5"/>
                 </button>
                 <button
                    onClick={() => setShowVision(true)}
                    className="p-2 rounded-full transition-colors text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    title="System Vision & Evolution"
                 >
                    <DocumentTextIcon className="h-5 w-5"/>
                 </button>
             </div>

             {/* Sync Indicator */}
             <div className="hidden sm:block mr-2">
                <SyncStatusIndicator status={syncStatus || 'idle'} />
             </div>
             
             <button
                onClick={onAskGemini}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow hover:shadow-md hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
             >
                <SparklesIcon className="h-4 w-4 transition-transform group-hover:scale-110"/>
                <span className="hidden sm:inline">AI Assistant</span>
            </button>

            <button
                onClick={signOut}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
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
            className="xl:hidden flex flex-wrap justify-center gap-2 py-3 border-t border-slate-100"
        >
             <button onClick={() => onNavigate('evidence')} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'evidence' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                Vault
             </button>
             <button onClick={() => onNavigate('timeline')} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'timeline' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                Timeline
             </button>
             <button onClick={() => onNavigate('collaborators')} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'collaborators' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                Persons
             </button>
             <button onClick={() => onNavigate('inventory')} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'inventory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                Schedule
             </button>
             <button onClick={() => onNavigate('claim')} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'claim' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                Arbitrage
             </button>
        </motion.div>
      </div>
    </header>
    {showVision && <SystemVisionModal onClose={() => setShowVision(false)} />}
    </>
  );
});
