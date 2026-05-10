
import React from 'react';
import { RiskGap } from '../types.ts';
import { ExclamationTriangleIcon, CheckCircleIcon, ChartPieIcon } from './icons.tsx';

interface RiskHeatmapProps {
    gaps: RiskGap[];
    isLoading: boolean;
    onCategoryClick?: (category: string) => void;
    selectedCategories?: Set<string>;
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ gaps, isLoading, onCategoryClick, selectedCategories = new Set() }) => {
    if (isLoading) {
        return <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse h-64"></div>;
    }

    if (gaps.length === 0) return null;

    const totalRisk = gaps.reduce((acc, gap) => gap.isAtRisk ? acc + (gap.totalValue - gap.policyLimit) : acc, 0);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                        <ChartPieIcon className="h-5 w-5 text-primary"/>
                        Coverage Gap Analysis
                    </h3>
                    <p className="text-sm text-slate-500">Real-time audit of your inventory vs. policy limits.</p>
                </div>
                {totalRisk > 0 ? (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5"/>
                        <span className="font-bold text-sm">Total Uninsured Value: ${totalRisk.toLocaleString()}</span>
                    </div>
                ) : (
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5"/>
                        <span className="font-bold text-sm">100% Coverage Verified</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gaps.map((gap, idx) => {
                    const percentage = Math.min((gap.totalValue / gap.policyLimit) * 100, 100);
                    const isOverLimit = gap.totalValue > gap.policyLimit;
                    const isSelected = selectedCategories.has(gap.category);
                    
                    return (
                        <div 
                            key={idx} 
                            className={`bg-slate-50 rounded-lg p-4 border transition-all ${onCategoryClick ? 'cursor-pointer' : ''} ${isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-100 hover:bg-slate-100 hover:shadow-md'}`}
                            onClick={() => onCategoryClick && onCategoryClick(gap.category)}
                        >
                            <div className="flex justify-between items-center mb-2 relative z-10">
                                <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{gap.category}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${isOverLimit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isOverLimit ? 'Limit Exceeded' : 'Covered'}
                                </span>
                            </div>
                            
                            <div className={`flex justify-between text-xs mb-1 relative z-10 ${isSelected ? 'text-primary/70' : 'text-slate-500'}`}>
                                <span>${gap.totalValue.toLocaleString()} Value</span>
                                <span>Limit: ${gap.policyLimit.toLocaleString()}</span>
                            </div>

                            <div className={`w-full rounded-full h-2 mb-3 relative z-10 ${isSelected ? 'bg-primary/20' : 'bg-slate-200'}`}>
                                <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>

                            {gap.missingProofCount > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium relative z-10">
                                    <ExclamationTriangleIcon className="h-3.5 w-3.5"/>
                                    {gap.missingProofCount} items need documentation
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RiskHeatmap;
