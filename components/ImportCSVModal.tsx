
import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem } from '../types.ts';
import { XIcon, ArrowUpTrayIcon, CheckCircleIcon, DocumentTextIcon, SpinnerIcon, SparklesIcon, ExclamationTriangleIcon, FunnelIcon } from './icons.tsx';
import { parseCSV } from '../utils/fileUtils.ts';
import { CATEGORIES } from '../constants.ts';

interface ImportCSVModalProps {
    onClose: () => void;
    onImport?: (items: InventoryItem[]) => void;
}

const INVENTORY_FIELDS = [
    { key: 'itemName', label: 'Item Name', required: true, synonyms: ['name', 'item', 'product', 'title', 'itemname'] },
    { key: 'itemCategory', label: 'Category', required: false, synonyms: ['category', 'type', 'cat', 'itemcategory'] },
    { key: 'originalCost', label: 'Original Cost', required: false, synonyms: ['cost', 'price', 'value', 'amount', 'purchaseprice', 'originalcost'] },
    { key: 'replacementCostValueRCV', label: 'Replacement Value (RCV)', required: false, synonyms: ['rcv', 'replacement', 'replacementcost', 'replacementvalue'] },
    { key: 'itemDescription', label: 'Description', required: false, synonyms: ['description', 'desc', 'details', 'notes', 'itemdescription'] },
    { key: 'brand', label: 'Brand', required: false, synonyms: ['brand', 'make', 'manufacturer'] },
    { key: 'model', label: 'Model', required: false, synonyms: ['model', 'modelnumber'] },
    { key: 'serialNumber', label: 'Serial Number', required: false, synonyms: ['serial', 'sn', 'serialnumber'] },
    { key: 'purchaseDate', label: 'Purchase Date', required: false, synonyms: ['date', 'purchased', 'acquired', 'purchasedate'] },
    { key: 'condition', label: 'Condition', required: false, synonyms: ['condition', 'state'] },
    { key: 'lastKnownLocation', label: 'Location', required: false, synonyms: ['location', 'room', 'place'] }
];

const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ onClose, onImport }) => {
    const dispatch = useAppDispatch();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const autoMapColumns = (csvHeaders: string[]) => {
        const newMapping: Record<string, string> = {};
        INVENTORY_FIELDS.forEach(field => {
            // Find best match in headers
            const match = csvHeaders.find(h => {
                const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                return field.synonyms.some(s => normalizedHeader === s || normalizedHeader.includes(s));
            });
            if (match) newMapping[field.key] = match;
        });
        setColumnMapping(newMapping);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setIsParsing(true);
            
            try {
                const data = await parseCSV(selectedFile);
                if (data.length > 0) {
                    const csvHeaders = Object.keys(data[0]);
                    setHeaders(csvHeaders);
                    setParsedData(data);
                    autoMapColumns(csvHeaders);
                } else {
                    alert("The CSV file appears to be empty.");
                    setFile(null);
                }
            } catch (error) {
                console.error("CSV Parse Error", error);
                alert("Failed to parse CSV file. Please check the format.");
                setFile(null);
            } finally {
                setIsParsing(false);
            }
        }
    };

    const handleMappingChange = (fieldKey: string, header: string) => {
        setColumnMapping(prev => ({
            ...prev,
            [fieldKey]: header
        }));
    };

    const mapRowToItem = (row: any): InventoryItem | null => {
        const getValue = (fieldKey: string) => {
            const mappedHeader = columnMapping[fieldKey];
            return mappedHeader ? row[mappedHeader] : undefined;
        };

        const itemName = getValue('itemName');
        
        // Validation: Item Name is mandatory
        if (!itemName || String(itemName).trim() === '') {
            return null;
        }

        const category = getValue('itemCategory') || 'Other';
        const costStr = getValue('originalCost');
        const rcvStr = getValue('replacementCostValueRCV');
        
        // Clean up cost
        const parseCost = (val: any) => {
            if (!val) return 0;
            return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        };

        // Normalize category
        const matchedCategory = CATEGORIES.find(c => c.toLowerCase() === String(category).toLowerCase()) || 'Other';

        return {
            id: `item-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'enriching', 
            itemName: String(itemName).trim(),
            itemDescription: String(getValue('itemDescription') || '').trim(),
            itemCategory: matchedCategory,
            originalCost: parseCost(costStr),
            replacementCostValueRCV: parseCost(rcvStr) || parseCost(costStr),
            purchaseDate: getValue('purchaseDate') ? String(getValue('purchaseDate')) : undefined,
            brand: getValue('brand') ? String(getValue('brand')) : undefined,
            model: getValue('model') ? String(getValue('model')) : undefined,
            serialNumber: getValue('serialNumber') ? String(getValue('serialNumber')) : undefined,
            condition: ['New', 'Like New', 'Good', 'Fair', 'Poor'].includes(String(getValue('condition'))) ? getValue('condition') as any : undefined,
            lastKnownLocation: getValue('lastKnownLocation') ? String(getValue('lastKnownLocation')) : undefined,
            linkedProofs: [],
            createdAt: new Date().toISOString(),
            createdBy: 'CSV Import',
        };
    };

    const handleImport = () => {
        setIsImporting(true);
        try {
            const newItems: InventoryItem[] = [];
            parsedData.forEach(row => {
                const item = mapRowToItem(row);
                if (item) newItems.push(item);
            });
            
            if (newItems.length === 0) {
                alert("No valid items found. Please ensure 'Item Name' is mapped correctly.");
                setIsImporting(false);
                return;
            }

            if (onImport) {
                onImport(newItems);
            } else {
                dispatch({ type: 'ADD_INVENTORY_ITEMS', payload: newItems });
                dispatch({ type: 'LOG_ACTIVITY', payload: { action: 'CSV_IMPORT', details: `Imported ${newItems.length} items from ${file!.name}`, app: 'VeritasVault' } });
            }
            
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error processing data.");
        } finally {
            setIsImporting(false);
        }
    };

    const validCount = parsedData.filter(row => {
        const header = columnMapping['itemName'];
        return header && row[header];
    }).length;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2">
                        <ArrowUpTrayIcon className="h-6 w-6 text-primary"/> Bulk Import Inventory
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50">
                    {!file ? (
                        <div 
                            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer bg-white"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                accept=".csv" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                            <DocumentTextIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Drop your CSV file here</h3>
                            <p className="text-sm text-slate-500 mt-2">or click to browse</p>
                            <p className="text-xs text-slate-400 mt-4">Supported columns: Name, Cost, Brand, Model, Serial, Date, etc.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <DocumentTextIcon className="h-6 w-6 text-green-600"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • {parsedData.length} Rows</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setParsedData([]); setHeaders([]); setColumnMapping({}); }} className="text-sm text-red-600 hover:underline font-medium">Change File</button>
                            </div>

                            {isParsing ? (
                                <div className="flex justify-center py-8">
                                    <SpinnerIcon className="h-8 w-8 text-primary"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Column Mapping Section */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                            <FunnelIcon className="h-5 w-5 text-primary"/>
                                            <h4 className="font-bold text-slate-800">Map Columns</h4>
                                        </div>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                            {INVENTORY_FIELDS.map(field => {
                                                const isMapped = !!columnMapping[field.key];
                                                return (
                                                    <div key={field.key} className="flex items-center justify-between gap-4">
                                                        <label className="text-sm font-medium text-slate-600 w-1/3 flex items-center gap-1">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500">*</span>}
                                                            {isMapped && <CheckCircleIcon className="h-3 w-3 text-emerald-500"/>}
                                                        </label>
                                                        <select 
                                                            className={`w-2/3 p-2 text-sm border rounded-md focus:ring-1 focus:ring-primary outline-none ${isMapped ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50'}`}
                                                            value={columnMapping[field.key] || ''}
                                                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                        >
                                                            <option value="">-- Select Column --</option>
                                                            {headers.map(h => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Preview Section */}
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="flex gap-4 text-sm">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-500 uppercase">Ready to Import</p>
                                                    <p className="text-2xl font-bold text-blue-700">{validCount}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-500 uppercase">Skipped</p>
                                                    <p className="text-2xl font-bold text-slate-400">{parsedData.length - validCount}</p>
                                                </div>
                                            </div>
                                            {validCount === 0 && (
                                                <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-100 p-2 rounded">
                                                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                                                    <p>Please map the <strong>Item Name</strong> column to proceed.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64 overflow-hidden flex flex-col">
                                            <h4 className="font-bold text-slate-800 text-sm mb-3">Data Preview</h4>
                                            <div className="overflow-x-auto flex-grow">
                                                <table className="min-w-full divide-y divide-slate-200 text-xs">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            {headers.slice(0, 4).map(h => (
                                                                <th key={h} className="px-2 py-2 text-left font-medium text-slate-500">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {parsedData.slice(0, 5).map((row, idx) => (
                                                            <tr key={idx}>
                                                                {headers.slice(0, 4).map(h => (
                                                                    <td key={`${idx}-${h}`} className="px-2 py-2 text-slate-700 whitespace-nowrap max-w-[100px] truncate">{row[h]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {parsedData.length > 5 && <p className="text-center text-xs text-slate-400 mt-2">... {parsedData.length - 5} more rows</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <SparklesIcon className="h-4 w-4 text-blue-500"/>
                        <span>Auto-Processing enabled for imported items</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                            Cancel
                        </button>
                        <button 
                            onClick={handleImport} 
                            disabled={!file || isParsing || isImporting || validCount === 0} 
                            className="flex items-center justify-center space-x-2 px-6 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? <SpinnerIcon className="h-5 w-5"/> : <CheckCircleIcon className="h-5 w-5" />}
                            <span>{isImporting ? 'Importing...' : 'Complete Import'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportCSVModal;
