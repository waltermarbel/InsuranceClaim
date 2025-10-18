import React from 'react';
// Fix: Added .ts extension to file path
import { InventoryItem, ItemStatus } from '../types.ts';
import { SpinnerIcon, CheckCircleIcon, ExclamationIcon, PencilIcon, XCircleIcon, DocumentTextIcon } from './icons';
import { ScoreIndicator } from './ScoreIndicator';
import { CATEGORY_COLORS } from '../constants';

interface ItemCardProps {
  item: InventoryItem;
  onSelect: () => void;
  onApprove: (itemId: string) => void;
  onReject: (itemId: string) => void;
}

const StatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
  const statusConfig = {
    processing: { Icon: SpinnerIcon, text: 'Processing...', bg: 'bg-primary/10', text_color: 'text-primary/80' },
    clustering: { Icon: SpinnerIcon, text: 'Clustering...', bg: 'bg-primary/10', text_color: 'text-primary/80' },
    enriching: { Icon: SpinnerIcon, text: 'Enriching...', bg: 'bg-primary/10', text_color: 'text-primary/80' },
    'needs-review': { Icon: PencilIcon, text: 'Needs Review', bg: 'bg-amber-100', text_color: 'text-amber-800' },
    active: { Icon: CheckCircleIcon, text: 'Active', bg: 'bg-success/10', text_color: 'text-success' },
    claimed: { Icon: CheckCircleIcon, text: 'Claimed', bg: 'bg-blue-100', text_color: 'text-blue-800' },
    archived: { Icon: CheckCircleIcon, text: 'Archived', bg: 'bg-slate-100', text_color: 'text-slate-600' },
    error: { Icon: ExclamationIcon, text: 'Error', bg: 'bg-danger/10', text_color: 'text-danger' },
    rejected: { Icon: XCircleIcon, text: 'Rejected', bg: 'bg-slate-100', text_color: 'text-medium' },
  };

  const config = statusConfig[status] || statusConfig.rejected;
  const { Icon, text, bg, text_color } = config;

  return (
    <div className={`absolute top-2 right-2 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text_color}`}>
      <Icon className="h-3 w-3" />
      <span>{text}</span>
    </div>
  );
};

const ItemCard: React.FC<ItemCardProps> = ({ item, onSelect, onApprove, onReject }) => {
  const primaryProof = item.linkedProofs && item.linkedProofs.length > 0 ? item.linkedProofs[0] : null;
  const categoryColor = CATEGORY_COLORS[item.itemCategory] || '#94a3b8';

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove(item.id);
  };
  
  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject(item.id);
  };

  if (item.status === 'processing' || item.status === 'clustering') {
    return (
       <div className="relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] w-full bg-slate-200"></div>
            <div className="p-3 border-t border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mt-2"></div>
            </div>
            <div className="h-1.5 bg-slate-200 w-full"></div>
       </div>
    );
  }

  return (
    <div
      className="relative group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transform hover:-translate-y-1 transition-all duration-300"
    >
        <div onClick={onSelect} className="cursor-pointer">
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
          <StatusIndicator status={item.status} />
          {item.proofStrengthScore !== undefined && (
            <div className="absolute top-2 left-2">
                <ScoreIndicator score={item.proofStrengthScore} size="sm" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              View Details
            </span>
          </div>
          <div className="p-3 border-t border-slate-100">
            <p className="text-sm font-medium text-dark truncate" title={item.itemName}>
              {item.itemName}
            </p>
            <p className="text-xs text-medium mt-1 truncate">
              {item.itemDescription}
            </p>
          </div>
        </div>
      {item.status === 'needs-review' && (
        <div className="p-2 bg-slate-50 border-t flex gap-2">
            <button onClick={handleReject} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-md transition-colors">
                <XCircleIcon className="h-4 w-4"/> Reject
            </button>
             <button onClick={handleApprove} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-success bg-success/10 hover:bg-success/20 rounded-md transition-colors">
                <CheckCircleIcon className="h-4 w-4"/> Approve
            </button>
        </div>
      )}
      <div 
        className="h-1.5 w-full"
        style={{ backgroundColor: categoryColor, opacity: item.status === 'rejected' ? 0.4 : 1 }}
        aria-hidden="true"
        title={`Category: ${item.itemCategory}`}
      />
    </div>
  );
};

export default ItemCard;