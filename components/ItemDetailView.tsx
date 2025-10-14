// Fix: Removed invalid file marker that was causing a parsing error.
import React, { useState, useEffect } from 'react';
import { InventoryItem, Proof, ParsedPolicy, AccountHolder, UploadProgress } from '../types';
import { ChevronLeftIcon, PlusIcon, TrashIcon, TagIcon, FolderIcon, SparklesIcon, GlobeIcon, DocumentMagnifyingGlassIcon, CalculatorIcon, TrophyIcon, PaperAirplaneIcon, LinkIcon, PencilIcon, XCircleIcon, CheckCircleIcon } from './icons';
import { ScoreIndicator } from './ScoreIndicator';
import { CurrencyInput } from './CurrencyInput';
import { CATEGORIES } from '../constants';
import InferenceCard from './InferenceCard';
import AnnotationEditor from './AnnotationEditor';

interface ItemDetailViewProps {
  item: InventoryItem;
  unlinkedProofs: Proof[];
  policy: ParsedPolicy | null;
  accountHolder: AccountHolder;
  onBack: () => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onFindMarketPrice: (item: InventoryItem) => void;
  onEnrichAsset: (item: InventoryItem) => void;
  onCalculateProofStrength: (item: InventoryItem) => void;
  onCalculateACV: (item: InventoryItem) => void;
  onFindHighestRCV: (item: InventoryItem) => void;
  onDraftClaim: (item: InventoryItem) => void;
  onFuzzyMatch: (item: InventoryItem) => void;
  onFindProductImage: (item: InventoryItem) => void;
  onLinkProof: (itemId: string, proofId: string) => void;
  onUnlinkProof: (itemId: string, proofId: string) => void;
  onRejectSuggestion: (itemId: string, proofId: string) => void;
  onAddProof: (itemId: string, files: File[]) => void;
  uploadProgress: UploadProgress | null;
}

const ItemDetailView: React.FC<ItemDetailViewProps> = ({
    item, unlinkedProofs, onBack, onUpdateItem, onDeleteItem, onFindMarketPrice, onEnrichAsset, onCalculateProofStrength, onCalculateACV, onFindHighestRCV, onDraftClaim, onUnlinkProof, onAddProof, onLinkProof, onRejectSuggestion, onFindProductImage, uploadProgress
}) => {
    const [editableItem, setEditableItem] = useState(item);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const proofInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditableItem(item);
    }, [item]);
    
    const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onAddProof(item.id, Array.from(event.target.files));
        }
    };

    const handleAnnotate = (proof: Proof) => {
        setSelectedProof(proof);
        setIsAnnotating(true);
    };

    const handleSaveAnnotation = async (newDataUrl: string) => {
        if (selectedProof) {
            const newProof: Proof = {
                ...selectedProof,
                id: `proof-${Date.now()}`,
                dataUrl: newDataUrl,
                createdBy: 'User',
                fileName: `annotated_${selectedProof.fileName}`
            }
            const file = new File([await (await fetch(newDataUrl)).blob()], newProof.fileName, {type: newProof.mimeType});
            onAddProof(item.id, [file]);
        }
        setIsAnnotating(false);
        setSelectedProof(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableItem(prev => ({ ...prev, [name]: value }));
    };

    const handleCostChange = (value: number, field: 'originalCost' | 'replacementCostValueRCV') => {
        setEditableItem(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdateItem(editableItem);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableItem(item);
        setIsEditing(false);
    };
    
    const primaryProof = item.linkedProofs.length > 0 ? item.linkedProofs[0] : null;

    return (
        <div className="max-w-7xl mx-auto">
             {isAnnotating && selectedProof && (
                <AnnotationEditor 
                    proof={selectedProof} 
                    onSave={handleSaveAnnotation} 
                    onCancel={() => { setIsAnnotating(false); setSelectedProof(null); }} 
                />
            )}
            <input type="file" ref={proofInputRef} onChange={handleProofFileChange} className="hidden" accept="image/*,application/pdf" multiple />
            <button onClick={onBack} className="flex items-center space-x-2 text-sm font-semibold text-medium hover:text-dark mb-6">
                <ChevronLeftIcon className="h-5 w-5" />
                <span>Back to Ledger</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Image & Proofs */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                            {primaryProof ? (
                                <img src={primaryProof.dataUrl} alt={primaryProof.fileName} className="w-full h-full object-cover" />
                            ) : (
                                <FolderIcon className="h-24 w-24 text-slate-300" />
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-dark font-heading">Linked Proofs</h3>
                            <button onClick={() => proofInputRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                                <PlusIcon className="h-3 w-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {uploadProgress && Object.entries(uploadProgress).map(([fileName, progress]) => {
                                // Fix: Cast progress value to `any` to resolve TypeScript error where type is inferred as `unknown`.
                                const percentage = (progress as any).total > 0 ? Math.round(((progress as any).loaded / (progress as any).total) * 100) : 0;
                                return (
                                    <div key={fileName} className="p-2 bg-slate-50 rounded-md">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <p className="text-medium truncate pr-4">{fileName}</p>
                                            <p className="font-semibold text-dark">{percentage}%</p>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1">
                                            <div className="bg-primary h-1 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {item.linkedProofs.map(proof => (
                                <div key={proof.id} className="group flex items-center justify-between p-2 bg-slate-50 rounded-md hover:bg-slate-100">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <img src={proof.dataUrl} alt={proof.fileName} className="h-8 w-8 rounded-md object-cover flex-shrink-0" />
                                        <span className="text-sm text-medium truncate">{proof.fileName}</span>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleAnnotate(proof)} className="p-1 text-medium hover:text-primary"><PencilIcon className="h-4 w-4"/></button>
                                        <button onClick={() => onUnlinkProof(item.id, proof.id)} className="p-1 text-medium hover:text-danger"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            ))}
                            {item.linkedProofs.length === 0 && !uploadProgress && <p className="text-sm text-center text-medium py-4">No proofs linked.</p>}
                        </div>
                    </div>
                </div>

                {/* Middle Column: Details & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                             <div>
                                {isEditing ? (
                                    <input type="text" name="itemName" value={editableItem.itemName} onChange={handleChange} className="text-3xl font-bold tracking-tight text-dark font-heading border-b-2 border-primary -ml-1 p-0.5" />
                                ) : (
                                    <h1 className="text-3xl font-bold tracking-tight text-dark font-heading">{item.itemName}</h1>
                                )}
                                {isEditing ? (
                                    <select name="itemCategory" value={editableItem.itemCategory} onChange={handleChange} className="text-sm text-medium mt-1 border-slate-300 rounded-md">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-sm font-semibold text-primary mt-1">{item.itemCategory}</p>
                                )}
                             </div>
                            {item.proofStrengthScore !== undefined && <ScoreIndicator score={item.proofStrengthScore} />}
                        </div>
                        
                         {isEditing ? (
                            <textarea name="itemDescription" value={editableItem.itemDescription} onChange={handleChange} rows={3} className="mt-4 text-medium w-full p-2 border border-slate-300 rounded-md" />
                         ) : (
                            <p className="mt-4 text-medium">{item.itemDescription}</p>
                         )}

                        <div className="mt-6 border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            {isEditing ? (
                                <>
                                 <div><label className="text-xs text-medium">Original Cost</label><CurrencyInput value={editableItem.originalCost} onChange={(v) => handleCostChange(v, 'originalCost')} className="w-full text-sm font-semibold p-1 border rounded-md" /></div>
                                 <div><label className="text-xs text-medium">RCV</label><CurrencyInput value={editableItem.replacementCostValueRCV || 0} onChange={(v) => handleCostChange(v, 'replacementCostValueRCV')} className="w-full text-sm font-semibold p-1 border rounded-md" /></div>
                                 <div><label className="text-xs text-medium">Purchase Date</label><input type="date" name="purchaseDate" value={editableItem.purchaseDate || ''} onChange={handleChange} className="w-full text-sm font-semibold p-1 border rounded-md"/></div>
                                 <div><label className="text-xs text-medium">Brand</label><input type="text" name="brand" value={editableItem.brand || ''} onChange={handleChange} className="w-full text-sm font-semibold p-1 border rounded-md"/></div>
                                 <div><label className="text-xs text-medium">Model</label><input type="text" name="model" value={editableItem.model || ''} onChange={handleChange} className="w-full text-sm font-semibold p-1 border rounded-md"/></div>
                                 <div><label className="text-xs text-medium">Serial #</label><input type="text" name="serialNumber" value={editableItem.serialNumber || ''} onChange={handleChange} className="w-full text-sm font-semibold p-1 border rounded-md"/></div>
                                </>
                            ) : (
                                <>
                                    <div><p className="text-xs text-medium">Original Cost</p><p className="font-semibold text-dark">${item.originalCost.toLocaleString()}</p></div>
                                    <div><p className="text-xs text-medium">Replacement Cost (RCV)</p><p className="font-semibold text-dark">${(item.replacementCostValueRCV || 0).toLocaleString()}</p></div>
                                    <div><p className="text-xs text-medium">Actual Cash Value (ACV)</p><p className="font-semibold text-dark">${(item.actualCashValueACV || 0).toLocaleString()}</p></div>
                                    <div><p className="text-xs text-medium">Purchase Date</p><p className="font-semibold text-dark">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</p></div>
                                    <div><p className="text-xs text-medium">Brand</p><p className="font-semibold text-dark">{item.brand || 'N/A'}</p></div>
                                    <div><p className="text-xs text-medium">Model</p><p className="font-semibold text-dark">{item.model || 'N/A'}</p></div>
                                    <div><p className="text-xs text-medium">Serial #</p><p className="font-semibold text-dark">{item.serialNumber || 'N/A'}</p></div>
                                </>
                            )}
                        </div>
                        <div className="mt-6 border-t pt-4 flex flex-wrap gap-2">
                             {isEditing ? (
                                <div className="flex justify-end w-full gap-2">
                                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-md">Cancel</button>
                                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md">Save</button>
                                </div>
                             ) : (
                                <>
                                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"><PencilIcon className="h-4 w-4" /> Edit Details</button>
                                <button onClick={() => onDeleteItem(item.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white text-danger border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"><TrashIcon className="h-4 w-4"/> Delete Item</button>
                                </>
                             )}
                        </div>
                    </div>
                     {item.suggestedProofs && item.suggestedProofs.length > 0 && (
                        <InferenceCard
                            title="Suggested Proofs"
                            icon={<LinkIcon />}
                            color="medium"
                        >
                            <div className="space-y-3">
                                {item.suggestedProofs.map(suggestion => {
                                    const proof = unlinkedProofs.find(p => p.id === suggestion.proofId);
                                    if (!proof) return null;

                                    return (
                                        <div key={suggestion.proofId} className="flex items-center justify-between p-2 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <img src={proof.dataUrl} alt={proof.fileName} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-semibold text-dark truncate flex items-center gap-1.5">
                                                      {proof.createdBy === 'AI' && <GlobeIcon className="h-4 w-4 text-blue-500 flex-shrink-0" title="Sourced from web by AI" />}
                                                      <span>{proof.fileName}</span>
                                                       {proof.predictedCategory && (
                                                            <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">{proof.predictedCategory}</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-medium italic">"{suggestion.reason}"</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{suggestion.confidence}%</span>
                                                <button onClick={() => onRejectSuggestion(item.id, proof.id)} className="p-1.5 text-medium hover:bg-danger/10 hover:text-danger rounded-full transition-colors" title="Reject Suggestion">
                                                    <XCircleIcon className="h-5 w-5"/>
                                                </button>
                                                <button onClick={() => onLinkProof(item.id, proof.id)} className="p-1.5 text-medium hover:bg-success/10 hover:text-success rounded-full transition-colors" title="Link Proof">
                                                    <CheckCircleIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </InferenceCard>
                    )}

                    <InferenceCard
                        title="AI Actions"
                        icon={<SparklesIcon />}
                        color="primary"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <button onClick={() => onFindMarketPrice(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><GlobeIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Market Price</span></button>
                            <button onClick={() => onEnrichAsset(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><DocumentMagnifyingGlassIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Enrich Data</span></button>
                             <button onClick={() => onCalculateProofStrength(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><CheckCircleIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Proof Strength</span></button>
                             <button onClick={() => onCalculateACV(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><CalculatorIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Calculate ACV</span></button>
                             <button onClick={() => onFindHighestRCV(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><TrophyIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Find Max RCV</span></button>
                            <button onClick={() => onFindProductImage(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><TagIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Find Image</span></button>
                             {item.status !== 'claimed' ? (
                                <button onClick={() => onDraftClaim(item)} className="p-3 text-center bg-slate-50 hover:bg-primary/10 rounded-md"><PaperAirplaneIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Draft Claim</span></button>
                            ) : (
                                <button onClick={() => onUpdateItem({...item, status: 'active'})} className="p-3 text-center bg-slate-50 hover:bg-amber-100 rounded-md"><XCircleIcon className="h-6 w-6 mx-auto text-slate-500"/><span className="text-xs font-semibold mt-1 block text-medium">Remove from Claim</span></button>
                            )}
                        </div>
                    </InferenceCard>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailView;
