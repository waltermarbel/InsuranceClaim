import React from 'react';
import { XCircleIcon, PrinterIcon, DocumentTextIcon } from './icons.tsx';

interface UltimateBlueprintModalProps {
    onClose: () => void;
}

const UltimateBlueprintModal: React.FC<UltimateBlueprintModalProps> = ({ onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 sm:p-6 print:p-0 print:bg-white print:block">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
                
                {/* Header - Hidden when printing */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl">
                            <DocumentTextIcon className="h-6 w-6 text-indigo-600"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-heading">Ultimate Master Blueprint</h2>
                            <p className="text-sm text-slate-500">Forensic Asset Intelligence Platform / Asset Decision Engine</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrint} 
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition shadow-sm"
                        >
                            <PrinterIcon className="h-4 w-4"/>
                            Export PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
                            <XCircleIcon className="h-6 w-6 text-slate-400"/>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-8 sm:p-12 print:p-0 print:overflow-visible bg-white">
                    <div className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-a:text-indigo-600">
                        <h1 className="text-center mb-2">Ultimate Master Blueprint</h1>
                        <p className="text-center text-lg text-slate-500 font-medium mb-12">Forensic Asset Intelligence Platform / Asset Decision Engine<br/>Business Thesis, Operating System Architecture, and V1 Implementation Schema</p>

                        <p className="lead text-slate-700 font-medium border-l-4 border-indigo-500 pl-4 py-2 bg-slate-50">
                            Single source of truth for founder strategy, investor framing, system logic, database design, and MVP implementation. This document consolidates the insurance dual-track system into a broader platform that identifies, values, routes, tracks, and audits assets from intake through final resolution.
                        </p>

                        <hr className="my-8" />

                        <h2>1. Platform Thesis</h2>
                        <p>The Asset Decision Engine is a forensic asset intelligence platform that converts discarded, damaged, returned, or otherwise under-managed physical assets into structured decisions and auditable value outcomes. Its first commercial expression grew out of the insurance dual-track system, but the broader platform is not limited to insurance. It combines identity detection, market-grounded valuation, policy-aware routing, custody tracking, and value-ledger logic into one operating system.</p>
                        
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 my-6">
                            <h4 className="text-indigo-900 mt-0">Core thesis</h4>
                            <p className="mb-0 text-indigo-800">One physical asset can produce multiple lawful value events without becoming multiple assets. The platform's job is to identify the object, decide whether it is worth processing, determine which routes are open or blocked, and preserve a truthful record of both the asset's physical life and its financial life.</p>
                        </div>

                        <h2>2. Problem, Opportunity, and Why This Matters</h2>
                        <p>Most assets that pass through salvage, claim, resale, or liquidation pipelines are handled through fragmented judgment. One person identifies the object, another prices it, another decides whether to claim it, another sells it, and almost nobody preserves a unified audit trail. That fragmentation creates leakage: good assets are skipped, low-value assets consume attention, duplicate value gets counted, return-required assets get mishandled, and past outcomes do not feed future decisions.</p>
                        <ul>
                            <li>Existing tools are usually single-purpose: inventory, resale listing, insurance claims, or liquidation tracking.</li>
                            <li>Market valuation is often treated as late-stage reference data instead of an early economic gate.</li>
                            <li>Most systems do not preserve parent-child lineage when a replacement asset is created.</li>
                            <li>Few systems capture route locks and decision reasons as first-class records.</li>
                            <li>Tacit expert judgment is rarely translated into repeatable logic.</li>
                        </ul>

                        <h2>3. Competitive Differentiation</h2>
                        <ul>
                            <li>Forensic intake instead of generic inventory.</li>
                            <li>Two primary front gates: identity confidence and market viability.</li>
                            <li>Policy-aware routing rather than simple price-based routing.</li>
                            <li>Append-only value ledger separated from the asset record.</li>
                            <li>Chain-of-custody and replacement lineage preserved in the data model.</li>
                            <li>A rules-first engine that can later be enhanced by AI without losing control or auditability.</li>
                        </ul>

                        <h2>4. Product Definition</h2>
                        <p>This platform should be understood as an operating system, not just a tool. It accepts an asset, classifies it with the right taxonomy for the right stage, evaluates whether it deserves attention, tests which routes are available, locks prohibited actions, recommends a route, and records what happened next. Insurance is a route. Resale is a route. Liquidation is a route. The system sits above those channels and controls them.</p>

                        <h2>5. End-to-End Operating Sequence</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Step</th>
                                        <th className="px-4 py-3 border-b">Stage</th>
                                        <th className="px-4 py-3 border-b">Purpose</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-medium">1</td><td className="px-4 py-3 font-semibold">Detection</td><td className="px-4 py-3">Asset is found, uploaded, or entered into the system.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">2</td><td className="px-4 py-3 font-semibold">Identity pass</td><td className="px-4 py-3">Visual and textual evidence are used to infer brand, model, type, and visible condition.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">3</td><td className="px-4 py-3 font-semibold">Confidence gate</td><td className="px-4 py-3">If the system cannot identify the asset well enough, it holds or rejects intake.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">4</td><td className="px-4 py-3 font-semibold">Market viability gate</td><td className="px-4 py-3">Current replacement, open-box, used, and liquidation signals determine proceed vs skip.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">5</td><td className="px-4 py-3 font-semibold">Case / eligibility pass</td><td className="px-4 py-3">Coverage, category match, documentation, return requirement, and contradictions are evaluated.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">6</td><td className="px-4 py-3 font-semibold">Route locks</td><td className="px-4 py-3">Blocked routes are logged and enforced.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">7</td><td className="px-4 py-3 font-semibold">Route recommendation</td><td className="px-4 py-3">Best open path is selected from claim, resale, parts, liquidation, hold, or skip.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">8</td><td className="px-4 py-3 font-semibold">Custody tracking</td><td className="px-4 py-3">Physical movement and possession changes are recorded.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">9</td><td className="px-4 py-3 font-semibold">Value tracking</td><td className="px-4 py-3">Payouts, sales, costs, and net extracted value are appended to the ledger.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">10</td><td className="px-4 py-3 font-semibold">Resolution</td><td className="px-4 py-3">Asset closes as surrendered, paid out, replaced, sold, liquidated, destroyed, disposed, or archived.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>6. The Two Primary Front Gates</h2>
                        
                        <h3>6.1 Identity Confidence Gate</h3>
                        <p>The first gate asks whether the object is known well enough to evaluate. The system should not burn API calls, analyst time, or routing effort on an asset that cannot be identified with acceptable confidence.</p>
                        <ul>
                            <li><strong>Inputs:</strong> object photo quality, label legibility, visible ports/buttons, serial fragments, packaging clues, accessory clues.</li>
                            <li><strong>Outputs:</strong> probable asset type, brand/model extraction, confidence score, hold vs proceed decision.</li>
                        </ul>

                        <h3>6.2 Market Viability Gate</h3>
                        <p>The second gate asks whether the asset is economically worth running through the rest of the machine at all. This is not passive enrichment. It is one of the main control points of the system.</p>
                        <ul>
                            <li><strong>Inputs:</strong> retail replacement value, open-box range, current used price range, liquidation floor, demand velocity, labor burden, shipping burden, testing burden.</li>
                            <li><strong>Outputs:</strong> proceed, hold, direct liquidation review, or skip.</li>
                        </ul>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 my-6">
                            <h4 className="text-amber-900 mt-0">Architectural correction</h4>
                            <p className="mb-0 text-amber-800">Market intelligence is mandatory as a platform capability and is promoted here to a first-class module. It functions as an economic gate, not as background metadata.</p>
                        </div>

                        <h2>7. Hidden Judgment Stack</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Layer</th>
                                        <th className="px-4 py-3 border-b">Primary inputs</th>
                                        <th className="px-4 py-3 border-b">Output</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Recognition</td><td className="px-4 py-3">Shape, scale, material, ports, finish, label fragments, accessories</td><td className="px-4 py-3">Likely object type + identity confidence</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Condition inference</td><td className="px-4 py-3">Damage signs, completeness, wear, cable condition, water/impact clues</td><td className="px-4 py-3">Likely working/damaged + repair burden</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Economic opportunity</td><td className="px-4 py-3">Market values, demand, labor burden, storage, shipping, testing</td><td className="px-4 py-3">Proceed / review / skip / liquidation-first</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Route opportunity</td><td className="px-4 py-3">Open value channels under current facts</td><td className="px-4 py-3">Claim / resale / parts / liquidation / skip</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Friction / kill factors</td><td className="px-4 py-3">Weak proof, restrictions, high labor, poor sellability, fragile shipping</td><td className="px-4 py-3">Proceed / hold / skip</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>8. System Architecture</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Layer</th>
                                        <th className="px-4 py-3 border-b">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Assets</td><td className="px-4 py-3">Permanent identity and status record for the physical object.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Market Intelligence</td><td className="px-4 py-3">Economic grounding and proceed-vs-skip gate.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Cases</td><td className="px-4 py-3">Workflow layer for coverage, documentation, return logic, and route eligibility.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Decision Events / Route Locks</td><td className="px-4 py-3">Why routes were opened, blocked, held, or changed.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Ledger Events</td><td className="px-4 py-3">Append-only financial truth.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Custody Events</td><td className="px-4 py-3">Physical truth and chain of custody.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Codebooks</td><td className="px-4 py-3">Locked definitions for categories, scores, statuses, and outcomes.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>9. Taxonomy by Stage</h2>
                        <p>The platform uses different classification systems at different stages because one universal category field is too weak. Each taxonomy exists for a specific operational job.</p>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Taxonomy Scope</th>
                                        <th className="px-4 py-3 border-b">Used for</th>
                                        <th className="px-4 py-3 border-b">Examples</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Claim Category</td><td className="px-4 py-3">Coverage matching, policy language, eligibility support</td><td className="px-4 py-3">Portable Electronics / Home Entertainment / Computing Device / Appliance</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Internal Asset Type</td><td className="px-4 py-3">Recognition, market lookup, resale analysis, filtering</td><td className="px-4 py-3">Bluetooth Speaker / 55-inch TV / Cable Modem / Cordless Vacuum</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Liquidation Class</td><td className="px-4 py-3">Bundling, physical routing, destruction/scrap logic</td><td className="px-4 py-3">Small Electronics / Small Smashable Audio / Medium Screen Item / Large Appliance</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>10. Asset Identity and Lineage</h2>
                        <p>Each physical object receives one stable Asset ID. The Asset ID is the system spine, not the system brain. It should hold stable identity information and remain searchable across all related records.</p>
                        <ul>
                            <li><strong>Recommended format:</strong> A-[YYYYMMDD]-[CategoryCode]-[Sequence] (example: A-20260704-PE-001).</li>
                            <li>Do not embed dynamic judgments such as opportunity score, claim score, or route confidence into the permanent Asset ID.</li>
                            <li>Replacement assets must receive a new Asset ID and link back to the original through a Parent Asset relationship.</li>
                        </ul>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 my-6">
                            <h4 className="text-indigo-900 mt-0">Lineage rule</h4>
                            <p className="mb-0 text-indigo-800">If a replacement is issued, the replacement is a new asset, not a status change on the original. This preserves truthful parent-child lineage and prevents record collapse.</p>
                        </div>

                        <h2>11. Insurance Dual-Track Logic within the Broader Platform</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Branch</th>
                                        <th className="px-4 py-3 border-b">Scenario</th>
                                        <th className="px-4 py-3 border-b">System handling</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold text-center">A</td><td className="px-4 py-3">Return required + replacement issued</td><td className="px-4 py-3">Original surrendered; replacement becomes child asset; original resale closed.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold text-center">B</td><td className="px-4 py-3">Return required + payout issued</td><td className="px-4 py-3">Original surrendered; payout logged; original exits system.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold text-center">C</td><td className="px-4 py-3">No return required + replacement issued</td><td className="px-4 py-3">Original retained; replacement received; both become separate value paths if lawful.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold text-center">D</td><td className="px-4 py-3">No return required + payout issued</td><td className="px-4 py-3">Original retained; payout logged; original may later be sold, repaired, parted out, or liquidated.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p>This dual-track logic is one high-value branch of the platform. The broader Asset Decision Engine preserves the same asset-ledger separation and route-lock discipline even when no insurance route exists.</p>

                        <h2>12. V1 Technical Stack</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Layer</th>
                                        <th className="px-4 py-3 border-b">Candidate</th>
                                        <th className="px-4 py-3 border-b">Why it is used</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Application layer</td><td className="px-4 py-3">Replit using Python/Flask or Node.js</td><td className="px-4 py-3">Rapid prototype UI, API orchestration, rules execution, Airtable writes/reads</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Database layer</td><td className="px-4 py-3">Airtable</td><td className="px-4 py-3">Fast schema iteration, linked-table MVP, human-readable truth records</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Identification layer</td><td className="px-4 py-3">OpenAI vision-capable model</td><td className="px-4 py-3">Image-based extraction of brand, model, type, visible condition, and confidence</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Market intelligence layer</td><td className="px-4 py-3">eBay sold data, Amazon / retail sources, optional added feeds</td><td className="px-4 py-3">Replacement value, open-box value, used value, liquidation floor, freshness</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Rules layer</td><td className="px-4 py-3">Server-side deterministic decision logic</td><td className="px-4 py-3">Proceed/skip, route locks, route recommendation, automation triggers</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>13. Corrected V1 Logic Loop</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Step</th>
                                        <th className="px-4 py-3 border-b">Logic stage</th>
                                        <th className="px-4 py-3 border-b">System behavior</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-medium">1</td><td className="px-4 py-3 font-semibold">Upload / detection</td><td className="px-4 py-3">User uploads photos or enters an asset manually.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">2</td><td className="px-4 py-3 font-semibold">Vision pass</td><td className="px-4 py-3">System extracts identity clues and confidence. Low-confidence intake is held.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">3</td><td className="px-4 py-3 font-semibold">Market pass</td><td className="px-4 py-3">System retrieves replacement, open-box, used, and liquidation signals.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">4</td><td className="px-4 py-3 font-semibold">Market viability gate</td><td className="px-4 py-3">If economics are weak relative to burden, route to skip or liquidation review.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">5</td><td className="px-4 py-3 font-semibold">Case / eligibility pass</td><td className="px-4 py-3">Coverage, category fit, documentation, return requirement, payout/replacement options, and contradictions are evaluated.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">6</td><td className="px-4 py-3 font-semibold">Route locks</td><td className="px-4 py-3">Blocked routes are logged and enforced.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">7</td><td className="px-4 py-3 font-semibold">Recommendation output</td><td className="px-4 py-3">System displays claim vs resale vs liquidation style recommendation.</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">8</td><td className="px-4 py-3 font-semibold">Execution truth</td><td className="px-4 py-3">Custody events and ledger events are appended as the asset is acted upon.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>14. Airtable Schema - Overview</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Table</th>
                                        <th className="px-4 py-3 border-b">Purpose</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Assets</td><td className="px-4 py-3">Master identity and status of the physical asset</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Market Intelligence</td><td className="px-4 py-3">Snapshot-based economic grounding</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Cases</td><td className="px-4 py-3">Eligibility and route-availability workflow</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Decision Events / Route Locks</td><td className="px-4 py-3">Why a route was opened, blocked, or changed</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Ledger Events</td><td className="px-4 py-3">Financial truth and net extracted value</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Custody Events</td><td className="px-4 py-3">Physical movement and possession trail</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Codebooks</td><td className="px-4 py-3">Locked values for categories, scores, and route outcomes</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>15. Exact Database Implementation Schema</h2>
                        
                        <h3>15.1 Assets</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Asset ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Stable identity of the physical object</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Created Date</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">Record creation date</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Parent Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Replacement lineage</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Source Type</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Street Salvage / Purchase / Replacement Received / Return / Gift / Other</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Claim Category</td><td className="px-4 py-2">Link -{'>'} Claim Category Codebook</td><td className="px-4 py-2">Insurer-aligned top-level classification</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Internal Asset Type</td><td className="px-4 py-2">Link -{'>'} Asset Type Codebook</td><td className="px-4 py-2">Specific object classification</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Liquidation Class</td><td className="px-4 py-2">Link -{'>'} Liquidation Class Codebook</td><td className="px-4 py-2">Assigned only at end-stage liquidation handling</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Brand / Model / Serial Number</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">Identity details</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Visible Condition Score</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Condition grade</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Functional Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Unknown / Likely Working / Tested Working / Partially Working / Not Working / Physically Damaged</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Completeness Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Complete / Mostly Complete / Missing Minor Parts / Missing Major Parts / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Photo Set Complete / Label Photo Present</td><td className="px-4 py-2">Checkbox</td><td className="px-4 py-2">Intake support evidence</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Ownership Proof Present / Type</td><td className="px-4 py-2">Checkbox + select</td><td className="px-4 py-2">Proof quality</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Current Possession Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">In Possession / Sent for Return / Surrendered / Sold / Liquidated / Destroyed / Disposed / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Verification Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Verified / Partial / Incomplete</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Evidence Confidence Score</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Identity confidence gate output</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Opportunity Score</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Economic opportunity indicator</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Current Route Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Open / Locked / Hold / Closed / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Final Outcome</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Resold / Surrendered / Paid Out / Replaced / Liquidated / Destroyed / Disposed / Open / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Narrative support</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.2 Market Intelligence</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Market Snapshot ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Unique snapshot record</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Related asset</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Snapshot Date</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">When market data was pulled</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Identity Confidence</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Quality of identity used for pricing</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Used Retail Replacement Value</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Current replacement grounding</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Open-Box Value</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Open-box / refurbished grounding</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Used Resale Value</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Current likely secondary-market value</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Liquidation Floor</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Lowest practical extraction value</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Demand / Velocity Note</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">How quickly the asset is likely to move</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Market Freshness</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Fresh / Aging / Stale</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Pricing Source Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Market source details and caveats</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Market Confidence Score</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Confidence in the pricing snapshot</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Proceed Threshold Result</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Proceed / Hold / Liquidation Review / Skip</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Expected Economic Tier</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Low / Medium / High / Exceptional</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Additional interpretation</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.3 Cases</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Case ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Workflow record identifier</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Related asset</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Case Type</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Claim Review / Claim Active / Resale Review / Repair Review / Liquidation Review / Manual Investigation</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Provider / Policy</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">Carrier / coverage source</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Coverage Active</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Covered Category</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Waiting Period Met</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Claim Filed</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Claim Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Not Started / Under Review / Approved Payout / Approved Replacement / Denied / Return Pending / Closed</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Documentation Complete</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Return Required</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Return Deadline</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">If applicable</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Payout Option Available</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Replacement Option Available</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Yes / No / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Deductible / Fee</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Case cost input</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Contradiction Flags</td><td className="px-4 py-2">Checkbox</td><td className="px-4 py-2">Manual review trigger</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Manual Review Required</td><td className="px-4 py-2">Checkbox</td><td className="px-4 py-2">System or reviewer-set hold state</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Resale Allowed Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Open / Locked / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Recommended Route</td><td className="px-4 py-2">Link -{'>'} Route Outcome Codebook</td><td className="px-4 py-2">Current best route</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Route Confidence Score</td><td className="px-4 py-2">Number</td><td className="px-4 py-2">Strength of route recommendation</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Case Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Narrative support</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.4 Decision Events / Route Locks</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Decision Event ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Unique route-decision record</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Related asset</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Case</td><td className="px-4 py-2">Link -{'>'} Cases</td><td className="px-4 py-2">Related case if applicable</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Decision Date</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">When the route decision was made</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Decision Type</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Route Recommended / Route Locked / Route Unlocked / Manual Hold / Manual Release / Escalation</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Trigger Field / Trigger Value</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">What created the decision</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Route Code Affected</td><td className="px-4 py-2">Link -{'>'} Route Outcome Codebook</td><td className="px-4 py-2">Affected route</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Lock Status</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Locked / Open / Hold</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Manual or System</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Source of the decision</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Reason Code</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Return Required / Return Status Unknown / Coverage Inactive / Documentation Incomplete / Contradiction Flag / Low Evidence Confidence / Manual Review Triggered / Other</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Explanation</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Human-readable reason</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Released Date / Released By</td><td className="px-4 py-2">Date / text</td><td className="px-4 py-2">If later lifted</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.5 Ledger Events</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Ledger Event ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Unique financial event</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Related asset</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Case</td><td className="px-4 py-2">Link -{'>'} Cases</td><td className="px-4 py-2">Related case if applicable</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Event Type</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Insurance Payout / Replacement Received / Resale Completed / Parts Sale / Liquidation Completed / Repair Expense / Claim Fee / Shipping Expense / Disposal-Surrender / Scrap Recovery</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Event Date</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">When value was realized or cost incurred</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Gross Amount</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Revenue or principal amount</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Fees / Shipping Cost / Repair Cost / Other Costs</td><td className="px-4 py-2">Currency</td><td className="px-4 py-2">Deduction fields</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Net Extracted Value</td><td className="px-4 py-2">Formula</td><td className="px-4 py-2">Gross minus costs</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Source Channel</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Insurance / Facebook Marketplace / eBay / Local Buyer / Rage Room / Scrap / Other</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Proof Attached</td><td className="px-4 py-2">Checkbox</td><td className="px-4 py-2">Evidence of the event</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Narrative support</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.6 Custody Events</h3>
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr><th className="px-4 py-2 border-b">Field</th><th className="px-4 py-2 border-b">Type</th><th className="px-4 py-2 border-b">Purpose</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-2 font-medium">Custody Event ID</td><td className="px-4 py-2">Text / primary</td><td className="px-4 py-2">Unique physical-movement event</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Asset</td><td className="px-4 py-2">Link -{'>'} Assets</td><td className="px-4 py-2">Related asset</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Case</td><td className="px-4 py-2">Link -{'>'} Cases</td><td className="px-4 py-2">Related case if applicable</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Event Date</td><td className="px-4 py-2">Date</td><td className="px-4 py-2">When the movement occurred</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Event Type</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">Acquired / Moved / Stored / Sent for Return / Surrendered / Released to Buyer / Released to Liquidation / Destroyed / Disposed</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">From Location / Holder</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">Prior state</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">To Location / Holder</td><td className="px-4 py-2">Text</td><td className="px-4 py-2">New state</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Possession Status After Event</td><td className="px-4 py-2">Single select</td><td className="px-4 py-2">In Possession / Sent for Return / Surrendered / Sold / Liquidated / Destroyed / Disposed / Unknown</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Proof Attached</td><td className="px-4 py-2">Checkbox</td><td className="px-4 py-2">Evidence of movement</td></tr>
                                    <tr><td className="px-4 py-2 font-medium">Notes</td><td className="px-4 py-2">Long text</td><td className="px-4 py-2">Narrative support</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3>15.7 Codebooks</h3>
                        <p>Codebooks must be built before operational tables are treated as stable. They lock meanings across the platform and prevent inconsistent data entry.</p>
                        <ul>
                            <li>Claim Category Codebook</li>
                            <li>Internal Asset Type Codebook</li>
                            <li>Liquidation Class Codebook</li>
                            <li>Opportunity Score Codebook</li>
                            <li>Condition Score Codebook</li>
                            <li>Evidence Confidence Score Codebook</li>
                            <li>Route Confidence Score Codebook</li>
                            <li>Route Outcome Codebook</li>
                        </ul>

                        <h2>16. Core Automations and Rules</h2>
                        <ul>
                            <li>Generate Asset ID automatically on new asset creation.</li>
                            <li>Set Verification Status based on minimum identity and proof completeness.</li>
                            <li>If Return Required = Yes or Unknown, set Resale Allowed Status = Locked and create a Route Lock record.</li>
                            <li>If Coverage Active = No, close claim routes and create a Decision Event.</li>
                            <li>If Contradiction Flags = checked, set Manual Review Required = true and create a Manual Hold record.</li>
                            <li>If a Ledger Event of type Replacement Received is created, create a new child Asset linked to the original parent asset.</li>
                            <li>Keep the ledger append-only and prevent duplicate overlapping payout records representing the same payout outcome.</li>
                        </ul>

                        <h2>17. Example Route Logic</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Scenario</th>
                                        <th className="px-4 py-3 border-b">System response</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-semibold">Identity confidence too low</td><td className="px-4 py-3">Hold intake and request better evidence before market lookup.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Market value weak and burden high</td><td className="px-4 py-3">Skip or move to direct liquidation review.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Market value strong and coverage active</td><td className="px-4 py-3">Proceed to claim review instead of making a blind sell/no-sell decision.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Claim approved and return required</td><td className="px-4 py-3">Lock resale of original asset and track return through custody events.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">No-return replacement approved</td><td className="px-4 py-3">Create child replacement asset; retain both asset histories separately.</td></tr>
                                    <tr><td className="px-4 py-3 font-semibold">Used value below practical threshold and demand weak</td><td className="px-4 py-3">Favor liquidation or discard path rather than deeper processing.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>18. Risks, Controls, and What Can Break First</h2>
                        <ul>
                            <li>Weak identity evidence creates bad downstream pricing and route suggestions.</li>
                            <li>Over-simplified market thresholds can cause false positives and false negatives.</li>
                            <li>A system without route-lock records becomes operationally opaque even if it appears to work.</li>
                            <li>Failure to separate original and replacement assets destroys lineage integrity.</li>
                            <li>If inventory and ledger are merged, double counting becomes likely.</li>
                            <li>If market data is stale or poorly sourced, the most important economic gate becomes unreliable.</li>
                        </ul>

                        <h2>19. MVP Build Order</h2>
                        <div className="overflow-x-auto my-6">
                            <table className="min-w-full text-sm text-left border border-slate-200">
                                <thead className="bg-slate-50 text-slate-900">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Phase</th>
                                        <th className="px-4 py-3 border-b">What gets built</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    <tr><td className="px-4 py-3 font-medium">1</td><td className="px-4 py-3">Codebooks: categories, scores, route outcomes</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">2</td><td className="px-4 py-3">Core tables: Assets, Market Intelligence, Cases</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">3</td><td className="px-4 py-3">Control table: Decision Events / Route Locks</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">4</td><td className="px-4 py-3">Truth tables: Ledger Events and Custody Events</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">5</td><td className="px-4 py-3">Replit app flow: upload, vision pass, market pass, rules engine, result screen</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">6</td><td className="px-4 py-3">Historical back-testing against real assets and outcomes</td></tr>
                                    <tr><td className="px-4 py-3 font-medium">7</td><td className="px-4 py-3">Threshold tuning, UI hardening, and investor/demo packaging</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h2>20. Investor and Partner Readout</h2>
                        <p>From an investor or strategic-partner standpoint, the platform is defensible because it captures a rare combination of forensic intake, market gating, policy-aware routing, and auditable value realization. It transforms private operator intuition into a repeatable system. That creates three forms of leverage: operational efficiency, decision quality, and reusable data. The system is not just monetizing assets; it is creating a structured intelligence layer about assets.</p>
                        <ul>
                            <li><strong>Why it can matter commercially:</strong> it reduces wasted effort, increases captured value, and creates reusable decision data.</li>
                            <li><strong>Why it can matter strategically:</strong> it sits above multiple channels rather than being locked to one channel.</li>
                            <li><strong>Why it can matter technically:</strong> the data model is already separated into identity, economics, eligibility, control, custody, and value truth.</li>
                            <li><strong>Why it can matter defensibly:</strong> the hidden judgment stack can be formalized and improved over time without discarding the rules-first core.</li>
                        </ul>

                        <div className="bg-slate-900 text-white rounded-xl p-8 my-10 text-center shadow-lg">
                            <h2 className="text-white mt-0 mb-4">21. Final Definition</h2>
                            <p className="text-xl font-medium text-indigo-200 mb-0">
                                "The Asset Decision Engine is a forensic asset intelligence, market-gated, policy-aware, route-controlled operating system that tracks both the physical life and the financial life of an asset from detection to final resolution."
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default UltimateBlueprintModal;
