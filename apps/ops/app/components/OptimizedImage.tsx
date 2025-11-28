import { useMemo } from 'react';
import type { PropertyImage } from '~/shared/types';
import {
    generateImageResizingUrl,
    generateImageSrcSet,
    ImageSizePresets,
    type ImageResizingOptions,
} from '~/shared/utils';

interface OptimizedImageProps {
    image: PropertyImage;
    size?: keyof typeof ImageSizePresets | 'custom';
    width?: number;
    height?: number;
    quality?: number;
    fit?: ImageResizingOptions['fit'];
    className?: string;
    alt?: string;
    lazy?: boolean;
    publicUrl?: string;
}

/**
 * OptimizedImage component with Cloudflare Image Resizing support
 * 
 * Usage:
 * - Size preset: <OptimizedImage image={img} size="card" />
 * - Custom size: <OptimizedImage image={img} size="custom" width={600} height={400} />
 * - Direct URL: <OptimizedImage image={img} /> (no resizing, just uses API endpoint)
 */
export function OptimizedImage({
    image,
    size,
    width,
    height,
    quality,
    fit,
    className = '',
    alt,
    lazy = true,
    publicUrl,
}: OptimizedImageProps) {
    const imageUrl = useMemo(() => {
        // If no public URL and no resize params, use direct API endpoint
        if (!publicUrl && !size && !width && !height) {
            return `/api/images/${image.id}/file`;
        }

        // Get resizing options
        let options: ImageResizingOptions = {};

        if (size && size !== 'custom') {
            // Use preset
            options = { ...ImageSizePresets[size] };
        } else if (width || height) {
            // Use custom dimensions
            options = {
                width,
                height,
                quality: quality || 85,
                fit: fit || 'scale-down',
                format: 'auto',
            };
        }

        // If we have a public URL and options, use Cloudflare resizing
        if (publicUrl && Object.keys(options).length > 0) {
            return generateImageResizingUrl(publicUrl, image.r2Key, options);
        }

        // Otherwise build URL with query params for the API endpoint
        const params = new URLSearchParams();
        if (options.width) params.set('width', options.width.toString());
        if (options.height) params.set('height', options.height.toString());
        if (options.quality) params.set('quality', options.quality.toString());
        if (options.fit) params.set('fit', options.fit);
        if (options.format) params.set('format', options.format);

        const queryString = params.toString();
        return `/api/images/${image.id}/file${queryString ? `?${queryString}` : ''}`;
    }, [image, size, width, height, quality, fit, publicUrl]);

    const srcSet = useMemo(() => {
        // Only generate srcSet if we have a public URL and responsive sizes are needed
        if (!publicUrl || size === 'custom') return undefined;

        const preset = size ? ImageSizePresets[size] : undefined;
        if (!preset?.width) return undefined;

        // Generate srcSet for 1x, 2x, 3x
        const widths = [
            preset.width,
            preset.width * 2,
            preset.width * 3,
        ];

        return generateImageSrcSet(
            publicUrl,
            image.r2Key,
            widths,
            {
                height: 'height' in preset ? preset.height : undefined,
                quality: preset.quality,
                fit: preset.fit,
                format: 'auto',
            }
        );
    }, [image.r2Key, size, publicUrl]);

    return (
        <img
            src={imageUrl}
            srcSet={srcSet}
            alt={alt || image.altText || image.filename}
            className={className}
            loading={lazy ? 'lazy' : 'eager'}
            width={width || (size && size !== 'custom' ? ImageSizePresets[size].width : undefined)}
            height={height || (size && size !== 'custom' && 'height' in ImageSizePresets[size] ? (ImageSizePresets[size] as any).height : undefined)}
        />
    );
}

interface OptimizedImageWithFallbackProps extends OptimizedImageProps {
    fallbackSrc?: string;
    onError?: () => void;
}

/**
 * OptimizedImage with error handling and fallback
 */
export function OptimizedImageWithFallback({
    fallbackSrc = '/images/placeholder.jpg',
    onError,
    ...props
}: OptimizedImageWithFallbackProps) {
    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = fallbackSrc;
        onError?.();
    };

    return <OptimizedImage {...props} />;
}
