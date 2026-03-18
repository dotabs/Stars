import { memo, useState } from 'react';
import { getPosterFallback, resolvePosterUrl } from '@/lib/posters';
export const PosterImage = memo(function PosterImage({ src, title, className, width, height, loading, sizes, fetchPriority, }) {
    const resolvedSrc = resolvePosterUrl(src, title, { width, height });
    const fallbackSrc = getPosterFallback(title, { width, height });
    const [failedSrc, setFailedSrc] = useState(null);
    const currentSrc = failedSrc === resolvedSrc ? fallbackSrc : resolvedSrc;
    const imageLoading = loading ?? (fetchPriority === 'high' ? 'eager' : 'lazy');
    return (<img src={currentSrc} alt={title} className={className} style={{
            backgroundColor: '#120d0b',
            backgroundImage: `url("${fallbackSrc}")`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
        }} loading={imageLoading} decoding="async" width={width} height={height} sizes={sizes} fetchPriority={fetchPriority} draggable={false} onError={() => setFailedSrc(resolvedSrc)}/>);
});
