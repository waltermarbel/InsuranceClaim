import React, { useState, useCallback, useRef } from 'react';
import { XIcon, SparklesIcon, SpinnerIcon, UploadIcon } from './icons.tsx';
import { fileToDataUrl } from '../utils/fileUtils.ts';

interface ImageAnalysisModalProps {
    onClose: () => void;
    onAnalyze: (files: File[], prompt: string) => Promise<string>;
}

const defaultPrompt = "Analyze these images for personal property. For each distinct item you identify, provide a name, a brief description, estimated condition (New, Good, Fair, etc.), and any other notable details like brand or material. If there are multiple images of the same item, group your analysis.";

const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({ onClose, onAnalyze }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [prompt, setPrompt] = useState(defaultPrompt);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(async (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;
        const fileList = Array.from(selectedFiles);
        setFiles(fileList);
        setAnalysisResult(null);
        setError(null);

        const dataUrls = await Promise.all(
            fileList.map(file => fileToDataUrl(file))
        );
        setPreviews(dataUrls);
    }, []);
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFileChange(e.dataTransfer.files);
    };

    const handleAnalyzeClick = async () => {
        if (files.length === 0 || !prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const result = await onAnalyze(files, prompt);
            setAnalysisResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-primary"/> AI Image Analysis
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Left Column: Upload & Prompt */}
                    <div className="space-y-4 flex flex-col">
                         <div
                            className="flex-grow border-2 border-dashed border-slate-300 rounded-lg p-4 text-center transition-colors flex flex-col justify-center items-center"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                         >
                             <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                            {previews.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {previews.map((src, index) => (
                                        <img key={index} src={src} alt={`preview ${index}`} className="w-full aspect-square object-cover rounded-md"/>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-medium">
                                    <UploadIcon className="h-12 w-12 mx-auto text-slate-400" />
                                    <p className="mt-2 font-semibold">Drag & drop images here</p>
                                    <p className="text-xs">or</p>
                                    <button onClick={() => fileInputRef.current?.click()} className="text-primary font-semibold text-sm hover:underline">browse files</button>
                                </div>
                            )}
                         </div>
                        <div>
                            <label className="text-sm font-semibold text-dark">Your Question</label>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm" />
                        </div>
                    </div>
                    {/* Right Column: Results */}
                    <div className="space-y-4">
                        <button onClick={handleAnalyzeClick} disabled={isLoading || files.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md disabled:opacity-50">
                            {isLoading ? <SpinnerIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
                            <span>{isLoading ? 'Analyzing...' : `Analyze ${files.length} Image(s)`}</span>
                        </button>
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 h-full min-h-[200px] overflow-y-auto">
                            <h3 className="font-semibold text-dark">AI Response:</h3>
                            {isLoading && (
                                <div className="flex items-center justify-center h-full text-medium">
                                    <p>Thinking...</p>
                                </div>
                            )}
                            {error && <p className="text-sm text-danger">{error}</p>}
                            {analysisResult && (
                                <div className="mt-2 text-sm text-dark whitespace-pre-wrap prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br />') }}/>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageAnalysisModal;