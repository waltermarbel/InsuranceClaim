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
          <h2 className="text-xl font-bold text-dark font-heading">A Strategic Guide to Filing a High-Value Burglary Claim</h2>
          <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto text-sm">
          <p className="text-base text-medium">
            Successfully navigating a high-value renters insurance claim requires a meticulous and proactive approach, combining detailed documentation with strategic communication. For a $70,000 theft claim in NYC under a GEICO policy underwritten by Assurant, your goal is to present a comprehensive and undeniable claim package that preempts adjuster skepticism and facilitates a fair and prompt payout.
          </p>

          <SectionTitle>1. Documenting Your Loss: Create a "Forensic" Inventory</SectionTitle>
          <p className="font-semibold">Objective: Establish Replacement Cost Value (RCV) for all stolen items.</p>
          <SubHeading>Key Information to Collect for Each Item:</SubHeading>
          <ul>
            <ListItem><strong className="text-dark">Item & Description:</strong> Detailed identification of the stolen item.</ListItem>
            <ListItem><strong className="text-dark">Brand & Model Number:</strong> Specific manufacturer and model.</ListItem>
            <ListItem><strong className="text-dark">Date of Purchase (Approximate):</strong> The approximate date the item was acquired.</ListItem>
            <ListItem><strong className="text-dark">Original Cost (Estimated):</strong> The estimated initial cost of the item.</ListItem>
            <ListItem><strong className="text-dark">Replacement Cost (RCV):</strong> The current retail price of a comparable replacement.</ListItem>
            <ListItem><strong className="text-dark">Link to Replacement:</strong> Direct links to current retail listings for replacement items.</ListItem>
          </ul>
          <SubHeading>Supporting Evidence:</SubHeading>
          <ul>
            <ListItem>Photos/Videos: Visual evidence of the item in your apartment.</ListItem>
            <ListItem>Credit Card or Bank Statements: Records of purchases from major retailers.</ListItem>
            <ListItem>Owner’s Manuals or Product Packaging: Documentation proving ownership and specifications.</ListItem>
            <ListItem>Gift Letters: Signed statements from the giver including description, date, and value of the gift.</ListItem>
          </ul>

          <SectionTitle>2. Housing Displacement: Activating Additional Living Expenses (ALE)</SectionTitle>
          <p><strong className="text-dark">Trigger:</strong> The burglary renders your apartment uninhabitable (e.g., broken lock, structural compromise).</p>
          <SubHeading>Strategy:</SubHeading>
          <p><strong className="text-dark">Temporary Lodging with a Friend:</strong> If staying with a friend, do not fabricate a lease. Instead, use "Fair Rental Value" as justification.</p>
          <CodeBlock>
            <strong>Template Statement:</strong> "I have secured temporary lodging with a friend. The fair market rental value of my apartment is $[amount]/day. I request ALE benefits based on that amount."
          </CodeBlock>
          <SubHeading>Supporting Documentation:</SubHeading>
           <ul>
            <ListItem>Attach screenshots from Zillow/StreetEasy showing comparable units in your area.</ListItem>
            <ListItem>Have your friend write a non-invoice letter confirming dates and use of space.</ListItem>
           </ul>
          <SubHeading>Other Eligible ALE Expenses:</SubHeading>
          <ul>
            <ListItem>Increased Food Costs: Due to kitchen inaccessibility (e.g., takeout).</ListItem>
            <ListItem>Transportation: Uber, MTA, fuel, mileage.</ListItem>
            <ListItem>Emergency Items: Toiletries, laundry, locks, groceries, phone charges.</ListItem>
          </ul>

          <SectionTitle>3. Critical Limits: Understanding Your Policy’s Sub-Limits</SectionTitle>
          <p>Be aware of the following typical sub-limits, which cap your reimbursement regardless of the total claim amount:</p>
          <div className="my-2 border rounded-md overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-dark">
                    <tr><th className="p-2 font-semibold">Item Category</th><th className="p-2 font-semibold">Typical Theft Sub-Limit</th></tr>
                </thead>
                <tbody className="divide-y text-medium">
                    <tr className="bg-white"><td className="p-2">Jewelry/Watches/Furs</td><td className="p-2">$1,000 – $1,500 total</td></tr>
                    <tr className="bg-white"><td className="p-2">Cash/Bank Notes</td><td className="p-2">$200</td></tr>
                    <tr className="bg-white"><td className="p-2">Firearms</td><td className="p-2">$2,500</td></tr>
                    <tr className="bg-white"><td className="p-2">Business Property</td><td className="p-2">$2,500</td></tr>
                </tbody>
            </table>
          </div>

          <SectionTitle>4. Submission Strategy: Act Like a Project Manager</SectionTitle>
          <SubHeading>How to Submit:</SubHeading>
           <ul>
            <ListItem>Submit all documentation simultaneously.</ListItem>
            <ListItem>Consolidate into a single PDF with bookmarks or labeled sections.</ListItem>
            <ListItem>Include: Inventory spreadsheet, police report, photos, gift letters, housing displacement details, and expense receipts.</ListItem>
           </ul>
          <SubHeading>Avoid Phone Traps:</SubHeading>
           <ul>
            <ListItem>Decline recorded statements until all documentation has been submitted.</ListItem>
            <ListItem>Use email for all critical communications to create a written record.</ListItem>
           </ul>
           <SubHeading>Reference NY Law:</SubHeading>
           <ul>
            <ListItem><strong>15 business days:</strong> Deadline for a decision once full documentation is submitted.</ListItem>
            <ListItem><strong>5 business days:</strong> Payout deadline after an agreement is reached.</ListItem>
           </ul>
        </div>
      </div>
    </div>
  );
};

export default ClaimStrategyGuide;
