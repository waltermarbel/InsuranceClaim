
import React, { useState } from 'react';
import { ActiveClaim, ParsedPolicy, EscalationLetter, EscalationType } from '../types.ts';
import { XIcon, BoltIcon, DocumentTextIcon, SpinnerIcon, CheckCircleIcon, ShieldExclamationIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface EscalationManagerProps {
    claim: ActiveClaim;
    policy: ParsedPolicy;
    onClose: () => void;
}

const EscalationManager: React.FC<EscalationManagerProps> = ({ claim, policy, onClose }) => {
    const [selectedTrigger, setSelectedTrigger] = useState<EscalationType>('No Response (15 Days)');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLetter, setGeneratedLetter] = useState<EscalationLetter | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const letter = await geminiService.generateEscalationLetter(selectedTrigger, claim, policy);
            setGeneratedLetter(letter);
        } catch (error) {
            console.error(error);
            alert("Failed to generate escalation letter.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (generatedLetter) {
            navigator.clipboard.writeText(generatedLetter.content);
            alert("Letter copied to clipboard.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
                        <ShieldExclamationIcon className="h-6 w-6 text-rose-600"/> 
                        Automated Escalation Protocol
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition"><XIcon className="h-6 w-6"/></button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Select Trigger Event</h3>
                        <div className="space-y-3">
                            {['No Response (15 Days)', 'Lowball Offer (<80% RCV)', 'Partial Denial', 'Full Denial'].map((trigger) => (
                                <button
                                    key={trigger}
                                    onClick={() => { setSelectedTrigger(trigger as EscalationType); setGeneratedLetter(null); }}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                                        selectedTrigger === trigger 
                                        ? 'bg-rose-50 border-rose-500 shadow-sm ring-1 ring-rose-500' 
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold text-sm ${selectedTrigger === trigger ? 'text-rose-700' : 'text-slate-700'}`}>{trigger}</span>
                                        {selectedTrigger === trigger && <CheckCircleIcon className="h-4 w-4 text-rose-600"/>}
                                    </div>
                                </button>
                            ))}
                        </div>
                        
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <p className="font-bold flex items-center gap-1 mb-1"><BoltIcon className="h-3 w-3"/> Strategy Note:</p>
                            <p>Letters are generated using real-time statute citations (e.g. Unfair Claims Settlement Practices Act) to force a mandatory response.</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="w-full md:w-2/3 p-8 overflow-y-auto bg-white">
                        {!generatedLetter ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="bg-slate-100 p-4 rounded-full mb-4">
                                    <DocumentTextIcon className="h-10 w-10 text-slate-400"/>
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">Ready to Generate</h3>
                                <p className="text-slate-500 max-w-xs mt-2 mb-6">Create a formal legal demand letter tailored to the "{selectedTrigger}" scenario.</p>
                                <button 
                                    onClick={handleGenerate} 
                                    disabled={isGenerating}
                                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? <SpinnerIcon className="h-5 w-5"/> : <BoltIcon className="h-5 w-5"/>}
                                    {isGenerating ? 'Drafting Legal Response...' : 'Generate Escalation Letter'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{generatedLetter.title}</h3>
                                        <p className="text-sm text-slate-500 mt-1">Recipient: <span className="font-semibold text-slate-700">{generatedLetter.recipientType}</span></p>
                                    </div>
                                    <button onClick={handleCopy} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded hover:bg-primary/20 transition">Copy Text</button>
                                </div>

                                {generatedLetter.statutesCited.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {generatedLetter.statutesCited.map((statute, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-mono rounded border border-slate-200">{statute}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap shadow-inner">
                                    {generatedLetter.content}
                                </div>
                                
                                <div className="flex justify-end pt-4">
                                    <button onClick={() => setGeneratedLetter(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Regenerate</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EscalationManager;
