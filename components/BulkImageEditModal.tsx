import React, { useState } from 'react';
import { XIcon, SparklesIcon, CheckCircleIcon } from './icons.tsx';

interface BulkImageEditModalProps {
    itemCount: number;
    onClose: () => void;
    onSave: (prompt: string) => void;
}

const BulkImageEditModal: React.FC<BulkImageEditModalProps> = ({ itemCount, onClose, onSave }) => {
    const [prompt, setPrompt] = useState('');

    const handleSave = () => {
        if (prompt.trim()) {
            onSave(prompt.trim());
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-primary"/>
                        Bulk Edit {itemCount} Image(s)
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-medium">
                        Enter a single prompt that will be applied to the primary image of all {itemCount} selected items. A new, edited image proof will be added to each item.
                    </p>
                    <div>
                        <label htmlFor="prompt" className="text-sm font-semibold text-dark">Editing Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm"
                            placeholder="e.g., Improve the lighting and color balance"
                        />
                    </div>
                </div>
                 <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!prompt.trim()}
                        className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Apply to All</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImageEditModal;