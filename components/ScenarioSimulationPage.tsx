import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheckIcon, SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from './icons.tsx';
import { InventoryItem, ParsedPolicy, ScenarioSimulationCard } from '../types.ts';
import { simulateCoverageScenario } from '../services/geminiService.ts';

interface ScenarioSimulationPageProps {
  inventory: InventoryItem[];
  policies: ParsedPolicy[];
}

const ScenarioSimulationPage: React.FC<ScenarioSimulationPageProps> = ({ inventory, policies }) => {
  const [params, setParams] = useState({
    causeOfLoss: 'Fire',
    lossDate: new Date().toISOString().split('T')[0],
    mitigationStatus: true,
    policyId: policies[0]?.id || ''
  });
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationCard | null>(null);
  
  const handleSimulate = async () => {
    if (!params.policyId) {
      alert("Please ensure an active policy exists first.");
      return;
    }
    const targetPolicy = policies.find(p => p.id === params.policyId);
    if (!targetPolicy) return;

    setIsSimulating(true);
    try {
      const result = await simulateCoverageScenario(targetPolicy, inventory, {
        causeOfLoss: params.causeOfLoss,
        lossDate: params.lossDate,
        mitigationStatus: params.mitigationStatus
      });
      setSimulationResult(result);
    } catch (e) {
      console.error(e);
      alert('Simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <ShieldCheckIcon className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-medium">No Policies Available</h2>
        <p className="mt-2 text-sm max-w-md text-center">
          Upload an insurance policy via the Document Ingestor to enable the Scenario Simulation Engine.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-full flex gap-8">
      {/* Sidebar: Simulation Parameters */}
      <div className="w-1/3 flex flex-col gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Simulation Engine</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Policy</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                value={params.policyId}
                onChange={e => setParams({...params, policyId: e.target.value})}
              >
                {policies.map(p => (
                  <option key={p.id} value={p.id}>{p.provider} - {p.policyNumber}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cause of Loss</label>
              <select 
                className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                value={params.causeOfLoss}
                onChange={e => setParams({...params, causeOfLoss: e.target.value})}
              >
                <option value="Fire">Structure Fire</option>
                <option value="Wind">Wind / Hurricane</option>
                <option value="Theft">Burglary / Theft</option>
                <option value="Water">Sudden Water Discharge</option>
                <option value="Flood">External Flood (Excluded)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Loss</label>
              <input 
                type="date" 
                className="w-full border-slate-300 rounded-md shadow-sm sm:text-sm"
                value={params.lossDate}
                onChange={e => setParams({...params, lossDate: e.target.value})}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="mitigation"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={params.mitigationStatus}
                onChange={e => setParams({...params, mitigationStatus: e.target.checked})}
              />
              <label htmlFor="mitigation" className="text-sm text-slate-700">
                Post-Loss Mitigation Complete
              </label>
            </div>

            <button 
              onClick={handleSimulate}
              disabled={isSimulating}
              className="mt-4 w-full bg-slate-900 text-white font-medium py-3 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSimulating ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <ShieldCheckIcon className="h-5 w-5" />}
              Run Deterministic Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Output Card */}
      <div className="w-2/3">
        {simulationResult ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="text-lg font-bold font-mono tracking-tight">SIMULATION: {simulationResult.simulationId}</h3>
                <p className="text-xs text-slate-400 font-mono">{new Date(simulationResult.timestamp).toUTCString()}</p>
              </div>
              <div className="text-right">
                <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono border border-slate-700">
                  {simulationResult.policyContext?.jurisdiction}
                </span>
              </div>
            </div>

            {/* Results Body */}
            <div className="p-6 grid grid-cols-2 gap-8">
              
              {/* Left Column */}
              <div className="space-y-6">
                
                {/* Coverage Gates */}
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Coverage Gates</h4>
                  <div className="space-y-2">
                    <GateStatus 
                      label="Validity (Dates & Insured)" 
                      passed={simulationResult.coverageDetermination?.gateResults?.validityGate} 
                    />
                    <GateStatus 
                      label="Cause (Insuring Agreement)" 
                      passed={simulationResult.coverageDetermination?.gateResults?.causeGate} 
                    />
                    <GateStatus 
                      label="Condition (Duties/Mitigation)" 
                      passed={simulationResult.coverageDetermination?.gateResults?.conditionGate} 
                    />
                  </div>
                </div>

                {/* Denial Reasons */}
                {simulationResult.coverageDetermination?.denialReasons?.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <h4>Exclusions Triggered</h4>
                    </div>
                    <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                      {simulationResult.coverageDetermination.denialReasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Financial */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Financial Payout Model</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 font-mono text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Gross Loss Total</span>
                    <span className="font-bold text-slate-900">${simulationResult.coverageDetermination?.financialSummary?.grossLossTotal}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 text-red-600">
                    <span>Depreciation (ACV)</span>
                    <span>-${simulationResult.coverageDetermination?.financialSummary?.depreciationApplied}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 text-red-600">
                    <span>Sublimit Reductions</span>
                    <span>-${simulationResult.coverageDetermination?.financialSummary?.sublimitReductions}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 text-red-600">
                    <span>Deductible Applied</span>
                    <span>-${simulationResult.coverageDetermination?.financialSummary?.deductibleApplied}</span>
                  </div>
                  <div className="flex justify-between py-3 mt-1 text-lg font-bold text-green-700">
                    <span>Net Payout</span>
                    <span>${simulationResult.coverageDetermination?.financialSummary?.netPayout}</span>
                  </div>
                </div>

                {/* Sublist Gaps */}
                {simulationResult.coverageDetermination?.financialSummary?.sublimitGaps && simulationResult.coverageDetermination.financialSummary.sublimitGaps.length > 0 && (
                  <div className="mt-6">
                    <div className="flex flex-col gap-3">
                      {simulationResult.coverageDetermination.financialSummary.sublimitGaps.map((gap, idx) => (
                        <div key={idx} className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                          <div className="flex items-start gap-2 mb-2 text-amber-800">
                            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <h4 className="font-bold text-sm">Coverage Gap: {gap.category}</h4>
                          </div>
                          <div className="pl-7 text-xs text-amber-900 space-y-1 font-mono">
                            <div className="flex justify-between text-slate-700">
                                <span>Asset Value:</span>
                                <span>${gap.assetValue}</span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                                <span>Policy Limit:</span>
                                <span>${gap.limit}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-bold border-t border-amber-200/50 pt-1 mt-1">
                                <span>Uncovered Gap:</span>
                                <span>${gap.gap}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center min-h-[400px]">
            <SparklesIcon className="h-16 w-16 mb-4 text-slate-300" />
            <p>Configure parameters and run a simulation to see the Coverage Gates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const GateStatus = ({ label, passed }: { label: string, passed: boolean }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {passed ? (
      <div className="flex gap-1 items-center text-green-600 text-xs font-bold uppercase tracking-wide">
        <CheckCircleIcon className="h-4 w-4" /> PASS
      </div>
    ) : (
      <div className="flex gap-1 items-center text-red-600 text-xs font-bold uppercase tracking-wide">
        <XCircleIcon className="h-4 w-4" /> FAIL
      </div>
    )}
  </div>
);

export default ScenarioSimulationPage;
