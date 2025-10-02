import React from 'react';
import { InventoryItem } from '../types';
import { CheckCircleIcon, FolderIcon, TrashIcon, DocumentTextIcon } from './icons';

interface InferenceCardProps {
  item: InventoryItem;
  onApprove: () => void;
  onReject: () => void;
  onSelect: () => void;
}

const InferenceCard: React.FC<InferenceCardProps> = ({ item, onApprove, onReject, onSelect }) => {
  const primaryProof = item.linkedProofs && item.linkedProofs.length > 0 ? item.linkedProofs[0] : null;

  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div onClick={onSelect} className="flex-grow cursor-pointer">
        <div className="aspect-[4/3] w-full bg-slate-100 flex items-center justify-center">
          {primaryProof && primaryProof.type === 'image' ? (
              <img
                src={primaryProof.dataUrl}
                alt={primaryProof.fileName}
                className="w-full h-full object-cover"
              />
          ) : (
              <DocumentTextIcon className="h-16 w-16 text-slate-300" />
          )}
        </div>
        
        <div className="p-3 border-t border-slate-100">
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-semibold text-dark truncate" title={item.itemName || (primaryProof ? primaryProof.fileName : '')}>
              {item.itemName || (primaryProof ? primaryProof.fileName : '')}
            </p>
            <span className="text-sm font-bold text-primary flex-shrink-0">${item.originalCost.toFixed(2)}</span>
          </div>
          
          <div className="mt-1 flex items-center text-xs text-medium">
              <FolderIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400"/>
              <span className="font-medium">{item.itemCategory}</span>
          </div>

          <p className="text-xs text-medium mt-2 text-ellipsis overflow-hidden h-8" title={item.itemDescription}>
            {item.itemDescription}
          </p>
        </div>
      </div>

      <div className="p-2 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-2">
        <button 
            onClick={onReject}
            className="flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition"
        >
            <TrashIcon className="h-3.5 w-3.5"/>
            <span>Reject</span>
        </button>
        <button 
            onClick={onApprove}
            className="flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition"
        >
            <CheckCircleIcon className="h-3.5 w-3.5"/>
            <span>Approve</span>
        </button>
      </div>
    </div>
  );
};

export default InferenceCard;
