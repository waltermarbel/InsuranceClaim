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
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
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
            const generated = await geminiService.generateClaimNarrative(claimDetails, accountHolder, itemsToInclude, policy);
            setNarrative(generated);
        } catch (error) {
            console.error(error);
            setNarrative("Failed to generate a narrative. Please write one manually.");
        } finally {
            setIsNarrativeLoading(false);
        }
    }, [claimDetails, accountHolder, policy, claimedItems, selectedItemIds]);

    useEffect(() => {
        generateNarrative();
    }, []); // Run only on initial mount
    
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
                <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2"><DocumentTextIcon className="h-6 w-6 text-primary"/> ClaimShield Package Generator</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    {/* Left: Narrative */}
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h3 className="font-bold text-dark font-heading">Executive Summary Draft</h3>
                            <button onClick={generateNarrative} disabled={isNarrativeLoading} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">Refresh</button>
                        </div>
                        <p className="text-sm text-medium">AI-generated summary of the loss event. Edit for accuracy before locking the dossier.</p>
                        {isNarrativeLoading ? (
                            <div className="h-64 flex items-center justify-center bg-slate-100 rounded-md"><SpinnerIcon className="h-8 w-8 text-primary"/></div>
                        ) : (
                            <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={15} className="w-full p-2 border border-slate-300 rounded-md text-sm"/>
                        )}
                    </div>
                    {/* Right: Items */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-dark font-heading">Forensic Inventory ({selectedItemIds.length} items)</h3>
                        <p className="text-sm text-medium">Select items to include in the sworn proof of loss.</p>
                        {selectedItemIds.length > 5 && (
                             <div className="p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-900">
                                <div className="flex">
                                    <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-amber-500" /></div>
                                    <div className="ml-3">
                                        <p className="text-sm font-bold">Strategic Warning</p>
                                        <p className="mt-1 text-xs">Submitting a large number of items in a single claim may attract additional scrutiny. Ensure all selected items have "Green" proof status.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-2 bg-slate-50">
                            {claimedItems.length > 0 ? claimedItems.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-md shadow-sm">
                                    <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => handleToggleItem(item.id)} className="h-5 w-5 rounded border-slate-400 text-primary focus:ring-primary"/>
                                    <CubeIcon className="h-6 w-6 text-medium"/>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-dark text-sm">{item.itemName}</p>
                                        <p className="text-xs text-medium">{item.itemCategory}</p>
                                    </div>
                                    <p className="text-sm font-bold text-dark">${(item.replacementCostValueRCV || item.originalCost || 0).toLocaleString()}</p>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-medium py-8">No items are currently marked as "claimed".</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 border-t space-x-3">
                     <div>
                        <p className="text-sm text-medium">Total Claim Value:</p>
                        <p className="text-lg font-bold text-dark">${totalSelectedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">Cancel</button>
                        <button onClick={handleGenerateZip} disabled={isGenerating || selectedItemIds.length === 0} className="flex items-center justify-center space-x-2 px-6 py-3 text-base font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                            {isGenerating ? <SpinnerIcon className="h-6 w-6"/> : <DocumentTextIcon className="h-6 w-6"/>}
                            <span>{isGenerating ? 'Compiling Dossier...' : `Download ClaimShield Package`}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimReportGenerator;