import React from 'react';
import { AutoHealResponse } from '../types.ts';
import { XIcon, CheckCircleIcon, SparklesIcon, ShieldCheckIcon } from './icons.tsx';

interface ForensicHealModalProps {
    report: AutoHealResponse;
    onApply: () => void;
    onClose: () => void;
}

const ForensicHealModal: React.FC<ForensicHealModalProps> = ({ report, onApply, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
                        <ShieldCheckIcon className="h-6 w-6 text-emerald-600"/>
                        Forensic Audit Report
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><XIcon className="h-6 w-6"/></button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-full">
                                <SparklesIcon className="h-6 w-6 text-indigo-600"/>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Autonomous Correction Engine</h3>
                                <p className="text-sm text-slate-500">{report.summary}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase">Confidence</p>
                            <p className="text-2xl font-extrabold text-emerald-600">{report.confidenceScore}%</p>
                        </div>
                    </div>

                    {report.corrections.length > 0 ? (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b pb-2">Proposed Fixes</h4>
                            {report.corrections.map((correction, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase bg-white px-2 py-1 rounded border border-slate-200">{correction.field}</span>
                                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{correction.reason}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm mt-3">
                                        <div className="flex-1 p-2 bg-rose-50 border border-rose-100 rounded text-rose-800 line-through decoration-rose-400">
                                            {String(correction.original)}
                                        </div>
                                        <div className="text-slate-400">→</div>
                                        <div className="flex-1 p-2 bg-emerald-50 border border-emerald-100 rounded text-emerald-800 font-bold">
                                            {String(correction.corrected)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-emerald-50 rounded-lg border border-emerald-100">
                            <CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto mb-2"/>
                            <h3 className="font-bold text-emerald-800">Clean Record</h3>
                            <p className="text-emerald-600 text-sm">No logical inconsistencies found. Asset is technically sound.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition">Dismiss</button>
                    {report.status === 'HEALED' && (
                        <button onClick={onApply} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 transition transform active:scale-95">
                            <CheckCircleIcon className="h-5 w-5"/>
                            Apply Corrections
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForensicHealModal;