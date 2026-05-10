import React, { useState, useEffect } from 'react';
import { TimelineEvent, ClaimDetails, InventoryItem, Proof, ClaimItem } from '../types.ts';
import { format } from 'date-fns';
import { generateDraftNarrativeFromTimeline } from '../services/geminiService.ts'; // We'll add this
import { ChevronUpIcon, ChevronDownIcon, PlusIcon, SparklesIcon, TrashIcon, DocumentTextIcon, UserGroupIcon, CubeIcon } from './icons.tsx';

interface TimelineCoreProps {
    claimDetails: ClaimDetails;
    onUpdateClaimDetails: (updates: Partial<ClaimDetails>) => void;
    availableItems: ClaimItem[];
    availableDocs: Proof[]; // Can be claimDocuments + aleProofs
}

export const TimelineCore: React.FC<TimelineCoreProps> = ({ claimDetails, onUpdateClaimDetails, availableItems, availableDocs }) => {
    const events = claimDetails.timelineEvents || [];
    
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [draftNarrative, setDraftNarrative] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial populate if empty
    useEffect(() => {
        if (events.length === 0 && claimDetails.dateOfLoss) {
            const initialEvents: TimelineEvent[] = [
                {
                    id: `te-${Date.now()}-1`,
                    title: 'Initial Damage Discovered',
                    date: claimDetails.dateOfLoss,
                    description: claimDetails.propertyDamageDetails || 'Damage observed at property.',
                    linkedDocumentIds: [],
                    linkedItemIds: [],
                    involvedPersons: [],
                    type: 'FACT'
                }
            ];
            onUpdateClaimDetails({ timelineEvents: initialEvents });
        }
    }, [events.length, claimDetails.dateOfLoss]);

    const handleAddEvent = () => {
        const newEvent: TimelineEvent = {
            id: `te-${Date.now()}`,
            title: 'New Event',
            date: new Date().toISOString().split('T')[0],
            description: '',
            linkedDocumentIds: [],
            linkedItemIds: [],
            involvedPersons: [],
            type: 'NARRATIVE_ELEMENT'
        };
        onUpdateClaimDetails({ timelineEvents: [...events, newEvent] });
        setSelectedEventId(newEvent.id);
    };

    const handleUpdateEvent = (id: string, updates: Partial<TimelineEvent>) => {
        const updated = events.map(e => e.id === id ? { ...e, ...updates } : e);
        // If date changes, we might want to re-sort, but let user organize.
        onUpdateClaimDetails({ timelineEvents: updated });
    };

    const handleRemoveEvent = (id: string) => {
        const updated = events.filter(e => e.id !== id);
        onUpdateClaimDetails({ timelineEvents: updated });
        if (selectedEventId === id) setSelectedEventId(null);
    };

    const handleMoveEvent = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === events.length - 1) return;
        
        const newEvents = [...events];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newEvents[index];
        newEvents[index] = newEvents[targetIndex];
        newEvents[targetIndex] = temp;
        
        onUpdateClaimDetails({ timelineEvents: newEvents });
    };

    const handleGenerateNarrative = async () => {
        setIsGenerating(true);
        try {
            // we will call geminiService
            const text = await generateDraftNarrativeFromTimeline(events, claimDetails);
            setDraftNarrative(text);
        } catch (e) {
            setDraftNarrative("Error generating narrative.");
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
            {/* Timeline Stream */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Timeline Core</h3>
                    <button onClick={handleAddEvent} className="p-1 bg-primary text-white rounded hover:bg-primary-dark transition"><PlusIcon className="h-4 w-4"/></button>
                </div>
                
                <div className="relative border-l-2 border-slate-300 ml-4 pl-4 space-y-6 flex flex-col">
                    {events.map((evt, idx) => (
                        <div key={evt.id} className="relative group">
                            {/* Node dot */}
                            <div className={`absolute -left-[23px] w-4 h-4 rounded-full border-2 ${selectedEventId === evt.id ? 'bg-primary border-primary ring-4 ring-primary/20' : 'bg-white border-slate-400 group-hover:border-primary'} transition-all cursor-pointer`} onClick={() => setSelectedEventId(evt.id)}></div>
                            
                            <div 
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedEventId === evt.id ? 'bg-white border-primary shadow-md' : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'} flex flex-col`}
                                onClick={() => setSelectedEventId(evt.id)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-xs font-bold text-primary">{evt.date}</div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveEvent(idx, 'up'); }} className="text-slate-300 hover:text-slate-600"><ChevronUpIcon className="h-3 w-3"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleMoveEvent(idx, 'down'); }} className="text-slate-300 hover:text-slate-600"><ChevronDownIcon className="h-3 w-3"/></button>
                                    </div>
                                </div>
                                <div className="font-bold text-slate-800 text-sm mb-1">{evt.title}</div>
                                <div className="text-xs text-slate-500 line-clamp-2">{evt.description}</div>
                                
                                {/* Indicators */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                    {evt.linkedDocumentIds.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded"><DocumentTextIcon className="h-3 w-3"/> {evt.linkedDocumentIds.length}</span>}
                                    {evt.linkedItemIds.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded"><CubeIcon className="h-3 w-3"/> {evt.linkedItemIds.length}</span>}
                                    {evt.involvedPersons.length > 0 && <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded"><UserGroupIcon className="h-3 w-3"/> {evt.involvedPersons.length}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Event Editor & Narrative */}
            <div className="lg:col-span-2 space-y-6 flex flex-col">
                {selectedEvent ? (
                    <div className="bg-white p-6 justify-between rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-lg">Edit Event Node</h3>
                            <button onClick={() => handleRemoveEvent(selectedEvent.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Event Title</label>
                                <input type="text" value={selectedEvent.title} onChange={e => handleUpdateEvent(selectedEvent.id, { title: e.target.value })} className="w-full text-sm border-slate-200 rounded p-2 focus:ring-primary focus:border-primary"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Date</label>
                                <input type="date" value={selectedEvent.date} onChange={e => handleUpdateEvent(selectedEvent.id, { date: e.target.value })} className="w-full text-sm border-slate-200 rounded p-2 focus:ring-primary focus:border-primary"/>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                            <textarea value={selectedEvent.description} onChange={e => handleUpdateEvent(selectedEvent.id, { description: e.target.value })} rows={3} className="w-full text-sm border-slate-200 rounded p-2 focus:ring-primary focus:border-primary"/>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Evidence Links */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><DocumentTextIcon className="h-4 w-4 text-slate-400"/> Documents / Evidence</h4>
                                <div className="space-y-2 mb-3">
                                    {selectedEvent.linkedDocumentIds.map(docId => {
                                        const d = availableDocs.find(x => x.id === docId);
                                        return d ? (
                                            <div key={docId} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2 rounded">
                                                <span className="truncate">{d.fileName}</span>
                                                <button onClick={() => handleUpdateEvent(selectedEvent.id, { linkedDocumentIds: selectedEvent.linkedDocumentIds.filter(id => id !== docId) })} className="text-slate-400 hover:text-rose-500">&times;</button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <select 
                                    className="w-full text-xs border-slate-200 rounded p-1"
                                    onChange={e => {
                                        if (e.target.value && !selectedEvent.linkedDocumentIds.includes(e.target.value)) {
                                            handleUpdateEvent(selectedEvent.id, { linkedDocumentIds: [...selectedEvent.linkedDocumentIds, e.target.value] });
                                        }
                                        e.target.value = '';
                                    }}
                                >
                                    <option value="">+ Attach Document</option>
                                    {availableDocs.filter(d => !selectedEvent.linkedDocumentIds.includes(d.id)).map(d => (
                                        <option key={d.id} value={d.id}>{d.fileName}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Involved Persons */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><UserGroupIcon className="h-4 w-4 text-slate-400"/> Involved Persons</h4>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {selectedEvent.involvedPersons.map((person, idx) => (
                                        <span key={idx} className="flex items-center gap-1 text-xs bg-white border border-slate-200 px-2 py-1 rounded-full text-slate-700 font-medium">
                                            {person}
                                            <button onClick={() => {
                                                const newPersons = [...selectedEvent.involvedPersons];
                                                newPersons.splice(idx, 1);
                                                handleUpdateEvent(selectedEvent.id, { involvedPersons: newPersons });
                                            }} className="text-slate-400 hover:text-rose-500 font-bold ml-1">&times;</button>
                                        </span>
                                    ))}
                                </div>
                                <input 
                                    type="text"
                                    placeholder="+ Add person (Press Enter)"
                                    className="w-full text-xs border-slate-200 rounded p-1.5 focus:ring-primary focus:border-primary"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                            handleUpdateEvent(selectedEvent.id, { involvedPersons: [...selectedEvent.involvedPersons, e.currentTarget.value.trim()] });
                                            e.currentTarget.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 text-slate-300"/>
                        <p>Select an event from the timeline to edit.</p>
                    </div>
                )}

                {/* Draft Narrative Component */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden flex-grow flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="font-bold text-lg flex items-center gap-2 font-heading tracking-wide">
                            <SparklesIcon className="h-5 w-5 text-indigo-400" />
                            Narrative Continuity
                        </h3>
                        <button 
                            onClick={handleGenerateNarrative}
                            disabled={isGenerating || events.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-md disabled:bg-slate-700 disabled:text-slate-400"
                        >
                            {isGenerating ? 'Compiling...' : 'Generate Draft Summary'}
                        </button>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 flex-grow relative z-10 overflow-y-auto">
                        {!draftNarrative ? (
                            <p className="text-slate-400 text-sm italic">Click "Generate Draft Summary" to build a synchronized claim narrative based on your timeline sequence. This ensures your story perfectly matches the evidence chronological flow.</p>
                        ) : (
                           <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed space-y-4">
                               {draftNarrative}
                           </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
