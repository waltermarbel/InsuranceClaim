import React from 'react';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'lg';
}

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({ score, size = 'lg' }) => {
  const sizeConfig = {
    sm: {
      sqSize: 32,
      strokeWidth: 4,
      textSize: 'text-[10px]',
    },
    lg: {
      sqSize: 64,
      strokeWidth: 8,
      textSize: 'text-xl',
    }
  };
  
  const { sqSize, strokeWidth, textSize } = sizeConfig[size];
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-success';
  if (score < 40) {
    colorClass = 'text-danger';
  } else if (score < 75) {
    colorClass = 'text-amber-500'; // Using amber for a gold/yellow feel
  }

  return (
    <div className="relative" style={{ width: sqSize, height: sqSize }}>
      <svg
        width={sqSize}
        height={sqSize}
        viewBox={viewBox}
        className="transform -rotate-90"
      >
        <circle
          className="text-slate-200"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          className={`${colorClass} transition-all duration-500`}
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
          stroke="currentColor"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-dark ${textSize}`}>
        {score}
      </div>
    </div>
  );
};
