import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { InventoryItem, ParsedPolicy, ActiveClaim } from '../types.ts';
import { 
    ShieldCheckIcon, BoltIcon, CurrencyDollarIcon, ExclamationTriangleIcon, 
    CheckCircleIcon, ClockIcon, DocumentTextIcon, ArrowPathIcon, XIcon,
    ServerIcon, GlobeAltIcon, InboxIcon, DocumentMagnifyingGlassIcon
} from './icons.tsx';

const ARBITRAGE_STATES = [
    'INTAKE', 'BROKEN_REVIEW', 'READY_TO_FILE', 'FILED', 
    'CLAIM_BOUND', 'READY_TO_SUBMIT', 'UNDER_REVIEW', 'APPROVED', 'DENIED'
];

const IDENTITIES = ['Roydel', 'Maleidy', 'Pablo'];

export default function ArbitrageDashboard() {
    const { inventory, policies, claims } = useAppState();
    const dispatch = useAppDispatch();

    const [selectedItemForArbitrage, setSelectedItemForArbitrage] = useState<InventoryItem | null>(null);
    const [arbitrageClaims, setArbitrageClaims] = useState<any[]>([]); // Mocking arbitrage specific claims for UI

    // --- 1. Global View: Aggregate Limit & Portfolio Tracking ---
    const totalPayouts = useMemo(() => arbitrageClaims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + c.targetPayout, 0), [arbitrageClaims]);
    const totalDeductibles = useMemo(() => arbitrageClaims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + c.serviceFee, 0), [arbitrageClaims]);
    const roi = totalDeductibles > 0 ? ((totalPayouts - totalDeductibles) / totalDeductibles * 100).toFixed(1) : 0;

    const capacityTrackers = IDENTITIES.map(id => {
        const used = arbitrageClaims.filter(c => c.identity === id && c.status !== 'DENIED').reduce((sum, c) => sum + c.targetPayout, 0);
        return { identity: id, used, limit: 5000 };
    });

    // --- 3. Module B: The Substitution Pool ---
    const handleMarkAsBroken = (item: InventoryItem) => {
        setSelectedItemForArbitrage(item);
    };

    // --- 4. Module C: Arbitrage Execution & Narrative Review ---
    const ArbitrageModal = () => {
        if (!selectedItemForArbitrage) return null;
        const item = selectedItemForArbitrage;

        const handleExecute = () => {
            const newClaim = {
                id: `ARB-${Math.floor(Math.random() * 10000)}`,
                itemId: item.id,
                itemName: item.itemName,
                status: 'BROKEN_REVIEW',
                targetPayout: item.replacementCostValueRCV || item.originalCost || 0,
                serviceFee: 89, // Mock lowest fee
                identity: IDENTITIES[Math.floor(Math.random() * IDENTITIES.length)],
                narrative: `Sudden and accidental failure of ${item.itemName}. Device was in normal use when it unexpectedly ceased functioning. No prior issues, no gradual degradation, no cosmetic damage contributing to the failure.`,
                failureDate: new Date().toISOString().split('T')[0] // Mock date snapper
            };
            setArbitrageClaims([...arbitrageClaims, newClaim]);
            setSelectedItemForArbitrage(null);
        };

        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
                    <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950">
                        <h2 className="text-lg font-bold text-indigo-400 font-heading flex items-center gap-2">
                            <BoltIcon className="h-5 w-5" /> Arbitrage Execution: {item.itemName}
                        </h2>
                        <button onClick={() => setSelectedItemForArbitrage(null)} className="text-slate-400 hover:text-white">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Path of Least Resistance Router */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Path of Least Resistance</h3>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-300">T-Mobile P360</span>
                                    <span className="text-emerald-400 font-bold">$89 Fee</span>
                                </div>
                                <div className="flex justify-between items-center mb-2 opacity-50">
                                    <span className="text-slate-300">Verizon HDP</span>
                                    <span className="text-slate-400 font-bold">$99 Fee</span>
                                </div>
                                <div className="flex justify-between items-center opacity-50">
                                    <span className="text-slate-300">Asurion Home+</span>
                                    <span className="text-slate-400 font-bold">$129 Fee</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <span className="text-xs text-indigo-400 font-bold">ROUTING VECTOR: T-MOBILE P360 SELECTED</span>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6">Forensic Date Snapper</h3>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="block text-xs text-slate-400 mb-1">Forced Failure Date (1st or 15th)</label>
                                <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" defaultValue="2026-04-01" />
                            </div>
                            
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6">Signature & Identity</h3>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                                    {IDENTITIES.map(id => <option key={id}>{id} - Base64 Bundle Ready</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Narrative & Valuation */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Narrative Engineering</h3>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <textarea 
                                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-sm font-mono"
                                    defaultValue={`Sudden and accidental failure of ${item.itemName}. Device was in normal use when it unexpectedly ceased functioning. No prior issues, no gradual degradation, no cosmetic damage contributing to the failure.`}
                                />
                                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                                    <CheckCircleIcon className="h-3 w-3" /> Open Peril exclusions bypassed
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6">Valuation Anchor</h3>
                            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                <label className="block text-xs text-slate-400 mb-1">Target Payout (RCV Injection)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <CurrencyDollarIcon className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 pl-9 text-emerald-400 font-bold text-lg" 
                                        defaultValue={item.replacementCostValueRCV || item.originalCost || 0} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                        <button onClick={() => setSelectedItemForArbitrage(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={handleExecute} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-2">
                            <BoltIcon className="h-4 w-4" /> Lock Claim & Execute
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 p-4 md:p-6 font-sans">
            
            {/* 1. Global View: Aggregate Limit & Portfolio Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Arbitrage ROI</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-emerald-400">{roi}%</span>
                        <span className="text-sm text-slate-500 mb-1">(${totalPayouts} out / ${totalDeductibles} in)</span>
                    </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:col-span-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Account Capacity Trackers (12-Mo Rolling)</h3>
                    <div className="space-y-3">
                        {capacityTrackers.map(tracker => (
                            <div key={tracker.identity} className="flex items-center gap-3">
                                <span className="text-sm font-medium w-16">{tracker.identity}</span>
                                <div className="flex-grow h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${tracker.used >= 4000 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min((tracker.used / tracker.limit) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <span className={`text-xs font-mono w-24 text-right ${tracker.used >= 4000 ? 'text-red-400' : 'text-slate-400'}`}>
                                    ${tracker.used} / $5k
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">System Status</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs"><GlobeAltIcon className="h-3 w-3 text-emerald-400"/> CF Edge Router</div>
                        <div className="flex items-center gap-2 text-xs"><ServerIcon className="h-3 w-3 text-emerald-400"/> GCP Instances</div>
                        <div className="flex items-center gap-2 text-xs"><InboxIcon className="h-3 w-3 text-emerald-400"/> Email Parser</div>
                        <div className="flex items-center gap-2 text-xs"><DocumentMagnifyingGlassIcon className="h-3 w-3 text-emerald-400"/> PDFOtter API</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 3. Module B: The Substitution Pool */}
                <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[800px]">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white font-heading">Substitution Pool</h2>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{inventory.length} Nodes</span>
                    </div>
                    <div className="overflow-auto flex-grow">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-950 text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 font-medium text-xs uppercase tracking-wider">Asset Node</th>
                                    <th className="p-3 font-medium text-xs uppercase tracking-wider">Value</th>
                                    <th className="p-3 font-medium text-xs uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-3">
                                            <div className="font-medium text-slate-200">{item.brand} {item.model}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.itemName}</div>
                                            <div className="text-[10px] text-indigo-400 mt-1 font-mono">ID: {IDENTITIES[Math.floor(Math.random() * IDENTITIES.length)]}</div>
                                        </td>
                                        <td className="p-3 font-mono text-emerald-400">
                                            ${item.replacementCostValueRCV || item.originalCost || 0}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleMarkAsBroken(item)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-xs font-bold tracking-wide"
                                            >
                                                MARK BROKEN
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {inventory.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500">
                                            No assets in substitution pool. Upload evidence to populate.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 5. Module D: Pipeline State Machine & Monitoring */}
                <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[800px] overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                        <h2 className="text-lg font-bold text-white font-heading">Pipeline State Machine</h2>
                        <div className="flex gap-2">
                            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30">Auto-Routing Active</span>
                        </div>
                    </div>
                    <div className="flex-grow overflow-x-auto p-4 flex gap-4 items-start">
                        {ARBITRAGE_STATES.map(state => {
                            const stateClaims = arbitrageClaims.filter(c => c.status === state);
                            return (
                                <div key={state} className="flex-shrink-0 w-72 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-col max-h-full">
                                    <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-lg">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{state.replace(/_/g, ' ')}</h3>
                                        <span className="text-xs bg-slate-800 text-slate-300 px-1.5 rounded">{stateClaims.length}</span>
                                    </div>
                                    <div className="p-2 overflow-y-auto flex-grow space-y-2">
                                        {stateClaims.map(claim => (
                                            <div key={claim.id} className="bg-slate-800 border border-slate-700 rounded p-3 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-mono text-indigo-400">{claim.id}</span>
                                                    <span className="text-xs font-bold text-emerald-400">${claim.targetPayout}</span>
                                                </div>
                                                <div className="text-sm text-slate-200 font-medium truncate">{claim.itemName}</div>
                                                <div className="text-xs text-slate-500 mt-1">Identity: {claim.identity}</div>
                                                
                                                {/* 6. Module E: Reassignment & Denial Recovery Protocol */}
                                                {state === 'DENIED' && (
                                                    <button 
                                                        onClick={() => {
                                                            // Execute Reassignment Logic
                                                            const updatedClaims = arbitrageClaims.map(c => 
                                                                c.id === claim.id ? { ...c, status: 'READY_TO_FILE', id: `ARB-${Math.floor(Math.random() * 10000)}`, identity: IDENTITIES[Math.floor(Math.random() * IDENTITIES.length)] } : c
                                                            );
                                                            setArbitrageClaims(updatedClaims);
                                                        }}
                                                        className="mt-3 w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 py-1.5 rounded text-xs font-bold transition-colors flex justify-center items-center gap-1"
                                                    >
                                                        <ArrowPathIcon className="h-3 w-3" /> EXECUTE REASSIGNMENT
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedItemForArbitrage && <ArbitrageModal />}
        </div>
    );
}
