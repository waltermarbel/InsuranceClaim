import React, { useState } from 'react';
// Fix: Added .ts extension to file path
import { InventoryItem } from '../types.ts';
import { CheckCircleIcon, DocumentTextIcon, TagIcon, TrashIcon, XCircleIcon } from './icons';
import { ScoreIndicator } from './ScoreIndicator';

interface BulkReviewPageProps {
  items: InventoryItem[];
  onFinalize: (approvedItems: InventoryItem[], rejectedItems: InventoryItem[]) => void;
}

const BulkReviewPage: React.FC<BulkReviewPageProps> = ({ items, onFinalize }) => {
  const [selection, setSelection] = useState<Record<string, 'approved' | 'rejected'>>(() => {
    // Default all items to 'approved'
    return items.reduce((acc, item) => {
      acc[item.id] = 'approved';
      return acc;
    }, {} as Record<string, 'approved' | 'rejected'>);
  });

  const handleToggle = (itemId: string) => {
    setSelection(prev => ({
      ...prev,
      [itemId]: prev[itemId] === 'approved' ? 'rejected' : 'approved',
    }));
  };

  const handleApproveAll = () => {
    setSelection(items.reduce((acc, item) => {
      acc[item.id] = 'approved';
      return acc;
    }, {} as Record<string, 'approved' | 'rejected'>));
  };

  const handleRejectAll = () => {
     setSelection(items.reduce((acc, item) => {
      acc[item.id] = 'rejected';
      return acc;
    }, {} as Record<string, 'approved' | 'rejected'>));
  };

  const handleFinalize = () => {
    const approvedItems = items.filter(item => selection[item.id] === 'approved');
    const rejectedItems = items.filter(item => selection[item.id] === 'rejected');
    onFinalize(approvedItems, rejectedItems);
  };

  const approvedCount = Object.values(selection).filter(s => s === 'approved').length;
  const rejectedCount = items.length - approvedCount;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-dark tracking-tight font-heading">Review Your New Items</h1>
        <p className="mt-3 text-lg text-medium max-w-3xl mx-auto">
          Our AI has analyzed your files. Please confirm which items you'd like to add to your vault. All items are approved by default.
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 sticky top-4 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={handleApproveAll} className="text-sm font-semibold text-medium hover:text-primary transition">Approve All</button>
            <button onClick={handleRejectAll} className="text-sm font-semibold text-medium hover:text-primary transition">Reject All</button>
          </div>
          <div className="text-sm font-semibold text-medium">
            <span className="text-success">{approvedCount} Approved</span> / <span className="text-danger">{rejectedCount} Rejected</span>
          </div>
          <button
            onClick={handleFinalize}
            className="w-full sm:w-auto px-6 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
          >
            Add to Vault ({approvedCount})
          </button>
        </div>
      </div>
      
      <div className="mt-6 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-300">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-dark sm:pl-6">Item</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-dark">Category</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-dark">AI Valuation (RCV)</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-dark">Proof Strength</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {items.map(item => (
                            <tr key={item.id} className={selection[item.id] === 'rejected' ? 'bg-slate-50' : ''}>
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0">
                                            {item.linkedProofs[0]?.type === 'image' ? (
                                                <img className="h-10 w-10 rounded-md object-cover" src={item.linkedProofs[0].dataUrl} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                                                    <DocumentTextIcon className="h-6 w-6 text-slate-400"/>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className={`font-medium ${selection[item.id] === 'rejected' ? 'text-medium line-through' : 'text-dark'}`}>{item.itemName}</div>
                                            <div className="text-medium truncate max-w-xs">{item.itemDescription}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-medium">
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                                        {item.itemCategory}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-medium">
                                    <div className="font-semibold text-dark">${(item.replacementCostValueRCV || item.originalCost).toFixed(2)}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-medium">
                                    {item.proofStrengthScore !== undefined && <ScoreIndicator score={item.proofStrengthScore} size="sm" />}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    {selection[item.id] === 'approved' ? (
                                        <button onClick={() => handleToggle(item.id)} className="flex items-center gap-1 text-danger hover:opacity-75">
                                            <XCircleIcon className="h-5 w-5"/> Reject
                                        </button>
                                    ) : (
                                        <button onClick={() => handleToggle(item.id)} className="flex items-center gap-1 text-success hover:opacity-75">
                                            <CheckCircleIcon className="h-5 w-5"/> Approve
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkReviewPage;