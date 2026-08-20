import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActivityLogEntry } from '../types.ts';
import { DocumentMagnifyingGlassIcon, SparklesIcon, CubeIcon, ExclamationTriangleIcon, CheckCircleIcon } from './icons.tsx';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { runAuditorAnalysis } from '../services/geminiService.ts';

interface AuditLogPageProps {
    activityLog: ActivityLogEntry[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ activityLog }) => {
    const { claims, inventory, accountHolder } = useAppState();
    const dispatch = useAppDispatch();
    
    const [activeTab, setActiveTab] = useState<'ledger' | 'auditor'>('auditor');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [actorFilter, setActorFilter] = useState<'all' | 'Assert' | 'Gemini'>('all');
    
    const [analysisResult, setAnalysisResult] = useState<{
         priceWarnings: { id: string, title: string, finding: string, type: 'success' | 'warning' }[],
         lifestyleWarnings: { id: string, title: string, finding: string, suggestion: string, type: 'warning' }[]
    } | null>(null);

    // Sort log entries newest first and apply filter
    const sortedLog = [...activityLog]
        .filter(entry => actorFilter === 'all' || entry.app === actorFilter)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            // Aggregate timeline events from claims
            let timelineEvents: any[] = [];
            claims.forEach(c => {
                if (c.incidentDetails?.timelineEvents) {
                    timelineEvents = timelineEvents.concat(c.incidentDetails.timelineEvents);
                }
            });
            const result = await runAuditorAnalysis(claims, inventory, accountHolder, timelineEvents);
            setAnalysisResult(result);
            
            // OPTIMIZATION: Replacing .filter().length with a simple reduce to avoid O(N) array allocation overhead
            const totalWarnings = result.priceWarnings.reduce((acc, w) => acc + (w.type === 'warning' ? 1 : 0), 0) + result.lifestyleWarnings.length;
            dispatch({
                type: 'LOG_ACTIVITY',
                payload: {
                    action: 'AI_AUDIT_RUN',
                    details: `System Auditor completed full review. Found ${totalWarnings} warnings.`,
                    reasonForChange: 'Background Validation',
                    app: 'Gemini'
                }
            });
            
        } catch(e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
         if (activeTab === 'auditor' && !analysisResult && !isAnalyzing) {
              runAnalysis();
         }
    }, [activeTab]);

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 h-full flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-3">
                        <DocumentMagnifyingGlassIcon className="h-8 w-8 text-rose-600" />
                        The Auditor
                    </h1>
                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                        AI Validation Engine and Immutable System Ledger.
                    </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setActiveTab('auditor')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'auditor' ? 'bg-white shadow text-rose-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <SparklesIcon className="h-4 w-4"/> AI Validation Engine
                    </button>
                    <button 
                        onClick={() => setActiveTab('ledger')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === 'ledger' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <DocumentMagnifyingGlassIcon className="h-4 w-4"/> System Ledger
                    </button>
                </div>
            </div>

            {activeTab === 'auditor' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                     <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 mb-6 flex justify-between items-center shrink-0">
                          <div>
                               <h3 className="font-bold flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5"/> Background Analysis Active</h3>
                               <p className="text-sm opacity-90">The Auditor constantly analyzes your entire claim file for weaknesses, price realism, and lifestyle coherence.</p>
                          </div>
                          <button 
                              onClick={runAnalysis} disabled={isAnalyzing}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                               {isAnalyzing ? <span className="animate-spin text-lg leading-none">⟳</span> : 'Run Full Audit'}
                          </button>
                     </div>

                     <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2">
                          <section>
                                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Price Realism Evaluation</h2>
                                {isAnalyzing ? (
                                    <div className="p-8 text-center text-slate-400 border border-slate-200 border-dashed rounded-xl"><SparklesIcon className="h-6 w-6 mx-auto mb-2 animate-pulse"/> Auditing Expenses...</div>
                                ) : analysisResult?.priceWarnings.length === 0 ? (
                                    <div className="p-4 bg-slate-50 text-slate-500 rounded-xl">No expenses found to audit.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {analysisResult?.priceWarnings.map((warning) => (
                                              <div key={warning.id} className={`p-5 rounded-xl border shadow-sm ${warning.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                                   <div className="flex items-start gap-3">
                                                        {warning.type === 'warning' ? <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mt-0.5 shrink-0"/> : <CheckCircleIcon className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0"/>}
                                                        <div>
                                                            <h4 className={`font-bold ${warning.type === 'warning' ? 'text-orange-800' : 'text-emerald-800'}`}>{warning.title}</h4>
                                                            <p className={`text-sm mt-1 ${warning.type === 'warning' ? 'text-orange-700' : 'text-emerald-700'}`}>{warning.finding}</p>
                                                        </div>
                                                   </div>
                                              </div>
                                         ))}
                                    </div>
                                )}
                          </section>

                          <section>
                                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Lifestyle Coherence Check</h2>
                                {isAnalyzing ? (
                                    <div className="p-8 text-center text-slate-400 border border-slate-200 border-dashed rounded-xl"><SparklesIcon className="h-6 w-6 mx-auto mb-2 animate-pulse"/> Profiling Assets...</div>
                                ) : analysisResult?.lifestyleWarnings.length === 0 ? (
                                    <div className="p-4 bg-slate-50 text-slate-500 rounded-xl">No lifestyle anomalies detected.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {analysisResult?.lifestyleWarnings.map((warning) => (
                                              <div key={warning.id} className="p-5 rounded-xl border border-rose-200 bg-white shadow-sm hover:shadow-md transition">
                                                   <div className="flex items-start gap-3">
                                                        <DocumentMagnifyingGlassIcon className="h-5 w-5 text-rose-500 mt-0.5 shrink-0"/>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800">{warning.title}</h4>
                                                            <p className="text-sm text-slate-600 mt-1"><strong className="text-rose-600">Detected:</strong> {warning.finding}</p>
                                                            <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-800 italic">
                                                                <span className="font-bold uppercase tracking-wider text-[10px] text-rose-500 not-italic block mb-1">Auditor Suggestion</span>
                                                                "{warning.suggestion}"
                                                            </div>
                                                        </div>
                                                   </div>
                                              </div>
                                         ))}
                                    </div>
                                )}
                          </section>
                     </div>
                </div>
            )}

            {activeTab === 'ledger' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="border-b border-slate-100 p-4 shrink-0 flex justify-end">
                    <select 
                        value={actorFilter} 
                        onChange={(e) => setActorFilter(e.target.value as any)}
                        className="text-sm form-select px-3 py-1.5 border-slate-200 rounded-lg cursor-pointer bg-slate-50 text-slate-700 font-medium"
                    >
                        <option value="all">All Actors</option>
                        <option value="Assert">System / User</option>
                        <option value="Gemini">AI Validation (Gemini)</option>
                    </select>
                </div>
                {sortedLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 flex-1">
                        <DocumentMagnifyingGlassIcon className="h-12 w-12 mb-4 text-slate-300" />
                        <p>No activity recorded yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Action Type</th>
                                    <th className="px-6 py-4">System / Actor</th>
                                    <th className="px-6 py-4 w-1/3">Details</th>
                                    <th className="px-6 py-4 w-1/4">Reason for Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence>
                                    {sortedLog.map((entry) => (
                                        <motion.tr 
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700">
                                                    {entry.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {entry.app === 'Gemini' ? (
                                                        <><SparklesIcon className="h-4 w-4 text-indigo-600" /><span className="font-medium text-indigo-700">Gemini AI</span></>
                                                    ) : (
                                                        <><CubeIcon className="h-4 w-4 text-slate-600" /><span className="font-medium text-slate-700">User / Vault</span></>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.details}
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.reasonForChange ? (
                                                    <span className="text-slate-700">{entry.reasonForChange}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">System Auto-Generated</span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default AuditLogPage;
