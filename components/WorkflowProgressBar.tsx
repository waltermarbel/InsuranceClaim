import React from 'react';
import { CheckIcon } from './icons';

interface WorkflowProgressBarProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
            {stepIdx < currentStep ? (
              // Completed step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary group">
                  <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  <span className="sr-only">{step}</span>
                </div>
              </>
            ) : stepIdx === currentStep ? (
              // Current step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                  <span className="sr-only">{step}</span>
                </div>
              </>
            ) : (
              // Upcoming step
              <>
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-slate-200" />
                </div>
                <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white hover:border-slate-400">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-slate-300"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{step}</span>
                </div>
              </>
            )}
             <div className="absolute top-10 w-max text-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                <p className={`text-xs font-semibold ${stepIdx <= currentStep ? 'text-primary' : 'text-medium'}`}>
                  {step}
                </p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};
