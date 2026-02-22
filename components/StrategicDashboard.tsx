
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, ParsedPolicy, OptimalPolicyResult, ClaimItem, ClaimDetails, ActiveClaim, ClaimScenario, ClaimStage, Task } from '../types.ts';
import { SpinnerIcon, WrenchScrewdriverIcon, CheckCircleIcon, SparklesIcon, InformationCircleIcon, BriefcaseIcon, ShieldCheckIcon, DocumentTextIcon, XCircleIcon, PlusIcon, ExclamationTriangleIcon, TrashIcon, BoltIcon, ChartPieIcon, CheckIcon, ArrowDownTrayIcon, ChevronRightIcon, ShieldExclamationIcon, ClockIcon, CalculatorIcon, LinkIcon, CubeIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import ClaimReportGenerator from './ClaimReportGenerator.tsx';
import { InsuranceSection } from './InsuranceSection.tsx';
import ClaimDetailsEditor from './ClaimDetailsEditor.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';
import * as claimService from '../services/claimService.ts';
import { ScoreIndicator } from './ScoreIndicator.tsx';
import { TaskBoard } from './TaskBoard.tsx';
import EscalationManager from './EscalationManager.tsx';
import ScenarioSimulatorModal from './ScenarioSimulatorModal.tsx';

interface StrategicDashboardProps {
    onPolicyUpload: (file: File) => void;
    isPolicyAnalyzing: boolean;
}

const STAGES: ClaimStage[] = ['Incident', 'Inventory', 'Valuation', 'Evidence', 'Review', 'Submitted'];

const StageStepper: React.FC<{ currentStage: ClaimStage }> = ({ currentStage }) => {
    const currentIndex = STAGES.indexOf(currentStage);
    
    return (
        <div className="flex items-center w-full mb-8 overflow-x-auto py-2">
            {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                
                return (
                    <React.Fragment key={stage}>
                        <div className={`flex items-center gap-2 ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all 
                                ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 
                                  isCurrent ? 'bg-white border-primary text-primary shadow-lg scale-110' : 
                                  'bg-slate-50 border-slate-300 text-slate-400'}`}>
                                {isCompleted ? <CheckIcon className="h-4 w-4"/> : idx + 1}
                            </div>
                            <span className={`text-xs font-bold whitespace-nowrap ${isCurrent ? 'text-primary' : 'text-slate-500'}`}>{stage}</span>
                        </div>
                        {idx < STAGES.length - 1 && (
                            <div className={`h-0.5 w-8 mx-2 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const ClaimWizard: React.FC<{ 
    activePolicy: ParsedPolicy, 
    inventory: InventoryItem[],
    onClose: () => void,
    onCreateClaim: (incidentType: string, date: string, description: string) => void,
    suggestedScenarios: ClaimScenario[]
}> = ({ activePolicy, inventory, onClose, onCreateClaim, suggestedScenarios }) => {
    const [step, setStep] = useState(1);
    const [prompt, setPrompt] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const [selectedIncident, setSelectedIncident] = useState<string>('');
    const [dateOfLoss, setDateOfLoss] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    // Extract potential triggers from policy
    const policyTriggers = useMemo(() => {
        const triggers = activePolicy.triggers || ["Theft", "Fire", "Water Damage", "Vandalism"];
        return [...new Set(triggers)]; // dedupe
    }, [activePolicy]);

    const handleAutoFill = async () => {
        if (!prompt.trim()) return;
        setIsAnalyzing(true);
        try {
            // Simulated AI extraction from natural language
            // In a real app, this would use geminiService to extract intent
            const simulatedDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
            await simulatedDelay(1500);
            
            // Mock logic for demo purposes based on keywords
            const lowerPrompt = prompt.toLowerCase();
            if (lowerPrompt.includes('fire') || lowerPrompt.includes('kitchen')) {
                setSelectedIncident('Fire');
                setDescription(prompt);
            } else if (lowerPrompt.includes('stole') || lowerPrompt.includes('theft')) {
                setSelectedIncident('Theft');
                setDescription(prompt);
            } else if (lowerPrompt.includes('water') || lowerPrompt.includes('leak')) {
                setSelectedIncident('Water Damage');
                setDescription(prompt);
            } else {
                setSelectedIncident('Other');
                setDescription(prompt);
            }
            setStep(2);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 font-heading">Start New Claim</h2>
                        <p className="text-xs text-slate-500">Under Policy: {activePolicy.provider} #{activePolicy.policyNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><XCircleIcon className="h-6 w-6 text-slate-400"/></button>
                </div>

                <div className="flex-grow overflow-y-auto p-8">
                    {/* STEP 1: Select Incident */}
                    {step === 1 && (
                        <div className="space-y-8">
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
                                <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-3">
                                    <SparklesIcon className="h-5 w-5 text-indigo-600"/> Auto-Pilot (Recommended)
                                </h3>
                                <p className="text-sm text-indigo-700 mb-4">Just tell us what happened. We'll set up the claim type, dates, and even suggest relevant inventory items.</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 'I had a kitchen fire yesterday and damaged my stove and laptop.'"
                                        className="flex-grow p-3 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAutoFill()}
                                    />
                                    <button 
                                        onClick={handleAutoFill}
                                        disabled={isAnalyzing || !prompt.trim()}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 disabled:opacity-50 transition"
                                    >
                                        {isAnalyzing ? <SpinnerIcon className="h-5 w-5 animate-spin"/> : 'Analyze'}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Or Select Manually</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {policyTriggers.map(trigger => (
                                        <button 
                                            key={trigger}
                                            onClick={() => { setSelectedIncident(trigger); setStep(2); }}
                                            className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 text-left transition flex justify-between items-center group"
                                        >
                                            <span className="font-semibold text-slate-700 group-hover:text-primary">{trigger}</span>
                                            <ChevronRightIcon className="h-4 w-4 text-slate-300 group-hover:text-primary"/>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800">Incident Details: {selectedIncident}</h3>
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Date of Loss</label>
                                <input 
                                    type="date" 
                                    value={dateOfLoss}
                                    onChange={(e) => setDateOfLoss(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe what happened..."
                                    rows={4}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                                <p className="font-bold flex items-center gap-2"><InformationCircleIcon className="h-4 w-4"/> Next Steps</p>
                                <p className="mt-1">We will generate a task list and document checklist specific to <strong>{selectedIncident}</strong> claims.</p>
                            </div>

                            <div className="flex justify-between pt-4">
                                <button onClick={() => setStep(1)} className="text-slate-500 font-semibold text-sm">Back</button>
                                <button 
                                    onClick={() => onCreateClaim(selectedIncident, dateOfLoss, description)}
                                    className="bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-primary-dark transition"
                                >
                                    Create Claim Strategy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StrategicDashboard: React.FC<StrategicDashboardProps> = ({ onPolicyUpload, isPolicyAnalyzing }) => {
    const { inventory, policies, claims, currentClaimId, accountHolder } = useAppState();
    const dispatch = useAppDispatch();
    
    const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimalPolicyResult | { error: string }>>({});
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
    const [selectedItemForNarrative, setSelectedItemForNarrative] = useState<InventoryItem | null>(null);
    const [optimizedNarrative, setOptimizedNarrative] = useState<string>('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    const [showReportGenerator, setShowReportGenerator] = useState(false);
    const [showNewClaimWizard, setShowNewClaimWizard] = useState(false);
    const [showEscalationManager, setShowEscalationManager] = useState(false);
    const [showSimulator, setShowSimulator] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
    
    // Scenarios State
    const [suggestedScenarios, setSuggestedScenarios] = useState<ClaimScenario[]>([]);
    const [isScenariosLoading, setIsScenariosLoading] = useState(false);
    
    const activePolicy = useMemo(() => policies.find(p => p.isActive), [policies]);
    const currentClaim = useMemo(() => claims.find(c => c.id === currentClaimId), [claims, currentClaimId]);

    const claimMetrics = useMemo(() => {
        if (!currentClaim || !activePolicy) return null;
        return claimService.calculateClaimMetrics(currentClaim, activePolicy, inventory);
    }, [currentClaim, activePolicy, inventory]);

    // Derived Next Action
    const nextStep = useMemo(() => {
        if (!currentClaim || !claimMetrics) return null;
        return claimService.determineNextAction(currentClaim, claimMetrics);
    }, [currentClaim, claimMetrics]);

    // Simulate Auto-Save on Claim Change
    useEffect(() => {
        if (currentClaim) {
            setAutoSaveStatus('saving');
            const timer = setTimeout(() => setAutoSaveStatus('saved'), 1500);
            return () => clearTimeout(timer);
        }
    }, [currentClaim]);

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

    useEffect(() => {
        if (activePolicy && inventory.length > 0 && suggestedScenarios.length === 0) {
            refreshScenarios();
        }
    }, [activePolicy, inventory.length, suggestedScenarios.length, refreshScenarios]);

    const handleCreateClaim = (incidentType: string, date: string, description: string) => {
        if (!activePolicy) return;
        
        const incident: ClaimDetails = {
            name: `${incidentType} Claim`,
            dateOfLoss: date,
            incidentType: incidentType,
            location: accountHolder.address,
            policeReport: '',
            propertyDamageDetails: description,
            aleProofs: [],
            claimDocuments: []
        };

        const newClaim = claimService.generateClaimInventory(inventory, activePolicy, incident);
        dispatch({ type: 'CREATE_CLAIM', payload: newClaim });

        const requirements = claimService.getIncidentRequirements(incidentType);
        
        requirements.requiredDocuments.forEach(doc => {
            const task: Task = {
                id: `task-req-${Date.now()}-${Math.random()}`,
                description: `Upload Document: ${doc}`,
                priority: 'High',
                isCompleted: false,
                createdAt: new Date().toISOString()
            };
            dispatch({ type: 'ADD_TASK', payload: task });
        });

        requirements.recommendedTasks.forEach(rec => {
            const task: Task = {
                id: `task-rec-${Date.now()}-${Math.random()}`,
                description: rec,
                priority: 'Medium',
                isCompleted: false,
                createdAt: new Date().toISOString()
            };
            dispatch({ type: 'ADD_TASK', payload: task });
        });

        setShowNewClaimWizard(false);
    };

    const handleConvertScenario = async (scenario: ClaimScenario) => {
        if (!activePolicy) {
            alert("Active policy required.");
            return;
        }
        
        try {
            const details = await geminiService.generateClaimDetailsFromScenario(scenario, accountHolder);
            handleCreateClaim(scenario.title, details.dateOfLoss, scenario.description);
        } catch (e) {
            console.error("Failed to convert scenario", e);
            alert("Could not generate claim from scenario.");
        }
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

    const handleUpdatePolicy = (policy: ParsedPolicy) => {
        dispatch({ type: 'UPDATE_POLICY', payload: policy });
    };

    const handleValidateAndExport = () => {
        if (!claimMetrics) return;
        if (claimMetrics.strategyScore < 70 || claimMetrics.actionItems.some(i => i.severity === 'high')) {
            if (!window.confirm(`Warning: Your Claim Strategy Score is ${claimMetrics.strategyScore}/100 and you have critical missing proofs. Proceeding may result in delays or denials. Continue anyway?`)) {
                return;
            }
        }
        setShowReportGenerator(true);
    };

    const handleNavigateToItem = (itemId: string) => {
        dispatch({ type: 'SELECT_ITEM', payload: itemId });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20">
            <div className="flex justify-between items-end mb-8 pt-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">Command Center</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage claim lifecycle, compliance, and strategy.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                        {autoSaveStatus === 'saving' ? (
                            <><SpinnerIcon className="h-3 w-3 animate-spin"/> Saving...</>
                        ) : (
                            <><ClockIcon className="h-3 w-3"/> Auto-Saved</>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setShowSimulator(true)}
                        disabled={!activePolicy}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-primary transition-all shadow-sm disabled:opacity-50"
                    >
                        <CalculatorIcon className="h-4 w-4"/>
                        Simulate Claim
                    </button>

                    {currentClaim && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowEscalationManager(true)}
                                disabled={currentClaim.stage !== 'Submitted' && currentClaim.stage !== 'Review'}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                <ShieldExclamationIcon className="h-3 w-3" />
                                Escalation
                            </button>
                            <button 
                                onClick={handleValidateAndExport}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-md transition-all active:scale-95"
                            >
                                <DocumentTextIcon className="h-3 w-3 text-amber-400" />
                                Export Packet
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Claims List */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Claims</h3>
                            <button onClick={() => setShowNewClaimWizard(true)} className="text-primary hover:bg-primary/10 p-1 rounded-full"><PlusIcon className="h-4 w-4"/></button>
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto">
                            {claims.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-slate-400">No claims active.</p>
                                    <button onClick={() => setShowNewClaimWizard(true)} className="mt-2 text-xs font-bold text-primary hover:underline">Start New Claim</button>
                                </div>
                            ) : (
                                claims.map(claim => (
                                    <div 
                                        key={claim.id} 
                                        className={`p-3 border-b last:border-b-0 cursor-pointer transition-all hover:bg-slate-50 relative group ${currentClaimId === claim.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                                        onClick={() => handleSwitchClaim(claim.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`text-sm font-bold truncate max-w-[150px] ${currentClaimId === claim.id ? 'text-primary' : 'text-slate-700'}`}>{claim.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{claim.incidentDetails.incidentType}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${claim.stage === 'Submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{claim.stage}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-xs font-bold text-slate-700">${claim.totalClaimValue.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(claim.generatedAt).toLocaleDateString()}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClaim(claim.id); }}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity p-1"
                                        >
                                            <TrashIcon className="h-3 w-3"/>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <InsuranceSection 
                        policies={policies}
                        onUpload={onPolicyUpload}
                        onSetActivePolicy={(id) => dispatch({ type: 'SET_ACTIVE_POLICY', payload: id })}
                        onUpdatePolicy={handleUpdatePolicy}
                        isLoading={isPolicyAnalyzing}
                    />
                    
                    {activePolicy && (
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
                                    <BoltIcon className="h-4 w-4 text-indigo-600"/> Proactive Scenarios
                                </h3>
                                <button 
                                    onClick={refreshScenarios} 
                                    disabled={isScenariosLoading}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white/50 px-2 py-1 rounded hover:bg-white transition disabled:opacity-50"
                                >
                                    <SparklesIcon className="h-3 w-3"/>
                                </button>
                            </div>
                            {suggestedScenarios.length > 0 ? (
                                <div className="space-y-2">
                                    {suggestedScenarios.slice(0, 2).map((scenario, i) => (
                                        <div key={i} className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 text-xs hover:shadow-md transition-all cursor-pointer" onClick={() => handleConvertScenario(scenario)}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-indigo-800">{scenario.title}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${scenario.likelihood === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{scenario.likelihood}</span>
                                            </div>
                                            <p className="text-slate-600 line-clamp-2">{scenario.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">No scenarios generated.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {currentClaim ? (
                        <>
                            {/* Workflow Stepper */}
                            <StageStepper currentStage={currentClaim.stage} />

                            {/* Next Best Action Card (Autonomous Logic) */}
                            {nextStep && (
                                <div className="bg-white rounded-xl border-l-4 border-l-primary shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in-down">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            <SparklesIcon className="h-5 w-5 text-primary"/> Next Recommended Action
                                        </h3>
                                        <p className="text-slate-600 mt-1 text-sm">{nextStep.reason}</p>
                                    </div>
                                    <button 
                                        className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:bg-primary-dark transition flex items-center gap-2 whitespace-nowrap"
                                        onClick={() => {
                                            // Handle automated navigation logic based on nextStep.stage
                                            // For V1, we just provide the visual cue.
                                            alert(`Navigating to ${nextStep.stage} tools...`);
                                        }}
                                    >
                                        {nextStep.action} <ChevronRightIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            )}

                            {/* Metrics & Strategy */}
                            {claimMetrics && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-900 font-heading">Financial Projection</h2>
                                                <p className="text-xs text-slate-500">Live estimate based on policy terms & inventory.</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${claimMetrics.netPayout > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {claimMetrics.netPayout > 0 ? 'Payout Likely' : 'Below Deductible'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-8">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gross Loss</p>
                                                <p className="text-xl font-bold text-slate-900">${claimMetrics.grossLoss.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deductible</p>
                                                <p className="text-xl font-bold text-rose-500">-${claimMetrics.deductible.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Net Expected</p>
                                                <p className="text-2xl font-extrabold text-emerald-600">${claimMetrics.netPayout.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-4 bg-slate-900 rounded-xl shadow-lg p-6 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                        <div className="relative z-10">
                                            <ScoreIndicator score={claimMetrics.strategyScore} size="lg" />
                                            <p className="mt-3 font-bold uppercase tracking-widest text-xs text-slate-400">Strategy Score</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Task & Issues Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Task Management Board */}
                                <TaskBoard title="Strategic Task Board" />

                                {/* Critical Actions Panel */}
                                {claimMetrics && claimMetrics.actionItems.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm h-full">
                                        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-4">
                                            <ExclamationTriangleIcon className="h-5 w-5"/> Strategy Blockers
                                        </h3>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                            {claimMetrics.actionItems.map((action, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-amber-100 flex flex-col justify-between shadow-sm">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold text-slate-800 text-sm truncate" title={action.itemName}>{action.itemName}</p>
                                                            {action.severity === 'high' && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1"></span>}
                                                        </div>
                                                        <p className="text-xs text-amber-700 mt-1">{action.issue}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleNavigateToItem(action.itemId)}
                                                        className="mt-3 w-full py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition"
                                                    >
                                                        Fix Issue
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Claim Incident Details */}
                            <ClaimDetailsEditor 
                                details={currentClaim.incidentDetails} 
                                onUpdate={handleUpdateClaimDetails} 
                            />
                            
                            {/* Claim Inventory Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-bold text-slate-800">Claim Schedule (Layer 2)</h3>
                                            <p className="text-xs text-slate-500">{currentClaim.name}</p>
                                        </div>
                                        <div className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 text-[10px] font-bold uppercase tracking-wide cursor-help group relative">
                                            <InformationCircleIcon className="h-3 w-3"/>
                                            Snapshot Mode
                                            <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800 text-white text-xs font-medium p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 normal-case leading-snug">
                                                You are editing a <strong>snapshot</strong> for this specific claim. Changes made here (descriptions, values) do <strong>not</strong> alter your Master Inventory (Layer 1).
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Items Value</p>
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
                                                        <div className="flex flex-col">
                                                            <input 
                                                                type="text" 
                                                                value={item.claimDescription} 
                                                                onChange={(e) => handleUpdateClaimItem(item, { claimDescription: e.target.value })}
                                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none text-sm text-slate-700 font-medium"
                                                            />
                                                            <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                                                                <LinkIcon className="h-3 w-3"/>
                                                                Linked to Master: <span className="font-mono">{item.masterItemId.substring(0,8)}...</span>
                                                            </div>
                                                        </div>
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
                                    {currentClaim.claimItems.length === 0 && (
                                        <div className="p-8 text-center text-slate-400">
                                            <CubeIcon className="h-12 w-12 mx-auto mb-2 text-slate-300"/>
                                            <p className="text-sm">No items in this claim snapshot.</p>
                                            <p className="text-xs mt-1">Items added here will be copied from your Master Inventory.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Narrative Architect */}
                            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                     <div className="bg-purple-100 p-2 rounded-lg">
                                        <SparklesIcon className="h-6 w-6 text-purple-600"/>
                                     </div>
                                     <h2 className="text-lg font-bold text-slate-800 font-heading">Narrative Architect</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Select Item to Optimize</label>
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
                        <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <BriefcaseIcon className="h-16 w-16 text-slate-300 mb-4"/>
                            <h3 className="text-xl font-bold text-slate-700">No Claim Selected</h3>
                            <p className="text-slate-500 mb-6 max-w-md text-center">Select a claim from the sidebar or create a new one to start the autonomous claim optimization process.</p>
                            <button onClick={() => setShowNewClaimWizard(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition shadow-md">
                                <PlusIcon className="h-5 w-5"/> Create New Claim
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Modals */}
            {showReportGenerator && currentClaim && (
                <ClaimReportGenerator onClose={() => setShowReportGenerator(false)} />
            )}
            
            {showNewClaimWizard && activePolicy && (
                <ClaimWizard 
                    activePolicy={activePolicy}
                    inventory={inventory}
                    onClose={() => setShowNewClaimWizard(false)}
                    onCreateClaim={handleCreateClaim}
                    suggestedScenarios={suggestedScenarios}
                />
            )}

            {showEscalationManager && currentClaim && activePolicy && (
                <EscalationManager 
                    claim={currentClaim} 
                    policy={activePolicy} 
                    onClose={() => setShowEscalationManager(false)} 
                />
            )}

            {showSimulator && activePolicy && (
                <ScenarioSimulatorModal 
                    inventory={inventory}
                    policy={activePolicy}
                    onClose={() => setShowSimulator(false)}
                />
            )}
        </div>
    );
};

export default StrategicDashboard;
