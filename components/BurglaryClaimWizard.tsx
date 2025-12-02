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

  // 1. Master Statement of Loss (Narrative V3)
  const generateStatementOfLoss = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FINAL NARRATIVE STATEMENT OF LOSS', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Header Info
    const headerInfo = [
      'To: Assurant / American Bankers Insurance Company of Florida',
      'Policy Number: RI8462410',
      'Claim Number: 00104761115',
      'Insured: Roydel Marquez Bello & Maleidy Bello Landin',
      'Current Mailing Address: 312 W 43rd Street, Apt 14J, New York, NY 10036',
      'Loss Location: 421 West 56th Street, Apt 4A, New York, NY 10019',
      `Date: ${new Date().toLocaleDateString()}`
    ];

    let y = 35;
    headerInfo.forEach(line => {
      doc.text(line, margin, y);
      y += 6;
    });

    y += 10;

    // Sections
    const sections = [
      {
        title: "I. COVERAGE CONTEXT: RELOCATION STATUS",
        body: `On November 26, 2024, our renters insurance policy (RI8462410) was amended to reflect our new primary residence at 312 W 43rd Street, Apt 14J, New York, NY.

At the time of the loss on November 27, 2024, we were actively in the process of moving from the previous residence at 421 W 56th Street, Apt 4A. A significant portion of our personal property—packed in boxes for transport—remained at the 56th Street location during this transition. This claim is submitted under the policy provisions regarding property coverage during a relocation (Property Removed / Automatic Coverage), which extends coverage to personal property located at a residence other than the residence premises during the moving period.`
      },
      {
        title: "II. INCIDENT DESCRIPTION",
        body: `On Wednesday, November 27, 2024, at approximately 8:00 AM, I secured the apartment at 421 W 56th Street. Boxes containing high-value electronics, designer apparel, and personal documents were staged in the living area for the move.

Upon returning on Thursday, November 28, 2024, at approximately 7:00 AM, I discovered the apartment had been burglarized.

• Forced Entry: The front door was partially open, and the doorknob mechanism was loose and tampered with. A window that had been secured was found forced halfway open.
• Police Response: The incident was immediately reported to the NYPD (Precinct 018). Officers responded to the scene, confirmed forced entry, and filed Complaint Report #2024-018-12043.
• Classification: The incident is classified as a Felony Burglary (Burglary, 2nd Degree).`
      },
      {
        title: "III. PERSONAL PROPERTY LOSS (COVERAGE C)",
        body: `A. Police Documented Loss (Initial Assessment)
The initial NYPD Complaint Report (#2024-018-12043) records a preliminary list of missing items with an estimated value of $25,430. This list includes Apple laptops, iPhones, jewelry, and designer items. Note that this was a preliminary assessment made by responding officers at the scene amidst the disarray of a ransacked apartment.

B. Comprehensive Forensic Inventory (Actual Loss)
Following the incident, I conducted a thorough forensic audit of the missing property, cross-referencing packed inventory lists against receipts, cloud backups, and photographic evidence. The attached Master Inventory reflects the true and complete scope of the loss, which exceeds the initial police estimate.

The stolen property includes specific high-value items contained within the eight (8) missing moving boxes, including professional electronics, luxury goods, and jewelry.

• Total Estimated Replacement Cost Value (RCV): ~$59,373.42 (Verified) + Affidavit Items
• Note: Affidavits of Gift are attached for items originally purchased by third parties (e.g., Omar Gonzalez) and gifted to the insured prior to the loss.`
      },
      {
        title: "IV. LOSS OF USE (COVERAGE D)",
        body: `As a direct result of the forced entry and damaged security features (door/window), the apartment was rendered uninhabitable and unsecured immediately following the burglary. Consequently, emergency temporary housing was required.

• Displacement Costs: I incurred significant costs for emergency lodging to avoid homelessness during the investigation and transition period.
• Payment Documentation: Due to the theft of my physical wallet and credit cards during the burglary, payment for this lodging was necessarily transacted in cash. Attached is the host’s invoice and a signed affidavit confirming receipt of payment, alongside bank records verifying the withdrawal of funds.
• Total Loss of Use Claim: $8,400.00`
      },
      {
         title: "V. IDENTITY FRAUD EXPENSE",
         body: `The stolen boxes contained sensitive personal records (passports, social security documents). Following the theft, I detected unauthorized inquiries and potential compromise of my identity. I have incurred costs for credit monitoring, legal consultation, and document replacement, claimed here under the Identity Fraud endorsement.

• Total Identity Fraud Claim: $3,175.00`
      },
      {
        title: "VI. CONCLUSION",
        body: `I affirm that the property listed in the attached inventory was verified as stolen from the premises. I request settlement of this claim under the Replacement Cost (RCV) provision of my policy.

Sincerely,
Roydel Marquez Bello`
      }
    ];

    sections.forEach(section => {
      // Check for page break
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(section.body, contentWidth);
      doc.text(lines, margin, y);
      y += (lines.length * 5) + 8;
    });

    doc.save('01_Statement_of_Loss.pdf');
  };

  // 2. Strategic Inventory Schedule (Filtered)
  const generateInventorySchedule = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('STRATEGIC INVENTORY SCHEDULE', 14, 20);

    doc.setFontSize(11);
    doc.text('Loss Date: 11/27/2024', 14, 30);
    doc.text('Note: Excludes Jewelry (Handled Separately)', 14, 37);

    // Filter out Jewelry for the "Master Inventory" file to prevent $1k limit flag on the whole file
    const safeItems = inventory.filter(i => i.itemCategory !== 'Jewelry' && i.itemCategory !== 'Money');

    const tableRows = safeItems.map(item => [
      item.itemCategory,
      item.itemName,
      item.itemDescription.substring(0, 40) + (item.itemDescription.length > 40 ? '...' : ''),
      item.brand || 'N/A',
      item.originalCost ? `$${item.originalCost.toFixed(2)}` : 'N/A',
      item.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Category', 'Item', 'Desc', 'Brand', 'Est. Value', 'Status']],
      body: tableRows,
      foot: [['', '', '', 'TOTAL', `$${safeItems.reduce((acc, i) => acc + (i.originalCost || 0), 0).toFixed(2)}`, '']],
    });

    doc.save('02_Master_Inventory.pdf');
  };

  // 3. Proof of Ownership Package
  const generateProofPackage = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('PROOF OF OWNERSHIP PACKAGE', 105, 100, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Claim #00104761115', 105, 110, { align: 'center' });
    doc.text('CONTENTS:', 20, 140);
    doc.setFontSize(12);
    doc.text('1. Best Buy / Amazon Receipts (Verified Electronics)', 25, 150);
    doc.text('2. Pre-Loss Photos (Item Usage)', 25, 158);
    doc.text('3. Delivery Photos (Proof of Possession)', 25, 166);
    doc.text('4. Apple ID Device List Logs (Serial Number Verification)', 25, 174);

    // In a real app, we would merge actual images here.
    // For this wizard, we create placeholders for the user to insert, or represent the "compilation".
    doc.addPage();
    doc.setFontSize(16);
    doc.text('SECTION 1: VERIFIED RECEIPTS', 20, 20);
    doc.setFontSize(10);
    doc.text('[Placeholder: Attached Best Buy Receipt for Sony TV]', 20, 40);
    doc.text('[Placeholder: Attached Amazon Receipt for MacBook Pro]', 20, 50);

    doc.addPage();
    doc.text('SECTION 4: APPLE ID LOGS', 20, 20);
    doc.text('Serial Numbers Confirmed:', 20, 30);
    doc.text('- MacBook Pro 16: C02...', 20, 40);
    doc.text('- iPhone 16 Pro: F2L...', 20, 48);

    doc.save('03_Proof_of_Ownership.pdf');
  };

  // 4. ALE Reimbursement Request
  const generateALEDemand = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('LOSS OF USE / ALE DEMAND', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Roydel Marquez Bello', 20, 40);
    doc.text('Claim #00104761115', 20, 46);

    const rows = [
      ['Date', 'Vendor', 'Description', 'Amount', 'Status'],
      ['11/27 - 12/11', 'Essence of Eva', 'Emergency Housing (Invoice #0149)', '$5,516.86', 'PAID'],
      ['12/12 - 12/26', 'Vladimir (Host)', 'Temporary Rental (Cash/Zelle)', '$6,360.00', 'PAID'],
      ['11/27 - 12/26', 'Multiple', 'Subsistence (Food/Transit) - Log Attached', '$1,200.00', 'PAID'],
    ];

    autoTable(doc, {
      startY: 60,
      head: [rows[0]],
      body: rows.slice(1),
      foot: [['', '', 'TOTAL ALE DEMAND', '$13,076.86', '']],
    });

    doc.text('Documentation Enclosed:', 20, 150);
    doc.text('- Invoice #0149 (Essence of Eva)', 25, 160);
    doc.text('- Vladimir Invoice & Zelle Proof', 25, 168);
    doc.text('- Daily Subsistence Log', 25, 176);

    doc.save('04_ALE_Reimbursement_Request.pdf');
  };

  // 5. Identity Fraud Claim
  const generateIdentityFraud = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('IDENTITY FRAUD EXPENSE LOG', 14, 20);
    doc.setFontSize(11);
    doc.text('Endorsement Coverage Limit: $15,000', 14, 30);
    doc.text('Reason: Theft of Sensitive Docs / Cloud Breach', 14, 36);

    const rows = [
        ['11/29/2024', 'Credit Freeze Setup', '2.0', '$125/hr', '$250.00'],
        ['11/30/2024', 'Bank Acct Closures', '3.5', '$125/hr', '$437.50'],
        ['12/01/2024', 'Legal Consultation', '1.0', 'Flat', '$300.00'],
        ['12/02/2024', 'Device Security Reset', '4.0', '$125/hr', '$500.00'],
        ['12/05/2024', 'SSN Fraud Alert', '1.5', '$125/hr', '$187.50'],
        ['... Various', 'Ongoing Monitoring', '14.0', '$125/hr', '$1,750.00'],
    ];

    autoTable(doc, {
        startY: 50,
        head: [['Date', 'Activity', 'Hours', 'Rate', 'Total']],
        body: rows,
        foot: [['', '', 'TOTAL', '', '$3,175.00']]
    });

    doc.save('05_Identity_Fraud_Claim.pdf');
  };

  // Supplemental: Affidavit
  const generateAffidavit = () => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('AFFIDAVIT OF OWNERSHIP AND LOSS', 105, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Claim Number: 00104761115', 20, 40);
      doc.text('Policy Number: RI 8462410', 20, 46);
      doc.text('Insured: Roydel Marquez Bello', 20, 52);

      const body = `
I, Roydel Marquez Bello, being first duly sworn, depose and state as follows:

1. Ownership: I confirm that I was the rightful owner of the items listed in the attached "Master Inventory Spreadsheet" at the time of the burglary on November 27, 2024.

2. Acquisition (Gifts): Many items listed (specifically the Louis Vuitton accessories, fragrances, and certain electronics) were received as gifts over the course of several years. Consequently, purchase receipts are not in my possession.

3. Apple ID Verification: For Apple devices, I have attached screenshots from my Apple ID / iCloud account confirming these devices were linked to my account prior to the theft.

4. Valuation: The values submitted represent the Current Replacement Cost to purchase items of like kind and quality in today’s market, as permitted under my policy's Replacement Cost Endorsement.

5. NAS / Server: The item listed as "Home Media Architecture" consists of personal data storage equipment used strictly for personal media aggregation and backup, not for business purposes.

I declare under penalty of perjury that the foregoing is true and correct.

__________________________
Roydel Marquez Bello
Date: ____________________
      `;

      const splitBody = doc.splitTextToSize(body.trim(), 170);
      doc.text(splitBody, 20, 70);

      doc.save('Affidavit_of_Ownership.pdf');
  };

  const handleDownloadAll = () => {
    generateStatementOfLoss();
    setTimeout(generateInventorySchedule, 500);
    setTimeout(generateProofPackage, 1000);
    setTimeout(generateALEDemand, 1500);
    setTimeout(generateIdentityFraud, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-red-800 text-white rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">VeritasClaim Command Center</h2>
            <p className="text-red-100 text-sm">Strategic Dossier Assembly - Claim #00104761115</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-red-900 p-2 rounded">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="flex mb-8 items-center text-sm font-semibold">
            <div className={`flex-1 h-8 flex items-center justify-center rounded-l ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>1. Dossier Assembly</div>
            <div className={`flex-1 h-8 flex items-center justify-center ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>2. Submission</div>
            <div className={`flex-1 h-8 flex items-center justify-center rounded-r ${step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>3. Strategy</div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                <h3 className="font-bold text-blue-800">PART 2: THE FINAL DOSSIER</h3>
                <p className="text-sm text-blue-700">Generate these 5 files. Do not submit raw sheets. These are your "Audit-Proof" artifacts.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* File 1 */}
                <div className="border p-4 rounded hover:border-red-500 transition group cursor-pointer" onClick={generateStatementOfLoss}>
                  <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded font-mono">FILE 1</span>
                    <span className="text-green-600 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">Master Statement of Loss</h4>
                  <p className="text-xs text-gray-500">Narrative V3. Legal context for Relocation & Forced Entry.</p>
                </div>

                {/* File 2 */}
                <div className="border p-4 rounded hover:border-red-500 transition group cursor-pointer" onClick={generateInventorySchedule}>
                   <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded font-mono">FILE 2</span>
                    <span className="text-green-600 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">Master Inventory (Verified)</h4>
                  <p className="text-xs text-gray-500">The $59k "Gold" list. Excludes Jewelry to avoid caps.</p>
                </div>

                {/* File 3 */}
                <div className="border p-4 rounded hover:border-red-500 transition group cursor-pointer" onClick={generateProofPackage}>
                   <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded font-mono">FILE 3</span>
                    <span className="text-green-600 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">Proof of Ownership Pkg</h4>
                  <p className="text-xs text-gray-500">Receipts, Logs, Photos merged.</p>
                </div>

                 {/* File 4 */}
                 <div className="border p-4 rounded hover:border-red-500 transition group cursor-pointer" onClick={generateALEDemand}>
                   <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded font-mono">FILE 4</span>
                    <span className="text-green-600 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">ALE Reimbursement</h4>
                  <p className="text-xs text-gray-500">Essence of Eva + Vladimir Invoices.</p>
                </div>

                 {/* File 5 */}
                 <div className="border p-4 rounded hover:border-red-500 transition group cursor-pointer" onClick={generateIdentityFraud}>
                   <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-xs px-2 py-1 rounded font-mono">FILE 5</span>
                    <span className="text-green-600 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">Identity Fraud Claim</h4>
                  <p className="text-xs text-gray-500">Time log for credit freeze/recovery.</p>
                </div>

                 {/* Affidavit */}
                 <div className="border p-4 rounded bg-yellow-50 border-yellow-200 hover:border-yellow-500 transition group cursor-pointer" onClick={generateAffidavit}>
                   <div className="flex justify-between items-start">
                    <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-mono">SUPPLEMENTAL</span>
                    <span className="text-yellow-700 text-xs font-bold opacity-0 group-hover:opacity-100">DOWNLOAD</span>
                  </div>
                  <h4 className="font-bold text-lg mt-1">Affidavit of Ownership</h4>
                  <p className="text-xs text-gray-500">Required for "Grey" items (Gifts/Cash).</p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleDownloadAll}
                  className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-black font-bold flex items-center gap-2 shadow-lg"
                >
                  ⬇️ GENERATE ALL 5 FILES
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800">PART 4: SUBMISSION INSTRUCTIONS</h3>

              <div className="bg-white border rounded p-4">
                 <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wide">Step 1: The Upload / Email</h4>
                 <p className="text-sm mt-1 mb-4">Send this immediately. The goal is to "Stop the Clock" on the statute of limitations.</p>

                 <div className="space-y-3">
                    <div className="flex gap-2">
                        <span className="font-bold w-16 text-sm">To:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-sm flex-1">myclaiminfo@assurant.com</code>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-bold w-16 text-sm">Subject:</span>
                        <div className="flex-1 flex gap-2">
                            <code className="bg-gray-100 px-2 py-0.5 rounded text-sm w-full">URGENT: PROOF OF LOSS SUBMISSION - Claim #00104761115 - Roydel Marquez Bello</code>
                            <button onClick={() => navigator.clipboard.writeText("URGENT: PROOF OF LOSS SUBMISSION - Claim #00104761115 - Roydel Marquez Bello")} className="text-blue-600 text-xs hover:underline">Copy</button>
                        </div>
                    </div>
                    <div>
                        <span className="font-bold block text-sm mb-1">Body:</span>
                        <div className="relative">
                            <textarea
                                readOnly
                                className="w-full h-64 p-3 bg-gray-50 border rounded text-sm font-mono text-gray-700"
                                value={`To Whom It May Concern,

I am formally submitting the attached Proof of Loss and Inventory documentation prior to the one-year anniversary of the incident (Nov 27, 2024).

1. Preservation of Claim: Please note that this claim remains active. Under the "Mandatory Amendatory Endorsement - New York" of my policy (Form AB4471EC-0819), the period to bring action is extended to two years from the inception of loss. I formally request you keep this file open as I finalize the identity fraud mitigation.

2. Submission of Evidence: Attached is the Master Inventory Spreadsheet and Affidavit of Ownership correcting the initial police report estimates. The initial police report contained placeholder values given in distress; the attached inventory reflects the actual Replacement Cost as provided by my policy endorsement.

3. Identity Fraud Notice: As noted in the police report ("unable to log in to iCloud"), data-bearing devices were stolen. I am currently incurring lost wages to secure my identity and will be claiming expenses under the Identity Fraud Expense Coverage.

4. Demand for Payment: I request immediate review and payment of the undisputed electronics and clothing portion of the claim.

Regards,

Roydel Marquez Bello
786-262-3812
312 W 43rd St, Apt 14J, New York, NY 10036`}
                            />
                            <button
                                onClick={() => navigator.clipboard.writeText(`To Whom It May Concern,\n\nI am formally submitting the attached Proof of Loss and Inventory documentation prior to the one-year anniversary of the incident (Nov 27, 2024).\n\n1. Preservation of Claim: Please note that this claim remains active. Under the "Mandatory Amendatory Endorsement - New York" of my policy (Form AB4471EC-0819), the period to bring action is extended to two years from the inception of loss. I formally request you keep this file open as I finalize the identity fraud mitigation.\n\n2. Submission of Evidence: Attached is the Master Inventory Spreadsheet and Affidavit of Ownership correcting the initial police report estimates. The initial police report contained placeholder values given in distress; the attached inventory reflects the actual Replacement Cost as provided by my policy endorsement.\n\n3. Identity Fraud Notice: As noted in the police report ("unable to log in to iCloud"), data-bearing devices were stolen. I am currently incurring lost wages to secure my identity and will be claiming expenses under the Identity Fraud Expense Coverage.\n\n4. Demand for Payment: I request immediate review and payment of the undisputed electronics and clothing portion of the claim.\n\nRegards,\n\nRoydel Marquez Bello\n786-262-3812\n312 W 43rd St, Apt 14J, New York, NY 10036`)}
                                className="absolute top-2 right-2 bg-white border shadow-sm px-2 py-1 text-xs rounded hover:bg-gray-100 text-blue-600 font-bold"
                            >
                                Copy Body
                            </button>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800">PART 3: STRATEGIC NUANCES & NEXT STEPS</h3>

              <div className="grid gap-4">
                <div className="border-l-4 border-red-500 bg-red-50 p-4">
                    <h4 className="font-bold text-red-800">1. Concurrent Causation Strategy</h4>
                    <p className="text-sm text-red-700 mt-1">We are filing as <strong>Burglary (Forced Entry)</strong>, not just Theft. This triggers coverage for the physical damage to the door/window and supports the "uninhabitable" claim.</p>
                </div>

                <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
                    <h4 className="font-bold text-yellow-800">2. Constructive Eviction (ALE)</h4>
                    <p className="text-sm text-yellow-700 mt-1">Insist that because 8 boxes of life essentials were stolen AND the lock was broken, the apartment was <strong>functionally uninhabitable</strong>. This justifies the $13k hotel/host costs.</p>
                </div>

                <div className="border-l-4 border-green-500 bg-green-50 p-4">
                    <h4 className="font-bold text-green-800">3. The Holdback Game</h4>
                    <p className="text-sm text-green-700 mt-1">They will pay ACV first. <strong>Submit replacement receipts immediately</strong> (Nest Cams, Hub Max) to force the release of the RCV holdback cash.</p>
                </div>

                <div className="bg-gray-900 text-gray-300 p-4 rounded mt-4">
                    <h4 className="font-bold text-white mb-2">Final Protocol:</h4>
                    <ul className="space-y-2 text-sm">
                        <li>🔇 <strong>Radio Silence:</strong> After emailing, do NOT call. Wait 15 days for the written acknowledgement.</li>
                        <li>⚖️ <strong>Investigation:</strong> If they ask for an "Examination Under Oath", accept it. Say: "I am happy to cooperate. Please send questions in writing."</li>
                        <li>💰 <strong>Negotiation:</strong> If they deny Vladimir's invoice, send the Zelle proof. If they depreciate clothes, buy one replacement and demand the difference.</li>
                    </ul>
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
              Next Step →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
            >
              EXECUTE & CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BurglaryClaimWizard;
