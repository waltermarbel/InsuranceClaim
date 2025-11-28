
import React, { useMemo, useState, useRef } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem } from '../types.ts';
import { 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    XCircleIcon, 
    MagnifyingGlassIcon, 
    FunnelIcon, 
    ArrowDownTrayIcon, 
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CubeIcon,
    ChartPieIcon,
    ClipboardDocumentListIcon
} from './icons.tsx';
import { CATEGORY_ICONS, CATEGORIES } from '../constants.ts';
import BulkEditModal from './BulkEditModal.tsx';
import { exportToCSV } from '../utils/fileUtils.ts';

interface InventoryDashboardProps {
    filteredItems: InventoryItem[];
    onItemPhotosSelected: (files: FileList) => void;
    onAddItemFromWeb: () => void;
    searchTerm: string;
    onSearchTermChange: (val: string) => void;
    // ... other props 
    [key: string]: any; 
}

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-start space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
        </div>
    </div>
);

const StatusBadge: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const hasReceipt = item.linkedProofs.some(p => p.type === 'document' || p.purpose === 'Proof of Purchase');
    const hasPhoto = item.linkedProofs.some(p => p.type === 'image');
    const hasSerial = !!item.serialNumber;
    
    if (hasReceipt && hasPhoto && hasSerial) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircleIcon className="w-3 h-3 mr-1"/> Ready</span>;
    }
    if (!hasPhoto) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-100"><XCircleIcon className="w-3 h-3 mr-1"/> No Photo</span>;
    }
    if (!hasReceipt) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100"><ExclamationTriangleIcon className="w-3 h-3 mr-1"/> No Receipt</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">Review</span>;
};

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
    onItemPhotosSelected,
    searchTerm,
    onSearchTermChange
}) => {
    const { inventory } = useAppState();
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkEdit, setShowBulkEdit] = useState(false);

    const tableData = useMemo(() => {
        return inventory.filter(item => 
            item.itemName.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
            item.itemCategory.toLowerCase().includes(searchTerm?.toLowerCase() || '')
        );
    }, [inventory, searchTerm]);

    const stats = useMemo(() => {
        const totalVal = tableData.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
        const readyCount = tableData.filter(i => 
            i.linkedProofs.some(p => p.type === 'image') && 
            i.linkedProofs.some(p => p.type === 'document' || p.purpose === 'Proof of Purchase')
        ).length;
        return {
            totalRCV: totalVal,
            count: tableData.length,
            readyPercentage: tableData.length > 0 ? Math.round((readyCount / tableData.length) * 100) : 0
        };
    }, [tableData]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(tableData.map(i => i.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (e.target.checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedIds(newSet);
    };

    const isAllSelected = tableData.length > 0 && selectedIds.size === tableData.length;
    
    const handleBulkSave = (updates: Partial<InventoryItem>) => {
        dispatch({
            type: 'BULK_EDIT_ITEMS',
            payload: {
                ids: Array.from(selectedIds),
                updates
            }
        });
        setShowBulkEdit(false);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
             Array.from(selectedIds).forEach(id => {
                 dispatch({ type: 'DELETE_ITEM', payload: { itemId: id } });
             });
             setSelectedIds(new Set());
        }
    };

    const handleExportCSV = () => {
        const filename = `VeritasVault_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(tableData, filename);
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Schedule Value" 
                    value={`$${stats.totalRCV.toLocaleString()}`} 
                    subtext="Replacement Cost Value (RCV)"
                    icon={ChartPieIcon} 
                    colorClass="bg-emerald-500 text-emerald-600" 
                />
                <StatCard 
                    title="Total Items Tracked" 
                    value={stats.count} 
                    subtext="Individual assets in vault"
                    icon={CubeIcon} 
                    colorClass="bg-blue-500 text-blue-600" 
                />
                <StatCard 
                    title="Documentation Health" 
                    value={`${stats.readyPercentage}%`} 
                    subtext="Items with Photo + Receipt"
                    icon={ClipboardDocumentListIcon} 
                    colorClass="bg-purple-500 text-purple-600" 
                />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-20">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 group">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search schedule..." 
                            className="pl-9 pr-3 py-2.5 text-sm border border-slate-200 bg-slate-50 rounded-lg w-full sm:w-80 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                     <button className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition text-sm font-medium">
                        <FunnelIcon className="h-4 w-4"/> Filter
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition text-sm font-medium"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4"/> Export CSV
                    </button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        <PlusIcon className="h-4 w-4" /> Add Item
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        onChange={(e) => e.target.files && onItemPhotosSelected(e.target.files)}
                    />
                </div>
            </div>

            {/* High-Density Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-4 py-4 w-12">
                                     <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                     />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Item & Description</th>
                                <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Acquisition</th>
                                <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Repl. Value (RCV)</th>
                                <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {tableData.map((item) => {
                                const CategoryIcon = CATEGORY_ICONS[item.itemCategory] || CATEGORY_ICONS['Other'];
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <tr 
                                        key={item.id} 
                                        className={`group transition-all duration-200 cursor-pointer ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                                        onClick={() => dispatch({ type: 'SELECT_ITEM', payload: item.id })}
                                    >
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                             <input 
                                                type="checkbox" 
                                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                checked={isSelected}
                                                onChange={(e) => handleSelectRow(item.id, e)}
                                             />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-12 w-12 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow relative">
                                                    {item.linkedProofs[0]?.dataUrl ? (
                                                        <img className="h-full w-full object-cover" src={item.linkedProofs[0].dataUrl} alt="" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                            <CategoryIcon className="h-6 w-6 opacity-50"/>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-slate-800 font-heading">{item.itemName}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[240px]">{item.brand} {item.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                                <CategoryIcon className="h-3.5 w-3.5 mr-1.5 text-slate-500"/>
                                                {item.itemCategory}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="text-sm text-slate-700">${item.originalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                            <div className="text-[10px] text-slate-400">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'Date Unknown'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">${(item.replacementCostValueRCV || item.originalCost).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <StatusBadge item={item} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold text-xs uppercase tracking-wide">View</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {tableData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <ClipboardDocumentListIcon className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">Schedule is Empty</h3>
                                            <p className="text-slate-500 mt-1 max-w-sm">Start by adding items manually or uploading evidence to the Evidence Locker.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 z-50 animate-fade-in-up border border-slate-700/50 backdrop-blur-md bg-opacity-95">
                    <span className="font-bold text-sm whitespace-nowrap pl-2">{selectedIds.size} Selected</span>
                    <div className="h-5 w-px bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowBulkEdit(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition text-sm font-semibold"
                        >
                            <PencilSquareIcon className="h-4 w-4"/> Edit
                        </button>
                        <button 
                             onClick={handleBulkDelete}
                             className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition text-sm font-semibold"
                        >
                            <TrashIcon className="h-4 w-4"/> Delete
                        </button>
                    </div>
                    <div className="h-5 w-px bg-slate-700"></div>
                    <button 
                        onClick={() => setSelectedIds(new Set())} 
                        className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider pr-2"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Modals */}
            {showBulkEdit && (
                <BulkEditModal 
                    itemCount={selectedIds.size}
                    itemCategories={CATEGORIES}
                    onClose={() => setShowBulkEdit(false)}
                    onSave={handleBulkSave}
                />
            )}
            
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translate(-50%, 20px); }
                    100% { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default InventoryDashboard;
