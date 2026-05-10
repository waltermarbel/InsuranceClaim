import React from 'react';
import { XIcon } from './icons';

interface ClaimStrategyGuideProps {
  onClose: () => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-bold text-dark font-heading mt-6 mb-2 border-b pb-1">{children}</h3>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="font-semibold text-dark mt-4 mb-1">{children}</h4>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="ml-5 list-disc text-medium">{children}</li>
);

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-slate-100 border border-slate-200 rounded p-3 my-2 text-sm text-medium italic">
        {children}
    </div>
);


const ClaimStrategyGuide: React.FC<ClaimStrategyGuideProps> = ({ onClose }) => {
  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b bg-slate-50">
          <h2 className="text-xl font-bold text-dark font-heading">Strategic Claim Protocols</h2>
          <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto text-sm">
          <p className="text-base text-slate-700">
            Successfully navigating a high-value renters insurance claim requires a meticulous and proactive approach, combining detailed documentation with strategic communication. Below is the operational protocol for <strong className="text-slate-900">Scenario 1: Theft of Personal Property from Residence</strong>. Your goal is to present a comprehensive and undeniable claim package that preempts adjuster skepticism and facilitates a fair and prompt payout.
          </p>

          <SectionTitle>Required Documentation and Inventory</SectionTitle>
          <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
          <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
            <li><strong className="text-slate-900">Prompt Notice of Loss:</strong> Prompt Notice of Loss to the insurer or agent.</li>
            <li><strong className="text-slate-900">Official Police Report:</strong> Official Police Report detailing the break-in and list of stolen items.</li>
            <li><strong className="text-slate-900">Detailed Inventory of Stolen Property:</strong> Listing quantity, description, actual cash value, and amount of loss for each item. Must be supported by bills, receipts, photographs, credit card statements, or appraisals.</li>
            <li><strong className="text-slate-900">Sworn Proof of Loss:</strong> A signed, sworn statement submitted within 60 days of request, detailing the time and cause of loss, the insured's interest in the property, any other insurance, and the inventory.</li>
            <li><strong className="text-slate-900">Replacement Receipts/Invoices:</strong> Documentation showing completion of replacement and costs incurred for items replaced at replacement cost.</li>
          </ul>

          <SectionTitle>Necessary Proof</SectionTitle>
          <SubHeading>Establish the required evidence boundaries:</SubHeading>
          <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
            <li><strong className="text-slate-900">Proof of Theft Incident:</strong> The official police report serves as primary proof.</li>
            <li><strong className="text-slate-900">Proof of Ownership and Value:</strong> Original purchase receipts, credit card statements, photographs showing the items in the home, gift receipts, or professional appraisals (especially for high-value items like jewelry, to substantiate value up to special limits).</li>
            <li><strong className="text-slate-900">Proof of Replacement:</strong> Receipts or invoices for replacement items for replacement cost claims.</li>
          </ul>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-base text-slate-700">
                Below is the operational protocol for <strong className="text-slate-900">Scenario 2: Water Damage due to Sewer or Drain Backup with Loss of Use</strong>.
            </p>

            <SectionTitle>Required Documentation and Inventory</SectionTitle>
            <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Prompt Notice of Loss:</strong> Prompt Notice of Loss to the insurer or agent.</li>
                <li><strong className="text-slate-900">Plumber's/Building Maintenance Report:</strong> Documentation confirming the sewer or drain backup as the cause of loss.</li>
                <li><strong className="text-slate-900">Photographic/Video Evidence:</strong> Documentation of the water damage to the apartment's structure and personal property.</li>
                <li><strong className="text-slate-900">Detailed Inventory of Damaged Personal Property:</strong> Listing quantity, description, actual cash value, and amount of loss. Supported by bills, receipts, or other evidence.</li>
                <li><strong className="text-slate-900">Sworn Proof of Loss:</strong> Detailing time/cause of loss, interest, other insurance, inventory, and additional living expenses.</li>
                <li><strong className="text-slate-900">Cleaning/Repair Estimates and Invoices:</strong> For mitigation, cleaning, and repair of damaged property and the residence.</li>
                <li><strong className="text-slate-900">Additional Living Expense Records:</strong> Receipts for temporary housing, meals, and other increased costs while displaced.</li>
            </ul>

            <SectionTitle>Necessary Proof</SectionTitle>
            <SubHeading>Establish the required evidence boundaries:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Proof of Cause of Loss:</strong> Report from a qualified professional (e.g., plumber) confirming the sewer/drain backup.</li>
                <li><strong className="text-slate-900">Proof of Damage:</strong> Comprehensive photos/videos of damaged areas and items.</li>
                <li><strong className="text-slate-900">Proof of Ownership and Value:</strong> Receipts, appraisals, or other documentation for damaged personal property.</li>
                <li><strong className="text-slate-900">Proof of Displacement and Expenses:</strong> Lease agreement, temporary accommodation receipts, utility bills, and other financial records demonstrating increased living costs.</li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-base text-slate-700">
                Below is the operational protocol for <strong className="text-slate-900">Scenario 3: Identity Fraud Expenses</strong>.
            </p>

            <SectionTitle>Required Documentation and Inventory</SectionTitle>
            <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Prompt Notice of Loss:</strong> Prompt Notice of Loss to the insurer or agent.</li>
                <li><strong className="text-slate-900">Police Report/Identity Theft Report:</strong> Official reports filed with law enforcement or a recognized identity theft reporting agency (e.g., Federal Trade Commission).</li>
                <li><strong className="text-slate-900">Fraudulent Account Statements/Credit Reports:</strong> Documentation showing the impact of the identity fraud (e.g., new accounts, unauthorized transactions, credit report inaccuracies).</li>
                <li>
                    <strong className="text-slate-900">Records of Expenses Incurred:</strong> Receipts, bills, invoices, and detailed logs for all claimed expenses, including:
                    <ul className="list-circle ml-5 mt-1 space-y-1">
                        <li>Notarized affidavits.</li>
                        <li>Certified mail receipts.</li>
                        <li>Employer's statement for lost wages due to time taken off work.</li>
                        <li>Loan application fee receipts.</li>
                        <li>Invoices from attorneys detailing services rendered for covered actions.</li>
                        <li>Phone bills itemizing long-distance calls related to resolving the fraud.</li>
                    </ul>
                </li>
                <li><strong className="text-slate-900">Sworn Proof of Loss:</strong> Detailing the time and cause of the identity fraud and the specific "expenses" incurred.</li>
            </ul>

            <SectionTitle>Necessary Proof</SectionTitle>
            <SubHeading>Establish the required evidence boundaries:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Proof of Identity Fraud:</strong> Official reports from law enforcement or fraud protection agencies, along with evidence of unauthorized financial activity.</li>
                <li><strong className="text-slate-900">Proof of Expenses:</strong> Original receipts, detailed invoices, bank statements, or other verifiable financial records for each category of covered "expenses."</li>
                <li><strong className="text-slate-900">Proof of Lost Income:</strong> Official letter from employer confirming lost work hours and corresponding wages.</li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-base text-slate-700">
                Below is the operational protocol for <strong className="text-slate-900">Scenario 4: Fire Damage to Personal Property and Loss of Use</strong>.
            </p>

            <SectionTitle>Required Documentation and Inventory</SectionTitle>
            <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Prompt Notice of Loss:</strong> Prompt Notice of Loss to the insurer or agent.</li>
                <li><strong className="text-slate-900">Fire Department Report:</strong> Official report detailing the fire's origin, extent of damage, and the fire department's response.</li>
                <li><strong className="text-slate-900">Photos/Videos of Damage:</strong> Visual evidence of fire and smoke damage to the apartment and personal property.</li>
                <li><strong className="text-slate-900">Detailed Inventory of Damaged Personal Property:</strong> Listing quantity, description, actual cash value, and amount of loss, supported by receipts, bills, photographs, or appraisals.</li>
                <li><strong className="text-slate-900">Sworn Proof of Loss:</strong> Detailing time/cause of loss, interest, other insurance, inventory, and additional living expenses.</li>
                <li><strong className="text-slate-900">Repair/Cleaning Estimates and Invoices:</strong> For mitigation, professional cleaning, and repair/replacement of damaged personal property and parts of the residence.</li>
                <li><strong className="text-slate-900">Additional Living Expense Records:</strong> Receipts for temporary housing, meals, and other increased costs incurred during displacement.</li>
                <li><strong className="text-slate-900">Fire Department Service Bill:</strong> If applicable, invoice for fire department charges.</li>
            </ul>

            <SectionTitle>Necessary Proof</SectionTitle>
            <SubHeading>Establish the required evidence boundaries:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Proof of Fire Event:</strong> Official fire department report.</li>
                <li><strong className="text-slate-900">Proof of Damage:</strong> Photos, videos, and professional damage assessments.</li>
                <li><strong className="text-slate-900">Proof of Ownership and Value:</strong> Receipts, appraisals, or other documentation for damaged personal property.</li>
                <li><strong className="text-slate-900">Proof of Displacement and ALE:</strong> Lease agreement, temporary housing receipts, utility bills, food receipts, and any other documentation showing increased living costs.</li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-base text-slate-700">
                Below is the operational protocol for <strong className="text-slate-900">Scenario 5: Personal Liability for Guest Injury</strong>.
            </p>

            <SectionTitle>Required Documentation and Inventory</SectionTitle>
            <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Prompt Written Notice of Accident/Claim:</strong> To the insurer or agent, detailing policy identity, insured names, time, place, and circumstances of the accident, and names/addresses of claimants and witnesses.</li>
                <li><strong className="text-slate-900">Medical Reports and Bills:</strong> Comprehensive documentation of the guest's injuries, treatment, and medical expenses. The injured person or their representative must provide written proof of claim and authorize the insurer to obtain medical records.</li>
                <li><strong className="text-slate-900">Legal Documents:</strong> Any summons, complaints, or other legal processes received by the insureds must be promptly forwarded to the insurer.</li>
                <li><strong className="text-slate-900">Witness Statements:</strong> If available, statements from individuals who witnessed the incident.</li>
                <li><strong className="text-slate-900">Photos of Accident Scene:</strong> If available, photos of the floor/spill condition where the guest fell.</li>
            </ul>

            <SectionTitle>Necessary Proof</SectionTitle>
            <SubHeading>Establish the required evidence boundaries:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Proof of "Occurrence" and Injury:</strong> Medical records confirming the bodily injury and its relation to the accident.</li>
                <li><strong className="text-slate-900">Proof of Medical Expenses:</strong> Itemized medical bills, hospital records, and treatment plans.</li>
                <li><strong className="text-slate-900">Proof of Alleged Negligence (for Liability):</strong> Evidence presented by the claimant to support the allegation of negligence.</li>
                <li><strong className="text-slate-900">Proof of Damages:</strong> Documentation of medical expenses, lost wages, and other claimed damages.</li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-base text-slate-700">
                Below is the operational protocol for <strong className="text-slate-900">Scenario 6: Flood Damage to Personal Property and Loss of Use</strong>.
            </p>

            <SectionTitle>Required Documentation and Inventory</SectionTitle>
            <SubHeading>Ensure the following are acquired and compiled:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Prompt Notice of Loss:</strong> Prompt Notice of Loss to the insurer or agent.</li>
                <li><strong className="text-slate-900">Official Flood Reports:</strong> Confirmation from local authorities or weather services of a flood event in the area, aligning with the "Flood" definition in the endorsement.</li>
                <li><strong className="text-slate-900">Photographic/Video Evidence:</strong> Documentation of floodwaters entering the apartment and the extent of damage to personal property and the residence premises.</li>
                <li><strong className="text-slate-900">Detailed Inventory of Damaged Personal Property:</strong> Listing quantity, description, actual cash value, and amount of loss, supported by receipts, bills, or other evidence.</li>
                <li><strong className="text-slate-900">Sworn Proof of Loss:</strong> Detailing time/cause of loss, interest, other insurance, inventory, and additional living expenses.</li>
                <li><strong className="text-slate-900">Cleaning/Repair Estimates and Invoices:</strong> For water extraction, drying, cleaning, and repair/replacement of damaged property.</li>
                <li><strong className="text-slate-900">Additional Living Expense Records:</strong> Receipts for temporary housing, food, and other increased costs incurred during displacement, up to the $1,000 limit for flood-related Loss of Use.</li>
            </ul>

            <SectionTitle>Necessary Proof</SectionTitle>
            <SubHeading>Establish the required evidence boundaries:</SubHeading>
            <ul className="list-disc ml-5 space-y-2 mt-2 text-slate-700">
                <li><strong className="text-slate-900">Proof of Flood Event:</strong> Official documentation (e.g., weather reports, emergency declarations) confirming a "Flood" as defined by RFN0011E-0219.</li>
                <li><strong className="text-slate-900">Proof of Damage:</strong> Comprehensive photos/videos of damaged areas and items clearly showing floodwater impact.</li>
                <li><strong className="text-slate-900">Proof of Ownership and Value:</strong> Receipts, appraisals, or other documentation for damaged personal property.</li>
                <li><strong className="text-slate-900">Proof of Displacement and Expenses:</strong> Documentation of temporary living arrangements and increased costs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimStrategyGuide;
