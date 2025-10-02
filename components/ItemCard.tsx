import React from 'react';
import { InventoryItem, ItemStatus } from '../types';
import { SpinnerIcon, CheckCircleIcon, ExclamationIcon, PencilIcon, XCircleIcon, DocumentTextIcon } from './icons';
import { ScoreIndicator } from './ScoreIndicator';

interface ItemCardProps {
  item: InventoryItem;
  onSelect: () => void;
}

const StatusIndicator: React.FC<{ status: ItemStatus }> = ({ status }) => {
  const statusConfig = {
    processing: { Icon: SpinnerIcon, text: 'Analyzing...', bg: 'bg-primary/10', text_color: 'text-primary/80' },
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

const ItemCard: React.FC<ItemCardProps> = ({ item, onSelect }) => {
  const primaryProof = item.linkedProofs && item.linkedProofs.length > 0 ? item.linkedProofs[0] : null;

  return (
    <div
      className="relative group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300"
      onClick={onSelect}
    >
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
          {item.status === 'active' ? 'View / Edit' : 'Click to Edit'}
        </span>
      </div>
      <div className="p-3 border-t border-slate-100">
        <p className="text-sm font-medium text-dark truncate" title={item.itemName || (primaryProof ? primaryProof.fileName : '...')}>
          {item.itemName || (primaryProof ? primaryProof.fileName : '...')}
        </p>
        <p className="text-xs text-medium mt-1 truncate">
          {item.status === 'processing' ? '...' : item.itemDescription}
        </p>
      </div>
    </div>
  );
};

export default ItemCard;
