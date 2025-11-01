import React, { useState } from 'react';
import { InventoryItem, ItemStatus } from '../types.ts';
import { XIcon, CheckCircleIcon } from './icons.tsx';

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

    const itemStatuses: ItemStatus[] = ['active', 'claimed', 'archived', 'rejected', 'needs-review'];
    const itemConditions: (InventoryItem['condition'])[] = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading">Bulk Edit {itemCount} Item(s)</h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-medium">Select the fields you want to update for all selected items. Unchecked fields will not be changed.</p>
                    
                    {/* Status Field */}
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="status-check" name="status" checked={fieldsToUpdate.status} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                        <label htmlFor="status" className="w-28 text-sm font-semibold text-dark">Status</label>
                        <select id="status" name="status" value={values.status} onChange={handleValueChange} disabled={!fieldsToUpdate.status} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                            {itemStatuses.map(s => <option key={s} value={s} className="capitalize">{s.replace('-', ' ')}</option>)}
                        </select>
                    </div>

                    {/* Category Field */}
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="category-check" name="itemCategory" checked={fieldsToUpdate.itemCategory} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                        <label htmlFor="itemCategory" className="w-28 text-sm font-semibold text-dark">Category</label>
                        <select id="itemCategory" name="itemCategory" value={values.itemCategory} onChange={handleValueChange} disabled={!fieldsToUpdate.itemCategory} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                            {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    {/* Location Field */}
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="location-check" name="lastKnownLocation" checked={fieldsToUpdate.lastKnownLocation} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                        <label htmlFor="lastKnownLocation" className="w-28 text-sm font-semibold text-dark">Location</label>
                        <input type="text" id="lastKnownLocation" name="lastKnownLocation" value={values.lastKnownLocation} onChange={handleValueChange} disabled={!fieldsToUpdate.lastKnownLocation} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400" placeholder="e.g., Living Room"/>
                    </div>
                    
                    {/* Condition Field */}
                     <div className="flex items-center gap-3">
                        <input type="checkbox" id="condition-check" name="condition" checked={fieldsToUpdate.condition} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"/>
                        <label htmlFor="condition" className="w-28 text-sm font-semibold text-dark">Condition</label>
                        <select id="condition" name="condition" value={values.condition || ''} onChange={handleValueChange} disabled={!fieldsToUpdate.condition} className="flex-grow block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-100 disabled:text-slate-400">
                            <option value="" disabled>Select a condition</option>
                            {itemConditions.map(c => c && <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                </div>
                 <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50" disabled={!Object.values(fieldsToUpdate).some(v => v)}>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkEditModal;
