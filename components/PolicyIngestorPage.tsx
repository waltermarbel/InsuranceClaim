import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { DocumentTextIcon, SpinnerIcon } from './icons.tsx';

interface PolicyIngestorPageProps {
  onPolicySelected: (file: File) => void;
  isAnalyzingPolicy?: boolean;
}

const PolicyIngestorPage: React.FC<PolicyIngestorPageProps> = ({ onPolicySelected, isAnalyzingPolicy }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [address, setAddress] = useState('');
  const [simulatedDeductible, setSimulatedDeductible] = useState<number>(1000);
  const [addressSubmitStatus, setAddressSubmitStatus] = useState<'idle'|'submitting'|'success'>('idle');
  const [riskProfile, setRiskProfile] = useState<{ zone: string, level: string, leverageFactor: string, carriers: string[], endorsements: string[] } | null>(null);

  const simulateRiskProfile = (addr: string) => {
      const lowercaseAddr = addr.toLowerCase();
      
      if (lowercaseAddr.includes('apt') || lowercaseAddr.includes('floor') || lowercaseAddr.includes('unit')) {
          return {
              zone: 'Urban High-Density',
              level: 'Elevated Theft / Water Damage',
              leverageFactor: '1.2x RCV Premium',
              carriers: ['Lemonade', 'State Farm', 'Assurant'],
              endorsements: ['Water Backup / Sump Overflow', 'Scheduled Personal Property', 'Business Property Off-Premises']
          };
      } else if (lowercaseAddr.includes('beach') || lowercaseAddr.includes('coast') || lowercaseAddr.includes('ocean')) {
          return {
              zone: 'Coastal Flood Zone',
              level: 'Critical Weather Risk',
              leverageFactor: 'Max Extract ($0 Ded)',
              carriers: ['Chubb', 'AIG Private Client', 'PURE'],
              endorsements: ['Flood / Excess Flood', 'Windstorm/Hail Deductible Buy-Back', 'Evacuation Expense']
          };
      } else {
          return {
              zone: 'Suburban Standard Risk',
              level: 'Nominal Baseline',
              leverageFactor: '1.0x ACV/RCV',
              carriers: ['Allstate', 'Geico', 'Progressive'],
              endorsements: ['Identity Theft Restoration', 'Equipment Breakdown', 'Service Line Coverage']
          };
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onPolicySelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onPolicySelected(e.target.files[0]);
    }
  };

  if (isAnalyzingPolicy) {
      return (
          <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center h-full min-h-[70vh]"
          >
              <div className="w-full max-w-2xl mx-auto">
                  <SpinnerIcon className="h-12 w-12 text-primary mx-auto"/>
                  <h1 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
                      Parsing Insurance Policy...
                  </h1>
                  <p className="mt-2 text-lg text-slate-500">
                      Extracting coverages, limits, conditions, and applying arbitrage rules.
                  </p>
              </div>
          </motion.div>
      );
  }

  if (showAddressInput) {
      return (
      <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 px-4 h-full"
      >
          <div className="w-full max-w-2xl bg-slate-950 rounded-lg shadow-2xl overflow-hidden font-mono text-emerald-400 p-8 border border-emerald-900/50">
              <div className="flex items-center space-x-2 mb-8 border-b border-emerald-900/50 pb-4">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div className="ml-4 text-xs text-emerald-700 font-bold uppercase tracking-widest opacity-60">ACAE Target Acquisition Terminal</div>
              </div>
              
              <h2 className="text-xl mb-4 font-bold tracking-widest uppercase text-emerald-300">Location Resolution Protocol</h2>
              <div className="mb-8 opacity-80 text-sm space-y-2">
                  <p>{`> NO ACTIVE POLICY DETECTED IN NODE B.`}</p>
                  <p>{`> INITIATING DEMOGRAPHICS-BASED RISK APPROXIMATION.`}</p>
                  <p>{`> PLEASE PROVIDE PRIMARY RESIDENCE ADDRESS TO CALIBRATE MARKET RATES AND TARGET COVERAGE VECTORS.`}</p>
              </div>
              
              <div className="flex flex-col gap-4 bg-black p-4 rounded border border-emerald-900/30">
                  <div className="flex items-start">
                      <span className="mr-3 text-emerald-600 mt-1">{`root@node-c:~#`}</span>
                      <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter physical address..."
                          autoFocus
                          rows={3}
                          className="bg-transparent border-none outline-none flex-grow text-emerald-400 placeholder-emerald-900 font-mono w-full resize-none leading-relaxed"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && address.trim()) {
                                  e.preventDefault();
                                  setAddressSubmitStatus('submitting');
                                  setTimeout(() => {
                                      setAddressSubmitStatus('success');
                                      setRiskProfile(simulateRiskProfile(address));
                                  }, 800);
                              }
                          }}
                      />
                  </div>
              </div>

              {riskProfile && (
                  <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 border border-emerald-900/50 bg-black p-4 rounded text-sm space-y-3"
                  >
                      <div className="flex justify-between border-b border-emerald-900/30 pb-2">
                          <span className="text-emerald-600">GEOSPATIAL ZONE</span>
                          <span className="text-emerald-300 font-bold">{riskProfile.zone}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-900/30 pb-2">
                          <span className="text-emerald-600">THREAT LEVEL</span>
                          <span className="text-emerald-300 font-bold">{riskProfile.level}</span>
                      </div>
                      <div className="flex justify-between border-b border-emerald-900/30 pb-2">
                          <span className="text-emerald-600">LEVERAGE MULTIPLIER</span>
                          <span className="text-amber-500 font-bold">{riskProfile.leverageFactor}</span>
                      </div>
                      <div className="pt-2">
                          <span className="text-emerald-600 block mb-2">TARGET UNDERWRITERS</span>
                          <ul className="list-disc pl-5 text-emerald-300 space-y-1">
                              {riskProfile.carriers.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                      </div>
                      <div className="pt-2 pb-2">
                          <span className="text-emerald-600 block mb-2">REQUIRED ENDORSEMENTS</span>
                          <ul className="list-disc pl-5 text-emerald-300 space-y-1">
                              {riskProfile.endorsements.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                      </div>

                      <div className="pt-2 pb-2 border-t border-emerald-900/30">
                          <label className="text-emerald-600 block mb-2">TARGET DEDUCTIBLE ($)</label>
                          <input 
                              type="number" 
                              value={simulatedDeductible} 
                              onChange={(e) => setSimulatedDeductible(parseInt(e.target.value) || 0)} 
                              className="w-full bg-black border border-emerald-900/50 p-2 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 rounded" 
                          />
                      </div>

                      <button 
                          onClick={() => {
                              const simulatedContent = `
DECLARATIONS PAGE
Policy Number: SIM-${Math.floor(Math.random() * 100000)}
Provider: ${riskProfile.carriers[0]}
Policy Holder: Simulated User
Policy Type: Homeowners (HO-3)
Coverage A (Dwelling): $500,000
Coverage B (Other Structures): $50,000
Coverage C (Personal Property): $250,000
Coverage D (Loss of Use): $100,000
Deductible: $${simulatedDeductible}
Endorsements: Replacement Cost Value (RCV) applicable to Personal Property.
`;
                              const simulatedFile = new File([simulatedContent], `Simulated_Policy_${riskProfile.carriers[0].replace(/\s+/g, '_')}.txt`, { type: 'text/plain' });
                              onPolicySelected(simulatedFile);
                          }}
                          className="w-full mt-4 bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-600 text-emerald-300 py-3 uppercase font-bold tracking-widest text-xs transition-colors"
                      >
                          Deploy Simulated Coverage Ghost
                      </button>
                  </motion.div>
              )}

              <div className="mt-8 flex justify-end gap-4">
                  <button 
                      onClick={() => setShowAddressInput(false)}
                      className="px-6 py-2 text-sm border border-emerald-900 hover:bg-emerald-900/30 text-emerald-600 transition-colors uppercase tracking-widest"
                  >
                      Abort
                  </button>
                  <button 
                      onClick={() => {
                          setAddressSubmitStatus('submitting');
                          setTimeout(() => {
                              setAddressSubmitStatus('success');
                              setRiskProfile(simulateRiskProfile(address));
                          }, 800);
                      }}
                      disabled={!address.trim() || addressSubmitStatus === 'submitting'}
                      className="px-8 py-2 bg-emerald-600 text-black font-bold uppercase tracking-widest hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {addressSubmitStatus === 'submitting' ? 'Resolving Vector...' : addressSubmitStatus === 'success' ? 'Protocol Engaged' : 'Commit Location'}
                  </button>
              </div>
          </div>
      </motion.div>
      );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-full min-h-[70vh] px-4 w-full"
    >
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        
        {/* Option 1: Upload */}
        <div 
            className={`group relative p-8 border-2 transition-all cursor-pointer flex flex-col items-start bg-slate-900 border-slate-800 hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] ${
                isDragging ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden"
                accept="application/pdf"
            />
            <div className="w-12 h-12 mb-6 bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <DocumentTextIcon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-heading mb-4 uppercase">
                Ingest Existing Policy
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                Upload target policy PDF. System will autonomously extract coverage limits, deductibles, and optimize extraction vectors.
            </p>
            <div className="mt-auto pt-6 border-t border-slate-800 w-full flex justify-between items-center text-emerald-500 font-mono text-sm uppercase tracking-widest font-bold">
                <span>{isDragging ? 'Drop Target Achieved' : 'Select or Drop PDF'}</span>
                <span>{'->'}</span>
            </div>
        </div>

        {/* Option 2: Address Input */}
        <div 
            className="group relative p-8 border-2 transition-all cursor-pointer flex flex-col items-start bg-slate-900 border-slate-800 hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
            onClick={() => setShowAddressInput(true)}
        >
            <div className="w-12 h-12 mb-6 bg-slate-800 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-heading mb-4 uppercase">
                Compute Optimal Coverage
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                No active policy detected. Input primary residence coordinates to simulate geospatial risk and generate target parameters.
            </p>
            <div className="mt-auto pt-6 border-t border-slate-800 w-full flex justify-between items-center text-emerald-500 font-mono text-sm uppercase tracking-widest font-bold">
                <span>Initiate Subroutine</span>
                <span>{'->'}</span>
            </div>
        </div>

      </div>
    </motion.div>
  );
};

export default PolicyIngestorPage;
