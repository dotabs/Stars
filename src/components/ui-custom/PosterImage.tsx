import { useEffect, useState } from 'react';
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
  const [currentSrc, setCurrentSrc] = useState(() =>
    resolvePosterUrl(src, title, { width, height }),
  );

  useEffect(() => {
    setCurrentSrc(resolvePosterUrl(src, title, { width, height }));
  }, [src, title, width, height]);

  return (
    <img
      src={currentSrc}
      alt={title}
      className={className}
      loading={loading}
      onError={() => setCurrentSrc(getPosterFallback(title, { width, height }))}
    />
  );
}