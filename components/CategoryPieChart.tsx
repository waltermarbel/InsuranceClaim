import React from 'react';
import { InventoryItem } from '../types';

interface CategoryPieChartProps {
  items: InventoryItem[];
}

const COLORS = ['#1F4E79', '#4A7C9F', '#75ADBF', '#A1DEDF', '#CCEFFF', '#3b82f6', '#60a5fa', '#93c5fd'];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ items }) => {
  // FIX: The generic type on `reduce` was causing a linting error. Switched to casting the initial
  // value to correctly type the accumulator. This resolves the type inference issue and fixes all
  // subsequent arithmetic errors in the component.
  const categoryCounts = items.reduce((acc, item) => {
    acc[item.itemCategory] = (acc[item.itemCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
  const totalItems = items.length;

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-center h-24 w-24 bg-slate-100 rounded-full">
        <p className="text-xs text-slate-500">No Data</p>
      </div>
    );
  }

  let accumulatedPercentage = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        {sortedCategories.map(([category, count], index) => {
          const percentage = (count / totalItems) * 100;
          const startAngle = accumulatedPercentage;
          accumulatedPercentage += percentage;
          const endAngle = accumulatedPercentage;

          const startX = 50 + 50 * Math.cos((startAngle * Math.PI) / 50);
          const startY = 50 + 50 * Math.sin((startAngle * Math.PI) / 50);
          const endX = 50 + 50 * Math.cos((endAngle * Math.PI) / 50);
          const endY = 50 + 50 * Math.sin((endAngle * Math.PI) / 50);

          const largeArcFlag = percentage > 50 ? 1 : 0;

          const pathData = `M 50,50 L ${startX},${startY} A 50,50 0 ${largeArcFlag} 1 ${endX},${endY} Z`;

          return <path key={category} d={pathData} fill={COLORS[index % COLORS.length]} />;
        })}
      </svg>
      <div className="text-xs">
        {sortedCategories.slice(0, 4).map(([category, count], index) => (
          <div key={category} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-medium">{category} ({count})</span>
          </div>
        ))}
         {sortedCategories.length > 4 && (
            <div className="text-slate-400 mt-1">...and more</div>
        )}
      </div>
    </div>
  );
};
