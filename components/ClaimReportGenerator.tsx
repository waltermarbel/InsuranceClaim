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
    const { inventory, policies, claimDetails, accountHolder } = useAppState();
    const policy = useMemo(() => policies.find(p => p.isActive), [policies]);
    
    const [narrative, setNarrative] = useState('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const claimedItems = useMemo(() => inventory.filter(item => item.status === 'claimed'), [inventory]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => claimedItems.map(item => item.id));

    const generateNarrative = useCallback(async () => {
        setIsNarrativeLoading(true);
        const itemsToInclude = claimedItems.filter(item => selectedItemIds.includes(item.id));
        if (!policy) {
            setNarrative("Error: No active insurance policy found.");
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
        if (!policy) {
            alert("Cannot generate report: No active policy found.");
            return;
        }

        setIsGenerating(true);
        const selectedItems = claimedItems.filter(item => selectedItemIds.includes(item.id));
        
        try {
            const zip = new JSZip();
            
            let reportContent = `# Claim Report: ${claimDetails.name}\n\n`;
            reportContent += `**Policyholder:** ${accountHolder.name}\n`;
            reportContent += `**Policy Number:** ${policy.policyNumber}\n`;
            reportContent += `**Date of Loss:** ${claimDetails.dateOfLoss}\n\n`;
            reportContent += `## Claim Narrative\n\n${narrative}\n\n`;
            reportContent += `## Claimed Items Summary\n\n`;
            reportContent += `| Item Name | Category | RCV |\n`;
            reportContent += `| :--- | :--- | :--- |\n`;
            let totalRcv = 0;
            for (const item of selectedItems) {
                const rcv = item.replacementCostValueRCV || item.originalCost || 0;
                totalRcv += rcv;
                reportContent += `| ${item.itemName} | ${item.itemCategory} | $${rcv.toFixed(2)} |\n`;
            }
            reportContent += `| **Total** | | **$${totalRcv.toFixed(2)}** |\n`;

            zip.file("Claim_Report.md", reportContent);

            const proofsFolder = zip.folder("proofs");
            if (!proofsFolder) throw new Error("Could not create proofs folder.");

            for (const item of selectedItems) {
                const itemFolderName = sanitizeFileName(item.itemName);
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
            link.download = `Claim_Report_${sanitizeFileName(claimDetails.name)}_${new Date().toISOString().split('T')[0]}.zip`;
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
    
    if (!policy) {
        return (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg my-8 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-50">
                        <h2 className="text-xl font-bold text-dark font-heading">Error</h2>
                        <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="p-8 text-center text-medium">
                        <p>An active insurance policy is required to generate a claim report. Please set an active policy and try again.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2"><DocumentTextIcon className="h-6 w-6 text-primary"/> Claim Report Generator</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    {/* Left: Narrative */}
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h3 className="font-bold text-dark font-heading">Claim Narrative</h3>
                            <button onClick={generateNarrative} disabled={isNarrativeLoading} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">Refresh</button>
                        </div>
                        <p className="text-sm text-medium">The AI has drafted a cover letter for your claim. You can edit it here before exporting.</p>
                        {isNarrativeLoading ? (
                            <div className="h-64 flex items-center justify-center bg-slate-100 rounded-md"><SpinnerIcon className="h-8 w-8 text-primary"/></div>
                        ) : (
                            <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={15} className="w-full p-2 border border-slate-300 rounded-md text-sm"/>
                        )}
                    </div>
                    {/* Right: Items */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-dark font-heading">Included Items ({selectedItemIds.length} / {claimedItems.length})</h3>
                        <p className="text-sm text-medium">Select which claimed items to include in this report package.</p>
                        {selectedItemIds.length > 5 && (
                             <div className="p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-900">
                                <div className="flex">
                                    <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-amber-500" /></div>
                                    <div className="ml-3">
                                        <p className="text-sm font-bold">Strategic Warning</p>
                                        <p className="mt-1 text-xs">Submitting a large number of items in a single claim may attract additional scrutiny. For best results, consider generating separate reports for smaller batches of high-value items.</p>
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
                        <p className="text-sm text-medium">Total Report Value:</p>
                        <p className="text-lg font-bold text-dark">${totalSelectedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">Cancel</button>
                        <button onClick={handleGenerateZip} disabled={isGenerating || selectedItemIds.length === 0} className="flex items-center justify-center space-x-2 px-6 py-3 text-base font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                            {isGenerating ? <SpinnerIcon className="h-6 w-6"/> : <DocumentTextIcon className="h-6 w-6"/>}
                            <span>{isGenerating ? 'Generating...' : `Generate Package (${selectedItemIds.length})`}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimReportGenerator;