
import React, { useState, useEffect, useRef } from 'react';
import { ClaimDetails } from '../types.ts';
import { PencilIcon, CheckIcon, MapPinIcon, CalendarIcon, DocumentTextIcon, ExclamationTriangleIcon } from './icons.tsx';

interface ClaimDetailsEditorProps {
    details: ClaimDetails;
    onUpdate: (details: Partial<ClaimDetails>) => void;
}

const RichTextToolbarButton: React.FC<{ command: string; icon: React.ReactNode; active?: boolean }> = ({ command, icon, active }) => {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand(command, false, undefined);
            }}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${active ? 'bg-slate-200 text-primary' : 'text-slate-600'}`}
        >
            {icon}
        </button>
    );
};

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-shadow">
            <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
                <RichTextToolbarButton command="bold" icon={<span className="font-bold px-1">B</span>} />
                <RichTextToolbarButton command="italic" icon={<span className="italic px-1">I</span>} />
                <RichTextToolbarButton command="underline" icon={<span className="underline px-1">U</span>} />
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <RichTextToolbarButton command="insertUnorderedList" icon={<span className="px-1">• List</span>} />
            </div>
            <div
                ref={editorRef}
                contentEditable
                className="p-3 min-h-[150px] outline-none text-sm text-slate-800 prose prose-sm max-w-none"
                onInput={handleInput}
                suppressContentEditableWarning={true}
            />
        </div>
    );
};

const ClaimDetailsEditor: React.FC<ClaimDetailsEditorProps> = ({ details, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(details);

    useEffect(() => {
        setFormData(details);
    }, [details]);

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(details);
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateRangeChange = (type: 'startDate' | 'endDate', value: string) => {
        setFormData(prev => ({
            ...prev,
            claimDateRange: {
                ...prev.claimDateRange,
                [type]: value
            }
        }));
    };

    if (!isEditing) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-slate-800 font-heading flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                        Incident Details
                    </h2>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition">
                        <PencilIcon className="h-4 w-4" /> Edit
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incident Type</p>
                            <p className="text-slate-800 font-semibold">{details.incidentType || 'Not specified'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3"/> Loss Date
                                </p>
                                <p className="text-slate-800">{details.dateOfLoss || 'Not specified'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3"/> Period
                                </p>
                                <p className="text-slate-800 text-xs mt-0.5">
                                    {details.claimDateRange?.startDate ? new Date(details.claimDateRange.startDate).toLocaleDateString() : 'N/A'} - {details.claimDateRange?.endDate ? new Date(details.claimDateRange.endDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                         <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Police Report #</p>
                            <p className="text-slate-800 font-mono bg-slate-50 px-2 py-1 rounded inline-block text-sm border border-slate-200">
                                {details.policeReport || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div>
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3"/> Location of Incident
                            </p>
                            <p className="text-slate-800">{details.location || 'Not specified'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                <DocumentTextIcon className="h-3 w-3"/> Narrative Description
                            </p>
                            <div 
                                className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: details.propertyDamageDetails || "No description provided." }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-primary/20 shadow-md p-6 mb-8 ring-1 ring-primary/5">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 font-heading">Edit Incident Details</h2>
                <div className="flex gap-2">
                    <button onClick={handleCancel} className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-sm">
                        <CheckIcon className="h-4 w-4" /> Save Changes
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Incident Type</label>
                        <select 
                            name="incidentType" 
                            value={formData.incidentType} 
                            onChange={handleChange}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                            <option value="">Select Type...</option>
                            <option value="Burglary (Forced Entry)">Burglary (Forced Entry)</option>
                            <option value="Theft">Theft</option>
                            <option value="Fire">Fire</option>
                            <option value="Water Damage">Water Damage</option>
                            <option value="Vandalism">Vandalism</option>
                            <option value="Loss during Travel">Loss during Travel</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Loss Start Date</label>
                            <input 
                                type="date" 
                                value={formData.claimDateRange?.startDate || ''} 
                                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Loss End Date</label>
                            <input 
                                type="date" 
                                value={formData.claimDateRange?.endDate || ''} 
                                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Date of Loss (Single Point)</label>
                        <input 
                            type="date" 
                            name="dateOfLoss"
                            value={formData.dateOfLoss} 
                            onChange={handleChange}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Police Report #</label>
                        <input 
                            type="text" 
                            name="policeReport"
                            value={formData.policeReport} 
                            onChange={handleChange}
                            placeholder="e.g. NYPD-2024-..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Location of Incident</label>
                        <input 
                            type="text" 
                            name="location"
                            value={formData.location} 
                            onChange={handleChange}
                            placeholder="Street Address, City, State"
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Property Damage Details</label>
                        <RichTextEditor 
                            value={formData.propertyDamageDetails}
                            onChange={(val) => setFormData(prev => ({ ...prev, propertyDamageDetails: val }))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimDetailsEditor;
