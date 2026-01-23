
import React, { useState } from 'react';
import { Proof } from '../types.ts';
import { XIcon, LinkIcon, DocumentTextIcon } from './icons.tsx';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';

interface LinkEvidenceModalProps {
    unlinkedProofs: Proof[];
    onClose: () => void;
    onLink: (proofIds: string[]) => void;
}

const ProofOption: React.FC<{ proof: Proof; isSelected: boolean; onToggle: () => void }> = ({ proof, isSelected, onToggle }) => {
    const { dataUrl, isLoading } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || dataUrl;

    return (
        <div 
            onClick={onToggle}
            className={`cursor-pointer border rounded-lg p-2 flex items-center gap-3 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
        >
            <div className="h-12 w-12 flex-shrink-0 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                ) : proof.type === 'image' && displayUrl ? (
                    <img src={displayUrl} alt={proof.fileName} className="h-full w-full object-cover" />
                ) : (
                    <DocumentTextIcon className="h-6 w-6 text-slate-400" />
                )}
            </div>
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate" title={proof.fileName}>{proof.fileName}</p>
                <p className="text-xs text-slate-500">{new Date(proof.createdAt || '').toLocaleDateString()}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
        </div>
    );
};

const LinkEvidenceModal: React.FC<LinkEvidenceModalProps> = ({ unlinkedProofs, onClose, onLink }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleLink = () => {
        onLink(Array.from(selectedIds));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-dark font-heading flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary"/> Link Existing Evidence
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-grow">
                    {unlinkedProofs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>No unlinked proofs available in the Locker.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {unlinkedProofs.map(proof => (
                                <ProofOption 
                                    key={proof.id} 
                                    proof={proof} 
                                    isSelected={selectedIds.has(proof.id)} 
                                    onToggle={() => toggleSelection(proof.id)} 
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button 
                        onClick={handleLink} 
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        Link Selected ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LinkEvidenceModal;
