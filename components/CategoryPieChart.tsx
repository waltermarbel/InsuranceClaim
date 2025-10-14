import React from 'react';
// Fix: Added .ts extension to file path
import { InventoryItem } from '../types.ts';
import { CATEGORY_COLORS } from '../constants';

interface CategoryPieChartProps {
  items: InventoryItem[];
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ items }) => {
  // Fix for untyped reduce call and subsequent type errors.
  const categoryCounts = items.reduce((acc: Record<string, number>, item) => {
    acc[item.itemCategory] = (acc[item.itemCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // FIX: Using Object.keys and a typed map to ensure `sortedCategories` is correctly typed as `[string, number][]`, resolving arithmetic operation errors.
  const sortedCategories = Object.keys(categoryCounts)
    .map((key): [string, number] => [key, categoryCounts[key]])
    .sort((a, b) => b[1] - a[1]);
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
        {sortedCategories.map((entry) => {
          const category = entry[0];
          const count = entry[1];
          const percentage = (count / totalItems) * 100;
          const angle = (percentage / 100) * 360;
          
          const startAngleRad = (accumulatedPercentage / 100) * 2 * Math.PI;
          accumulatedPercentage += percentage;
          
          const endAngleRad = (accumulatedPercentage / 100) * 2 * Math.PI;

          const startX = 50 + 50 * Math.cos(startAngleRad);
          const startY = 50 + 50 * Math.sin(startAngleRad);
          const endX = 50 + 50 * Math.cos(endAngleRad);
          const endY = 50 + 50 * Math.sin(endAngleRad);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = `M 50,50 L ${startX},${startY} A 50,50 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
          
          return <path key={category} d={pathData} fill={CATEGORY_COLORS[category] || '#94a3b8'} />;
        })}
      </svg>
      <div className="text-xs">
        {sortedCategories.slice(0, 4).map((entry) => {
          const category = entry[0];
          const count = entry[1];
          return (
            <div key={category} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[category] || '#94a3b8' }} />
              <span className="text-medium">{category} ({count})</span>
            </div>
          );
        })}
         {sortedCategories.length > 4 && (
            <div className="text-slate-400 mt-1">...and more</div>
        )}
      </div>
    </div>
  );
};
