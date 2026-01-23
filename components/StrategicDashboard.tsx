
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, ParsedPolicy, OptimalPolicyResult, ClaimItem, ClaimDetails, ActiveClaim, ClaimScenario, ClaimGapAnalysis } from '../types.ts';
import { SpinnerIcon, WrenchScrewdriverIcon, CheckCircleIcon, SparklesIcon, InformationCircleIcon, BriefcaseIcon, ShieldCheckIcon, DocumentTextIcon, XCircleIcon, PlusIcon, ExclamationTriangleIcon, TrashIcon, BoltIcon, ChartPieIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import ClaimReportGenerator from './ClaimReportGenerator.tsx';
import { InsuranceSection } from './InsuranceSection.tsx';
import ClaimDetailsEditor from './ClaimDetailsEditor.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';
import * as claimService from '../services/claimService.ts';

interface StrategicDashboardProps {
    onPolicyUpload: (file: File) => void;
    isPolicyAnalyzing: boolean;
}

const StrategicDashboard: React.FC<StrategicDashboardProps> = ({ onPolicyUpload, isPolicyAnalyzing }) => {
    const { inventory, policies, claims, currentClaimId } = useAppState();
    const dispatch = useAppDispatch();
    
    const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimalPolicyResult | { error: string }>>({});
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [selectedItemForNarrative, setSelectedItemForNarrative] = useState<InventoryItem | null>(null);
    const [optimizedNarrative, setOptimizedNarrative] = useState<string>('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    const [showReportGenerator, setShowReportGenerator] = useState(false);
    const [showNewClaimForm, setShowNewClaimForm] = useState(false);
    
    // Scenarios State
    const [suggestedScenarios, setSuggestedScenarios] = useState<ClaimScenario[]>([]);
    const [isScenariosLoading, setIsScenariosLoading] = useState(false);

    // Gap Analysis State
    const [gapAnalysis, setGapAnalysis] = useState<ClaimGapAnalysis | null>(null);
    const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);

    // New Claim Form State
    const [newClaimIncidentType, setNewClaimIncidentType] = useState('Theft');
    const [newClaimDate, setNewClaimDate] = useState(new Date().toISOString().split('T')[0]);

    const activePolicy = useMemo(() => policies.find(p => p.isActive), [policies]);
    
    // Select the current claim object
    const currentClaim = useMemo(() => claims.find(c => c.id === currentClaimId), [claims, currentClaimId]);

    const refreshScenarios = useCallback(async () => {
        if (!activePolicy || inventory.length === 0) return;
        setIsScenariosLoading(true);
        try {
            const scenarios = await geminiService.suggestClaimScenarios(inventory, activePolicy);
            setSuggestedScenarios(scenarios);
        } catch (e) {
            console.error("Failed to fetch scenarios", e);
        } finally {
            setIsScenariosLoading(false);
        }
    }, [activePolicy, inventory]);

    // Fetch scenarios on mount if policy exists and list is empty
    useEffect(() => {
        if (activePolicy && inventory.length > 0 && suggestedScenarios.length === 0) {
            refreshScenarios();
        }
    }, [activePolicy, inventory.length, suggestedScenarios.length, refreshScenarios]);

    const handleCreateClaim = () => {
        if (!activePolicy) {
            alert("Please ensure an active policy is selected.");
            return;
        }
        
        const incident: ClaimDetails = {
            name: `${newClaimIncidentType} Claim`,
            dateOfLoss: newClaimDate,
            incidentType: newClaimIncidentType,
            location: '',
            policeReport: '',
            propertyDamageDetails: '',
            aleProofs: [],
            claimDocuments: []
        };

        const newClaim = claimService.generateClaimInventory(inventory, activePolicy, incident);
        dispatch({ type: 'CREATE_CLAIM', payload: newClaim });
        setShowNewClaimForm(false);
    };

    const handleDeleteClaim = (id: string) => {
        if (window.confirm("Are you sure you want to delete this claim draft?")) {
            dispatch({ type: 'DELETE_CLAIM', payload: id });
        }
    };

    const handleSwitchClaim = (id: string) => {
        dispatch({ type: 'SET_CURRENT_CLAIM', payload: id });
    };

    const handleUpdateClaimItem = (item: ClaimItem, updates: Partial<ClaimItem>) => {
        if (currentClaim) {
            dispatch({ type: 'UPDATE_CLAIM_ITEM', payload: { claimId: currentClaim.id, item: { ...item, ...updates } } });
        }
    };
    
    const handleUpdateClaimDetails = (updates: Partial<ClaimDetails>) => {
        if (currentClaim) {
            dispatch({ type: 'UPDATE_CLAIM_DETAILS', payload: { claimId: currentClaim.id, details: updates } });
        }
    };

    const handleAnalyzeGaps = async () => {
        if (!currentClaim || !activePolicy) return;
        setIsAnalyzingGaps(true);
        setGapAnalysis(null);
        try {
            const analysis = await geminiService.analyzeClaimCoverageGaps(currentClaim, activePolicy);
            setGapAnalysis(analysis);
        } catch (error) {
            console.error("Gap analysis failed", error);
            alert("Failed to perform coverage analysis.");
        } finally {
            setIsAnalyzingGaps(false);
        }
    };

    const handleGenerateNarrative = useCallback(async () => {
        if (!selectedItemForNarrative || !activePolicy || !currentClaim) return;
        setIsNarrativeLoading(true);
        setOptimizedNarrative('');
        try {
            const result = await geminiService.generateOptimizedNarrative(selectedItemForNarrative, activePolicy, currentClaim.incidentDetails);
            setOptimizedNarrative(result);
        } catch (error) {
            console.error(error);
            setOptimizedNarrative("Error: Could not generate an optimized narrative.");
        } finally {
            setIsNarrativeLoading(false);
        }
    }, [selectedItemForNarrative, activePolicy, currentClaim]);

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20">
            <div className="text-center mb-10 pt-8 relative">
                <div className="inline-flex p-4 rounded-full bg-primary/5 mb-4">
                    <BriefcaseIcon className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-heading">Strategic Claim Optimizer</h1>
                <div className="absolute top-0 right-0">
                    <button 
                        onClick={() => setShowReportGenerator(true)}
                        disabled={!currentClaim}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        <DocumentTextIcon className="h-4 w-4 text-amber-400" />
                        Generate Official Claim Packet
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Claim Selector */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800">Your Claims</h3>
                            <button onClick={() => setShowNewClaimForm(true)} className="text-primary hover:bg-primary/10 p-1 rounded-full"><PlusIcon className="h-5 w-5"/></button>
                        </div>
                        
                        {showNewClaimForm && (
                            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 animate-fade-in-down">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Incident Type</label>
                                <select 
                                    className="w-full text-sm p-2 border rounded mb-2"
                                    value={newClaimIncidentType}
                                    onChange={e => setNewClaimIncidentType(e.target.value)}
                                >
                                    <option value="Theft">Theft</option>
                                    <option value="Fire">Fire</option>
                                    <option value="Water Damage">Water Damage</option>
                                    <option value="Vandalism">Vandalism</option>
                                </select>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full text-sm p-2 border rounded mb-3"
                                    value={newClaimDate}
                                    onChange={e => setNewClaimDate(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleCreateClaim} className="flex-1 bg-primary text-white text-xs font-bold py-1.5 rounded">Create</button>
                                    <button onClick={() => setShowNewClaimForm(false)} className="flex-1 bg-white border border-slate-300 text-slate-600 text-xs font-bold py-1.5 rounded">Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {claims.map(claim => (
                                <div 
                                    key={claim.id} 
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${currentClaimId === claim.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-slate-200 hover:border-primary/50'}`}
                                    onClick={() => handleSwitchClaim(claim.id)}
                                >
                                    <div>
                                        <p className={`text-sm font-bold ${currentClaimId === claim.id ? 'text-primary' : 'text-slate-700'}`}>{claim.name}</p>
                                        <p className="text-xs text-slate-500">{new Date(claim.generatedAt).toLocaleDateString()}</p>
                                        <p className="text-xs font-bold text-emerald-600 mt-1">${claim.totalClaimValue.toLocaleString()}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClaim(claim.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1"
                                    >
                                        <TrashIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                            {claims.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No active claims.</p>}
                        </div>
                    </div>

                    <InsuranceSection 
                        policies={policies}
                        onUpload={onPolicyUpload}
                        onSetActivePolicy={(id) => dispatch({ type: 'SET_ACTIVE_POLICY', payload: id })}
                        isLoading={isPolicyAnalyzing}
                    />
                    
                    {/* Suggested Scenarios */}
                    {activePolicy && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                    <BoltIcon className="h-5 w-5 text-indigo-600"/> Proactive Scenarios
                                </h3>
                                <button 
                                    onClick={refreshScenarios} 
                                    disabled={isScenariosLoading}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white/50 px-2 py-1 rounded hover:bg-white transition disabled:opacity-50"
                                >
                                    <SparklesIcon className="h-3 w-3"/>
                                    {isScenariosLoading ? 'Analyzing...' : 'Refresh'}
                                </button>
                            </div>
                            {isScenariosLoading ? (
                                <div className="flex justify-center py-4"><SpinnerIcon className="h-6 w-6 text-indigo-400"/></div>
                            ) : suggestedScenarios.length > 0 ? (
                                <div className="space-y-3">
                                    {suggestedScenarios.map((scenario, i) => (
                                        <div key={i} className="bg-white/80 p-3 rounded-lg border border-indigo-100 text-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-indigo-800">{scenario.title}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scenario.likelihood === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{scenario.likelihood}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2">{scenario.description}</p>
                                            <p className="text-[10px] text-indigo-500 font-semibold">Coverage: {scenario.relevantCoverage}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">Add inventory items to generate risk scenarios.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-8">
                    {currentClaim ? (
                        <>
                            {/* Claim Incident Details */}
                            <ClaimDetailsEditor 
                                details={currentClaim.incidentDetails} 
                                onUpdate={handleUpdateClaimDetails} 
                            />
                            
                            {/* AI Coverage Audit */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 font-heading flex items-center gap-2">
                                        <ChartPieIcon className="h-6 w-6 text-blue-600"/>
                                        AI Coverage Audit
                                    </h3>
                                    <button 
                                        onClick={handleAnalyzeGaps} 
                                        disabled={isAnalyzingGaps}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                                    >
                                        {isAnalyzingGaps ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <SparklesIcon className="h-4 w-4"/>}
                                        {isAnalyzingGaps ? 'Analyzing Policy...' : 'Run Coverage Analysis'}
                                    </button>
                                </div>

                                {gapAnalysis ? (
                                    <div className="space-y-6 animate-fade-in-down">
                                        {/* Risk Score */}
                                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className={`text-2xl font-bold ${gapAnalysis.overallRiskScore > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {gapAnalysis.overallRiskScore}/100
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Risk Score</p>
                                                <p className="text-xs text-slate-500">Higher score indicates higher potential for denied/reduced payouts.</p>
                                            </div>
                                        </div>

                                        {/* Flagged Items */}
                                        {gapAnalysis.flaggedItems.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-bold text-rose-700 mb-3 uppercase tracking-wider">At-Risk Items</h4>
                                                <div className="space-y-3">
                                                    {gapAnalysis.flaggedItems.map((item, i) => (
                                                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-rose-50 border border-rose-100 rounded-lg">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-rose-800">{item.itemName}</span>
                                                                    <span className="text-[10px] px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full font-bold uppercase">{item.issueType}</span>
                                                                </div>
                                                                <p className="text-xs text-rose-700 mt-1">{item.description}</p>
                                                            </div>
                                                            <div className="mt-2 sm:mt-0 text-right">
                                                                <p className="text-xs font-bold text-slate-400 uppercase">Potential Loss</p>
                                                                <p className="font-bold text-rose-600">${item.financialImpact.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-blue-700 mb-2 uppercase tracking-wider">Policy Warnings</h4>
                                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                                    {gapAnalysis.policyWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-emerald-700 mb-2 uppercase tracking-wider">Recommendations</h4>
                                                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                                    {gapAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        <ShieldCheckIcon className="h-12 w-12 text-slate-300 mx-auto mb-2"/>
                                        <p className="text-sm text-slate-500">Run the analysis to identify under-insured items or policy exclusions.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Claim Inventory Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Claim Inventory</h3>
                                        <p className="text-xs text-slate-500">{currentClaim.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Total Claim Value</p>
                                        <p className="text-xl font-extrabold text-emerald-600">${currentClaim.totalClaimValue.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Adjuster View)</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Narrative Tag</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Claim Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {currentClaim.claimItems.map(item => (
                                                <tr key={item.id} className={item.status === 'excluded' ? 'bg-slate-50 opacity-60' : 'bg-white hover:bg-slate-50'}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <select 
                                                            value={item.status} 
                                                            onChange={(e) => handleUpdateClaimItem(item, { status: e.target.value as any })}
                                                            className={`text-xs font-bold rounded px-2 py-1 border-0 focus:ring-0 cursor-pointer ${item.status === 'included' ? 'bg-emerald-100 text-emerald-800' : item.status === 'flagged' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}
                                                        >
                                                            <option value="included">Included</option>
                                                            <option value="excluded">Excluded</option>
                                                            <option value="flagged">Flagged</option>
                                                        </select>
                                                        {item.policyNotes && (
                                                            <div className="mt-2 text-[10px] text-amber-600 font-medium flex items-start gap-1 max-w-[120px] whitespace-normal">
                                                                <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0 mt-0.5"/>
                                                                {item.policyNotes}
                                                            </div>
                                                        )}
                                                        {item.exclusionReason && (
                                                            <div className="mt-2 text-[10px] text-rose-600 font-medium flex items-start gap-1 max-w-[120px] whitespace-normal">
                                                                <XCircleIcon className="h-3 w-3 flex-shrink-0 mt-0.5"/>
                                                                {item.exclusionReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input 
                                                            type="text" 
                                                            value={item.claimDescription} 
                                                            onChange={(e) => handleUpdateClaimItem(item, { claimDescription: e.target.value })}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none text-sm text-slate-700"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.category}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                         <select 
                                                            value={item.narrativeTag} 
                                                            onChange={(e) => handleUpdateClaimItem(item, { narrativeTag: e.target.value as any })}
                                                            className="text-xs bg-slate-100 border-none rounded focus:ring-0 text-slate-600"
                                                        >
                                                            <option value="Packed">Packed</option>
                                                            <option value="Stored">Stored</option>
                                                            <option value="In Transit">In Transit</option>
                                                            <option value="In Use">In Use</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <CurrencyInput 
                                                            value={item.claimedValue} 
                                                            onChange={(val) => handleUpdateClaimItem(item, { claimedValue: val })}
                                                            className="w-24 text-right text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Narrative Architect */}
                            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                     <div className="bg-purple-100 p-2 rounded-lg">
                                        <SparklesIcon className="h-6 w-6 text-purple-600"/>
                                     </div>
                                     <h2 className="text-2xl font-bold text-slate-800 font-heading">Narrative Architect</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Select Item</label>
                                        <select onChange={(e) => setSelectedItemForNarrative(inventory.find(i => i.id === e.target.value) || null)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition">
                                            <option value="">-- Choose an item --</option>
                                            {inventory.map(item => <option key={item.id} value={item.id}>{item.itemName}</option>)}
                                        </select>
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
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-200">
                            <BriefcaseIcon className="h-16 w-16 text-slate-300 mb-4"/>
                            <h3 className="text-xl font-bold text-slate-700">No Claim Selected</h3>
                            <p className="text-slate-500 mb-6">Select a claim from the sidebar or create a new one to start optimizing.</p>
                            <button onClick={() => setShowNewClaimForm(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition">
                                <PlusIcon className="h-5 w-5"/> Create New Claim
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Report Generator Modal */}
            {showReportGenerator && currentClaim && (
                <ClaimReportGenerator onClose={() => setShowReportGenerator(false)} />
            )}
        </div>
    );
};

export default StrategicDashboard;
