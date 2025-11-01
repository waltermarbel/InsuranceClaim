import React, { useMemo } from 'react';
import { InventoryItem, ProcessingInference, ClaimDetails } from '../types.ts';
import { CubeIcon, LinkIcon, ReceiptIcon, ExclamationTriangleIcon, SpinnerIcon, CheckCircleIcon, XCircleIcon, TagIcon } from './icons.tsx';
import { CATEGORY_ICONS } from '../constants.ts';

interface InferenceCardProps {
    inference: ProcessingInference;
    existingItem?: InventoryItem; // Pass the full item if it's a match
    onToggleSelection: (proofId: string) => void;
    onImageZoom: (imageUrl: string) => void;
    claimDetails: ClaimDetails;
}

const InferenceCard: React.FC<InferenceCardProps> = ({ inference, existingItem, onToggleSelection, onImageZoom, claimDetails }) => {
    const { proof, status, userSelection } = inference;
    const isApproved = userSelection === 'approved';

    const isDateInvalid = useMemo(() => {
        if (inference.analysisType === 'NEW_ITEM') {
            const purchaseDate = inference.synthesizedItem?.purchaseDate;
            const lossDate = claimDetails.dateOfLoss;
            return purchaseDate && lossDate && new Date(purchaseDate) > new Date(lossDate);
        }
        if (inference.analysisType === 'ALE_EXPENSE') {
            const expenseDateStr = inference.aleDetails?.date;
            const { startDate, endDate } = claimDetails.claimDateRange || {};
            if (expenseDateStr && startDate && endDate) {
                const expenseDate = new Date(expenseDateStr);
                return expenseDate < new Date(startDate) || expenseDate > new Date(endDate);
            }
        }
        return false;
    }, [inference, claimDetails]);

    const getIcon = () => {
        if (status === 'processing') return <SpinnerIcon className="h-6 w-6 text-primary" />;
        switch (inference.analysisType) {
            case 'NEW_ITEM': return <CubeIcon className="h-6 w-6 text-success" />;
            case 'EXISTING_ITEM_MATCH': return <LinkIcon className="h-6 w-6 text-blue-500" />;
            case 'ALE_EXPENSE': return <ReceiptIcon className="h-6 w-6 text-amber-600" />;
            default: return <ExclamationTriangleIcon className="h-6 w-6 text-medium" />;
        }
    };

    const getTitle = () => {
        if (status === 'processing') return "Analyzing...";
        if (status === 'error') return "Analysis Error";
        switch (inference.analysisType) {
            case 'NEW_ITEM': return "New Item Suggested";
            case 'EXISTING_ITEM_MATCH': return "Existing Item Match";
            case 'ALE_EXPENSE': return "Expense Identified";
            default: return "Unclear Proof";
        }
    };

    const borderColor = isApproved ? 'border-primary/50' : 'border-slate-200';
    const bgColor = isApproved ? 'bg-primary/5' : 'bg-white';
    
    return (
        <div className={`rounded-lg shadow-sm border ${borderColor} ${bgColor} transition-colors duration-300`}>
            <div className="p-4 flex flex-col sm:flex-row items-start gap-4">
                <img 
                    src={proof.dataUrl} 
                    alt={proof.fileName} 
                    className="w-full sm:w-24 h-24 object-cover rounded-md flex-shrink-0 bg-slate-100 cursor-pointer" 
                    onClick={() => onImageZoom(proof.dataUrl)}
                />
                <div className="flex-grow w-full">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex-shrink-0">{getIcon()}</span>
                                <h3 className="font-bold text-dark font-heading">{getTitle()}</h3>
                            </div>
                            <p className="text-xs text-medium mt-1 truncate" title={proof.fileName}>{proof.fileName}</p>
                        </div>
                        <button 
                            onClick={() => onToggleSelection(proof.id)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-colors"
                            title={isApproved ? 'Reject this suggestion' : 'Approve this suggestion'}
                        >
                            {isApproved 
                                ? <><CheckCircleIcon className="h-5 w-5 text-success"/> <span className="text-success">Approved</span></> 
                                : <><XCircleIcon className="h-5 w-5 text-medium"/> <span className="text-medium">Rejected</span></>
                            }
                        </button>
                    </div>
                    <div className="mt-3 text-sm text-dark space-y-1 pl-8">
                        {status === 'complete' && inference.analysisType === 'NEW_ITEM' && inference.synthesizedItem && (
                            <>
                                <p><strong>Name:</strong> {inference.synthesizedItem.itemName}</p>
                                <p className="flex items-center gap-1"><strong>Category:</strong> 
                                    {React.createElement(CATEGORY_ICONS[inference.synthesizedItem.itemCategory || 'Other'] || TagIcon, {className: "h-4 w-4 text-medium"})}
                                    {inference.synthesizedItem.itemCategory}
                                </p>
                                <p><strong>Cost:</strong> ${(inference.synthesizedItem.originalCost || 0).toLocaleString()}</p>
                                {inference.synthesizedItem.isGift && <p className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 inline-block">Gift</p>}
                            </>
                        )}
                        {status === 'complete' && inference.analysisType === 'EXISTING_ITEM_MATCH' && existingItem && (
                             <>
                                <p><strong>Matched Item:</strong> {existingItem.itemName}</p>
                                <p><strong>Confidence:</strong> {inference.matchConfidence}%</p>
                            </>
                        )}
                        {status === 'complete' && inference.analysisType === 'ALE_EXPENSE' && inference.aleDetails && (
                            <>
                                <p><strong>Vendor:</strong> {inference.aleDetails.vendor}</p>
                                <p><strong>Amount:</strong> ${inference.aleDetails.amount.toLocaleString()}</p>
                                <p><strong>Type:</strong> {inference.aleDetails.costType}</p>
                            </>
                        )}
                        {status === 'error' && <p className="text-danger text-xs">{inference.errorMessage}</p>}
                        {(status === 'complete' && inference.analysisType === 'UNCLEAR') && (
                            <div>
                                <p className="text-medium italic">{inference.proofSummary || "The AI could not determine the purpose of this proof."}</p>
                                {inference.errorMessage && <p className="text-danger text-xs mt-1">{inference.errorMessage}</p>}
                            </div>
                        )}
                         {isDateInvalid && (
                            <div className="flex items-center gap-1.5 text-xs text-warning mt-1">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                <span>Date is outside of claim timeframe.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InferenceCard;