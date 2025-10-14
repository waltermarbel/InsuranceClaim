import React from 'react';
import { useState, useEffect } from 'react';
// Fix: Added .ts extension to file path
import { InventoryItem, AccountHolder, ParsedPolicy, OtherCosts, ClaimDetails } from '../types.ts';
import ItemCard from './ItemCard';
import { PlusIcon, SearchIcon, VideoCameraIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon, PencilIcon, CheckCircleIcon, InformationCircleIcon } from './icons';
import { CATEGORIES } from '../constants';
import { InsuranceSection } from './InsuranceSection';
import { CategoryPieChart } from './CategoryPieChart';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import { CurrencyInput } from './CurrencyInput';

interface InventoryDashboardProps {
  items: InventoryItem[];
  filteredItems: InventoryItem[];
  accountHolder: AccountHolder;
  policy: ParsedPolicy | null;
  claimDetails: ClaimDetails;
  onUpdateClaimDetails: (details: ClaimDetails) => void;
  isParsingPolicy: boolean;
  onUploadPolicy: (file: File) => void;
  onUpdatePolicy: (policy: ParsedPolicy) => void;
  onVerifyPolicy: () => void;
  onSelectItem: (itemId: string) => void;
  onItemPhotosSelected: (files: FileList) => void;
  onProofDocumentsSelected: (files: FileList) => void;
  onStartRoomScan: () => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  coverageFilter: string;
  onCoverageFilterChange: (value: string) => void;
}

interface ClaimOverviewProps {
    items: InventoryItem[];
    policy: ParsedPolicy | null;
    claimDetails: ClaimDetails;
    onUpdateClaimDetails: (details: ClaimDetails) => void;
}

const ClaimOverview: React.FC<ClaimOverviewProps> = ({ items, policy, claimDetails, onUpdateClaimDetails }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableDetails, setEditableDetails] = useState<ClaimDetails>(claimDetails);

  const claimedItems = items.filter(item => item.status === 'claimed');

  useEffect(() => {
      setEditableDetails(claimDetails);
  }, [claimDetails]);

  if (!policy) return null;

  if (claimedItems.length === 0) {
    return (
        <div className="mb-10 text-center p-8 bg-white rounded-lg shadow-sm border border-slate-200">
             <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center justify-center gap-2 mb-2">
                <ClipboardDocumentListIcon className="h-6 w-6 text-medium"/>
                No Active Claim
            </h3>
            <p className="text-medium">To start a claim, select an item from your ledger and use the "Draft Claim" action in its detail view.</p>
        </div>
    );
  }

  const handleSave = () => {
    onUpdateClaimDetails(editableDetails);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditableDetails(claimDetails);
    setIsEditing(false);
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableDetails(prev => ({ ...prev, [name]: value }));
  };


  const calculateCosts = () => {
    let lossOfUse = 0;
    let propertyDamage = 0;
    let identityFraud = 0;

    claimedItems.forEach(item => {
      item.linkedProofs.forEach(proof => {
        const value = proof.estimatedValue || 0;
        switch (proof.costType) {
          case 'Loss of Use':
            lossOfUse += value;
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
    });
    return { lossOfUse, propertyDamage, identityFraud };
  };

  const calculatedCosts = calculateCosts();

  const personalPropertyTotal = claimedItems.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const totalClaimValue = personalPropertyTotal + calculatedCosts.lossOfUse + calculatedCosts.propertyDamage + calculatedCosts.identityFraud;
  
  const identityFraudLimit = policy.coverage.find(c => c.category === 'Identity Fraud Expenses')?.limit || 0;
  const jewelryLimit = policy.coverage.find(c => c.category === 'Jewelry')?.limit || 0;
  
  const identityFraudConflict = calculatedCosts.identityFraud > identityFraudLimit;
  const jewelryValue = claimedItems.filter(i => i.itemCategory === 'Jewelry').reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const jewelryConflict = jewelryValue > jewelryLimit;

  return (
    <div className="mb-10">
        <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2 mb-4">
            <ClipboardDocumentListIcon className="h-6 w-6 text-medium"/>
            Claim Overview: {claimDetails.name}
        </h3>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                 <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-dark font-heading">Claim Value Breakdown</h4>
                 </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Personal Property (Coverage C)</span><span className="font-semibold text-dark">${personalPropertyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Loss of Use (Coverage D)</span><span className="font-semibold text-dark">${calculatedCosts.lossOfUse.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Property Damage & Debris Removal</span><span className="font-semibold text-dark">${calculatedCosts.propertyDamage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between items-center py-1 border-b"><span className="text-medium">Identity Fraud Expenses</span><span className="font-semibold text-dark">${calculatedCosts.identityFraud.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between items-center pt-2 font-bold text-lg"><span className="text-dark font-heading">Total Claim Value</span><span className="text-primary">${totalClaimValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                </div>
                
                <div className="mt-6">
                    <h4 className="font-bold text-dark mb-2 flex items-center gap-2 font-heading">
                        <WrenchScrewdriverIcon className="h-5 w-5 text-medium" />
                        <span>Property Damage Details</span>
                    </h4>
                    {isEditing ? (
                        <textarea
                            name="propertyDamageDetails"
                            value={editableDetails.propertyDamageDetails}
                            onChange={handleDetailsChange}
                            rows={6}
                            className="w-full text-xs text-medium bg-white p-4 rounded-md border border-primary/50 shadow-inner focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    ) : (
                        <div className="text-xs text-medium bg-slate-50 p-4 rounded-md border space-y-2 whitespace-pre-wrap">
                            {claimDetails.propertyDamageDetails || 'No details provided.'}
                        </div>
                    )}
                </div>
                {(identityFraudConflict || jewelryConflict) && (<div className="mt-6"><h4 className="font-bold text-dark mb-2 font-heading">Strategic Highlights</h4><div className="space-y-3">{identityFraudConflict && (<div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm"><div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div><div className="ml-3"><p><strong className="font-semibold">Sub-Limit Conflict:</strong> Claimed Identity Fraud Expenses of ${calculatedCosts.identityFraud.toLocaleString()} exceed the ${identityFraudLimit.toLocaleString()} policy sub-limit. This requires a specific negotiation strategy.</p></div></div></div>)}{jewelryConflict && (<div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm"><div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div><div className="ml-3"><p><strong className="font-semibold">Sub-Limit Conflict:</strong> Total Jewelry value of ${jewelryValue.toLocaleString()} exceed the ${jewelryLimit.toLocaleString()} theft sub-limit. Items may need separate scheduling for full coverage.</p></div></div></div>)}</div></div>)}
            </div>
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-dark font-heading">Incident Details</h4>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                            <PencilIcon className="h-3 w-3" /> Edit
                        </button>
                    )}
                </div>
                 {isEditing ? (
                    <div className="space-y-2 text-sm p-4 rounded-md border border-primary/50 bg-slate-50">
                        <div>
                            <label className="text-xs font-medium text-medium">Claim Name</label>
                            <input type="text" name="name" value={editableDetails.name} onChange={handleDetailsChange} className="w-full mt-0.5 px-2 py-1 text-sm border-slate-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-medium">Date of Loss</label>
                            <input type="date" name="dateOfLoss" value={editableDetails.dateOfLoss} onChange={handleDetailsChange} className="w-full mt-0.5 px-2 py-1 text-sm border-slate-300 rounded-md"/>
                        </div>
                         <div>
                            <label className="text-xs font-medium text-medium">Incident</label>
                            <input type="text" name="incidentType" value={editableDetails.incidentType} onChange={handleDetailsChange} className="w-full mt-0.5 px-2 py-1 text-sm border-slate-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-medium">Location</label>
                            <input type="text" name="location" value={editableDetails.location} onChange={handleDetailsChange} className="w-full mt-0.5 px-2 py-1 text-sm border-slate-300 rounded-md"/>
                        </div>
                         <div>
                            <label className="text-xs font-medium text-medium">Police Report #</label>
                            <input type="text" name="policeReport" value={editableDetails.policeReport} onChange={handleDetailsChange} className="w-full mt-0.5 px-2 py-1 text-sm border-slate-300 rounded-md"/>
                        </div>
                        <div className="flex gap-2 pt-2">
                             <button onClick={handleCancel} className="w-full text-xs font-semibold py-1.5 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                            <button onClick={handleSave} className="w-full text-xs font-semibold py-1.5 bg-primary text-white rounded-md hover:bg-primary-dark">Save</button>
                        </div>
                    </div>
                 ) : (
                    <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-md border">
                        <div className="flex justify-between"><span className="text-medium">Date of Loss:</span><span className="font-medium">{claimDetails.dateOfLoss ? new Date(claimDetails.dateOfLoss).toLocaleDateString('en-US', {timeZone: 'UTC'}) : 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-medium">Incident:</span><span className="font-medium">{claimDetails.incidentType}</span></div>
                        <div className="flex justify-between text-left"><span className="text-medium pr-2">Location:</span><span className="font-medium text-right">{claimDetails.location}</span></div>
                        <div className="flex justify-between"><span className="text-medium">Police Report:</span><span className="font-medium">{claimDetails.policeReport}</span></div>
                    </div>
                 )}
            </div>
        </div>
    </div>
  );
};

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
    items,
    filteredItems, 
    accountHolder, 
    policy, 
    claimDetails,
    onUpdateClaimDetails,
    isParsingPolicy,
    onUploadPolicy,
    onUpdatePolicy,
    onVerifyPolicy,
    onSelectItem, 
    onItemPhotosSelected,
    onProofDocumentsSelected,
    onStartRoomScan,
    searchTerm,
    onSearchTermChange,
    categoryFilter,
    onCategoryFilterChange,
    statusFilter,
    onStatusFilterChange,
    coverageFilter,
    onCoverageFilterChange,
}) => {
    const itemFileInputRef = React.useRef<HTMLInputElement>(null);
    const proofFileInputRef = React.useRef<HTMLInputElement>(null);

    const handleItemFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onItemPhotosSelected(event.target.files);
        }
    };
    
    const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onProofDocumentsSelected(event.target.files);
        }
    };
    
    const handleAddItemClick = () => {
        itemFileInputRef.current?.click();
    };
    
    const handleAddProofClick = () => {
        proofFileInputRef.current?.click();
    };
    
    const totalRcv = items.filter(i => i.status === 'active').reduce((acc, item) => {
        return acc + (item.replacementCostValueRCV || item.originalCost || 0);
    }, 0);

  return (
    <div>
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
                 <div className="flex items-center space-x-4 w-full pt-6 border-t border-slate-200 mt-6">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      ref={itemFileInputRef}
                      onChange={handleItemFileChange}
                      className="hidden"
                    />
                     <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      ref={proofFileInputRef}
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                    <button 
                        onClick={onStartRoomScan}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                    >
                        <VideoCameraIcon className="h-5 w-5"/>
                        <span>Room Scan</span>
                    </button>
                    <button 
                        onClick={handleAddProofClick}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
                    >
                        <PlusIcon className="h-5 w-5"/>
                        <span>Add Proofs</span>
                    </button>
                    <button 
                        onClick={handleAddItemClick}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
                    >
                        <PlusIcon className="h-5 w-5"/>
                        <span>Add Items</span>
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
        policy={policy}
        claimDetails={claimDetails}
        onUpdateClaimDetails={onUpdateClaimDetails}
      />

      <InsuranceSection 
        policy={policy}
        onUpload={onUploadPolicy}
        onUpdate={onUpdatePolicy}
        onVerify={onVerifyPolicy}
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
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                    <option value="active">Active</option>
                    <option value="claimed">Claimed</option>
                    <option value="archived">Archived</option>
                </select>
            </div>
            <div>
                 <select
                    aria-label="Filter by coverage"
                    value={coverageFilter}
                    onChange={(e) => onCoverageFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    disabled={!policy?.isVerified}
                >
                    <option value="all">All Coverages</option>
                    {policy?.coverage.map(cov => <option key={cov.category} value={cov.category}>{cov.category}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={() => onSelectItem(item.id)} />
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