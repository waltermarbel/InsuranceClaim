
import React, { useState } from 'react';
import { InventoryItem, ParsedPolicy, ScenarioAnalysis } from '../types.ts';
import { XIcon, SparklesIcon, SpinnerIcon, ExclamationTriangleIcon, CalculatorIcon, DocumentTextIcon, CheckCircleIcon, BoltIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface ScenarioSimulatorModalProps {
    inventory: InventoryItem[];
    policy: ParsedPolicy;
    onClose: () => void;
}

const SCENARIO_TYPES = ["Theft / Burglary", "Fire", "Water Damage", "Lost during Travel", "Power Surge"];

const ScenarioSimulatorModal: React.FC<ScenarioSimulatorModalProps> = ({ inventory, policy, onClose }) => {
    const [eventType, setEventType] = useState(SCENARIO_TYPES[0]);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ScenarioAnalysis | null>(null);

    const handleSimulate = async () => {
        if (!description.trim()) return;
        setIsLoading(true);
        setResult(null);
        try {
            const analysis = await geminiService.runScenarioSimulation(inventory, policy, description, eventType);
            setResult(analysis);
        } catch (error) {
            console.error(error);
            alert("Simulation failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadDemoScenario = () => {
        setEventType("Theft / Burglary");
        setDescription("My MacBook Pro was stolen during a move.");
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-xl font-bold text-dark font-heading flex items-center gap-2">
                        <CalculatorIcon className="h-6 w-6 text-primary"/> Scenario Simulator
                    </h2>
                    <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition"><XIcon className="h-6 w-6" /></button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                    {!result ? (
                        <div className="max-w-xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h3 className="text-lg font-bold text-slate-800">Run a "What-If" Analysis</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    Simulate a loss event to see how your current policy would respond. Our AI Adjuster will calculate estimated payouts, apply deductibles, and identify coverage gaps.
                                </p>
                            </div>

                            <div className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-end">
                                    <button 
                                        onClick={loadDemoScenario} 
                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 transition"
                                    >
                                        <BoltIcon className="h-3 w-3"/> Load Demo: Theft during Move
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Event Type</label>
                                    <select 
                                        value={eventType} 
                                        onChange={(e) => setEventType(e.target.value)} 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                    >
                                        {SCENARIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Scenario Details</label>
                                    <textarea 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)} 
                                        rows={4} 
                                        placeholder="e.g., A pipe burst in the kitchen ceiling, damaging my laptop, toaster, and rug."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleSimulate} 
                                    disabled={isLoading || !description.trim()} 
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition disabled:opacity-50"
                                >
                                    {isLoading ? <SpinnerIcon className="h-5 w-5"/> : <SparklesIcon className="h-5 w-5"/>}
                                    {isLoading ? 'Running Simulation...' : 'Simulate Claim'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left: Financial Summary */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Net Estimated Payout</p>
                                    <div className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                                        ${result.netPayout.toLocaleString()}
                                    </div>
                                    <div className="mt-4 space-y-2 text-sm border-t border-slate-100 pt-4">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Gross Loss</span>
                                            <span className="font-semibold text-slate-800">${result.grossLoss.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Deductible</span>
                                            <span className="font-semibold text-rose-600">-${result.appliedDeductible.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                                        <CheckCircleIcon className="h-5 w-5"/> Action Plan
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.actionPlan.map((action, i) => (
                                            <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                                                {action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Right: Detailed Analysis */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Sub-limits */}
                                {result.subLimitHits.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500"/> Sub-Limit Warnings
                                        </h4>
                                        <div className="space-y-3">
                                            {result.subLimitHits.map((hit, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                    <div>
                                                        <p className="font-semibold text-amber-900">{hit.category}</p>
                                                        <p className="text-xs text-amber-700">Policy Limit: ${hit.limit.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-amber-900">${hit.totalValue.toLocaleString()}</p>
                                                        <p className="text-xs font-bold text-amber-600">-${(hit.totalValue - hit.limit).toLocaleString()} Cap Loss</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Denied Items */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-400"/> Item Analysis
                                    </h4>
                                    {result.deniedItems.length > 0 ? (
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-rose-600 mb-2">Likely Denied / Excluded Items:</p>
                                            {result.deniedItems.map((item, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-rose-50 rounded-lg border border-rose-100">
                                                    <div>
                                                        <p className="font-semibold text-rose-900">{item.itemName}</p>
                                                        <p className="text-xs text-rose-700">{item.reason}</p>
                                                    </div>
                                                    <span className="font-bold text-rose-900 text-sm">${item.value.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                                            <p className="text-emerald-800 font-medium">Good news! No items were flagged for denial in this simulation.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {result && (
                    <div className="p-4 bg-white border-t flex justify-end">
                        <button onClick={() => setResult(null)} className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition">Run Another Scenario</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioSimulatorModal;
