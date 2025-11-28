import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, Proof, ProcessingInference, ClaimDetails } from '../types.ts';
import { WorkflowProgressBar } from './WorkflowProgressBar.tsx';
import * as geminiService from '../services/geminiService.ts';
import InferenceCard from './InferenceCard.tsx';
import { CheckCircleIcon, XCircleIcon } from './icons.tsx';
import { useAppState } from '../context/AppContext.tsx';

interface ProcessingPreviewProps {
    proofs: Proof[];
    onFinalize: (inferences: ProcessingInference[]) => void;
    onCancel: () => void;
    onImageZoom: (imageUrl: string) => void;
}

const ProcessingPreview: React.FC<ProcessingPreviewProps> = ({ proofs, onFinalize, onCancel, onImageZoom }) => {
    const { inventory, policies, claimDetails } = useAppState();
    const policy = useMemo(() => policies.find(p => p.isActive), [policies]);
    const policyHolders = useMemo(() => policy?.policyHolder.split(/ & | and /i).map(s => s.trim()).filter(Boolean) || [], [policy]);
    
    const [inferences, setInferences] = useState<ProcessingInference[]>([]);
    const [processingIndex, setProcessingIndex] = useState(0);

    useEffect(() => {
        // Initialize inference state for all proofs
        const initialInferences = proofs.map(proof => ({
            proof,
            status: 'pending' as const,
            userSelection: 'approved' as const, // Default to approved
        }));
        setInferences(initialInferences);
    }, [proofs]);

    useEffect(() => {
        if (processingIndex < proofs.length) {
            const processProof = async () => {
                const proofToProcess = proofs[processingIndex];
                
                // Set status to processing
                setInferences(prev => prev.map((inf, i) => i === processingIndex ? { ...inf, status: 'processing' } : inf));

                try {
                    const result = await geminiService.analyzeProofForClaimableItem(proofToProcess, inventory);
                    
                    let userSelection: 'approved' | 'rejected' = 'approved';
                    if(result.analysisType === 'EXISTING_ITEM_MATCH' && (result.matchConfidence || 0) < 75) {
                        userSelection = 'rejected';
                    }
                     if(result.analysisType === 'UNCLEAR') {
                        userSelection = 'rejected';
                    }

                    setInferences(prev => prev.map((inf, i) => 
                        i === processingIndex 
                        ? { ...inf, ...result, status: 'complete', userSelection } 
                        : inf
                    ));
                } catch (error) {
                    setInferences(prev => prev.map((inf, i) => 
                        i === processingIndex 
                        ? { ...inf, status: 'error', errorMessage: error instanceof Error ? error.message : 'Unknown error', userSelection: 'rejected' } 
                        : inf
                    ));
                } finally {
                    setProcessingIndex(prev => prev + 1);
                }
            };
            processProof();
        }
    }, [processingIndex, proofs, inventory]);
    
    const handleToggleSelection = (proofId: string) => {
        setInferences(prev => prev.map(inf => 
            inf.proof.id === proofId 
            ? { ...inf, userSelection: inf.userSelection === 'approved' ? 'rejected' : 'approved' }
            : inf
        ));
    };

    const completedCount = inferences.filter(inf => inf.status === 'complete' || inf.status === 'error').length;
    const approvedCount = inferences.filter(inf => inf.userSelection === 'approved').length;
    const progressPercentage = proofs.length > 0 ? (completedCount / proofs.length) * 100 : 0;
    
    const currentStep = useMemo(() => {
        if (progressPercentage < 100) return 1; // AI Analysis
        return 2; // Review
    }, [progressPercentage]);
    
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-12">
                <WorkflowProgressBar steps={["Upload", "AI Analysis", "Review & Finalize"]} currentStep={currentStep} />
            </div>

            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-dark tracking-tight font-heading">AI Processing & Review</h1>
                <p className="mt-3 text-lg text-medium max-w-3xl mx-auto">
                   Your files are being analyzed. Review the AI's findings below and approve what you want to add to your vault.
                </p>
            </div>
            
             <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.5s ease' }}></div>
            </div>
            
            <div className="space-y-4">
                {inferences.map(inference => (
                    <InferenceCard
                        key={inference.proof.id}
                        inference={inference}
                        existingItem={inference.matchedItemId ? inventory.find(i => i.id === inference.matchedItemId) : undefined}
                        onToggleSelection={handleToggleSelection}
                        onImageZoom={onImageZoom}
                        claimDetails={claimDetails}
                    />
                ))}
            </div>

            <div className="mt-8 pt-6 border-t sticky bottom-0 bg-light/80 backdrop-blur-sm py-4">
                <div className="flex justify-between items-center">
                    <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-white text-danger border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                         <XCircleIcon className="h-5 w-5"/> Cancel
                    </button>
                    <button 
                        onClick={() => onFinalize(inferences)}
                        disabled={progressPercentage < 100}
                        className="flex items-center justify-center space-x-2 px-6 py-3 text-base font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         <CheckCircleIcon className="h-6 w-6"/>
                         <span>Finalize & Add {approvedCount} Item(s) to Vault</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProcessingPreview;