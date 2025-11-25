import { useMemo, useState } from 'react';
import type { PropertyImage } from '@leaselab/shared-types';
import {
    generateImageResizingUrl,
    generateImageSrcSet,
    ImageSizePresets,
    type ImageResizingOptions,
} from '@leaselab/shared-utils';

interface PropertyImageProps {
    image: PropertyImage | { r2Key: string; url?: string; filename?: string; altText?: string };
    size?: keyof typeof ImageSizePresets | 'custom';
    width?: number;
    height?: number;
    quality?: number;
    fit?: ImageResizingOptions['fit'];
    className?: string;
    alt?: string;
    lazy?: boolean;
    publicUrl?: string;
    priority?: boolean; // For above-the-fold images
    blurPlaceholder?: boolean;
}

/**
 * PropertyImage component for public site with advanced optimizations
 * 
 * Features:
 * - Automatic WebP/AVIF format detection
 * - Responsive srcSet generation
 * - Lazy loading with blur placeholder
 * - SEO-friendly alt text
 * 
 * Usage:
 * - Hero image: <PropertyImage image={img} size="hero" priority={true} />
 * - Card image: <PropertyImage image={img} size="card" />
 * - Custom size: <PropertyImage image={img} width={600} height={400} />
 */
export function PropertyImage({
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
    priority = false,
    blurPlaceholder = false,
}: PropertyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const imageUrl = useMemo(() => {
        // If image has a direct URL property, use it
        if ('url' in image && image.url) {
            return image.url;
        }

        // Get resizing options
        let options: ImageResizingOptions = {
            format: 'auto', // Let Cloudflare choose WebP/AVIF based on browser support
        };

        if (size && size !== 'custom') {
            // Use preset
            options = { ...ImageSizePresets[size], ...options };
        } else if (width || height) {
            // Use custom dimensions
            options = {
                ...options,
                width,
                height,
                quality: quality || 85,
                fit: fit || 'cover',
            };
        }

        // If we have a public URL, use Cloudflare resizing
        if (publicUrl) {
            return generateImageResizingUrl(publicUrl, image.r2Key, options);
        }

        // Fallback to direct R2 key (assumes public bucket or separate API)
        return `/${image.r2Key}`;
    }, [image, size, width, height, quality, fit, publicUrl]);

    const srcSet = useMemo(() => {
        // Only generate srcSet if we have a public URL
        if (!publicUrl) return undefined;

        const preset = size && size !== 'custom' ? ImageSizePresets[size] : undefined;
        const baseWidth = width || preset?.width;

        if (!baseWidth) return undefined;

        // Generate srcSet for responsive images (1x, 2x, 3x)
        const widths = [baseWidth, baseWidth * 2, baseWidth * 3];

        return generateImageSrcSet(
            publicUrl,
            image.r2Key,
            widths,
            {
                height: height || preset?.height,
                quality: quality || preset?.quality || 85,
                fit: fit || preset?.fit || 'cover',
                format: 'auto',
            }
        );
    }, [image.r2Key, size, width, height, quality, fit, publicUrl]);

    const placeholderUrl = useMemo(() => {
        if (!blurPlaceholder || !publicUrl) return undefined;

        // Generate a tiny, heavily blurred version for placeholder
        return generateImageResizingUrl(publicUrl, image.r2Key, {
            width: 20,
            quality: 50,
            blur: 20,
            format: 'auto',
        });
    }, [blurPlaceholder, publicUrl, image.r2Key]);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setHasError(true);
    };

    const altText = alt ||
        ('altText' in image ? image.altText : undefined) ||
        ('filename' in image ? image.filename : undefined) ||
        'Property image';

    if (hasError) {
        return (
            <div
                className={`bg-gray-200 flex items-center justify-center ${className}`}
                style={{ width: width || '100%', height: height || '100%' }}
            >
                <span className="text-gray-400 text-sm">Image unavailable</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Blur placeholder */}
            {blurPlaceholder && placeholderUrl && !isLoaded && (
                <img
                    src={placeholderUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
                    aria-hidden="true"
                />
            )}

            {/* Main image */}
            <img
                src={imageUrl}
                srcSet={srcSet}
                alt={altText}
                className={`
          w-full h-full object-cover transition-opacity duration-300
          ${blurPlaceholder && !isLoaded ? 'opacity-0' : 'opacity-100'}
        `}
                loading={priority ? 'eager' : lazy ? 'lazy' : 'eager'}
                decoding={priority ? 'sync' : 'async'}
                onLoad={handleLoad}
                onError={handleError}
                width={width || (size && size !== 'custom' ? ImageSizePresets[size].width : undefined)}
                height={height || (size && size !== 'custom' ? ImageSizePresets[size].height : undefined)}
            />
        </div>
    );
}

interface PropertyImageGalleryProps {
    images: (PropertyImage | { r2Key: string; url?: string; filename?: string; altText?: string })[];
    size?: keyof typeof ImageSizePresets;
    publicUrl?: string;
    className?: string;
}

/**
 * Simple image gallery for property listings
 */
export function PropertyImageGallery({
    images,
    size = 'card',
    publicUrl,
    className = '',
}: PropertyImageGalleryProps) {
    if (images.length === 0) {
        return (
            <div className={`bg-gray-200 rounded-lg flex items-center justify-center ${className}`}>
                <span className="text-gray-400">No images</span>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
            {images.map((image, index) => (
                <PropertyImage
                    key={'id' in image ? image.id : `image-${index}`}
                    image={image}
                    size={size}
                    publicUrl={publicUrl}
                    priority={index === 0} // First image is priority
                    blurPlaceholder={true}
                    className="aspect-square rounded-lg overflow-hidden"
                />
            ))}
        </div>
    );
}
