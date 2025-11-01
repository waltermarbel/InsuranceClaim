import React, { useState } from 'react';
import { Proof } from '../types.ts';
import { XIcon, SparklesIcon, SpinnerIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface ImageEditorModalProps {
    proof: Proof;
    onClose: () => void;
    onSave: (originalProof: Proof, newDataUrl: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ proof, onClose, onSave }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const newDataUrl = await geminiService.editImageWithPrompt(proof.dataUrl, prompt);
            onSave(proof, newDataUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to edit image.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading">Edit Image with AI</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="relative aspect-square w-full bg-slate-100 rounded-md overflow-hidden">
                        <img src={proof.dataUrl} alt="Original Proof" className="w-full h-full object-contain" />
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                                <SpinnerIcon className="h-10 w-10" />
                                <p className="mt-2 text-sm font-semibold">Generating...</p>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-sm text-danger text-center">{error}</p>}
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a retro filter..."
                            className="flex-grow p-2 border border-slate-300 rounded-md text-sm"
                            disabled={isLoading}
                        />
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md disabled:opacity-50">
                            <SparklesIcon className="h-5 w-5" />
                            <span>Generate</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;