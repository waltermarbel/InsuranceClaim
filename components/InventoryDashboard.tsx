
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, Proof, RiskGap } from '../types.ts';
import { 
    CheckCircleIcon, 
    ExclamationTriangleIcon, 
    XCircleIcon, 
    MagnifyingGlassIcon, 
    FunnelIcon, 
    ArrowDownTrayIcon, 
    ArrowUpTrayIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CubeIcon,
    ChartPieIcon,
    ClipboardDocumentListIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    PhotoIcon,
    DocumentTextIcon,
    SpinnerIcon,
    CalculatorIcon,
    CloudArrowUpIcon,
    XIcon
} from './icons.tsx';
import { CATEGORY_ICONS, CATEGORIES, CATEGORY_COLORS } from '../constants.ts';
import BulkEditModal from './BulkEditModal.tsx';
import ImportCSVModal from './ImportCSVModal.tsx';
import RiskHeatmap from './RiskHeatmap.tsx';
import ScenarioSimulatorModal from './ScenarioSimulatorModal.tsx';
import DigitalDiscoveryModal from './DigitalDiscoveryModal.tsx'; // Import new modal
import { exportToCSV } from '../utils/fileUtils.ts';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';
import * as geminiService from '../services/geminiService.ts';

interface InventoryDashboardProps {
    filteredItems: InventoryItem[];
    onItemPhotosSelected: (files: FileList) => void;
    onAddItemFromWeb: () => void;
    searchTerm: string;
    onSearchTermChange: (val: string) => void;
    onImageZoom: (url: string) => void;
    onImportInventory?: (items: InventoryItem[]) => void;
    // ... other props 
    [key: string]: any; 
}

// Updated component to load thumbnails asynchronously and handle types
const DashboardThumbnail: React.FC<{ proof: Proof; categoryIcon: React.ElementType; categoryColor: string; onZoom?: (url: string) => void }> = ({ proof, categoryIcon: CategoryIcon, categoryColor, onZoom }) => {
    const { dataUrl, isLoading } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || dataUrl;
    const isImage = proof.type === 'image' || proof.mimeType?.startsWith('image/');

    const handleClick = (e: React.MouseEvent) => {
        if (displayUrl && onZoom && isImage) {
            e.stopPropagation();
            onZoom(displayUrl);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50">
                <SpinnerIcon className="h-4 w-4 text-primary opacity-50" />
            </div>
        );
    }

    if (displayUrl && isImage) {
        return (
            <img 
                className={`h-full w-full object-cover ${onZoom ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`} 
                src={displayUrl} 
                alt="Item Thumbnail" 
                onClick={handleClick} 
            />
        );
    }
    
    // Fallback for documents or non-image proofs
    if (proof.type === 'document' || proof.mimeType === 'application/pdf') {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border-2 border-transparent hover:border-slate-200 transition-colors" title={proof.fileName}>
                <DocumentTextIcon className="h-6 w-6"/>
                <span className="text-[8px] font-bold uppercase mt-0.5">DOC</span>
            </div>
        );
    }
    
    // Fallback for no proof or unknown type
    return (
        <div className="h-full w-full flex items-center justify-center text-slate-300 bg-slate-50">
            <CategoryIcon className="h-6 w-6 opacity-50"/>
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, progress, target }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex-grow">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 font-heading tracking-tight">{value}</h3>
            {progress !== undefined && target !== undefined && (
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((progress / target) * 100)}% of Limit</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${colorClass.replace('bg-', 'bg-').replace('text-', '')}`} 
                            style={{ width: `${Math.min((progress / target) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}
            {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
        </div>
    </div>
);

const StatusBadge: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const proofs = item.linkedProofs || [];
    const hasReceipt = proofs.some(p => p.type === 'document' || p.purpose === 'Proof of Purchase');
    const hasPhoto = proofs.some(p => p.type === 'image');
    const hasSerial = !!item.serialNumber;
    
    if(item.status === 'enriching') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"><SpinnerIcon className="w-3 h-3 mr-1"/> Enriching</span>;
    }

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

type SortKey = 'itemName' | 'itemCategory' | 'originalCost' | 'replacementCostValueRCV' | 'status';

const SortIcon = ({ active, direction }: { active: boolean, direction?: 'asc' | 'desc' }) => {
    if (!active) return <div className="flex flex-col opacity-0 group-hover:opacity-30"><ChevronUpIcon className="h-3 w-3 -mb-1"/><ChevronDownIcon className="h-3 w-3"/></div>
    return direction === 'asc' 
        ? <ChevronUpIcon className="h-3 w-3 text-primary" />
        : <ChevronDownIcon className="h-3 w-3 text-primary" />
}

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
    onItemPhotosSelected,
    searchTerm,
    onSearchTermChange,
    onImageZoom,
    onImportInventory
}) => {
    const { inventory, policies } = useAppState();
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false); // New state
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [riskGaps, setRiskGaps] = useState<RiskGap[]>([]);
    const [isRiskLoading, setIsRiskLoading] = useState(false);
    const [showSimulator, setShowSimulator] = useState(false);

    const activePolicy = policies.find(p => p.isActive);
    const personalPropertyLimit = activePolicy?.coverage ? (activePolicy.coverage.find(c => c.type === 'main' && c.category === 'Personal Property')?.limit || 95000) : 95000;

    useEffect(() => {
        const fetchRiskData = async () => {
            if (activePolicy && inventory.length > 0) {
                setIsRiskLoading(true);
                try {
                    const gaps = await geminiService.auditCoverageGaps(inventory, activePolicy);
                    setRiskGaps(gaps);
                } catch (e) {
                    console.error("Failed to fetch risk gaps", e);
                } finally {
                    setIsRiskLoading(false);
                }
            }
        };
        // Debounce slightly to prevent constant re-fetching on small edits
        const timer = setTimeout(fetchRiskData, 1000);
        return () => clearTimeout(timer);
    }, [inventory, activePolicy]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortValue = (item: InventoryItem, key: SortKey) => {
        if (key === 'replacementCostValueRCV') return item.replacementCostValueRCV || item.originalCost || 0;
        if (key === 'itemName') return item.itemName ? item.itemName.toLowerCase() : '';
        if (key === 'itemCategory') return item.itemCategory ? item.itemCategory.toLowerCase() : '';
        if (key === 'status') return item.status ? item.status.toLowerCase() : '';
        // default to direct access (originalCost)
        return (item as any)[key];
    };

    const tableData = useMemo(() => {
        let data = inventory.filter(item => 
            (item.itemName && item.itemName.toLowerCase().includes(searchTerm?.toLowerCase() || '')) ||
            (item.itemCategory && item.itemCategory.toLowerCase().includes(searchTerm?.toLowerCase() || ''))
        );

        if (sortConfig) {
            data.sort((a, b) => {
                const aValue = getSortValue(a, sortConfig.key);
                const bValue = getSortValue(b, sortConfig.key);

                // Handle undefined/null
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return data;
    }, [inventory, searchTerm, sortConfig]);

    const stats = useMemo(() => {
        const totalVal = tableData.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
        const readyCount = tableData.filter(i => 
            (i.linkedProofs || []).some(p => p.type === 'image') && 
            (i.linkedProofs || []).some(p => p.type === 'document' || p.purpose === 'Proof of Purchase')
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
                    title="Personal Property Target" 
                    value={`$${stats.totalRCV.toLocaleString()} / $${personalPropertyLimit.toLocaleString()}`} 
                    progress={stats.totalRCV}
                    target={personalPropertyLimit}
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

            {/* Risk Heatmap (New Feature) */}
            <RiskHeatmap gaps={riskGaps} isLoading={isRiskLoading} />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-20 transition-all duration-300 ease-in-out">
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
                     {/* Simulator Button */}
                     <button 
                        onClick={() => setShowSimulator(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 text-primary font-bold bg-primary/10 rounded-lg hover:bg-primary/20 transition text-sm"
                    >
                        <CalculatorIcon className="h-4 w-4"/> What If?
                    </button>

                     {/* Cloud Discovery Button (New) */}
                     <button 
                        onClick={() => setShowDiscoveryModal(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 text-purple-600 font-bold bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-100 transition text-sm"
                    >
                        <CloudArrowUpIcon className="h-4 w-4"/> Digital Discovery
                    </button>

                     <button 
                        onClick={() => setShowImportModal(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition text-sm font-medium"
                    >
                        <ArrowUpTrayIcon className="h-4 w-4"/> Import
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-dark hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition text-sm font-medium"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4"/> Export
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
                    <table className="min-w-full border-separate border-spacing-y-2 px-4" style={{ borderCollapse: 'separate' }}>
                        <thead>
                            <tr>
                                <th scope="col" className="px-4 py-3 w-12 text-left">
                                     <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                     />
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors group"
                                    onClick={() => handleSort('itemName')}
                                >
                                    <div className="flex items-center gap-1">
                                        Item & Description
                                        <SortIcon active={sortConfig?.key === 'itemName'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors group"
                                    onClick={() => handleSort('itemCategory')}
                                >
                                    <div className="flex items-center gap-1">
                                        Category
                                        <SortIcon active={sortConfig?.key === 'itemCategory'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors group"
                                    onClick={() => handleSort('originalCost')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Acquisition
                                        <SortIcon active={sortConfig?.key === 'originalCost'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors group"
                                    onClick={() => handleSort('replacementCostValueRCV')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Repl. Value (RCV)
                                        <SortIcon active={sortConfig?.key === 'replacementCostValueRCV'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th 
                                    scope="col" 
                                    className="px-6 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors group"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Status
                                        <SortIcon active={sortConfig?.key === 'status'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((item) => {
                                const CategoryIcon = CATEGORY_ICONS[item.itemCategory] || CATEGORY_ICONS['Other'];
                                const categoryColor = CATEGORY_COLORS[item.itemCategory] || '#94a3b8';
                                const isSelected = selectedIds.has(item.id);
                                
                                // Prioritize showing an image proof if available
                                const displayProof = (item.linkedProofs || []).find(p => p.type === 'image' || p.mimeType.startsWith('image/')) || (item.linkedProofs || [])[0];

                                return (
                                    <tr 
                                        key={item.id} 
                                        className={`group transition-all duration-300 cursor-pointer rounded-lg shadow-sm border border-transparent hover:shadow-md hover:border-slate-200 ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-white'}`}
                                        onClick={() => dispatch({ type: 'SELECT_ITEM', payload: item.id })}
                                    >
                                        <td className="px-4 py-4 rounded-l-lg" onClick={(e) => e.stopPropagation()}>
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
                                                    {displayProof ? (
                                                        <DashboardThumbnail proof={displayProof} categoryIcon={CategoryIcon} categoryColor={categoryColor} onZoom={onImageZoom} />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                            <CategoryIcon className="h-6 w-6 opacity-50"/>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="flex items-center gap-2">
                                                        <CategoryIcon className="h-4 w-4 flex-shrink-0" style={{ color: categoryColor }} />
                                                        <div className="text-sm font-bold text-slate-800 font-heading">{item.itemName}</div>
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[240px] pl-6">{item.brand} {item.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-100">
                                                <CategoryIcon className="h-3.5 w-3.5 mr-1.5" style={{ color: categoryColor }}/>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium rounded-r-lg">
                                            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold text-xs uppercase tracking-wide bg-primary/5 px-3 py-1 rounded-full">Edit</span>
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
                                            <p className="text-slate-500 mt-1 max-w-sm">Start by adding items manually, importing a CSV, or uploading evidence.</p>
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
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/95 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 z-50 animate-fade-in-up border border-slate-700/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedIds.size}
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap">Selected</span>
                    </div>
                    
                    <div className="h-6 w-px bg-slate-700/50"></div>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setShowBulkEdit(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 transition text-sm font-semibold group"
                        >
                            <PencilSquareIcon className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors"/> 
                            Edit
                        </button>
                        <button 
                             onClick={handleBulkDelete}
                             className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition text-sm font-semibold group"
                        >
                            <TrashIcon className="h-4 w-4 group-hover:text-rose-200"/> 
                            Delete
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-700/50"></div>
                    
                    <button 
                        onClick={() => setSelectedIds(new Set())} 
                        className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider pl-1 pr-2 transition-colors"
                    >
                        <XIcon className="h-4 w-4"/>
                        Clear Selection
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
            
            {showSimulator && activePolicy && (
                <ScenarioSimulatorModal 
                    inventory={inventory}
                    policy={activePolicy}
                    onClose={() => setShowSimulator(false)}
                />
            )}

            {showImportModal && (
                <ImportCSVModal 
                    onClose={() => setShowImportModal(false)} 
                    onImport={onImportInventory}
                />
            )}

            {showDiscoveryModal && (
                <DigitalDiscoveryModal 
                    onClose={() => setShowDiscoveryModal(false)}
                    onImport={onImportInventory!} // Assuming onImportInventory is provided in props
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
