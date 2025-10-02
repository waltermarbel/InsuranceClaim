import React, { useState } from 'react';
import { InventoryItem, AccountHolder, ParsedPolicy } from '../types';
import ItemCard from './ItemCard';
import InferenceCard from './InferenceCard';
import { PlusIcon, SearchIcon, VideoCameraIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon } from './icons';
import { CATEGORIES } from '../constants';
import { InsuranceSection } from './InsuranceSection';
import { SCENARIO_OTHER_COSTS } from '../services/geminiService';
import { CategoryPieChart } from './CategoryPieChart';

interface InventoryDashboardProps {
  items: InventoryItem[];
  accountHolder: AccountHolder;
  policy: ParsedPolicy | null;
  isParsingPolicy: boolean;
  onUploadPolicy: (file: File) => void;
  onUpdatePolicy: (policy: ParsedPolicy) => void;
  onVerifyPolicy: () => void;
  onSelectItem: (itemId: string) => void;
  onApproveItem: (itemId: string) => void;
  onRejectItem: (itemId: string) => void;
  onFilesSelected: (files: FileList) => void;
  onStartRoomScan: () => void;
  isLoading: boolean;
}

const ClaimOverview: React.FC<{ items: InventoryItem[], policy: ParsedPolicy | null }> = ({ items, policy }) => {
  if (!policy) return null;

  const personalPropertyTotal = items.reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const totalClaimValue = personalPropertyTotal + SCENARIO_OTHER_COSTS.lossOfUse + SCENARIO_OTHER_COSTS.propertyDamage + SCENARIO_OTHER_COSTS.identityFraud;
  
  const identityFraudLimit = policy.coverage.find(c => c.category === 'Identity Fraud Expenses')?.limit || 0;
  const jewelryLimit = policy.coverage.find(c => c.category === 'Jewelry')?.limit || 0;
  
  const identityFraudConflict = SCENARIO_OTHER_COSTS.identityFraud > identityFraudLimit;
  const jewelryValue = items.filter(i => i.itemCategory === 'Jewelry').reduce((acc, item) => acc + (item.replacementCostValueRCV || item.originalCost || 0), 0);
  const jewelryConflict = jewelryValue > jewelryLimit;

  return (
    <div className="mb-10">
        <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2 mb-4">
            <ClipboardDocumentListIcon className="h-6 w-6 text-medium"/>
            Claim Overview: Burglary Loss
        </h3>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <h4 className="font-bold text-dark mb-3 font-heading">Claim Value Breakdown</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-medium">Personal Property (Coverage C)</span>
                        <span className="font-semibold text-dark">${personalPropertyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-medium">Loss of Use (Coverage D)</span>
                        <span className="font-semibold text-dark">${SCENARIO_OTHER_COSTS.lossOfUse.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-medium">Property Damage & Debris Removal</span>
                        <span className="font-semibold text-dark">${SCENARIO_OTHER_COSTS.propertyDamage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                     <div className="flex justify-between items-center py-1 border-b">
                        <span className="text-medium">Identity Fraud Expenses</span>
                        <span className="font-semibold text-dark">${SCENARIO_OTHER_COSTS.identityFraud.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-bold text-lg">
                        <span className="text-dark font-heading">Total Claim Value</span>
                        <span className="text-primary">${totalClaimValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="mt-6">
                    <h4 className="font-bold text-dark mb-2 flex items-center gap-2 font-heading">
                        <WrenchScrewdriverIcon className="h-5 w-5 text-medium" />
                        <span>Property Damage Details</span>
                    </h4>
                    <div className="text-xs text-medium bg-slate-50 p-4 rounded-md border space-y-3">
                        <div>
                            <p><strong className="text-slate-700">Main Entry Door:</strong> Compromised door jamb, splintered wood, pry marks, and a broken deadbolt.</p>
                            <p className="italic pl-2 text-slate-500">&rarr; Required Action: Full replacement of the door, frame, and hardware.</p>
                        </div>
                        <div>
                            <p><strong className="text-slate-700">Bedroom Window:</strong> One cracked and shattered glass pane with a slightly twisted frame.</p>
                            <p className="italic pl-2 text-slate-500">&rarr; Required Action: Replacement of the glass pane and frame inspection/repair.</p>
                        </div>
                        <div>
                            <p><strong className="text-slate-700">Interior Damage:</strong> Minor drywall scuffs near the entry and scratches on the entryway hardwood floor.</p>
                            <p className="italic pl-2 text-slate-500">&rarr; Required Action: Localized drywall patching, repainting, and floor refinishing.</p>
                        </div>
                        <div className="border-t border-slate-200 pt-3 mt-3">
                            <strong className="text-slate-700 block mb-1">Supporting Documentation Required:</strong>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Detailed photos of each specific damage point (door, frame, window, drywall, floor).</li>
                                <li>Contractor estimates for all required repairs (door, window, interior).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {(identityFraudConflict || jewelryConflict) && (
                <div className="mt-6">
                     <h4 className="font-bold text-dark mb-2 font-heading">Strategic Highlights</h4>
                     <div className="space-y-3">
                        {identityFraudConflict && (
                             <div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div>
                                    <div className="ml-3">
                                        <p><strong className="font-semibold">Sub-Limit Conflict:</strong> Claimed Identity Fraud Expenses of ${SCENARIO_OTHER_COSTS.identityFraud.toLocaleString()} exceed the ${identityFraudLimit.toLocaleString()} policy sub-limit. This requires a specific negotiation strategy.</p>
                                    </div>
                                </div>
                             </div>
                        )}
                         {jewelryConflict && (
                             <div className="p-3 bg-warning/20 border-l-4 border-warning text-dark/80 text-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-warning"/></div>
                                    <div className="ml-3">
                                        <p><strong className="font-semibold">Sub-Limit Conflict:</strong> Total Jewelry value of ${jewelryValue.toLocaleString()} exceed the ${jewelryLimit.toLocaleString()} theft sub-limit. Items may need separate scheduling for full coverage.</p>
                                    </div>
                                </div>
                             </div>
                        )}
                     </div>
                </div>
                )}
            </div>
            <div>
                 <h4 className="font-bold text-dark mb-3 font-heading">Incident Details</h4>
                 <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-md border">
                    <div className="flex justify-between"><span className="text-medium">Date of Loss:</span><span className="font-medium">Nov 27, 2024</span></div>
                    <div className="flex justify-between"><span className="text-medium">Incident:</span><span className="font-medium">Burglary</span></div>
                    <div className="flex justify-between text-left"><span className="text-medium pr-2">Location:</span><span className="font-medium text-right">421 W 56th St, Apt 4A, NY</span></div>
                    <div className="flex justify-between"><span className="text-medium">Police Report:</span><span className="font-medium">NYPD #2024-018-012043</span></div>
                 </div>
            </div>
        </div>
    </div>
  );
};


const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ 
    items, 
    accountHolder, 
    policy, 
    isParsingPolicy,
    onUploadPolicy,
    onUpdatePolicy,
    onVerifyPolicy,
    onSelectItem, 
    onApproveItem, 
    onRejectItem, 
    onFilesSelected, 
    onStartRoomScan, 
    isLoading 
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onFilesSelected(event.target.files);
        }
    };
    
    const handleAddClick = () => {
        fileInputRef.current?.click();
    };

    const itemsForReview = items.filter(item => item.status === 'needs-review');
    const ledgerItems = items.filter(item => item.status !== 'needs-review');

    const filteredLedgerItems = ledgerItems.filter(item => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            item.itemName.toLowerCase().includes(lowerSearchTerm) ||
            item.itemDescription.toLowerCase().includes(lowerSearchTerm);

        const matchesCategory = categoryFilter === 'all' || item.itemCategory === categoryFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    const savedItems = items.filter(item => item.status === 'active');
    const totalRcv = savedItems.reduce((acc, item) => {
        const value = item.replacementCostValueRCV || item.originalCost || 0;
        return acc + value;
    }, 0);


  return (
    <div>
      <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-grow">
                <h2 className="text-3xl font-bold tracking-tight text-dark font-heading">
                    Welcome, {accountHolder.name.split(' ')[0]}!
                </h2>
                <p className="text-medium mt-2">
                    You have <span className="font-semibold text-dark">{savedItems.length}</span> items in your vault.
                    Your estimated total RCV is <span className="font-semibold text-dark">${totalRcv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>.
                </p>
            </div>
            <div className="flex-shrink-0">
                <CategoryPieChart items={savedItems} />
            </div>
        </div>
         <div className="flex items-center space-x-2 w-full pt-6 border-t border-slate-200 mt-6">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                 <button 
                    onClick={onStartRoomScan}
                    disabled={isLoading}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
                >
                    <VideoCameraIcon className="h-5 w-5"/>
                    <span>Start Room Scan</span>
                </button>
                <button 
                    onClick={handleAddClick}
                    disabled={isLoading}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition disabled:opacity-50"
                >
                    <PlusIcon className="h-5 w-5"/>
                    <span>Add New Assets</span>
                </button>
            </div>
      </div>

      <ClaimOverview items={items} policy={policy} />

      <InsuranceSection 
        policy={policy}
        onUpload={onUploadPolicy}
        onUpdate={onUpdatePolicy}
        onVerify={onVerifyPolicy}
        isLoading={isParsingPolicy}
      />
      
      {itemsForReview.length > 0 && (
        <div className="mb-10">
            <h3 className="text-xl font-bold tracking-tight text-dark font-heading border-b pb-2 mb-4">Validation Queue</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {itemsForReview.map(item => (
                    <InferenceCard 
                        key={item.id}
                        item={item}
                        onApprove={() => onApproveItem(item.id)}
                        onReject={() => onRejectItem(item.id)}
                        onSelect={() => onSelectItem(item.id)}
                    />
                ))}
            </div>
        </div>
      )}

      <h3 className="text-xl font-bold tracking-tight text-dark font-heading">Inventory Ledger</h3>
      <div className="my-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </span>
                <input
                    type="text"
                    placeholder="Search your ledger..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                />
            </div>
            <div>
                <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
                 <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="claimed">Claimed</option>
                    <option value="archived">Archived</option>
                    <option value="processing">Processing</option>
                    <option value="error">Error</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredLedgerItems.map(item => (
          <ItemCard key={item.id} item={item} onSelect={() => onSelectItem(item.id)} />
        ))}
      </div>
      {filteredLedgerItems.length === 0 && ledgerItems.length > 0 && (
         <div className="text-center py-12 text-medium col-span-full">
            <p>No items match your current filters.</p>
        </div>
      )}
       {ledgerItems.length === 0 && itemsForReview.length === 0 && (
         <div className="text-center py-12 text-medium col-span-full">
            <p>Your inventory ledger is empty.</p>
            <p className="text-sm">Approved items will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
