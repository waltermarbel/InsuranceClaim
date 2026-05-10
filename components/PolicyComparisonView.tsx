import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAppState } from '../context/AppContext.tsx';
import { SparklesIcon, ShieldCheckIcon, DocumentTextIcon, FolderIcon } from './icons.tsx';
import { ParsedPolicy } from '../types.ts';

const PolicyComparisonView: React.FC = () => {
    const { policies } = useAppState();
    const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

    const togglePolicySelection = (id: string) => {
        setSelectedPolicyIds(prev => 
            prev.includes(id) 
                ? prev.filter(p => p !== id)
                : prev.length < 3 ? [...prev, id] : prev
        );
    };

    const selectedPolicies = policies.filter(p => selectedPolicyIds.includes(p.id));

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-3xl font-bold font-heading text-slate-800 tracking-tight">Policy Comparison Matrix</h2>
                    <p className="text-slate-500 mt-1">Select up to 3 policies to analyze coverage gaps, limits, and deductible structures.</p>
                </div>
                {/* AI Interpret Button could go here */}
                {selectedPolicies.length > 1 && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition shadow-sm font-semibold">
                        <SparklesIcon className="h-4 w-4" />
                        AI Analysis
                    </button>
                )}
            </div>

            {/* Policy Selection Bar */}
            <div className="flex flex-wrap gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 items-center">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500 mr-2 flex items-center gap-2">
                    <FolderIcon className="h-4 w-4" />
                    Available Policies ({policies.length})
                </span>
                {policies.length === 0 ? (
                    <span className="text-sm text-slate-400 italic">No policies ingested yet. Go to Ingestor to add policies.</span>
                ) : (
                    policies.map(policy => {
                        const isSelected = selectedPolicyIds.includes(policy.id);
                        return (
                            <button
                                key={policy.id}
                                onClick={() => togglePolicySelection(policy.id)}
                                className={`flex flex-col text-left px-4 py-2 rounded-lg border transition-all ${
                                    isSelected 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-600/20'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                                }`}
                            >
                                <span className="font-semibold text-sm">{policy.provider}</span>
                                <span className="text-xs opacity-70 font-mono">{policy.policyNumber}</span>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Comparison Grid */}
            <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                {selectedPolicies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <DocumentTextIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p>Select at least 1 policy to view details, or 2+ to compare.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-xs border-b border-r border-slate-200 w-1/4">Feature / Metric</th>
                                {selectedPolicies.map(policy => (
                                    <th key={policy.id} className="p-4 border-b border-r border-slate-200 min-w-[250px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{policy.provider}</h3>
                                                <div className="text-xs font-mono text-slate-500 mt-1">{policy.policyNumber}</div>
                                                <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                    <ShieldCheckIcon className="h-3 w-3" />
                                                    {policy.policyType}
                                                </div>
                                            </div>
                                            {policy.isActive && (
                                                <span className="bg-indigo-600 text-white text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded">Active</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Coverage Basics */}
                            <tr className="bg-slate-50/50">
                                <td colSpan={selectedPolicies.length + 1} className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500">Core Coverages</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Coverage A (Dwelling)</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        <span className="font-mono text-slate-800 font-medium">
                                            {policy.coverage?.find(c => c.category.includes('Dwelling') || c.category.includes('Coverage A'))?.limit 
                                                ? `$${policy.coverage?.find(c => c.category.includes('Dwelling') || c.category.includes('Coverage A'))?.limit?.toLocaleString()}` 
                                                : 'Not Specified'}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Coverage C (Personal Property)</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        <span className="font-mono text-slate-800 font-medium">
                                            {policy.coverage?.find(c => c.category.includes('Personal Property') || c.category.includes('Coverage C'))?.limit 
                                                ? `$${policy.coverage?.find(c => c.category.includes('Personal Property') || c.category.includes('Coverage C'))?.limit?.toLocaleString()}` 
                                                : 'Not Specified'}
                                        </span>
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Personal Property Valuation</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        <span className={`font-semibold text-sm ${policy.endorsements?.includes('Replacement Cost Value (RCV) applicable to Personal Property') || policy.endorsements?.some(e => e.includes('RCV') || e.includes('Replacement Cost')) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {policy.endorsements?.includes('Replacement Cost Value (RCV) applicable to Personal Property') || policy.endorsements?.some(e => e.includes('RCV') || e.includes('Replacement Cost')) ? 'Replacement Cost (RCV)' : 'Actual Cash Value (ACV)'}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Deductibles */}
                            <tr className="bg-slate-50/50">
                                <td colSpan={selectedPolicies.length + 1} className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500 border-t border-slate-200">Deductibles</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Standard Deductible</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        <span className="font-mono text-slate-800 font-medium">
                                            {policy.deductible ? `$${policy.deductible.toLocaleString()}` : 'Not Listed'}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Endorsements / Special */}
                            <tr className="bg-slate-50/50">
                                <td colSpan={selectedPolicies.length + 1} className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500 border-t border-slate-200">Endorsements & Special Limits</td>
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Endorsements</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        {policy.endorsements && policy.endorsements.length > 0 ? (
                                            <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                                                {policy.endorsements.map((end, i) => (
                                                    <li key={i}>{end}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-slate-400 italic text-sm">None detected</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            <tr className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 border-r border-slate-100 text-sm font-semibold text-slate-700 align-top">Limits</td>
                                {selectedPolicies.map(policy => (
                                    <td key={policy.id} className="p-4 border-r border-slate-100 align-top">
                                        {policy.limits && policy.limits.length > 0 ? (
                                            <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                                                {policy.limits.map((limit, i) => (
                                                    <li key={i}>{limit}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-slate-400 italic text-sm">Standard Limits Apply</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PolicyComparisonView;
