import { useState } from 'react';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';

interface PosterImageProps {
  src?: string;
  title: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
}

export function PosterImage({
  src,
  title,
  className,
  width,
  height,
  loading,
}: PosterImageProps) {
  const resolvedSrc = resolvePosterUrl(src, title, { width, height });
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const currentSrc =
    failedSrc === resolvedSrc ? getPosterFallback(title, { width, height }) : resolvedSrc;

  return (
    <img
      src={currentSrc}
      alt={title}
      className={className}
      loading={loading}
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );
}
