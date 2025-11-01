import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem } from '../types.ts';
import { XIcon, CheckCircleIcon, SpinnerIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface AudioRecorderModalProps {
    item: InventoryItem;
    onClose: () => void;
    onSave: (item: InventoryItem, audioBlob: Blob, transcription: string) => void;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ item, onClose, onSave }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcription, setTranscription] = useState<string>('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    useEffect(() => {
        return () => {
            // Clean up stream and URL on unmount
            streamRef.current?.getTracks().forEach(track => track.stop());
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                audioChunks.current = [];
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setAudioBlob(null);
            setTranscription('');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please grant permission.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
    };

    const handleTranscribe = async () => {
        if (!audioBlob) return;
        setIsTranscribing(true);
        try {
            const result = await geminiService.transcribeAudio(audioBlob);
            setTranscription(result);
        } catch (error) {
            console.error("Transcription failed:", error);
            setTranscription("Error: Could not transcribe audio.");
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleSave = () => {
        if (audioBlob) {
            onSave(item, audioBlob, transcription);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading">Record Audio Note for {item.itemName}</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-slate-100 rounded-md">
                        {!isRecording && !audioBlob && (
                            <button onClick={startRecording} className="px-6 py-3 text-lg font-bold rounded-md bg-primary text-white">Start Recording</button>
                        )}
                        {isRecording && (
                            <button onClick={stopRecording} className="px-6 py-3 text-lg font-bold rounded-md bg-danger text-white animate-pulse">Stop Recording</button>
                        )}
                        {audioUrl && (
                            <div className="w-full">
                                <audio src={audioUrl} controls className="w-full" />
                            </div>
                        )}
                    </div>

                    {audioBlob && (
                        <div className="space-y-3">
                            <button onClick={handleTranscribe} disabled={isTranscribing} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-primary border border-primary rounded-md disabled:opacity-50">
                                {isTranscribing ? <SpinnerIcon className="h-5 w-5" /> : null}
                                {isTranscribing ? 'Transcribing...' : 'Transcribe with AI'}
                            </button>
                            {transcription && (
                                <div>
                                    <label className="text-xs font-semibold text-medium">Transcription:</label>
                                    <textarea value={transcription} readOnly rows={4} className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-sm" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleSave} disabled={!audioBlob} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Save Audio Note</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioRecorderModal;