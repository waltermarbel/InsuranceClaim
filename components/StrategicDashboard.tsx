
import React, { useState, useCallback, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, ParsedPolicy, OptimalPolicyResult } from '../types.ts';
import { SpinnerIcon, WrenchScrewdriverIcon, CheckCircleIcon, SparklesIcon, InformationCircleIcon, BriefcaseIcon, ShieldCheckIcon, DocumentTextIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import ClaimReportGenerator from './ClaimReportGenerator.tsx';

const StrategicDashboard: React.FC = () => {
    const { inventory, policies, claimDetails } = useAppState();
    const dispatch = useAppDispatch();
    
    const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimalPolicyResult | { error: string }>>({});
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [selectedItemForNarrative, setSelectedItemForNarrative] = useState<InventoryItem | null>(null);
    const [optimizedNarrative, setOptimizedNarrative] = useState<string>('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    const [showReportGenerator, setShowReportGenerator] = useState(false);

    const claimedItems = useMemo(() => inventory.filter(item => item.status === 'claimed'), [inventory]);
    const activePolicy = useMemo(() => policies.find(p => p.isActive), [policies]);

    const handleFindOptimalPolicy = useCallback(async (item: InventoryItem) => {
        setLoadingItemId(item.id);
        try {
            const result = await geminiService.findOptimalPolicyForItem(item, policies);
            setOptimizationResults(prev => ({ ...prev, [item.id]: result }));
        } catch (error) {
            console.error(error);
            setOptimizationResults(prev => ({ ...prev, [item.id]: { error: error instanceof Error ? error.message : 'Failed to analyze' } }));
        } finally {
            setLoadingItemId(null);
        }
    }, [policies]);
    
    const handleGenerateNarrative = useCallback(async () => {
        if (!selectedItemForNarrative || !activePolicy) return;
        setIsNarrativeLoading(true);
        setOptimizedNarrative('');
        try {
            const result = await geminiService.generateOptimizedNarrative(selectedItemForNarrative, activePolicy, claimDetails);
            setOptimizedNarrative(result);
        } catch (error) {
            console.error(error);
            setOptimizedNarrative("Error: Could not generate an optimized narrative.");
        } finally {
            setIsNarrativeLoading(false);
        }
    }, [selectedItemForNarrative, activePolicy, claimDetails]);

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20">
            <div className="text-center mb-16 pt-8 relative">
                <div className="inline-flex p-4 rounded-full bg-primary/5 mb-6">
                    <BriefcaseIcon className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-heading">Strategic Claim Optimizer</h1>
                <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    AI-driven insights to maximize your payout and ensure policy compliance.
                </p>
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={() => setShowReportGenerator(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 shadow-md transition-all active:scale-95"
                    >
                        <DocumentTextIcon className="h-4 w-4 text-amber-400" />
                        Generate Official Claim Packet
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Claim Routing Advisor */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                         <div className="bg-blue-100 p-2 rounded-lg">
                            <ShieldCheckIcon className="h-6 w-6 text-blue-600"/>
                         </div>
                         <h2 className="text-2xl font-bold text-slate-800 font-heading">Policy Routing Advisor</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {claimedItems.length === 0 && (
                            <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center">
                                <p className="text-slate-400 font-medium">No items marked as 'Claimed' yet.</p>
                                <p className="text-sm text-slate-400 mt-2">Mark items as 'Claimed' in the inventory to unlock optimization.</p>
                            </div>
                        )}
                        {claimedItems.map(item => (
                            <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                   <div>
                                       <p className="font-bold text-slate-800 text-lg">{item.itemName}</p>
                                       <p className="text-sm text-slate-500 mt-1">{item.itemCategory} • <span className="font-semibold text-slate-700">RCV: ${(item.replacementCostValueRCV || item.originalCost).toLocaleString()}</span></p>
                                   </div>
                                   <button onClick={() => handleFindOptimalPolicy(item)} disabled={loadingItemId === item.id} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg shadow hover:bg-slate-800 transition disabled:opacity-50">
                                       {loadingItemId === item.id ? <SpinnerIcon className="h-4 w-4"/> : <SparklesIcon className="h-4 w-4 text-amber-400"/>}
                                       {loadingItemId === item.id ? 'Analyzing...' : 'Analyze'}
                                   </button>
                                </div>
                                {optimizationResults[item.id] && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-xl">
                                        {'error' in optimizationResults[item.id] ? (
                                            <p className="text-sm text-rose-600 font-semibold">{(optimizationResults[item.id] as any).error}</p>
                                        ) : (
                                            <div className="text-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircleIcon className="h-5 w-5 text-emerald-500"/>
                                                    <p className="font-bold text-slate-800">Recommendation: File under '{policies.find(p => p.id === (optimizationResults[item.id] as OptimalPolicyResult).bestPolicyId)?.policyName}'</p>
                                                </div>
                                                <p className="text-slate-600 leading-relaxed pl-7">{(optimizationResults[item.id] as OptimalPolicyResult).reasoning}</p>
                                                <div className="mt-3 pl-7">
                                                    <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">
                                                        Financial Advantage: +${(optimizationResults[item.id] as OptimalPolicyResult).financialAdvantage.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Narrative Optimizer */}
                <div>
                     <div className="flex items-center gap-3 mb-6">
                         <div className="bg-purple-100 p-2 rounded-lg">
                            <SparklesIcon className="h-6 w-6 text-purple-600"/>
                         </div>
                         <h2 className="text-2xl font-bold text-slate-800 font-heading">Narrative Architect</h2>
                    </div>

                     <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">Select an item to generate a refined incident narrative. The AI will reframe the facts to align with covered perils (e.g., theft, accidental damage) based on your policy's specific exclusions.</p>
                         
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Select Item</label>
                                <select onChange={(e) => setSelectedItemForNarrative(claimedItems.find(i => i.id === e.target.value) || null)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition">
                                    <option value="">-- Choose an item --</option>
                                    {claimedItems.map(item => <option key={item.id} value={item.id}>{item.itemName}</option>)}
                                </select>
                            </div>
                            
                            {claimDetails.propertyDamageDetails && (
                                <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Current Base Facts</label>
                                     <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 italic">
                                        "{claimDetails.propertyDamageDetails}"
                                     </div>
                                </div>
                            )}
                         </div>
                         
                         <button onClick={handleGenerateNarrative} disabled={!selectedItemForNarrative || isNarrativeLoading} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition disabled:opacity-50">
                            {isNarrativeLoading ? <SpinnerIcon className="h-5 w-5"/> : <SparklesIcon className="h-5 w-5"/>}
                            {isNarrativeLoading ? 'Architecting Narrative...' : 'Generate Optimized Narrative'}
                         </button>

                         {optimizedNarrative && (
                             <div className="mt-6 pt-6 border-t border-slate-100">
                                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">AI-Optimized Narrative</label>
                                <textarea value={optimizedNarrative} onChange={e => setOptimizedNarrative(e.target.value)} rows={8} className="w-full p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/20"/>
                             </div>
                         )}
                     </div>
                </div>
            </div>
            
            {/* Report Generator Modal */}
            {showReportGenerator && (
                <ClaimReportGenerator onClose={() => setShowReportGenerator(false)} />
            )}
        </div>
    );
};

export default StrategicDashboard;
