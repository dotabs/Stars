import type { Verdict } from '@/types';
import { getVerdictColor } from '@/data/movies';

interface VerdictBadgeProps {
  verdict: Verdict;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function VerdictBadge({ verdict, score, size = 'md', showScore = true }: VerdictBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  const scoreSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full font-medium border ${getVerdictColor(verdict)} ${sizeClasses[size]}`}>
        {verdict}
      </span>
      {showScore && score !== undefined && (
        <span className={`font-semibold text-foreground ${scoreSizeClasses[size]}`}>
          {score.toFixed(1)}/10
        </span>
      )}
    </div>
  );
}
