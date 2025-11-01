import React from 'react';
import {
    DevicePhoneMobileIcon,
    HomeIcon,
    GemIcon,
    PaintBrushIcon,
    WashingMachineIcon,
    TShirtIcon,
    WrenchScrewdriverIcon,
    StarIcon,
    DocumentTextIcon,
    HeartIcon,
    BriefcaseIcon,
    BookOpenIcon,
    TagIcon,
} from './components/icons.tsx';


export const CATEGORIES = [
    'Electronics', 
    'Furniture', 
    'Jewelry', 
    'Art', 
    'Appliances', 
    'Clothing', 
    'Tools', 
    'Collectibles',
    'Documents',
    'Medical Equipment',
    'Travel Accessories',
    'Books',
    'Other'
];

export const CATEGORY_COLORS = {
    'Electronics': '#3b82f6',
    'Furniture': '#a16207',
    'Jewelry': '#d97706',
    'Art': '#7e22ce',
    'Appliances': '#64748b',
    'Clothing': '#db2777',
    'Tools': '#ea580c',
    'Collectibles': '#16a34a',
    'Documents': '#a3a3a3',
    'Medical Equipment': '#0891b2',
    'Travel Accessories': '#0ea5e9',
    'Books': '#be123c',
    'Other': '#737373'
};

export const CATEGORY_ICONS = {
    'Electronics': DevicePhoneMobileIcon,
    'Furniture': HomeIcon,
    'Jewelry': GemIcon,
    'Art': PaintBrushIcon,
    'Appliances': WashingMachineIcon,
    'Clothing': TShirtIcon,
    'Tools': WrenchScrewdriverIcon,
    'Collectibles': StarIcon,
    'Documents': DocumentTextIcon,
    'Medical Equipment': HeartIcon,
    'Travel Accessories': BriefcaseIcon,
    'Books': BookOpenIcon,
    'Other': TagIcon,
};


// New: Colors for proof purpose badges
export const PROOF_PURPOSE_COLORS = {
    'Proof of Purchase': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    'Proof of Possession': { bg: 'bg-sky-100', text: 'text-sky-800' },
    'Proof of Value': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'Supporting Document': { bg: 'bg-slate-100', text: 'text-slate-600' },
    'Unknown': { bg: 'bg-slate-100', text: 'text-slate-600' },
};