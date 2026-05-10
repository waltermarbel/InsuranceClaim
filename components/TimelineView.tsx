import React, { useState, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { TimelineEvent } from '../types.ts';
import { PlusIcon, TrashIcon, PencilIcon, ClockIcon, DocumentTextIcon, ExclamationTriangleIcon, SparklesIcon, PhotoIcon } from './icons.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { processEvidenceForTimeline } from '../services/geminiService.ts';

export const TimelineView: React.FC = () => {
    const { timeline, policies, inventory, unlinkedProofs } = useAppState();
    const activePolicy = policies.find(p => p.isActive);
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
    const [isProcessingEvidence, setIsProcessingEvidence] = useState(false);
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidenceText, setEvidenceText] = useState('');
    const [evidenceResults, setEvidenceResults] = useState<{
        extractedEvents: { date: string, description: string, type: 'FACT' | 'NARRATIVE_ELEMENT' }[],
        inferredEvents: { date: string, description: string, type: 'INFERRED_NARRATIVE' }[],
        contradictionAlerts: string[]
    } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

    const [formData, setFormData] = useState<Partial<TimelineEvent>>({
        type: 'NARRATIVE_ELEMENT'
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const id = editingEvent ? editingEvent.id : `evt_${Date.now()}`;
        const newEvent = { ...formData, id } as TimelineEvent;

        let newTimeline;
        if (editingEvent) {
            newTimeline = timeline.map(evt => evt.id === id ? newEvent : evt);
        } else {
            newTimeline = [...timeline, newEvent];
        }
        
        // Sort chronologically
        newTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        dispatch({ type: 'UPDATE_TIMELINE', payload: newTimeline });
        setIsModalOpen(false);
        setEditingEvent(null);
        setFormData({ type: 'NARRATIVE_ELEMENT' });
    };

    const handleEdit = (evt: TimelineEvent) => {
        setEditingEvent(evt);
        setFormData(evt);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        dispatch({ type: 'UPDATE_TIMELINE', payload: timeline.filter(evt => evt.id !== id) });
    };

    const handleNew = () => {
        setEditingEvent(null);
        setFormData({ type: 'NARRATIVE_ELEMENT' });
        setIsModalOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToggleLink = (type: 'linkedItemIds' | 'linkedDocumentIds', valId: string) => {
        setFormData(prev => {
            const current = (prev[type] as string[]) || [];
            if (current.includes(valId)) {
                return { ...prev, [type]: current.filter(x => x !== valId) };
            } else {
                return { ...prev, [type]: [...current, valId] };
            }
        });
    };

    const handleProcessEvidence = async () => {
        setIsProcessingEvidence(true);
        setEvidenceResults(null);
        try {
            // Ideally we pass highValueClaimAvenues from policy analysis, using a dummy default if not there
            const avenues = activePolicy?.highValueClaimAvenues || []; 
            const dataToProcess = evidenceFile || evidenceText;
            const contextText = evidenceFile ? evidenceText : ''; 
            
            const results = await processEvidenceForTimeline(dataToProcess, contextText, timeline, avenues);
            setEvidenceResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessingEvidence(false);
        }
    };

    const handleMergeEvidence = () => {
        if (!evidenceResults) return;
        
        let newTimeline = [...timeline];
        
        // Remove all previous INFERRED_NARRATIVEs as we are replacing them with the new cohesive set
        newTimeline = newTimeline.filter(evt => evt.type !== 'INFERRED_NARRATIVE');

        evidenceResults.extractedEvents.forEach(evt => {
            newTimeline.push({
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                title: 'Extracted Fact',
                date: evt.date,
                description: evt.description,
                type: evt.type,
                linkedDocumentIds: [],
                linkedItemIds: [],
                involvedPersons: []
            });
        });
        evidenceResults.inferredEvents.forEach(evt => {
            newTimeline.push({
                id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                title: 'Inferred Event',
                date: evt.date,
                description: evt.description,
                type: evt.type,
                linkedDocumentIds: [],
                linkedItemIds: [],
                involvedPersons: []
            });
        });

        newTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        dispatch({ type: 'UPDATE_TIMELINE', payload: newTimeline });
        
        setIsEvidenceModalOpen(false);
        setEvidenceFile(null);
        setEvidenceText('');
        setEvidenceResults(null);
    };

    // Calculate contradictions locally
    const getContradictions = () => {
        const facts = timeline.filter(t => t.type === 'FACT');
        const alerts: string[] = [];

        timeline.forEach(event => {
            facts.forEach(fact => {
                if (event.id !== fact.id) {
                    const eventHasBeforeKeyword = event.description.toLowerCase().includes('before ' + fact.description.toLowerCase());
                    const factDate = new Date(fact.date).getTime();
                    const eventDate = new Date(event.date).getTime();
                    
                    if (eventHasBeforeKeyword && eventDate > factDate) {
                         alerts.push(`Event "${event.description}" claims to happen before fact "${fact.description}", but its timestamp is later.`);
                    }
                }
            });
        });
        return alerts;
    };

    const alerts = getContradictions();

    return (
        <div className="flex flex-col h-full bg-slate-50 relative p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-primary" />
                    Narrative Timeline
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEvidenceModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <SparklesIcon className="h-4 w-4" /> Ingest Evidence
                    </button>
                    <button 
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <PlusIcon className="h-4 w-4" /> Manual Event
                    </button>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg shadow-sm flex gap-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-rose-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-rose-800">Timeline Contradiction</h3>
                                <p className="text-xs text-rose-700 mt-1">{alert}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-grow overflow-y-auto pr-4">
                {timeline.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <ClockIcon className="h-12 w-12 opacity-20 mb-4" />
                        <p>No events in timeline yet. Start building your claim narrative.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {timeline.map((event) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={event.id} 
                                className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-colors"
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${event.type === 'FACT' ? 'bg-emerald-100 text-emerald-600' : event.type === 'INFERRED_NARRATIVE' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {event.type === 'FACT' ? <DocumentTextIcon className="h-5 w-5" /> : event.type === 'INFERRED_NARRATIVE' ? <SparklesIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-mono text-sm font-bold text-slate-500">{new Date(event.date).toLocaleString()}</p>
                                            {event.title && <h4 className="text-lg font-bold text-slate-800 mt-1">{event.title}</h4>}
                                            <p className={`mt-1 text-base ${event.type === 'INFERRED_NARRATIVE' ? 'text-fuchsia-900 italic' : 'text-slate-800'} ${event.title ? 'text-sm opacity-80' : ''}`}>{event.description}</p>
                                            {(event.linkedItemIds?.length! > 0 || event.linkedDocumentIds?.length! > 0) && (
                                                <div className="flex gap-3 mt-3">
                                                    {event.linkedItemIds?.length! > 0 && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                                            <span>Items Linked: {event.linkedItemIds?.length}</span>
                                                        </span>
                                                    )}
                                                    {event.linkedDocumentIds?.length! > 0 && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                                            <PhotoIcon className="h-3.5 w-3.5" />
                                                            <span>Evidence Attached: {event.linkedDocumentIds?.length}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${event.type === 'FACT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : event.type === 'INFERRED_NARRATIVE' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                                                {event.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                                    <button onClick={() => handleEdit(event)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(event.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-heading text-slate-800">
                                {editingEvent ? 'Edit Event' : 'Add Event to Timeline'}
                            </h3>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        name="date" 
                                        value={formData.date || ''} 
                                        onChange={handleChange} 
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                                    <input 
                                        type="text" 
                                        name="title" 
                                        value={formData.title || ''} 
                                        onChange={handleChange} 
                                        placeholder="Brief title (e.g., Police Arrived)" 
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Notes</label>
                                    <textarea 
                                        name="description" 
                                        value={formData.description || ''} 
                                        onChange={handleChange} 
                                        placeholder="What happened? Add details, recollections, or evidence context..." 
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-24"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Event Type</label>
                                    <select 
                                        name="type" 
                                        value={formData.type || 'NARRATIVE_ELEMENT'} 
                                        onChange={handleChange} 
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        <option value="NARRATIVE_ELEMENT">Narrative Element (Assumption/Recollection)</option>
                                        <option value="FACT">Fact (Backed by hard evidence)</option>
                                        <option value="INFERRED_NARRATIVE" disabled>AI Inferred Narrative</option>
                                    </select>
                                </div>
                                
                                {inventory.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link Schedule Items</label>
                                        <div className="max-h-32 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                            {inventory.map(item => (
                                                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={formData.linkedItemIds?.includes(item.id) || false}
                                                        onChange={() => handleToggleLink('linkedItemIds', item.id)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    {item.itemName}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {(() => {
                                    const allProofs = [...unlinkedProofs, ...inventory.flatMap(i => i.linkedProofs)];
                                    if (allProofs.length === 0) return null;
                                    return (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link Evidence</label>
                                            <div className="max-h-32 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                                {allProofs.map(proof => (
                                                    <label key={proof.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={formData.linkedDocumentIds?.includes(proof.id) || false}
                                                            onChange={() => handleToggleLink('linkedDocumentIds', proof.id)}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="truncate">{proof.fileName}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 rounded-xl font-bold bg-primary text-white shadow hover:shadow-md transition-all hover:-translate-y-0.5"
                                >
                                    Save Event
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Evidence Modal */}
            <AnimatePresence>
            {isEvidenceModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col h-[85vh]"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-indigo-600 text-white">
                            <div>
                                <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                                    <SparklesIcon className="h-6 w-6 text-indigo-300" />
                                    AI Evidence Ingestion
                                </h3>
                                <p className="text-sm text-indigo-100 mt-1">Upload evidence or provide a statement to extract facts and build narrative.</p>
                            </div>
                            <button onClick={() => { setIsEvidenceModalOpen(false); setEvidenceResults(null); setEvidenceFile(null); setEvidenceText(''); }} className="p-2 bg-indigo-500 hover:bg-indigo-400 rounded-full transition text-white">
                                ✕
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 bg-slate-50">
                            <div className="w-full md:w-1/3 flex flex-col gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload Evidence (Optional)</label>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                                    <div 
                                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${evidenceFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 bg-slate-50'}`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <PhotoIcon className={`h-8 w-8 mx-auto mb-2 ${evidenceFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                                        <p className="text-sm font-bold text-slate-700">{evidenceFile ? evidenceFile.name : 'Click to Upload Document/Photo'}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Statement / Context</label>
                                    <textarea 
                                        value={evidenceText}
                                        onChange={(e) => setEvidenceText(e.target.value)}
                                        placeholder="Describe the event, or provide context for the uploaded file..."
                                        className="w-full flex-1 min-h-[10rem] p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleProcessEvidence}
                                    disabled={isProcessingEvidence || (!evidenceFile && !evidenceText.trim())}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessingEvidence ? <span className="animate-pulse">Processing Evidence...</span> : 'Analyze Evidence'}
                                    {!isProcessingEvidence && <SparklesIcon className="h-4 w-4" />}
                                </button>
                            </div>

                            <div className="w-full md:w-2/3 flex flex-col bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-lg border-b pb-2 mb-4 text-slate-800">Analysis Results</h4>
                                {isProcessingEvidence ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-indigo-500">
                                        <SparklesIcon className="h-12 w-12 animate-spin mb-4" />
                                        <p className="font-bold">Segmenting Facts and Narratives...</p>
                                    </div>
                                ) : !evidenceResults ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center px-8">
                                        Submit evidence or a statement. The AI will extract hard facts, infer missing narrative gaps strategically, and flag any contradictions.
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto space-y-6">
                                        {evidenceResults.contradictionAlerts.length > 0 && (
                                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                                                <h5 className="font-bold text-rose-800 flex items-center gap-2 mb-2"><ExclamationTriangleIcon className="h-5 w-5" /> Contradiction Alerts</h5>
                                                <ul className="list-disc pl-5 text-sm text-rose-700 space-y-1">
                                                    {evidenceResults.contradictionAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        <div>
                                            <h5 className="font-bold text-emerald-800 flex items-center gap-2 mb-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                                <DocumentTextIcon className="h-4 w-4" /> Extracted Facts
                                            </h5>
                                            {evidenceResults.extractedEvents.length === 0 ? <p className="text-sm text-slate-400 italic px-2">No facts extracted.</p> : (
                                                <div className="space-y-2">
                                                    {evidenceResults.extractedEvents.map((evt, i) => (
                                                        <div key={i} className="flex gap-3 text-sm p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                            <div className="font-mono text-xs text-emerald-600 font-bold whitespace-nowrap mt-0.5">{evt.date.split('T')[0]}</div>
                                                            <div className="text-slate-700">{evt.description}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h5 className="font-bold text-indigo-800 flex items-center gap-2 mb-3 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                                <SparklesIcon className="h-4 w-4" /> Inferred Narrative Gaps
                                            </h5>
                                            {evidenceResults.inferredEvents.length === 0 ? <p className="text-sm text-slate-400 italic px-2">No narrative inferred.</p> : (
                                                <div className="space-y-2">
                                                    {evidenceResults.inferredEvents.map((evt, i) => (
                                                        <div key={i} className="flex gap-3 text-sm p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                            <div className="font-mono text-xs text-indigo-600 font-bold whitespace-nowrap mt-0.5">{evt.date.split('T')[0] || 'Unknown'}</div>
                                                            <div className="text-slate-700 italic">"{evt.description}"</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {evidenceResults && !isProcessingEvidence && evidenceResults.contradictionAlerts.length === 0 && (
                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
                                <button onClick={handleMergeEvidence} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow">
                                    Commit to Master Timeline
                                </button>
                            </div>
                        )}
                        {evidenceResults && !isProcessingEvidence && evidenceResults.contradictionAlerts.length > 0 && (
                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
                                <button disabled className="px-6 py-2 bg-slate-300 text-slate-500 font-bold rounded-lg cursor-not-allowed">
                                    Resolve Contradictions First
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </div>
    );
};
