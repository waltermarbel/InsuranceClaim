import React from 'react';

interface InferenceCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  children: React.ReactNode;
}

const InferenceCard: React.FC<InferenceCardProps> = ({ title, icon, color, children }) => {
    const colorClasses = {
        primary: 'border-primary/50 text-primary',
        success: 'border-success/50 text-success',
        warning: 'border-warning/50 text-warning',
        danger: 'border-danger/50 text-danger',
        medium: 'border-medium/50 text-medium',
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm border ${colorClasses[color]}`}>
            <div className="p-4 border-b border-inherit">
                <h3 className="font-bold font-heading flex items-center gap-2">
                    <span className="h-6 w-6">{icon}</span>
                    {title}
                </h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

export default InferenceCard;
