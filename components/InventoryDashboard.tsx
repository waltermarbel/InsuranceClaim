
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
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
    XIcon,
    LinkIcon
} from './icons.tsx';
import { CATEGORY_ICONS, CATEGORIES, CATEGORY_COLORS, ITEM_CONDITIONS } from '../constants.ts';
import BulkEditModal from './BulkEditModal.tsx';
import ImportCSVModal from './ImportCSVModal.tsx';
import RiskHeatmap from './RiskHeatmap.tsx';
import ScenarioSimulatorModal from './ScenarioSimulatorModal.tsx';
import DigitalDiscoveryModal from './DigitalDiscoveryModal.tsx'; // Import new modal
import GallerySyncModal from './GallerySyncModal.tsx';
import BatchConflictCheckModal from './BatchConflictCheckModal.tsx';
import BulkLinkEvidenceModal from './BulkLinkEvidenceModal.tsx';
import { exportToCSV } from '../utils/fileUtils.ts';
import { useProofDataUrl } from '../hooks/useProofDataUrl.ts';
import * as geminiService from '../services/geminiService.ts';
import { generateInventoryReport } from '../utils/pdfGenerator.ts';
import { calculateHealthMetric, isHighRiskOfDenial } from '../utils/healthMetric.ts';
import { ScoreIndicator } from './ScoreIndicator.tsx';

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
const DashboardThumbnail = React.memo<{ proof: Proof; categoryIcon: React.ElementType; categoryColor: string; onZoom?: (url: string) => void }>(({ proof, categoryIcon: CategoryIcon, categoryColor, onZoom }) => {
    const { dataUrl, isLoading } = useProofDataUrl(proof.id);
    const displayUrl = proof.dataUrl || dataUrl;
    const isImage = proof.type === 'image' || proof.mimeType?.startsWith('image/');

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (displayUrl && onZoom && isImage) {
            e.stopPropagation();
            onZoom(displayUrl);
        }
    }, [displayUrl, onZoom, isImage]);

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
});

const StatCard = React.memo(({ title, value, subtext, icon: Icon, colorClass, progress, target }: any) => (
    <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start space-x-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
    >
        <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10 shadow-inner`}>
            <Icon className={`h-7 w-7 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div className="flex-grow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
            <h3 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">{value}</h3>
            {progress !== undefined && target !== undefined && target > 0 && (
                <div className="mt-5 w-full">
                    <div className="flex justify-between items-end mb-2.5">
                         <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Extraction Velocity</span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${(progress/target) > 0.8 ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                            {((progress / target) * 100).toFixed(1)}% of Cap
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex relative shadow-inner">
                        {/* 80% Threshold Line */}
                        <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-rose-400 z-10 opacity-70" style={{ left: '80%' }}></div>
                        
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((progress / target) * 100, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                            className={`h-full relative z-0 ${(progress/target) > 0.8 ? 'bg-rose-500' : colorClass.split(' ')[0]}`}
                        >
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        </motion.div>
                    </div>
                </div>
            )}
            {subtext && <p className="text-sm text-slate-500 mt-2 font-medium">{subtext}</p>}
        </div>
    </motion.div>
));

const StatusBadge = React.memo<{ item: InventoryItem }>(({ item }) => {
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
});

// ... 

const DashboardRow = React.memo<{ 
    item: InventoryItem; 
    isSelected: boolean; 
    onSelectRow: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void; 
    onRowClick: (id: string) => void; 
    onDelete: (id: string) => void; 
    onZoom: (url: string) => void; 
}>(({ item, isSelected, onSelectRow, onRowClick, onDelete, onZoom }) => {
    const CategoryIcon = CATEGORY_ICONS[item.itemCategory] || CATEGORY_ICONS['Other'];
    const categoryColor = CATEGORY_COLORS[item.itemCategory] || '#94a3b8';
    
    // Prioritize showing an image proof if available
    const displayProof = (item.linkedProofs || []).find(p => p.type === 'image' || p.mimeType.startsWith('image/')) || (item.linkedProofs || [])[0];

    const healthScore = calculateHealthMetric(item);
    const highRisk = isHighRiskOfDenial(healthScore);

    return (
        <motion.tr 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`group transition-all duration-300 cursor-pointer shadow-sm border-b border-transparent hover:shadow-md hover:border-slate-200 ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-white'}`}
            onClick={() => onRowClick(item.id)}
        >
            <td className="px-4 py-4 rounded-l-lg" onClick={(e) => e.stopPropagation()}>
                 <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => onSelectRow(item.id, e)}
                 />
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className="h-12 w-12 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow relative">
                        {displayProof ? (
                            <DashboardThumbnail proof={displayProof} categoryIcon={CategoryIcon} categoryColor={categoryColor} onZoom={onZoom} />
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
                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                    <StatusBadge item={item} />
                    <div className="flex flex-col items-center gap-1 w-full mt-1">
                        <ScoreIndicator score={healthScore} size="sm" />
                        {highRisk && (
                            <span className="text-[9px] font-bold uppercase tracking-widest bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm w-full block text-center">High Risk of Denial</span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium rounded-r-lg">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <span className="text-primary font-semibold text-xs uppercase tracking-wide bg-primary/5 px-3 py-1 rounded-full hover:bg-primary/10 transition-colors">Edit</span>
                    <button aria-label="Delete Item"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                        }}
                        className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-rose-500"
                        title="Delete Item"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
});

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
    const { inventory, policies, accountHolder, unlinkedProofs } = useAppState();
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
    const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
    const [purchaseDateStart, setPurchaseDateStart] = useState<string>('');
    const [purchaseDateEnd, setPurchaseDateEnd] = useState<string>('');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false); // New state
    const [showBatchConflict, setShowBatchConflict] = useState(false);
    const [showBulkLink, setShowBulkLink] = useState(false);
    const [showGallerySyncModal, setShowGallerySyncModal] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
    const [riskGaps, setRiskGaps] = useState<RiskGap[]>([]);
    const [isRiskLoading, setIsRiskLoading] = useState(false);
    const [showSimulator, setShowSimulator] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onItemPhotosSelected(e.dataTransfer.files);
        }
    };

    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    
    const toggleCategoryGroup = (category: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    const handleBulkLink = useCallback((proofIds: string[], itemIds: string[]) => {
        const proofsToLink = unlinkedProofs.filter(p => proofIds.includes(p.id));
        if (proofsToLink.length === 0) return;

        // Add the proofs to all specified items
        itemIds.forEach(itemId => {
            dispatch({ type: 'ADD_PROOFS_TO_ITEM', payload: { itemId, proofs: proofsToLink } });
        });
        
        // Remove the proofs from unlinked proofs
        proofIds.forEach(proofId => {
            dispatch({ type: 'REMOVE_UNLINKED_PROOF', payload: proofId });
        });
        
        setShowBulkLink(false);
    }, [dispatch, unlinkedProofs]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const activePolicy = policies.find(p => p.isActive);
    const personalPropertyLimit = (activePolicy?.state?.aggregateLimits?.['Personal Property'] ?? (activePolicy?.coverage?.find(c => c.type === 'main' && c.category === 'Personal Property')?.limit || 0)) || 15000;

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

    const handleRowClick = useCallback((id: string) => {
        dispatch({ type: 'SELECT_ITEM', payload: id });
    }, [dispatch]);

    const handleRowDelete = useCallback((id: string) => {
        dispatch({ type: 'DELETE_ITEM', payload: { itemId: id } });
    }, [dispatch]);

    const activeFilterCount = selectedCategories.size + selectedStatuses.size + selectedConditions.size + (purchaseDateStart ? 1 : 0) + (purchaseDateEnd ? 1 : 0);

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

        if (selectedCategories.size > 0) {
            data = data.filter(item => selectedCategories.has(item.itemCategory));
        }

        if (selectedStatuses.size > 0) {
            data = data.filter(item => item.status && selectedStatuses.has(item.status));
        }

        if (selectedConditions.size > 0) {
            data = data.filter(item => item.condition && selectedConditions.has(item.condition));
        }

        if (purchaseDateStart) {
            data = data.filter(item => item.purchaseDate && item.purchaseDate >= purchaseDateStart);
        }

        if (purchaseDateEnd) {
            data = data.filter(item => item.purchaseDate && item.purchaseDate <= purchaseDateEnd);
        }

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

    const groupedData = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        for (const item of tableData) {
            const cat = item.itemCategory || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        }
        return Object.keys(groups).sort().map(cat => ({
            category: cat,
            items: groups[cat]
        }));
    }, [tableData]);

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

    const handleSelectRow = useCallback((id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (e.target.checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    }, []);

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
        dispatch({ type: 'BULK_DELETE_ITEMS', payload: { ids: Array.from(selectedIds) } });
        setSelectedIds(new Set());
    };

    const handleExportCSV = () => {
        const filename = `Assert_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(tableData, filename);
    };

    const handleGenerateReport = () => {
        generateInventoryReport(tableData, activePolicy, accountHolder.name);
    };

    const handleCategoryClick = (category: string) => {
        const newCategories = new Set(selectedCategories);
        if (newCategories.has(category)) {
            newCategories.delete(category);
        } else {
            newCategories.add(category);
        }
        setSelectedCategories(newCategories);
        
        // Scroll to table
        const tableElement = document.querySelector('table');
        if (tableElement) {
            tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div 
            className={`space-y-8 pb-24 relative transition-colors ${isDragging ? 'bg-indigo-50/50 outline-dashed outline-2 outline-indigo-400 rounded-2xl' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl pointer-events-none">
                    <CloudArrowUpIcon className="h-24 w-24 text-indigo-500 animate-bounce" />
                    <h2 className="text-3xl font-bold font-heading text-indigo-800 tracking-tight mt-6">Drop Evidence to Ingest</h2>
                    <p className="text-indigo-600 mt-2 font-medium">Documents, receipts, photos, or data files.</p>
                </div>
            )}
            
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
            <RiskHeatmap 
                gaps={riskGaps} 
                isLoading={isRiskLoading} 
                onCategoryClick={handleCategoryClick}
                selectedCategories={selectedCategories}
            />

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] sticky top-24 z-20 transition-all duration-300 ease-in-out">
                <div className="flex items-center gap-4 w-full xl:w-1/3">
                    <div className="relative flex-grow group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search schedule..." 
                            className="pl-12 pr-4 py-3 text-sm border border-slate-200 bg-slate-50 rounded-full w-full focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all outline-none text-slate-700"
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                        />
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative flex-shrink-0" ref={filterRef}>
                        <button 
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-full border transition-all duration-200 ${
                                activeFilterCount > 0 || showFilterDropdown 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow'
                            }`}
                        >
                            <FunnelIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Filter</span>
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 rounded-full ml-1">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {showFilterDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-slate-100 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                                    <span className="font-bold text-slate-700">Filters</span>
                                    {activeFilterCount > 0 && (
                                        <button 
                                            onClick={() => {
                                                setSelectedCategories(new Set());
                                                setSelectedStatuses(new Set());
                                                setSelectedConditions(new Set());
                                                setPurchaseDateStart('');
                                                setPurchaseDateEnd('');
                                            }}
                                            className="text-xs text-primary hover:text-primary-dark font-medium px-2 py-1 bg-primary/10 rounded-md transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
                                    {/* Categories */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</div>
                                        <div className="space-y-1">
                                            {CATEGORIES.map(category => (
                                                <label key={category} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedCategories.has(category)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedCategories);
                                                            if (e.target.checked) newSet.add(category);
                                                            else newSet.delete(category);
                                                            setSelectedCategories(newSet);
                                                        }}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-slate-700">{category}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Statuses */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Statuses</div>
                                        <div className="space-y-1">
                                            {['needs-review', 'active', 'processing', 'clustering', 'enriching', 'claimed', 'archived', 'error', 'rejected'].map(status => (
                                                <label key={status} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedStatuses.has(status)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedStatuses);
                                                            if (e.target.checked) newSet.add(status);
                                                            else newSet.delete(status);
                                                            setSelectedStatuses(newSet);
                                                        }}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-slate-700 capitalize">{status.replace('-', ' ')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Conditions */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Condition</div>
                                        <div className="space-y-1">
                                            {ITEM_CONDITIONS.map(condition => (
                                                <label key={condition} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedConditions.has(condition)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedConditions);
                                                            if (e.target.checked) newSet.add(condition);
                                                            else newSet.delete(condition);
                                                            setSelectedConditions(newSet);
                                                        }}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-slate-700">{condition}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date Range */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase Date</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">From</label>
                                                <input 
                                                    type="date" 
                                                    value={purchaseDateStart}
                                                    onChange={e => setPurchaseDateStart(e.target.value)}
                                                    className="w-full text-sm border-slate-200 rounded-md p-1 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">To</label>
                                                <input 
                                                    type="date" 
                                                    value={purchaseDateEnd}
                                                    onChange={e => setPurchaseDateEnd(e.target.value)}
                                                    className="w-full text-sm border-slate-200 rounded-md p-1 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
                     {/* Simulator Button */}
                     <button 
                        onClick={() => setShowSimulator(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-indigo-700 font-semibold bg-indigo-50/50 hover:bg-indigo-100/70 rounded-full transition-all duration-200 text-sm border border-indigo-100 shadow-sm"
                    >
                        <CalculatorIcon className="h-4 w-4"/> What If Strategy
                    </button>

                     {/* Cloud Discovery Button (New) */}
                     <button 
                        onClick={() => setShowDiscoveryModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 text-purple-700 font-semibold bg-purple-50/50 hover:bg-purple-100/70 rounded-full border border-purple-100 transition-all duration-200 text-sm shadow-sm"
                    >
                        <CloudArrowUpIcon className="h-4 w-4 text-purple-600"/> Digital Discovery
                    </button>

                    {/* Gallery Sync Button */}
                    <button 
                        onClick={() => setShowGallerySyncModal(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-blue-700 font-semibold bg-blue-50/50 hover:bg-blue-100/70 rounded-full border border-blue-100 transition-all duration-200 text-sm shadow-sm"
                    >
                        <PhotoIcon className="h-4 w-4 text-blue-600"/> Gallery Sync
                    </button>

                    {/* Batch Conflict Check Button */}
                    <button 
                        onClick={() => setShowBatchConflict(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-amber-700 font-semibold bg-amber-50/50 hover:bg-amber-100/70 rounded-full border border-amber-100 transition-all duration-200 text-sm shadow-sm"
                    >
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-600"/> Conflict Check
                    </button>

                    {/* Bulk Link Evidence Button */}
                    {unlinkedProofs.length > 0 && (
                        <button 
                            onClick={() => setShowBulkLink(true)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-indigo-600 font-semibold bg-indigo-50 hover:bg-indigo-100 rounded-full border border-indigo-100 transition-all duration-200 text-sm shadow-sm"
                        >
                            <LinkIcon className="h-4 w-4"/> Bulk Link
                        </button>
                    )}

                     <button 
                        onClick={() => setShowImportModal(true)}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full border border-transparent transition-all duration-200 text-sm font-medium"
                    >
                        <ArrowUpTrayIcon className="h-4 w-4"/> Import
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full border border-transparent transition-all duration-200 text-sm font-medium pt-tooltip"
                        title="Export as ISO/Xactimate compatible CSV for Adjusters"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4"/> Adjuster CSV (ISO)
                    </button>
                    <button 
                        onClick={handleGenerateReport}
                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full border border-transparent transition-all duration-200 text-sm font-medium"
                        title="Generate standard Schedule of Loss Report"
                    >
                        <DocumentTextIcon className="h-4 w-4"/> Loss Schedule PDF
                    </button>
                    <div className="h-8 w-px bg-slate-200 hidden xl:block mx-1"></div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
                    >
                        <PlusIcon className="h-5 w-5" /> Add Item
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
                                        Readiness & Status
                                        <SortIcon active={sortConfig?.key === 'status'} direction={sortConfig?.direction} />
                                    </div>
                                </th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedData.map((group) => (
                                <React.Fragment key={group.category}>
                                    <tr 
                                        className="bg-slate-50 border-y border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => toggleCategoryGroup(group.category)}
                                    >
                                        <td colSpan={8} className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                {collapsedCategories.has(group.category) ? (
                                                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                                                ) : (
                                                    <ChevronUpIcon className="h-4 w-4 text-slate-500" />
                                                )}
                                                <span className="font-bold text-slate-800 text-sm tracking-wide">{group.category}</span>
                                                <span className="bg-white text-slate-600 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                                                    {group.items.length}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    {!collapsedCategories.has(group.category) && group.items.map((item) => (
                                        <DashboardRow 
                                            key={item.id}
                                            item={item}
                                            isSelected={selectedIds.has(item.id)}
                                            onSelectRow={handleSelectRow}
                                            onRowClick={handleRowClick}
                                            onDelete={handleRowDelete}
                                            onZoom={onImageZoom}
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                            {tableData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <ClipboardDocumentListIcon className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">Schedule is Empty</h3>
                                            <p className="text-slate-500 mt-1 max-w-sm mb-6">Start by adding items manually, importing a CSV, or discovering them digitally.</p>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                 <button 
                                                    onClick={() => setShowDiscoveryModal(true)}
                                                    className="flex items-center justify-center gap-2 px-6 py-3 text-purple-600 font-bold bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-100 transition shadow-sm"
                                                >
                                                    <CloudArrowUpIcon className="h-5 w-5"/> Auto-Discover from Cloud
                                                </button>
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold rounded-xl transition shadow-sm"
                                                >
                                                    <PhotoIcon className="h-5 w-5"/> Upload Photos / Receipts
                                                </button>
                                            </div>
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

            {showGallerySyncModal && (
                <GallerySyncModal 
                    onClose={() => setShowGallerySyncModal(false)}
                />
            )}
            
            {showBatchConflict && (
                <BatchConflictCheckModal 
                    inventory={inventory}
                    onClose={() => setShowBatchConflict(false)}
                />
            )}

            {showBulkLink && (
                <BulkLinkEvidenceModal 
                    unlinkedProofs={unlinkedProofs}
                    inventory={inventory}
                    initialSelectedItemIds={Array.from(selectedIds)}
                    onClose={() => setShowBulkLink(false)}
                    onBulkLink={handleBulkLink}
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
