import React, { useState, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { InventoryItem, ParsedPolicy, ClaimDetails, AccountHolder } from '../types.ts';
import { XIcon, DocumentTextIcon, SpinnerIcon, CubeIcon, ExclamationTriangleIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { dataUrlToBlob, sanitizeFileName } from '../utils/fileUtils.ts';
import { useAppState } from '../context/AppContext.tsx';

interface ClaimReportGeneratorProps {
    onClose: () => void;
}

const ClaimReportGenerator: React.FC<ClaimReportGeneratorProps> = ({ onClose }) => {
    const { inventory, policies, claims, currentClaimId, accountHolder } = useAppState();
    const policy = useMemo(() => policies.find(p => p.isActive), [policies]);
    const activeClaim = useMemo(() => claims.find(c => c.id === currentClaimId), [claims, currentClaimId]);
    const claimDetails = activeClaim?.incidentDetails;
    
    const [narrative, setNarrative] = useState('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // ECON Phase 4 signals
    const [hasSignaledNoMoreDocuments, setHasSignaledNoMoreDocuments] = useState(false);
    const [isNarrativeApproved, setIsNarrativeApproved] = useState(false);
    
    const claimedItems = useMemo(() => inventory.filter(item => item.status === 'claimed'), [inventory]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => claimedItems.map(item => item.id));

    const generateNarrative = useCallback(async () => {
        setIsNarrativeLoading(true);
        const itemsToInclude = claimedItems.filter(item => selectedItemIds.includes(item.id));
        if (!policy || !claimDetails) {
            setNarrative("Error: No active insurance policy or claim found.");
            setIsNarrativeLoading(false);
            return;
        }
        if (itemsToInclude.length === 0) {
            setNarrative("No items selected to include in the report.");
            setIsNarrativeLoading(false);
            return;
        }
        try {
            // Reusing existing geminiService narrative generation (or we could use a specific ECON one)
            const generated = await geminiService.generateClaimNarrative(claimDetails, accountHolder, itemsToInclude, policy);
            setNarrative(generated);
            setIsNarrativeApproved(false);
        } catch (error) {
            console.error(error);
            setNarrative("Failed to generate a narrative. Please write one manually.");
        } finally {
            setIsNarrativeLoading(false);
        }
    }, [claimDetails, accountHolder, policy, claimedItems, selectedItemIds]);

    useEffect(() => {
        if (hasSignaledNoMoreDocuments && !narrative && !isNarrativeLoading) {
            generateNarrative();
        }
    }, [hasSignaledNoMoreDocuments, narrative, isNarrativeLoading, generateNarrative]);
    
    const handleToggleItem = (itemId: string) => {
        setSelectedItemIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    };

    const handleGenerateZip = async () => {
        if (!policy || !claimDetails) {
            alert("Cannot generate report: No active policy or claim found.");
            return;
        }

        setIsGenerating(true);
        const selectedItems = claimedItems.filter(item => selectedItemIds.includes(item.id));
        
        try {
            const zip = new JSZip();
            const dateStr = new Date().toISOString().split('T')[0];
            
            // 1. Executive Summary
            let execSummary = `# Executive Summary: Claim ${claimDetails.name}\n\n`;
            execSummary += `**Date:** ${dateStr}\n`;
            execSummary += `**Policyholder:** ${accountHolder.name}\n`;
            execSummary += `**Policy Number:** ${policy.policyNumber}\n\n`;
            execSummary += `## Incident Overview\n${narrative}\n\n`;
            
            const totalRcv = selectedItems.reduce((acc, i) => acc + (i.replacementCostValueRCV || 0), 0);
            execSummary += `## Financial Summary\n`;
            execSummary += `- **Total Replacement Cost Value (RCV):** $${totalRcv.toLocaleString()}\n`;
            execSummary += `- **Applicable Deductible:** $${policy.deductible.toLocaleString()}\n`;
            execSummary += `- **Net Claim Demand:** $${Math.max(0, totalRcv - policy.deductible).toLocaleString()}\n`;
            
            zip.file("00_Executive_Summary.md", execSummary);

            // 2. Sworn Proof of Loss (Template)
            const proofOfLoss = `SWORN STATEMENT IN PROOF OF LOSS\n\nTo: ${policy.provider}\nPolicy: ${policy.policyNumber}\nInsured: ${accountHolder.name}\n\nAt the time of loss, the interest of the insured in the property described was sole and unconditional ownership.\n\nThe actual cash value of said property at the time of the loss was $${totalRcv.toLocaleString()}.\n\nThe total amount claimed under this policy is $${Math.max(0, totalRcv - policy.deductible).toLocaleString()}.\n\nThe said loss did not originate by any act, design or procurement on the part of your insured.\n\n_________________________\nSignature of Insured\nDate: ${dateStr}`;
            zip.file("01_Sworn_Proof_of_Loss.txt", proofOfLoss);

            // 3. Forensic Inventory
            let inventoryCsv = "Item ID,Description,Category,Brand,Model,Serial Number,Purchase Date,Original Cost,RCV,Proof Type\n";
            selectedItems.forEach(item => {
                inventoryCsv += `"${item.id}","${item.itemName} - ${item.itemDescription}","${item.itemCategory}","${item.brand}","${item.model}","${item.serialNumber}","${item.purchaseDate}",${item.originalCost},${item.replacementCostValueRCV},"${item.linkedProofs.map(p=>p.type).join(';')}"\n`;
            });
            zip.file("02_Forensic_Inventory.csv", inventoryCsv);

            // 4. Legal Memorandum (Placeholder logic for prototype)
            const legalMemo = `LEGAL MEMORANDUM RE: CLAIM SUBMISSION\n\n` +
                              `Pursuant to state insurance regulations regarding Fair Claims Settlement Practices, attached is the complete proof of loss.\n\n` +
                              `NOTICE OF RIGHTS:\n` + 
                              `1. We request acknowledgement of this claim within 15 days.\n` +
                              `2. We request a coverage decision within 30 days of this submission.\n` +
                              `3. Any ambiguity in the policy must be construed in favor of the insured (Contra Proferentem).\n\n` +
                              `Govern yourselves accordingly.`;
            zip.file("03_Legal_Memorandum.txt", legalMemo);

            // Proofs Folder
            const proofsFolder = zip.folder("04_Supporting_Evidence");
            if (!proofsFolder) throw new Error("Could not create proofs folder.");

            for (const item of selectedItems) {
                const itemFolderName = sanitizeFileName(`${item.itemCategory}_${item.itemName}`);
                const itemFolder = proofsFolder.folder(itemFolderName);
                if (!itemFolder) continue;

                for (const proof of item.linkedProofs) {
                    if (proof.dataUrl) {
                        const blob = dataUrlToBlob(proof.dataUrl);
                        itemFolder.file(sanitizeFileName(proof.fileName), blob);
                    }
                }
            }
            
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `ClaimShield_Dossier_${sanitizeFileName(claimDetails.name)}_${dateStr}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onClose();

        } catch (error) {
            console.error("Failed to generate ZIP", error);
            alert("An error occurred while generating the report package.");
        } finally {
            setIsGenerating(false);
        }
    };

    const totalSelectedValue = useMemo(() => {
        return claimedItems
            .filter(item => selectedItemIds.includes(item.id))
            .reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
    }, [claimedItems, selectedItemIds]);
    
    if (!policy || !claimDetails) {
        return (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-50">
                        <h2 className="text-xl font-bold text-dark font-heading">Error</h2>
                        <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="p-8 text-center text-medium">
                        <p>An active insurance policy and a selected claim are required to generate a claim report. Please check your settings.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-900 text-white">
                    <h2 className="text-xl font-bold font-heading flex items-center gap-2"><DocumentTextIcon className="h-6 w-6 text-indigo-400"/> ECON Phase 4: Final Compilation</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-800 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="p-6 md:p-8 space-y-8 overflow-y-auto bg-slate-50">
                    {/* Step 1: No More Documents Signal */}
                    <div className={`p-6 rounded-xl border transition-all duration-300 ${hasSignaledNoMoreDocuments ? 'bg-white border-emerald-200' : 'bg-white border-indigo-200 shadow-md'}`}>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            Step 1: Evidence Lock
                            {hasSignaledNoMoreDocuments && <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest">Locked</span>}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 mb-4">Signal that all available evidence has been submitted and no further documents will be provided.</p>
                        
                        {!hasSignaledNoMoreDocuments ? (
                            <button 
                                onClick={() => setHasSignaledNoMoreDocuments(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                            >
                                Signal: All Evidence Submitted
                            </button>
                        ) : (
                            <div className="text-sm text-emerald-700 flex items-center gap-2 font-semibold">
                                <CubeIcon className="h-5 w-5" /> Evidence intake sequence closed. System ready for narrative generation.
                            </div>
                        )}
                    </div>
                    
                    {/* Step 2: Final Review */}
                    <div className={`p-6 rounded-xl border transition-all duration-300 ${!hasSignaledNoMoreDocuments ? 'opacity-50 pointer-events-none bg-slate-100' : (isNarrativeApproved ? 'bg-white border-emerald-200' : 'bg-white border-indigo-200 shadow-md')}`}>
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                Step 2: Final Narrative Review
                                {isNarrativeApproved && <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest">Approved</span>}
                            </h3>
                            {hasSignaledNoMoreDocuments && !isNarrativeApproved && (
                                <button onClick={generateNarrative} disabled={isNarrativeLoading} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                                    <SpinnerIcon className={`h-3 w-3 ${isNarrativeLoading ? 'animate-spin' : 'hidden'}`} /> Refresh Draft
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-slate-600 mb-4">Review and explicitly approve the system-generated narrative. The narrative optimizes the evidence array to maximize asset liquidation.</p>
                        
                        {isNarrativeLoading ? (
                            <div className="h-48 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg">
                                <SpinnerIcon className="h-8 w-8 text-indigo-500 animate-spin mb-2"/>
                                <p className="text-sm text-slate-500 font-semibold animate-pulse">Compiling Strategic Narrative...</p>
                            </div>
                        ) : (
                            <>
                                <textarea 
                                    value={narrative} 
                                    onChange={(e) => {
                                        setNarrative(e.target.value);
                                        if (isNarrativeApproved) setIsNarrativeApproved(false);
                                    }} 
                                    rows={10} 
                                    className="w-full p-4 border border-slate-300 rounded-lg text-sm bg-white font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder={hasSignaledNoMoreDocuments ? "Enter or generate a narrative..." : "Awaiting evidence lock..."}
                                    disabled={!hasSignaledNoMoreDocuments}
                                />
                                {hasSignaledNoMoreDocuments && !isNarrativeApproved && narrative && (
                                    <div className="mt-4 flex justify-end">
                                        <button 
                                            onClick={() => setIsNarrativeApproved(true)}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                                        >
                                            Authorize Narrative
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    
                    {/* Step 3: Document Assembly */}
                    <div className={`space-y-4 p-6 rounded-xl border transition-all duration-300 ${!isNarrativeApproved ? 'opacity-50 pointer-events-none bg-slate-100' : 'bg-white border-indigo-200 shadow-md'}`}>
                        <h3 className="font-bold text-lg text-slate-800">Step 3: Document Assembly & Export</h3>
                        <p className="text-sm text-slate-600">The system will now compile the approved narrative, selected inventory items, and evidence payloads into a single submission dossier.</p>
                        
                        {/* Included Items Summary */}
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <h4 className="font-bold text-sm text-slate-700 mb-2 flex items-center justify-between">
                                Included Inventory ({selectedItemIds.length} items)
                                <span className="text-lg font-black text-emerald-700">${totalSelectedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </h4>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {claimedItems.length > 0 ? claimedItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 py-1">
                                        <input type="checkbox" disabled={!hasSignaledNoMoreDocuments || isNarrativeApproved} checked={selectedItemIds.includes(item.id)} onChange={() => handleToggleItem(item.id)} className="h-4 w-4 rounded border-slate-400 text-indigo-600"/>
                                        <div className="flex-grow flex justify-between">
                                            <p className={`text-sm ${selectedItemIds.includes(item.id) ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{item.itemName}</p>
                                            <p className={`text-sm ${selectedItemIds.includes(item.id) ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>${(item.replacementCostValueRCV || item.originalCost || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-500 italic">No claimed items available.</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-900 border-t border-slate-800">
                     <p className="text-sm text-slate-400">Total Asset Liquidation Target: <span className="text-white font-bold">${totalSelectedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition">Abort</button>
                        <button 
                            onClick={handleGenerateZip} 
                            disabled={isGenerating || !isNarrativeApproved || selectedItemIds.length === 0} 
                            className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg shadow border border-indigo-500 hover:bg-indigo-500 transition disabled:opacity-50 disabled:bg-slate-700 disabled:border-slate-600"
                        >
                            {isGenerating ? <SpinnerIcon className="h-5 w-5 animate-spin"/> : <DocumentTextIcon className="h-5 w-5"/>}
                            <span>{isGenerating ? 'Compiling Dossier...' : `Assemble Final Dossier`}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimReportGenerator;