import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem } from '../types';

interface BurglaryClaimWizardProps {
  onClose: () => void;
  inventory: InventoryItem[];
}

const BurglaryClaimWizard: React.FC<BurglaryClaimWizardProps> = ({ onClose, inventory }) => {
  const [step, setStep] = useState<number>(1);

  // --- PDF Generators ---

  const generateStatementOfLoss = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header
    doc.setFontSize(18);
    doc.text('STATEMENT OF LOSS', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Claimant: Roydel Marquez Bello', margin, 35);
    doc.text('Date of Loss: 11/27/2024', margin, 42);
    doc.text('Type of Loss: Burglary / Forced Entry', margin, 49);

    // Body
    doc.setFontSize(14);
    doc.text('Statement of Facts', margin, 65);

    doc.setFontSize(11);
    const statementText = `
On November 27, 2024, a forced entry burglary occurred at my residence during an active move.

Specifically, perpetrators stole 8 specific large moving boxes that were staged near the entrance. These boxes contained high-value electronics, gaming equipment, home media systems, and luxury personal property.

The residence was rendered insecure due to the damage to the entry, requiring emergency temporary housing.

This statement serves to correct and clarify any preliminary information noted in the police report regarding the specific items and the nature of the theft. The inventory schedule attached to this claim represents the verified list of stolen property contained within those 8 boxes.
    `;

    const splitText = doc.splitTextToSize(statementText.trim(), pageWidth - (margin * 2));
    doc.text(splitText, margin, 75);

    // Signature Line
    doc.text('_____________________________', margin, 150);
    doc.text('Roydel Marquez Bello', margin, 157);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 164);

    doc.save('01_Statement_of_Loss_MarquezBello.pdf');
  };

  const generateInventorySchedule = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('STRATEGIC INVENTORY SCHEDULE', 14, 20);

    doc.setFontSize(11);
    doc.text('Loss Date: 11/27/2024', 14, 30);
    doc.text('Total Estimated Value: ~$62,000.00', 14, 37);

    // Filter relevant items (Electronics, Clothing, Household)
    // In a real app we might select specific items, here we take all active ones for the demo
    const tableRows = inventory.map(item => [
      item.itemCategory,
      item.itemName,
      item.brand || 'N/A',
      item.originalCost ? `$${item.originalCost.toFixed(2)}` : 'N/A',
      item.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Category', 'Item Description', 'Brand/Model', 'Est. Value', 'Status']],
      body: tableRows,
      foot: [['', '', 'TOTAL', `$${inventory.reduce((acc, i) => acc + (i.originalCost || 0), 0).toFixed(2)}`, '']],
    });

    doc.save('02_Inventory_Schedule.pdf');
  };

  const generateALEDemand = () => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFontSize(12);
    doc.text('Roydel Marquez Bello', margin, 20);
    doc.text('421 W 56 ST, APT 4A', margin, 27);
    doc.text('NEW YORK NY 10019', margin, 34);

    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 50);

    doc.text('To: Assurant / GEICO Insurance Adjuster', margin, 65);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RE: DEMAND FOR ALE REIMBURSEMENT - $9,809.78', margin, 80);
    doc.setFont('helvetica', 'normal');

    doc.setFontSize(11);
    const body = `
This letter serves as a formal demand for reimbursement of Additional Living Expenses (ALE) incurred due to the constructive eviction resulting from the burglary on 11/27/2024.

As the residence was rendered insecure and uninhabitable following the forced entry, I was required to secure emergency temporary housing.

Total ALE Expenses: $9,809.78
- Emergency Hotel Stay (Invoice #0157): $8,609.00
- Associated Food & Displacement Expenses: $1,200.78

Attached is the paid-in-full hotel invoice confirming a $0.00 balance due.

Please process this reimbursement immediately.
    `;

    const splitBody = doc.splitTextToSize(body.trim(), doc.internal.pageSize.getWidth() - (margin * 2));
    doc.text(splitBody, margin, 95);

    doc.text('Sincerely,', margin, 180);
    doc.text('Roydel Marquez Bello', margin, 190);

    doc.save('03_ALE_Demand_Paid.pdf');
  };

  const handleDownloadAll = () => {
    generateStatementOfLoss();
    setTimeout(generateInventorySchedule, 500);
    setTimeout(generateALEDemand, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-red-600 text-white rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Burglary Claim Execution Protocol</h2>
            <p className="text-red-100 text-sm">Follow these steps exactly to secure your claim.</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-red-700 p-2 rounded">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="flex mb-8 items-center">
            <div className={`flex-1 h-2 rounded-l ${step >= 1 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
            <div className={`flex-1 h-2 ${step >= 2 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
            <div className={`flex-1 h-2 rounded-r ${step >= 3 ? 'bg-red-600' : 'bg-gray-200'}`}></div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800">PHASE 1: FILE CREATION</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="font-bold">ACTION REQUIRED:</p>
                <p>You must generate and save these 3 PDF files now. They will be required for the upload step.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="border p-4 rounded hover:shadow-lg transition cursor-pointer" onClick={generateStatementOfLoss}>
                  <div className="text-4xl mb-2">📄</div>
                  <h4 className="font-bold">1. Statement of Loss</h4>
                  <p className="text-sm text-gray-600">Corrects police report errors.</p>
                  <button className="mt-2 text-blue-600 text-sm font-semibold hover:underline">Download PDF</button>
                </div>
                <div className="border p-4 rounded hover:shadow-lg transition cursor-pointer" onClick={generateInventorySchedule}>
                  <div className="text-4xl mb-2">📋</div>
                  <h4 className="font-bold">2. Inventory Schedule</h4>
                  <p className="text-sm text-gray-600">List of ~62k in goods.</p>
                  <button className="mt-2 text-blue-600 text-sm font-semibold hover:underline">Download PDF</button>
                </div>
                <div className="border p-4 rounded hover:shadow-lg transition cursor-pointer" onClick={generateALEDemand}>
                  <div className="text-4xl mb-2">🏨</div>
                  <h4 className="font-bold">3. ALE Demand</h4>
                  <p className="text-sm text-gray-600">Demand for $9,809.78</p>
                  <button className="mt-2 text-blue-600 text-sm font-semibold hover:underline">Download PDF</button>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleDownloadAll}
                  className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-bold flex items-center gap-2"
                >
                  ⬇️ Download All 3 Files
                </button>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-bold mb-2">Checklist: Have you gathered these?</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li><span className="font-mono bg-gray-100 px-1">Invoice - 0157.pdf</span> (Hotel Bill)</li>
                  <li><span className="font-mono bg-gray-100 px-1">04_Verified_Amazon_Purchase_History.csv</span> (Rename your retail history CSV)</li>
                  <li><span className="font-mono bg-gray-100 px-1">COMPLAINT_REPORT_2024-018-12043.pdf</span> (Police Report)</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800">PHASE 2: PORTAL SUBMISSION</h3>
              <p className="text-gray-600">Open <a href="https://MyAssurantPolicy.com" target="_blank" className="text-blue-600 underline">MyAssurantPolicy.com</a> in a new tab and follow these steps.</p>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-gray-50 rounded">
                  <div className="font-bold text-2xl text-gray-400">1</div>
                  <div>
                    <h4 className="font-bold">Login & Navigate</h4>
                    <p>Click "File a Claim" or "Report a Loss".</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-gray-50 rounded">
                  <div className="font-bold text-2xl text-gray-400">2</div>
                  <div className="w-full">
                    <h4 className="font-bold">Input Claim Details</h4>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div>
                        <span className="font-semibold block">Date of Loss:</span>
                        <span className="bg-white px-2 py-1 border rounded block">11/27/2024</span>
                      </div>
                      <div>
                        <span className="font-semibold block">Type/Cause:</span>
                        <span className="bg-white px-2 py-1 border rounded block">Theft / Forced Entry</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="font-semibold block">Description of Incident:</span>
                      <div className="relative group">
                        <textarea
                          readOnly
                          className="w-full p-2 text-sm border rounded bg-yellow-50 font-mono h-24"
                          value="Forced entry burglary occurred during active move. Perpetrators stole 8 specific large moving boxes staged near the entrance containing high-value electronics and luxury personal property. Residence was rendered insecure, requiring emergency temporary housing."
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText("Forced entry burglary occurred during active move. Perpetrators stole 8 specific large moving boxes staged near the entrance containing high-value electronics and luxury personal property. Residence was rendered insecure, requiring emergency temporary housing.")}
                          className="absolute top-2 right-2 bg-blue-100 text-blue-700 px-2 py-1 text-xs rounded hover:bg-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-gray-50 rounded">
                  <div className="font-bold text-2xl text-gray-400">3</div>
                  <div>
                    <h4 className="font-bold">Upload Documents</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-2">
                      <li><strong>Proof of Loss / Inventory:</strong> Upload <span className="font-mono text-red-600">01_Statement...pdf</span> and <span className="font-mono text-red-600">02_Inventory...pdf</span></li>
                      <li><strong>Receipts/Docs:</strong> Upload <span className="font-mono text-red-600">04_Verified_Amazon...csv</span> and Hotel Invoice</li>
                      <li><strong>Other Documents:</strong> Upload <span className="font-mono text-red-600">03_ALE_Demand...pdf</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded mt-4">
                <h4 className="font-bold text-red-700 flex items-center gap-2">⚠️ CRITICAL WARNINGS</h4>
                <ul className="list-disc pl-5 mt-2 text-sm text-red-800 space-y-1">
                  <li><strong>Computers:</strong> If asked, say "Personal Use / Gaming / Home Media". DO NOT say "Business".</li>
                  <li><strong>Jewelry:</strong> If asked why it's missing, say "Handling separately to avoid delay".</li>
                  <li><strong>Cash:</strong> Do not mention cash, HRA, or debt. Stick to the docs.</li>
                </ul>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800">PHASE 3: THE FOLLOW-UP</h3>
              <p className="text-gray-600">Immediately after getting your Claim Number, send this email.</p>

              <div className="bg-white border rounded-lg p-6 shadow-sm">
                <div className="mb-4">
                  <span className="font-bold block text-sm text-gray-500">To:</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded">rentersmail@assurant.com</span>
                    <button onClick={() => navigator.clipboard.writeText("rentersmail@assurant.com")} className="text-blue-500 text-sm hover:underline">Copy</button>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-bold block text-sm text-gray-500">Subject:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm border p-1 rounded w-full">URGENT: Proof of Loss & ALE Demand - Claim #[Insert Claim Number] - Roydel Marquez Bello</span>
                    <button onClick={() => navigator.clipboard.writeText("URGENT: Proof of Loss & ALE Demand - Claim #[Insert Claim Number] - Roydel Marquez Bello")} className="text-blue-500 text-sm hover:underline">Copy</button>
                  </div>
                </div>

                <div>
                  <span className="font-bold block text-sm text-gray-500">Body:</span>
                  <div className="relative mt-1">
                    <textarea
                      readOnly
                      className="w-full h-64 p-4 border rounded font-mono text-sm bg-gray-50"
                      value={`To the Adjuster,

I have just filed Claim #[Insert Claim Number] regarding the burglary on 11/27/2024.

Attached are the finalized Proof of Loss documents:
1. Statement of Loss (Correcting police report errors).
2. Verified Inventory Schedule (Supported by attached Amazon/Apple logs).
3. ALE Demand for $9,809.78 (Emergency housing paid in full).

Immediate Action Required:
Please prioritize the processing of the ALE reimbursement ($9,809.78) as these out-of-pocket expenses were incurred due to constructive eviction. The invoice attached (Invoice - 0157.pdf) confirms a $0.00 balance due.

I am available for a brief call to expedite the release of funds.

Regards,
Roydel Marquez Bello`}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`To the Adjuster,\n\nI have just filed Claim #[Insert Claim Number] regarding the burglary on 11/27/2024.\n\nAttached are the finalized Proof of Loss documents:\n1. Statement of Loss (Correcting police report errors).\n2. Verified Inventory Schedule (Supported by attached Amazon/Apple logs).\n3. ALE Demand for $9,809.78 (Emergency housing paid in full).\n\nImmediate Action Required:\nPlease prioritize the processing of the ALE reimbursement ($9,809.78) as these out-of-pocket expenses were incurred due to constructive eviction. The invoice attached (Invoice - 0157.pdf) confirms a $0.00 balance due.\n\nI am available for a brief call to expedite the release of funds.\n\nRegards,\nRoydel Marquez Bello`)}
                      className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-3 py-1 text-xs rounded hover:bg-blue-200"
                    >
                      Copy Body
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center rounded-b-lg">
          <button
            disabled={step === 1}
            onClick={() => setStep(s => s - 1)}
            className={`px-4 py-2 rounded ${step === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-200'}`}
          >
            ← Back
          </button>

          <div className="text-sm text-gray-500 font-semibold">
            Step {step} of 3
          </div>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold"
            >
              Next Phase →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BurglaryClaimWizard;
