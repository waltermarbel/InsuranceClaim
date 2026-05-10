import React, { useState, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { generateScribeDocument, suggestScribeDocuments } from '../services/geminiService.ts';
import { DocumentTextIcon, SparklesIcon, ClipboardDocumentListIcon, CloudArrowUpIcon, ShieldCheckIcon, LightBulbIcon } from './icons.tsx';
import { AdvisorStrategyModal } from './AdvisorStrategyModal.tsx';

const TEMPLATES_LIST = [
    "Cover Letter",
    "Detailed Narrative",
    "Missing Receipts Statement",
    "Repair Affidavit",
    "Proof of Loss Form Response"
];

export const ScribeModule: React.FC = () => {
    const { claims, currentClaimId, accountHolder, policies, unlinkedProofs, inventory } = useAppState();
    const dispatch = useAppDispatch();

    const [templates, setTemplates] = useState(TEMPLATES_LIST);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [customInstructions, setCustomInstructions] = useState('');
    const [draftContent, setDraftContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestions, setSuggestions] = useState<{title: string; rationale: string; suggestedInstructions: string}[]>([]);
    const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
    
    const activeClaim = currentClaimId ? claims.find(c => c.id === currentClaimId) : claims[0];
    const activePolicy = activeClaim ? policies.find(p => p.id === activeClaim.linkedPolicyId) : null;
    
    // Deduce vault proofs (all available evidence)
    const [vaultProofs, setVaultProofs] = useState<any[]>([]);
    useEffect(() => {
        const uniqueProofs = new Map<string, any>();
        unlinkedProofs.forEach(p => uniqueProofs.set(p.id, p));
        inventory.forEach(item => item.linkedProofs.forEach(p => uniqueProofs.set(p.id, p)));
        claims.forEach(claim => {
            claim.incidentDetails?.aleProofs?.forEach(p => uniqueProofs.set(p.id, p));
            claim.incidentDetails?.claimDocuments?.forEach(p => uniqueProofs.set(p.id, p));
        });
        setVaultProofs(Array.from(uniqueProofs.values()));
    }, [unlinkedProofs, inventory, claims]);

    useEffect(() => {
        if (!selectedTemplate && templates.length > 0) {
            setSelectedTemplate(templates[0]);
        }
    }, [selectedTemplate, templates]);

    const handleGetSuggestions = async () => {
        if (!activeClaim) return;
        setIsSuggesting(true);
        try {
            const data = await suggestScribeDocuments(
                activeClaim.incidentDetails,
                activeClaim.incidentDetails?.timelineEvents || [],
                vaultProofs
            );
            setSuggestions(data);
        } catch(e) {
            console.error(e);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSelectSuggestion = (sug: any) => {
        if (!templates.includes(sug.title)) {
            setTemplates(prev => [sug.title, ...prev]);
        }
        setSelectedTemplate(sug.title);
        setCustomInstructions(sug.suggestedInstructions);
    };

    const handleGenerate = async () => {
        if (!activeClaim) return;
        setIsGenerating(true);
        try {
            const content = await generateScribeDocument(
                selectedTemplate,
                activeClaim.incidentDetails,
                accountHolder,
                activePolicy,
                activeClaim.incidentDetails?.timelineEvents || [],
                vaultProofs,
                customInstructions
            );
            setDraftContent(content);
            dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'SCRIBE_GENERATE', details: `Generated ${selectedTemplate} document via Scribe.`, app: 'Assert' } });
        } catch (error) {
            console.error("Scribe generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!activeClaim) {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 text-center text-slate-500">
                <p>No active claim to pull context from. Please create a claim first.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-2">
                        <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
                        The Scribe
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm lg:text-base">Reactive document generation utilizing Timeline and Vault telemetry.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow overflow-hidden">
                {/* Configuration Sidebar */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-5 overflow-y-auto flex flex-col h-full">
                    <h2 className="font-bold text-slate-800 mb-4 border-b pb-2">Document Setup</h2>
                    
                    <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold uppercase text-indigo-800 flex items-center gap-1.5">
                                <LightBulbIcon className="h-4 w-4" /> AI Suggestions
                            </h3>
                            <button 
                                onClick={handleGetSuggestions}
                                disabled={isSuggesting}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white px-2 py-1 rounded shadow-sm border border-indigo-100 disabled:opacity-50 transition"
                            >
                                {isSuggesting ? 'Analyzing...' : 'Analyze Claim'}
                            </button>
                        </div>
                        {suggestions.length > 0 ? (
                            <div className="space-y-2">
                                {suggestions.map((sug, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleSelectSuggestion(sug)}
                                        className={`p-2.5 rounded-lg border text-sm cursor-pointer transition ${selectedTemplate === sug.title ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-indigo-100 hover:border-indigo-300'}`}
                                    >
                                        <div className="font-bold mb-0.5">{sug.title}</div>
                                        <div className={`text-xs ${selectedTemplate === sug.title ? 'text-indigo-100' : 'text-slate-500'}`}>{sug.rationale}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-indigo-600/70">Our AI can read your timeline and vault evidence to suggest the most crucial documents you should draft right now.</p>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Template Type</label>
                        <div className="space-y-2">
                            {templates.map(temp => (
                                <button
                                    key={temp}
                                    onClick={() => setSelectedTemplate(temp)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedTemplate === temp ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'hover:bg-slate-50 border-transparent text-slate-600'} border`}
                                >
                                    {temp}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Custom Instructions (Optional)</label>
                        <textarea
                            value={customInstructions}
                            onChange={(e) => setCustomInstructions(e.target.value)}
                            placeholder="E.g., Emphasize the urgency of the temporary housing need..."
                            rows={3}
                            className="w-full text-sm border-slate-200 rounded p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Context Indication */}
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 mb-6">
                        <div className="font-bold text-slate-700 mb-1 flex items-center gap-1"><ClipboardDocumentListIcon className="h-4 w-4"/> Source Data</div>
                        <ul className="list-disc leading-relaxed pl-5 space-y-1">
                            <li>Claim: {activeClaim.name}</li>
                            <li>Events: {activeClaim.incidentDetails?.timelineEvents?.length || 0} loaded</li>
                            <li>Vault items: {vaultProofs.length} loaded</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition disabled:bg-slate-400 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? 'Drafting...' : 'Generate Document'}
                        <SparklesIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Editor Surface */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden h-[70vh] lg:h-auto">
                    <div className="bg-slate-800 text-slate-200 px-4 py-3 flex justify-between items-center text-sm font-semibold">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            Current Draft: {selectedTemplate}
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="hover:text-emerald-300 transition flex items-center gap-1 text-emerald-400 font-bold mr-2" onClick={() => setIsAdvisorOpen(true)}>
                                <ShieldCheckIcon className="h-4 w-4"/> Get Acquisition Strategy
                            </button>
                            <button className="hover:text-white transition flex items-center gap-1" onClick={() => {
                                const blob = new Blob([draftContent], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${selectedTemplate.replace(/\s+/g, '_')}_Draft.txt`;
                                a.click();
                            }}>
                                <CloudArrowUpIcon className="h-4 w-4"/> Export
                            </button>
                        </div>
                    </div>
                    {draftContent ? (
                        <textarea
                            className="flex-grow w-full p-6 text-slate-800 bg-transparent resize-none focus:outline-none focus:ring-0 leading-relaxed font-serif"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                        />
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <DocumentTextIcon className="h-16 w-16 mb-4 text-slate-200 opacity-50" />
                            <p className="text-lg">No document drafted yet.</p>
                            <p className="text-sm mt-2 max-w-md">Configure your options in the sidebar and click Generate Document. The Scribe will intelligently correlate timeline events and vault evidence.</p>
                        </div>
                    )}
                </div>
            </div>

            <AdvisorStrategyModal 
                isOpen={isAdvisorOpen} 
                onClose={() => setIsAdvisorOpen(false)} 
                documentType={selectedTemplate} 
            />
        </div>
    );
};
