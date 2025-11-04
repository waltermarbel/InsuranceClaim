import React from 'react';
import { useState, useEffect } from 'react';
// Fix: Added .ts extension to file path
import { InventoryItem, AccountHolder, ParsedPolicy, OtherCosts, ClaimDetails, PipelineStage, PipelineProgress } from '../types.ts';
import ItemCard from './ItemCard.tsx';
import { PlusIcon, SearchIcon, VideoCameraIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon, PencilIcon, CheckCircleIcon, InformationCircleIcon, CubeIcon, ShieldExclamationIcon, XCircleIcon, QrCodeIcon, PencilSquareIcon, GlobeIcon, DocumentMagnifyingGlassIcon, CameraIcon, SparklesIcon, PhotoIcon } from './icons.tsx';
import { InsuranceSection } from './InsuranceSection.tsx';
import { CategoryPieChart } from './CategoryPieChart.tsx';

interface InventoryDashboardProps {
  items: InventoryItem[];
  filteredItems: InventoryItem[];
  accountHolder: AccountHolder;
  policies: ParsedPolicy[];
  activePolicy: ParsedPolicy | undefined;
  claimDetails: ClaimDetails;
  onUpdateClaimDetails: (updatedDetails: Partial<ClaimDetails>) => void;
  isParsingPolicy: boolean;
  onUploadPolicy: (file: File) => void;
  onSetActivePolicy: (policyId: string) => void;
  onSelectItem: (itemId: string) => void;
  onItemPhotosSelected: (files: FileList) => void;
  onStartRoomScan: () => void;
  onOpenImageAnalysis: () => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  itemCategories: string[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  coverageFilter: string;
  onCoverageFilterChange: (value: string) => void;
  onApproveItem: (itemId: string) => void;
  onRejectItem: (itemId: string) => void;
  onCalculateFRV: () => void;
  
  selectedItemIds: string[];
  onToggleItemSelection: (itemId: string) => void;
  onSelectAllFilteredItems: () => void;
  onClearSelection: () => void;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onBulkExtractSerialNumbers: () => void;
  onBulkFindMarketPrice: () => void;
  onBulkEnrichData: () => void;
  onBulkVisualSearch: () => void;
  onBulkGenerateImages: () => void;
  onOpenBulkImageEditModal: () => void;
  onOpenBulkEdit: () => void;
}

interface ClaimOverviewProps {
    items: InventoryItem[];
    policy: ParsedPolicy | null;
    claimDetails: ClaimDetails;
    onUpdateClaimDetails: (updatedDetails: Partial<ClaimDetails>) => void;
    onCalculateFRV: () => void;
}

const ClaimOverview: React.FC<ClaimOverviewProps> = ({ items, policy, claimDetails, onUpdateClaimDetails, onCalculateFRV }) => {
  const claimedItems = items.filter(item => item.status === 'claimed');

  const calculateCosts = () => {
    let lossOfUse = 0;
    let propertyDamage = 0;
    let identityFraud = 0;
    const aleProofs = claimDetails.aleProofs || [];

    if (claimDetails.fairRentalValuePerDay && claimDetails.claimDateRange?.startDate && claimDetails.claimDateRange?.endDate) {
        const start = new Date(claimDetails.claimDateRange.startDate);
        const end = new Date(claimDetails.claimDateRange.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        const calculatedLossOfUse = diffDays * claimDetails.fairRentalValuePerDay;
        lossOfUse = policy ? Math.min(calculatedLossOfUse, policy.coverageD_limit) : calculatedLossOfUse;
    }

    aleProofs.forEach(proof => {
      const value = proof.estimatedValue || 0;
      switch (proof.costType) {
        case 'Loss of Use':
            if (!claimDetails.fairRentalValuePerDay) lossOfUse += value;
            break;
        case 'Property Damage & Debris Removal':
          propertyDamage += value;
          break;
        case 'Identity Fraud Expenses':
          identityFraud += value;
          break;
        default:
          break;
      }
    });
    return { lossOfUse, propertyDamage, identityFraud };
  };

  const calculatedCosts = calculateCosts();

  const personalPropertyTotal = claimedItems.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const totalClaimValue = personalPropertyTotal + calculatedCosts.lossOfUse + calculatedCosts.propertyDamage + calculatedCosts.identityFraud;
  
  if (!policy) return null;
  const identityFraudLimit = policy.coverage.find(c => c.category === 'Identity Fraud Expenses')?.limit || 0;
  const jewelryLimit = policy.coverage.find(c => c.category === 'Jewelry')?.limit || 0;
  
  const identityFraudConflict = calculatedCosts.identityFraud > identityFraudLimit;
  const jewelryValue = claimedItems.filter(i => i.itemCategory === 'Jewelry').reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const jewelryConflict = jewelryValue > jewelryLimit;
  
  const isClaimSetup = claimedItems.length === 0;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      onUpdateClaimDetails({
          claimDateRange: {
              ...claimDetails.claimDateRange,
              [name]: value,
          }
      });
  };

  return (
    <div className="mb-10">
        <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2 mb-4">
            <ClipboardDocumentListIcon className="h-6 w-6 text-medium"/>
            {isClaimSetup ? 'Claim Setup' : `Claim Overview: ${claimDetails.name}`}
        </h3>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                {isClaimSetup ? (
                    <div className="h-full flex flex-col justify-center">
                        <h4 className="font-bold text-dark font-heading">Prepare Your Claim</h4>
                        <p className="text-medium text-sm mt-1">
                            Set up the details of your loss event here. Once you start drafting claims for items, a value breakdown will appear.
                        </p>
                         <div className="mt-6">
                            <h4 className="font-bold text-dark mb-2 flex items-center gap-2 font-heading">
                                <WrenchScrewdriverIcon className="h-5 w-5 text-medium" />
                                <span>Property Damage Details</span>
                            </h4>
                            <div className="text-xs text-medium bg-slate-50 p-4 rounded-md border space-y-2 whitespace-pre-wrap">
                                {claimDetails.propertyDamageDetails || 'No details provided.'}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-dark font-heading">Claim Value Breakdown</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Personal Property (Coverage C)</span><span className="font-semibold text-dark">${personalPropertyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between items-center py-1 border-b">
                                <span className="text-medium">Loss of Use (Coverage D)</span>
                                {claimDetails.fairRentalValuePerDay ? (
                                    <span className="font-semibold text-dark">${calculatedCosts.lossOfUse.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                ) : (
                                    <button onClick={onCalculateFRV} className="text-xs font-semibold text-primary hover:underline">Calculate FRV</button>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Property Damage & Debris Removal</span><span className="font-semibold text-dark">${calculatedCosts.propertyDamage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Identity Fraud Expenses</span><span className="font-semibold text-dark">${calculatedCosts.identityFraud.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between items-center pt-2 font-bold text-lg"><span className="text-dark font-heading">Total Claim Value</span><span className="text-primary">${totalClaimValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                        
                        <div className="mt-6">
                            <h4 className="font-bold text-dark mb-2 flex items-center gap-2 font-heading">
                                <WrenchScrewdriverIcon className="h-5 w-5 text-medium" />
                                <span>Property Damage Details</span>
                            </h4>
                            <div className="text-xs text-medium bg-slate-50 p-4 rounded-md border space-y-2 whitespace-pre-wrap">
                                {claimDetails.propertyDamageDetails || 'No details provided.'}
                            </div>
                        </div>
                        {(identityFraudConflict || jewelryConflict) && (<div className="mt-6"><h4 className="font-bold text-dark mb-2 font-heading">Strategic Highlights</h4><div className="space-y-3">{identityFraudConflict && (<div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm"><div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div><div className="ml-3"><p><strong className="font-semibold">Sub-Limit Conflict:</strong> Claimed Identity Fraud Expenses of ${calculatedCosts.identityFraud.toLocaleString()} exceed the ${identityFraudLimit.toLocaleString()} policy sub-limit. This requires a specific negotiation strategy.</p></div></div></div>)}{jewelryConflict && (<div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm"><div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div><div className="ml-3"><p><strong className="font-semibold">Sub-Limit Conflict:</strong> Total Jewelry value of ${jewelryValue.toLocaleString()} exceed the ${jewelryLimit.toLocaleString()} theft sub-limit. Items may need separate scheduling for full coverage.</p></div></div></div>)}</div></div>)}
                    </>
                )}
            </div>
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-dark font-heading">Incident Details</h4>
                </div>
                <div className="space-y-4 text-sm bg-slate-50 p-4 rounded-md border">
                    <div className="flex justify-between"><span className="text-medium">Date of Loss:</span><span className="font-medium">{claimDetails.dateOfLoss ? new Date(claimDetails.dateOfLoss).toLocaleDateString('en-US', {timeZone: 'UTC'}) : 'N/A'}</span></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-xs font-medium text-medium">Timeframe Start</label>
                            <input
                                type="date"
                                id="startDate"
                                name="startDate"
                                value={claimDetails.claimDateRange?.startDate || ''}
                                onChange={handleDateChange}
                                className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-xs font-medium text-medium">Timeframe End</label>
                            <input
                                type="date"
                                id="endDate"
                                name="endDate"
                                value={claimDetails.claimDateRange?.endDate || ''}
                                onChange={handleDateChange}
                                className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-between pt-2"><span className="text-medium">Incident:</span><span className="font-medium">{claimDetails.incidentType}</span></div>
                    <div className="flex justify-between text-left"><span className="text-medium pr-2">Location:</span><span className="font-medium text-right">{claimDetails.location}</span></div>
                    <div className="flex justify-between"><span className="text-medium">Police Report:</span><span className="font-medium">{claimDetails.policeReport}</span></div>
                </div>
            </div>
        </div>
    </div>
  );
};

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
    items,
    filteredItems, 
    accountHolder, 
    policies,
    activePolicy,
    claimDetails,
    onUpdateClaimDetails,
    isParsingPolicy,
    onUploadPolicy,
    onSetActivePolicy,
    onSelectItem, 
    onItemPhotosSelected,
    onStartRoomScan,
    onOpenImageAnalysis,
    searchTerm,
    onSearchTermChange,
    categoryFilter,
    onCategoryFilterChange,
    itemCategories,
    statusFilter,
    onStatusFilterChange,
    coverageFilter,
    onCoverageFilterChange,
    onApproveItem,
    onRejectItem,
    onCalculateFRV,
    selectedItemIds,
    onToggleItemSelection,
    onSelectAllFilteredItems,
    onClearSelection,
    onApproveSelected,
    onRejectSelected,
    onBulkExtractSerialNumbers,
    onBulkFindMarketPrice,
    onBulkEnrichData,
    onBulkVisualSearch,
    onBulkGenerateImages,
    onOpenBulkImageEditModal,
    onOpenBulkEdit,
}) => {
    const itemFileInputRef = React.useRef<HTMLInputElement>(null);
    
    const handleItemFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onItemPhotosSelected(event.target.files);
        }
    };
    
    const handleAddItemClick = () => {
        itemFileInputRef.current?.click();
    };
    
    const totalRcv = items.filter(i => i.status === 'active').reduce((acc, item) => {
        return acc + (item.replacementCostValueRCV || item.originalCost || 0);
    }, 0);

    const isAllFilteredSelected = filteredItems.length > 0 && selectedItemIds.length === filteredItems.length && filteredItems.every(i => selectedItemIds.includes(i.id));

    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectAllFilteredItems();
        } else {
            onClearSelection();
        }
    };

    if (policies.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-16">
                 <h1 className="text-4xl font-extrabold text-dark tracking-tight font-heading">
                    Welcome to Your Digital Vault
                </h1>
                <p className="mt-4 text-lg text-medium">
                    To get started, the AI needs to understand your insurance coverage. Please upload your policy declarations page. This provides the context for all future analysis and ensures your inventory is aligned with your coverage.
                </p>
                <div className="mt-8">
                     <InsuranceSection 
                        policies={policies}
                        onUpload={onUploadPolicy}
                        onSetActivePolicy={onSetActivePolicy}
                        isLoading={isParsingPolicy}
                    />
                </div>
            </div>
        )
    }

  return (
    <div className="relative">
      <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-3xl font-bold tracking-tight text-dark font-heading mb-4">
            Welcome, {accountHolder.name.split(' ')[0]}!
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-dark font-heading">Inventory Overview</h3>
                <p className="text-medium mt-1">
                    You have <span className="font-semibold text-dark">{items.length}</span> items in your vault.
                    Your estimated total RCV for non-claimed items is <span className="font-semibold text-dark">${totalRcv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>.
                </p>
                 <div className="flex items-center flex-wrap gap-4 w-full pt-6 border-t border-slate-200 mt-6">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      ref={itemFileInputRef}
                      onChange={handleItemFileChange}
                      className="hidden"
                    />
                    <button 
                        onClick={onStartRoomScan}
                        className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                    >
                        <VideoCameraIcon className="h-5 w-5"/>
                        <span>Room Scan</span>
                    </button>
                    <button 
                        onClick={onOpenImageAnalysis}
                        className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                    >
                        <DocumentMagnifyingGlassIcon className="h-5 w-5"/>
                        <span>Analyze Images</span>
                    </button>
                    <button 
                        onClick={handleAddItemClick}
                        className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                    >
                        <PlusIcon className="h-5 w-5"/>
                        <span>Add Local Files</span>
                    </button>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
                <CategoryPieChart items={items} />
            </div>
        </div>
      </div>

      <ClaimOverview 
        items={items} 
        policy={activePolicy || null}
        claimDetails={claimDetails}
        onUpdateClaimDetails={onUpdateClaimDetails}
        onCalculateFRV={onCalculateFRV}
      />

      <InsuranceSection 
        policies={policies}
        onUpload={onUploadPolicy}
        onSetActivePolicy={onSetActivePolicy}
        isLoading={isParsingPolicy}
      />
      
      <h3 className="text-xl font-bold tracking-tight text-dark font-heading">Inventory Ledger</h3>
      <div className="my-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </span>
                <input
                    type="text"
                    placeholder="Search your ledger..."
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
            </div>
            <div>
                <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => onCategoryFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="all">All Item Categories</option>
                    {itemCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
                 <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="needs-review">Needs Review</option>
                    <option value="active">Active</option>
                    <option value="enriching">Enriching</option>
                    <option value="processing">Processing</option>
                    <option value="claimed">Claimed</option>
                    <option value="archived">Archived</option>
                    <option value="rejected">Rejected</option>
                    <option value="error">Error</option>
                </select>
            </div>
            <div>
                 <select
                    aria-label="Filter by coverage"
                    value={coverageFilter}
                    onChange={(e) => onCoverageFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    disabled={!activePolicy?.isVerified}
                >
                    <option value="all">All Coverages</option>
                    {activePolicy?.coverage.map(cov => <option key={cov.category} value={cov.category}>{cov.category}</option>)}
                </select>
            </div>
        </div>
        {selectedItemIds.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 bg-primary/5 p-3 -m-4 mt-4 rounded-b-lg flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-dark">
                        {selectedItemIds.length} item(s) selected
                    </p>
                    <button onClick={onClearSelection} className="text-sm text-primary font-semibold hover:underline">
                        Deselect All
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={onRejectSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-md transition-colors"><XCircleIcon className="h-4 w-4" />Reject</button>
                    <button onClick={onApproveSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success bg-success/10 hover:bg-success/20 rounded-md transition-colors"><CheckCircleIcon className="h-4 w-4" />Approve</button>
                    <div className="h-5 border-l border-slate-300 mx-1"></div>
                    <button onClick={onBulkFindMarketPrice} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><GlobeIcon className="h-4 w-4" />Market Price</button>
                    <button onClick={onBulkEnrichData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><DocumentMagnifyingGlassIcon className="h-4 w-4" />Enrich Data</button>
                    <button onClick={onBulkVisualSearch} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><CameraIcon className="h-4 w-4" />Visual Search</button>
                    <div className="h-5 border-l border-slate-300 mx-1"></div>
                    <button onClick={onBulkGenerateImages} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><PhotoIcon className="h-4 w-4" />Generate Images</button>
                    <button onClick={onOpenBulkImageEditModal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><SparklesIcon className="h-4 w-4" />Edit Images</button>
                    <button onClick={onOpenBulkEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><PencilSquareIcon className="h-4 w-4" />Bulk Edit</button>
                    <div className="h-5 border-l border-slate-300 mx-1"></div>
                    <button onClick={onBulkExtractSerialNumbers} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"><QrCodeIcon className="h-4 w-4" />Extract S/N</button>
                </div>
            </div>
        )}
      </div>
      
      {filteredItems.length > 0 && (
        <div className="px-1 py-2 flex items-center">
            <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={handleSelectAllChange}
                aria-label="Select all items"
                className="h-5 w-5 rounded border-slate-400 text-primary focus:ring-primary"
            />
            <label className="ml-3 text-sm font-semibold text-medium">
                {isAllFilteredSelected ? `Deselect All ${filteredItems.length} items` : `Select All ${filteredItems.length} items`}
            </label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredItems.map(item => (
          <ItemCard 
            key={item.id} 
            item={item} 
            onSelect={() => onSelectItem(item.id)}
            onApprove={onApproveItem}
            onReject={onRejectItem}
            isSelected={selectedItemIds.includes(item.id)}
            onToggleSelection={onToggleItemSelection}
          />
        ))}
      </div>
      {filteredItems.length === 0 && items.length > 0 && (
         <div className="text-center py-12 text-medium col-span-full">
            <p>No items match your current filters.</p>
        </div>
      )}
       {items.length === 0 && (
         <div className="text-center py-12 text-medium col-span-full">
            <p>Your inventory ledger is empty.</p>
            <p className="text-sm">Add assets to begin building your vault.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;