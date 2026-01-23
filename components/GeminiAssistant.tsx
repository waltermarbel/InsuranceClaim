
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { XIcon, SparklesIcon, CubeIcon, CheckIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from './icons.tsx';
import { InventoryItem, ParsedPolicy, ChatMessage } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { useAppState } from '../context/AppContext.tsx';

// Audio encoding/decoding utilities for Live API & TTS
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface GeminiAssistantProps {
  onClose: () => void;
  onNavigate: (tab: 'evidence' | 'inventory' | 'claim') => void;
  onSearch: (query: string) => void;
}

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ onClose, onNavigate, onSearch }) => {
  const { inventory, policies } = useAppState();
  const policy = useMemo(() => policies.find(p => p.isActive), [policies]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Live API & TTS refs
  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTime = useRef(0);
  const sources = useRef(new Set<AudioBufferSourceNode>());


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopLiveSession = useCallback(() => {
    setIsLive(false);
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);

    sessionPromise.current?.then(session => session.close()).catch(console.error);

    streamRef.current = null;
    scriptProcessorRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromise.current = null;
  }, []);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
        if(isLive) {
            stopLiveSession();
        }
    };
  }, [isLive, stopLiveSession]);

  const startLiveSession = useCallback(async () => {
    if (isLive) {
      stopLiveSession();
      return;
    }
    setIsLive(true);
    setMessages([]);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    sessionPromise.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current.onaudioprocess = (event) => {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) {
                        int16[i] = inputData[i] * 32768;
                    }
                    const pcmBlob: GenaiBlob = {
                        data: encode(new Uint8Array(int16.buffer)),
                        mimeType: 'audio/pcm;rate=16000',
                    };
                    sessionPromise.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessorRef.current);
                scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    const outputCtx = outputAudioContextRef.current!;
                    nextStartTime.current = Math.max(nextStartTime.current, outputCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.addEventListener('ended', () => sources.current.delete(source));
                    source.start(nextStartTime.current);
                    nextStartTime.current += audioBuffer.duration;
                    sources.current.add(source);
                }
            },
            onerror: (e: ErrorEvent) => {
                console.error('Live session error:', e);
                stopLiveSession();
            },
            onclose: (e: CloseEvent) => {
                // Already handled in stopLiveSession
            },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: geminiService.getAssistantContext(inventory, policy),
        },
    });
  }, [isLive, stopLiveSession, inventory, policy]);


  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: inputText };
    const loadingMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', text: '', isLoading: true };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputText('');

    try {
      const response = await geminiService.getChatResponse(messages, inputText, isThinkingMode, inventory, policy);
      
      let responseText = response.text || "";
      const toolCalls = response.functionCalls;

      if (toolCalls && toolCalls.length > 0) {
          for (const call of toolCalls) {
              if (call.name === 'navigate') {
                  const view = call.args['view'] as 'evidence' | 'inventory' | 'claim' | 'dashboard';
                  if (view === 'dashboard') {
                      onNavigate('inventory'); // Map dashboard to inventory view
                  } else {
                      onNavigate(view);
                  }
                  if (!responseText) responseText = `Navigating to ${view}...`;
                  else responseText += `\n\n(Navigating to ${view})`;
              } else if (call.name === 'searchVault') {
                  const query = call.args['query'] as string;
                  onSearch(query);
                  onNavigate('inventory'); // Ensure we are on inventory page to see results
                  if (!responseText) responseText = `Searching inventory for "${query}"...`;
                  else responseText += `\n\n(Searching for "${query}")`;
              }
          }
      }

      const finalMessage: ChatMessage = { ...loadingMessage, text: responseText, isLoading: false };
      setMessages(prev => prev.map(m => m.id === loadingMessage.id ? finalMessage : m));
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = { ...loadingMessage, text: "Sorry, I encountered an error. Please try again.", isLoading: false };
      setMessages(prev => prev.map(m => m.id === loadingMessage.id ? errorMessage : m));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
          <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-primary"/> AI Assistant</h2>
          <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
        </div>
        
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <div className="flex-shrink-0 bg-primary/10 rounded-full p-2 mt-1"><SparklesIcon className="h-5 w-5 text-primary"/></div>}
              <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100 text-dark'}`}>
                {msg.isLoading ? <div className="animate-pulse">...</div> : <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />}
              </div>
            </div>
          ))}
           {isLive && messages.length === 0 && (
                <div className="text-center text-medium py-10">
                    <div className="animate-pulse">
                        <svg className="h-12 w-12 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm0 12.5a4.5 4.5 0 0 1-4.5-4.5H6a6 6 0 0 0 5.25 5.95V21h1.5v-2.55A6 6 0 0 0 18 10h-1.5a4.5 4.5 0 0 1-4.5 4.5z" /></svg>
                    </div>
                    <p className="mt-4 font-semibold">Voice session is active. Start speaking.</p>
                </div>
            )}
          <div ref={chatEndRef} />
        </div>
        
        <div className="p-4 bg-slate-50 border-t">
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="thinking-mode" className="flex items-center gap-2 text-sm font-semibold text-dark cursor-pointer">
              <input type="checkbox" id="thinking-mode" checked={isThinkingMode} onChange={(e) => setIsThinkingMode(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"/>
              Thinking Mode
            </label>
            <p className="text-xs text-medium">(Gemini 3.0 Pro + Reasoning)</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={isLive ? "Voice session is active..." : "Ask me to navigate or search..."}
              className="flex-grow p-2 border border-slate-300 rounded-md text-sm"
              disabled={isLive}
            />
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md" disabled={isLive}>Send</button>
            <button
                onClick={startLiveSession}
                className={`p-2 rounded-full border transition-colors ${isLive ? 'bg-danger text-white border-danger' : 'bg-white text-medium border-slate-300'}`}
                title={isLive ? 'Stop Voice Session' : 'Start Voice Session'}
            >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm0 12.5a4.5 4.5 0 0 1-4.5-4.5H6a6 6 0 0 0 5.25 5.95V21h1.5v-2.55A6 6 0 0 0 18 10h-1.5a4.5 4.5 0 0 1-4.5 4.5z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistant;
