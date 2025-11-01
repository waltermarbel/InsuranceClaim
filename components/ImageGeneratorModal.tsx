import React, { useState } from 'react';
import { InventoryItem } from '../types.ts';
import { XIcon, SparklesIcon, SpinnerIcon, PhotoIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface ImageGeneratorModalProps {
    item: InventoryItem;
    onClose: () => void;
    onGenerate: (item: InventoryItem, dataUrl: string) => void;
}

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ item, onClose, onGenerate }) => {
    const [prompt, setPrompt] = useState(item.itemName);
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const dataUrl = await geminiService.generateImage(prompt, aspectRatio);
            setGeneratedImage(dataUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to generate image.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (generatedImage) {
            onGenerate(item, generatedImage);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading">Generate Image for {item.itemName}</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-dark">Prompt</label>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-dark">Aspect Ratio</label>
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm bg-white">
                                {aspectRatios.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md disabled:opacity-50">
                            <SparklesIcon className="h-5 w-5" />
                            <span>{isLoading ? 'Generating...' : 'Generate Image'}</span>
                        </button>
                         {generatedImage && <button onClick={handleSave} className="w-full px-4 py-2 text-sm font-semibold bg-success text-white rounded-md">Save Generated Image</button>}
                    </div>
                    <div className="relative aspect-square w-full bg-slate-100 rounded-md overflow-hidden flex items-center justify-center">
                        {isLoading && <SpinnerIcon className="h-10 w-10 text-primary" />}
                        {error && <p className="text-sm text-danger text-center p-4">{error}</p>}
                        {generatedImage && <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />}
                        {!isLoading && !generatedImage && !error && 
                            <div className="text-center text-slate-400">
                                <PhotoIcon className="h-12 w-12 mx-auto" />
                                <p className="text-sm mt-2">Image will appear here</p>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGeneratorModal;