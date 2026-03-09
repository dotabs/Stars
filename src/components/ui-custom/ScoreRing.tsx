interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreRing({ score, size = 'md' }: ScoreRingProps) {
  const percentage = (score / 10) * 100;
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-lg'
  };

  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
  const radius = size === 'sm' ? 16 : size === 'md' ? 24 : 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 9) return '#f59e0b'; // amber
    if (score >= 8) return '#ef4444'; // red
    if (score >= 7) return '#10b981'; // emerald
    if (score >= 6) return '#eab308'; // yellow
    return '#64748b'; // slate
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <span className="font-bold text-foreground">{score.toFixed(1)}</span>
    </div>
  );
}
