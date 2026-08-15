import React, { useState } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { Collaborator, StrategicResourcePlan } from '../types.ts';
import { PlusIcon, TrashIcon, PencilIcon, BriefcaseIcon, CheckCircleIcon, EnvelopeIcon, DocumentTextIcon, XIcon, SparklesIcon, CheckIcon, MapIcon } from './icons.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { generateLiaisonEmailTemplate, generateStrategicResourcePlan } from '../services/geminiService.ts';

export const CollaboratorsView: React.FC = () => {
    const { collaborators, claims, currentClaimId } = useAppState();
    const activeClaim = currentClaimId ? claims.find(c => c.id === currentClaimId) : claims[0];
    const dispatch = useAppDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Collaborator | null>(null);

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailObjective, setEmailObjective] = useState('');
    const [selectedPersonForEmail, setSelectedPersonForEmail] = useState<Collaborator | null>(null);
    const [generatedEmail, setGeneratedEmail] = useState('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [strategicPlan, setStrategicPlan] = useState<StrategicResourcePlan | null>(null);

    const [formData, setFormData] = useState<Partial<Collaborator>>({
        type: 'TRUSTED'
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const id = editingPerson ? editingPerson.id : `collab_${Date.now()}`;
        const newPerson = { tasks: [], communicationLog: [], ...formData, id } as Collaborator;

        let newCollaborators;
        if (editingPerson) {
            newCollaborators = collaborators.map(c => c.id === id ? { ...c, ...newPerson } : c);
        } else {
            newCollaborators = [...collaborators, newPerson];
        }
        
        dispatch({ type: 'UPDATE_COLLABORATORS', payload: newCollaborators });
        setIsModalOpen(false);
        setEditingPerson(null);
        setFormData({ type: 'TRUSTED' });
    };

    const handleEdit = (collab: Collaborator) => {
        setEditingPerson(collab);
        setFormData(collab);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        dispatch({ type: 'UPDATE_COLLABORATORS', payload: collaborators.filter(c => c.id !== id) });
    };

    const handleNew = () => {
        setEditingPerson(null);
        setFormData({ type: 'TRUSTED' });
        setIsModalOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleTaskCompleted = (personId: string, taskId: string) => {
        const newCollaborators = collaborators.map(c => {
            if (c.id === personId) {
                return {
                    ...c,
                    tasks: c.tasks?.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) || []
                };
            }
            return c;
        });
        dispatch({ type: 'UPDATE_COLLABORATORS', payload: newCollaborators });
    };

    const handleAddTask = (personId: string) => {
        const taskText = prompt("Enter task instruction:");
        if (taskText) {
            const newCollaborators = collaborators.map(c => {
                if (c.id === personId) {
                    return {
                        ...c,
                        tasks: [...(c.tasks || []), { id: `task_${Date.now()}`, text: taskText, completed: false }]
                    };
                }
                return c;
            });
            dispatch({ type: 'UPDATE_COLLABORATORS', payload: newCollaborators });
        }
    };

    const openEmailGenerator = (person: Collaborator) => {
        setSelectedPersonForEmail(person);
        setEmailObjective('');
        setGeneratedEmail('');
        setIsEmailModalOpen(true);
    };

    const generateEmail = async () => {
        if (!selectedPersonForEmail || !activeClaim) return;
        setIsGeneratingEmail(true);
        try {
             const emailStr = await generateLiaisonEmailTemplate(selectedPersonForEmail.name, selectedPersonForEmail.script || 'External Party', emailObjective, activeClaim.incidentDetails);
             setGeneratedEmail(emailStr);
             
             // Auto-log it
             const newCollaborators = collaborators.map(c => {
                 if (c.id === selectedPersonForEmail.id) {
                     return {
                         ...c,
                         communicationLog: [
                             ...(c.communicationLog || []), 
                             { id: `log_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'Email', summary: `Drafted regarding: ${emailObjective}` }
                         ]
                     } as Collaborator;
                 }
                 return c;
             });
             dispatch({ type: 'UPDATE_COLLABORATORS', payload: newCollaborators });
        } catch (e) {
             console.error(e);
        } finally {
             setIsGeneratingEmail(false);
        }
    };

    const handleGeneratePlan = async () => {
        if (!activeClaim) return;
        setIsGeneratingPlan(true);
        setIsPlanModalOpen(true);
        try {
            const plan = await generateStrategicResourcePlan(activeClaim.incidentDetails, activeClaim.incidentDetails.timelineEvents || []);
            setStrategicPlan(plan);
        } catch (e) {
            console.error("Failed to generate strategic plan", e);
            setStrategicPlan(null);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleAddStrategicCollaborator = (collabDef: StrategicResourcePlan['corroborationNetwork'][0]) => {
        const newPerson: Collaborator = {
            id: `collab_strat_${Date.now()}`,
            name: collabDef.namePlaceholder,
            type: 'TRUSTED',
            script: collabDef.role,
            dossier: {
                roleDescription: collabDef.roleDescription,
                script: collabDef.script,
                boundaries: collabDef.boundaries,
                compensationModel: collabDef.suggestedCompensation
            },
            tasks: [],
            communicationLog: []
        };
        dispatch({ type: 'UPDATE_COLLABORATORS', payload: [...collaborators, newPerson] });
        alert(`Added ${collabDef.role} to your roster.`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-2">
                        <BriefcaseIcon className="h-8 w-8 text-primary" />
                        The Liaison
                    </h2>
                    <p className="text-slate-500 mt-2">Collaboration & Communication Hub</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleGeneratePlan}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <MapIcon className="h-4 w-4" /> Strategic Resource Plan
                    </button>
                    <button 
                        onClick={handleNew}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <PlusIcon className="h-4 w-4" /> Add Contact
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-4">
                {collaborators.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <BriefcaseIcon className="h-12 w-12 opacity-20 mb-4" />
                        <p>No contacts added yet. Build your support network and track external parties.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {collaborators.map((person) => (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={person.id} 
                                className="group bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-colors relative overflow-hidden"
                            >
                                <div className={`p-4 border-b ${person.type === 'TRUSTED' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">{person.name}</h3>
                                            <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${person.type === 'TRUSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {person.type === 'TRUSTED' ? 'Internal Circle (Trusted)' : 'External Party'}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(person)} aria-label="Edit contact" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(person.id)} aria-label="Delete contact" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {(person.email || person.phone) && (
                                        <div className="mt-3 text-xs text-slate-500 flex flex-col gap-1">
                                            {person.email && <div>✉️ {person.email}</div>}
                                            {person.phone && <div>📞 {person.phone}</div>}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4 flex-grow flex flex-col gap-4">
                                    {person.type === 'TRUSTED' ? (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                    Assigned Tasks
                                                    <button onClick={() => handleAddTask(person.id)} className="text-primary hover:text-primary/80"><PlusIcon className="h-3 w-3"/></button>
                                                </h4>
                                                <div className="space-y-2">
                                                    {(!person.tasks || person.tasks.length === 0) && <p className="text-xs text-slate-400 italic">No tasks assigned.</p>}
                                                    {person.tasks?.map(task => (
                                                        <div key={task.id} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                                            <button onClick={() => toggleTaskCompleted(person.id, task.id)} className={`mt-0.5 shrink-0 h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400'}`}>
                                                                {task.completed && <CheckIcon className="h-3 w-3" />}
                                                            </button>
                                                            <span className={task.completed ? 'line-through text-slate-400' : ''}>{task.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Role / Details</h4>
                                                <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic min-h-[2rem]">
                                                    {person.script || "Role not specified."}
                                                </p>
                                            </div>
                                            {person.dossier && (
                                                <div className="mt-2 space-y-2">
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Required Script</h4>
                                                        <p className="text-[10px] text-slate-600 italic bg-emerald-50 p-1.5 rounded">{person.dossier.script}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Boundaries</h4>
                                                        <p className="text-[10px] text-slate-600 font-mono bg-rose-50 p-1.5 rounded">{person.dossier.boundaries}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Compensation</h4>
                                                        <p className="text-[10px] text-slate-600 bg-indigo-50 p-1.5 rounded">{person.dossier.compensationModel}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-auto">
                                                <button 
                                                    onClick={() => openEmailGenerator(person)}
                                                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                                                >
                                                    <DocumentTextIcon className="h-4 w-4" /> Draft Firm Email
                                                </button>
                                            </div>
                                            {person.communicationLog && person.communicationLog.length > 0 && (
                                                <div className="mt-2 border-t pt-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Comms Log</h4>
                                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                                        {person.communicationLog.map(log => (
                                                            <div key={log.id} className="text-[10px] flex gap-2 items-start text-slate-600">
                                                                <span className="font-mono text-slate-400 shrink-0">{log.date}</span>
                                                                <span>{log.summary}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Editing Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-heading text-slate-800">
                                {editingPerson ? 'Edit Contact' : 'Add Contact'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} aria-label="Close modal" className="text-slate-400 hover:text-slate-600"><XIcon className="h-5 w-5"/></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 text-center flex justify-center mb-2">
                                         <div className="inline-flex bg-slate-100 p-1 rounded-xl">
                                             <button type="button" onClick={() => setFormData({...formData, type: 'TRUSTED'})} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${formData.type === 'TRUSTED' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>Internal Circle</button>
                                             <button type="button" onClick={() => setFormData({...formData, type: 'THIRD_PARTY'})} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${formData.type === 'THIRD_PARTY' ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>External Party</button>
                                         </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                                        <input 
                                            type="text" name="name" value={formData.name || ''} 
                                            onChange={handleChange} 
                                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="e.g., Jane Doe, John Smith PC" required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Optional" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                                        <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Optional" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{formData.type === 'TRUSTED' ? 'Notes' : 'Role / Title'}</label>
                                        <textarea 
                                            name="script" value={formData.script || ''} onChange={handleChange} 
                                            placeholder={formData.type === 'TRUSTED' ? "Additional personal notes..." : "e.g., Adjuster, Mitigation Contractor"} 
                                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none h-24"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button type="submit" className="w-full py-3 rounded-xl font-bold bg-primary text-white shadow hover:shadow-md transition-all">Save Contact</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Email Generator Modal */}
            <AnimatePresence>
            {isEmailModalOpen && selectedPersonForEmail && activeClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsEmailModalOpen(false)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 flex flex-col h-[85vh]"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white shrink-0">
                            <div>
                                <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                                    <DocumentTextIcon className="h-6 w-6 text-indigo-400" />
                                    Firm Comms Generator
                                </h3>
                                <p className="text-sm text-slate-300 mt-1">Drafting unassailable communication to {selectedPersonForEmail.name}</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} aria-label="Close modal" className="p-2 hover:bg-slate-700 rounded-full transition"><XIcon className="h-5 w-5"/></button>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
                             <div className="w-full lg:w-1/3 border-r border-slate-200 p-6 bg-slate-50 flex flex-col overflow-y-auto">
                                 <label className="block text-sm font-bold text-slate-700 mb-2">What is the objective?</label>
                                 <textarea 
                                     value={emailObjective}
                                     onChange={(e) => setEmailObjective(e.target.value)}
                                     placeholder="e.g., Request a formal, itemized estimate. Demand an update on the building code upgrade limits."
                                     className="w-full flex-grow p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
                                 />
                                 <button 
                                     onClick={generateEmail}
                                     disabled={isGeneratingEmail || !emailObjective.trim()}
                                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition disabled:bg-slate-400 flex items-center justify-center gap-2 mt-auto"
                                 >
                                     {isGeneratingEmail ? 'Drafting...' : 'Generate Email'}
                                     <SparklesIcon className="h-4 w-4" />
                                 </button>
                             </div>
                             <div className="w-full lg:w-2/3 p-6 flex flex-col bg-white">
                                  <label className="block text-sm font-bold text-slate-700 mb-2">Draft Output</label>
                                  {generatedEmail ? (
                                      <textarea 
                                          className="w-full flex-grow p-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-serif text-slate-800 leading-relaxed"
                                          value={generatedEmail}
                                          onChange={(e) => setGeneratedEmail(e.target.value)}
                                      />
                                  ) : (
                                      <div className="flex-grow flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50">
                                          <EnvelopeIcon className="h-16 w-16 mb-4 text-slate-300" />
                                          <p>Enter an objective on the left and click Generate.</p>
                                          <p className="text-sm mt-2 max-w-sm">The Liaison will draft a legally sound, firm email asking for precise information and creating a solid record.</p>
                                      </div>
                                  )}
                                  
                                  {generatedEmail && (
                                      <div className="mt-4 flex justify-between items-center text-sm">
                                           <div className="text-slate-500 flex items-center gap-1">
                                               <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                                               Automatically logged to their profile
                                           </div>
                                           <button 
                                               onClick={() => {
                                                   navigator.clipboard.writeText(generatedEmail);
                                                   alert("Copied to clipboard!");
                                               }}
                                               className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                                           >
                                               Copy to Clipboard
                                           </button>
                                      </div>
                                  )}
                             </div>
                        </div>
                    </motion.div>
                </div>
            )}
            
            {/* Strategic Resource Plan Modal */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsPlanModalOpen(false)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-900 text-white shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold font-heading flex items-center gap-2">
                                    <MapIcon className="h-7 w-7 text-indigo-400" />
                                    Strategic Action & Resource Plan
                                </h3>
                                <p className="text-sm text-indigo-200 mt-1">Generated by Enterprise Claims Optimization Node (ECON)</p>
                            </div>
                            <button onClick={() => setIsPlanModalOpen(false)} aria-label="Close modal" className="p-2 hover:bg-indigo-800 rounded-full transition"><XIcon className="h-5 w-5"/></button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
                            {isGeneratingPlan ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                                    <SparklesIcon className="h-12 w-12 animate-pulse text-indigo-400 mb-4" />
                                    <p className="font-bold">Analyzing timeline and generating resource plan...</p>
                                    <p className="text-sm mt-2">Correlating facts, identifying narrative gaps, generating dossiers.</p>
                                </div>
                            ) : strategicPlan ? (
                                <div className="space-y-8">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                                            Documentation Guidance
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {strategicPlan.documentationGuidance.map((doc, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                                    <h5 className="font-bold text-slate-800">{doc.title}</h5>
                                                    <p className="text-sm text-slate-600 mt-2">{doc.instructions}</p>
                                                    <div className="mt-3 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded inline-block font-bold">
                                                        Basis: {doc.validityDescription}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <BriefcaseIcon className="h-5 w-5 text-indigo-600" />
                                            Corroboration Network & Dossiers
                                        </h4>
                                        <div className="space-y-4">
                                            {strategicPlan.corroborationNetwork.map((person, idx) => (
                                                <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6">
                                                    <div className="md:w-1/3">
                                                        <div className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider rounded mb-2">
                                                            {person.role}
                                                        </div>
                                                        <h5 className="font-bold text-slate-800 text-lg">{person.namePlaceholder}</h5>
                                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{person.roleDescription}</p>
                                                        
                                                        <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-100 text-sm">
                                                            <strong className="block text-slate-700 mb-1 text-xs uppercase">Est. Compensation:</strong>
                                                            {person.suggestedCompensation}
                                                        </div>
                                                        
                                                        <button 
                                                            onClick={() => handleAddStrategicCollaborator(person)}
                                                            className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-sm transition"
                                                        >
                                                            Add to Roster
                                                        </button>
                                                    </div>
                                                    <div className="md:w-2/3 space-y-4">
                                                        <div>
                                                            <h6 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-2">Required Scripting / Talking Points</h6>
                                                            <p className="text-sm text-slate-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 leading-relaxed italic">
                                                                "{person.script}"
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <h6 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-2">Boundaries & Restrictions</h6>
                                                            <p className="text-sm text-slate-700 bg-rose-50/50 p-3 rounded-lg border border-rose-100 leading-relaxed font-mono">
                                                                {person.boundaries}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </div>
    );
};

