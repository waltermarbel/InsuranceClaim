
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

const RichTextEditor: React.FC<{ value: string; onBlur: (val: string) => void }> = ({ value, onBlur }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleBlur = () => {
        if (editorRef.current) {
            onBlur(editorRef.current.innerHTML);
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
                onBlur={handleBlur}
                suppressContentEditableWarning={true}
            />
        </div>
    );
};

const ClaimDetailsEditor: React.FC<ClaimDetailsEditorProps> = ({ details, onUpdate }) => {
    // Local state to handle input values before blur
    const [formData, setFormData] = useState(details);

    useEffect(() => {
        setFormData(details);
    }, [details]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Auto-save on blur for text fields
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (value !== (details as any)[name]) {
            onUpdate({ [name]: value });
        }
    };

    // Auto-save immediately for Select fields
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        onUpdate({ [name]: value });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; // name will be 'startDate' or 'endDate' via data-field logic below if needed, or specific inputs
        // This function handles the root 'dateOfLoss'
        setFormData(prev => ({ ...prev, [name]: value }));
        onUpdate({ [name]: value });
    };

    const handleRangeDateChange = (type: 'startDate' | 'endDate', value: string) => {
        const newRange = {
            ...formData.claimDateRange,
            [type]: value,
            // ensure other field is preserved if existing, or empty string
            ...(type === 'startDate' ? { endDate: formData.claimDateRange?.endDate || '' } : { startDate: formData.claimDateRange?.startDate || '' })
        };
        
        setFormData(prev => ({
            ...prev,
            claimDateRange: newRange
        }));
        onUpdate({ claimDateRange: newRange });
    };

    return (
        <div className="bg-white rounded-xl border border-primary/20 shadow-md p-6 mb-8 ring-1 ring-primary/5">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 font-heading">Incident Details</h2>
                <div className="text-xs text-slate-400 italic">
                    Changes saved automatically
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Incident Type</label>
                        <select 
                            name="incidentType" 
                            value={formData.incidentType} 
                            onChange={handleSelectChange}
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
                                onChange={(e) => handleRangeDateChange('startDate', e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Loss End Date</label>
                            <input 
                                type="date" 
                                value={formData.claimDateRange?.endDate || ''} 
                                onChange={(e) => handleRangeDateChange('endDate', e.target.value)}
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
                            onChange={handleChange} // Update local state
                            onBlur={handleBlur} // Save on blur
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
                            onBlur={handleBlur}
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
                            onBlur={handleBlur}
                            placeholder="Street Address, City, State"
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Property Damage Details</label>
                        <RichTextEditor 
                            value={formData.propertyDamageDetails}
                            onBlur={(val) => onUpdate({ propertyDamageDetails: val })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClaimDetailsEditor;
