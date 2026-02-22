
import React, { useState } from 'react';
import { InventoryItem, ItemStatus } from '../types.ts';
import { XIcon, CheckCircleIcon, SparklesIcon, SpinnerIcon, BoltIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

type UpdatableFields = Pick<InventoryItem, 'status' | 'itemCategory' | 'lastKnownLocation' | 'condition'>;

interface BulkEditModalProps {
    itemCount: number;
    itemCategories: string[];
    onClose: () => void;
    onSave: (updates: Partial<UpdatableFields>) => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ itemCount, itemCategories, onClose, onSave }) => {
    const [fieldsToUpdate, setFieldsToUpdate] = useState<Record<keyof UpdatableFields, boolean>>({
        status: false,
        itemCategory: false,
        lastKnownLocation: false,
        condition: false,
    });

    const [values, setValues] = useState<Partial<UpdatableFields>>({
        status: 'active',
        itemCategory: itemCategories[0] || 'Other',
        lastKnownLocation: '',
        condition: 'Good',
    });

    // AI State
    const [aiCommand, setAiCommand] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFieldsToUpdate(prev => ({ ...prev, [name]: checked }));
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const updates: Partial<UpdatableFields> = {};
        for (const key in fieldsToUpdate) {
            if (fieldsToUpdate[key as keyof UpdatableFields]) {
                (updates as any)[key] = values[key as keyof UpdatableFields];
            }
        }

        if (Object.keys(updates).length > 0) {
            onSave(updates);
        } else {
            onClose();
        }
    };

    const handleAiCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiCommand.trim()) return;
        
        setIsAiProcessing(true);
        try {
            const updates = await geminiService.parseBulkEditCommand(aiCommand);
            
            const newValues = { ...values };
            const newFields = { ...fieldsToUpdate };
            let updatedCount = 0;

            if (updates.status) { 
                newValues.status = updates.status; 
                newFields.status = true; 
                updatedCount++;
            }
            if (updates.itemCategory) { 
                newValues.itemCategory = updates.itemCategory; 
                newFields.itemCategory = true; 
                updatedCount++;
            }
            if (updates.lastKnownLocation) { 
                newValues.lastKnownLocation = updates.lastKnownLocation; 
                newFields.lastKnownLocation = true; 
                updatedCount++;
            }
            if (updates.condition) { 
                newValues.condition = updates.condition; 
                newFields.condition = true; 
                updatedCount++;
            }
            
            setValues(newValues);
            setFieldsToUpdate(newFields);
            
            if (updatedCount === 0) {
                alert("I couldn't understand which fields to update. Try specifying 'status', 'location', 'category', or 'condition'.");
            }
        } catch (e) {
            console.error(e);
            alert("AI processing failed. Please try again.");
        } finally {
            setIsAiProcessing(false);
        }
    };

    const itemStatuses: ItemStatus[] = ['active', 'claimed', 'archived', 'rejected', 'needs-review'];
    const itemConditions: (InventoryItem['condition'])[] = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2">
                        <BoltIcon className="h-5 w-5 text-primary"/> Bulk Edit ({itemCount})
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* AI Command Section */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4"/> Autonomous Command
                        </label>
                        <form onSubmit={handleAiCommand} className="flex gap-2">
                            <input 
                                type="text" 
                                value={aiCommand}
                                onChange={(e) => setAiCommand(e.target.value)}
                                placeholder="e.g. 'Move everything to the Attic and mark as Fair'"
                                className="flex-grow p-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                disabled={isAiProcessing}
                            />
                            <button 
                                type="submit" 
                                disabled={isAiProcessing || !aiCommand.trim()}
                                className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1"
                            >
                                {isAiProcessing ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : 'Auto-Set'}
                            </button>
                        </form>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-medium font-medium">Or select fields manually:</p>
                        
                        {/* Status Field */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${fieldsToUpdate.status ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-slate-50'}`}>
                            <input type="checkbox" id="status-check" name="status" checked={fieldsToUpdate.status} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                            <label htmlFor="status" className="w-24 text-sm font-semibold text-dark">Status</label>
                            <select id="status" name="status" value={values.status} onChange={handleValueChange} disabled={!fieldsToUpdate.status} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                                {itemStatuses.map(s => <option key={s} value={s} className="capitalize">{s.replace('-', ' ')}</option>)}
                            </select>
                        </div>

                        {/* Category Field */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${fieldsToUpdate.itemCategory ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-slate-50'}`}>
                            <input type="checkbox" id="category-check" name="itemCategory" checked={fieldsToUpdate.itemCategory} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                            <label htmlFor="itemCategory" className="w-24 text-sm font-semibold text-dark">Category</label>
                            <select id="itemCategory" name="itemCategory" value={values.itemCategory} onChange={handleValueChange} disabled={!fieldsToUpdate.itemCategory} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                                {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        {/* Location Field */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${fieldsToUpdate.lastKnownLocation ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-slate-50'}`}>
                            <input type="checkbox" id="location-check" name="lastKnownLocation" checked={fieldsToUpdate.lastKnownLocation} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                            <label htmlFor="lastKnownLocation" className="w-24 text-sm font-semibold text-dark">Location</label>
                            <input type="text" id="lastKnownLocation" name="lastKnownLocation" value={values.lastKnownLocation} onChange={handleValueChange} disabled={!fieldsToUpdate.lastKnownLocation} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400" placeholder="e.g., Living Room"/>
                        </div>
                        
                        {/* Condition Field */}
                         <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${fieldsToUpdate.condition ? 'bg-slate-50 border-slate-300' : 'border-transparent hover:bg-slate-50'}`}>
                            <input type="checkbox" id="condition-check" name="condition" checked={fieldsToUpdate.condition} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                            <label htmlFor="condition" className="w-24 text-sm font-semibold text-dark">Condition</label>
                            <select id="condition" name="condition" value={values.condition || ''} onChange={handleValueChange} disabled={!fieldsToUpdate.condition} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                                <option value="" disabled>Select a condition</option>
                                {itemConditions.map(c => c && <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                </div>
                 <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center justify-center space-x-2 px-6 py-2 text-sm font-bold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50" disabled={!Object.values(fieldsToUpdate).some(v => v)}>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Apply Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkEditModal;
