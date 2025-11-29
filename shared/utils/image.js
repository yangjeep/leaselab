// Image utility functions for R2 storage and Cloudflare Image Resizing
import { generateId } from './index';
/**
 * Generate R2 key with site_id prefix
 * Format: {siteId}/{entityType}/{entityId}/{timestamp}-{uniqueId}.{ext}
 * Example: default/property/prop_123/1732550400-img_abc123.jpg
 */
export function generateR2Key(siteId, entityType, entityId, filename) {
    const timestamp = Date.now();
    const uniqueId = generateId('img');
    const ext = filename.split('.').pop() || 'bin';
    return `${siteId}/${entityType}/${entityId}/${timestamp}-${uniqueId}.${ext}`;
}
/**
 * Standard image size presets
 */
export const ImageSizePresets = {
    thumbnail: {
        width: 200,
        height: 200,
        fit: 'cover',
        quality: 80,
    },
    card: {
        width: 400,
        height: 300,
        fit: 'cover',
        quality: 85,
    },
    medium: {
        width: 800,
        height: 600,
        fit: 'scale-down',
        quality: 85,
    },
    hero: {
        width: 1920,
        height: 1080,
        fit: 'cover',
        quality: 90,
    },
    full: {
        width: 2560,
        quality: 90,
        fit: 'scale-down',
    },
};
/**
 * Generate Cloudflare Image Resizing URL
 * @param baseUrl - Base URL for images (e.g., 'https://files.leaselab.io')
 * @param imagePath - Path to the image (R2 key)
 * @param options - Resizing options
 * @returns Cloudflare Image Resizing URL
 */
export function generateImageResizingUrl(baseUrl, imagePath, options = {}) {
    // Build option string
    const optionParts = [];
    if (options.width)
        optionParts.push(`width=${options.width}`);
    if (options.height)
        optionParts.push(`height=${options.height}`);
    if (options.quality)
        optionParts.push(`quality=${options.quality}`);
    if (options.fit)
        optionParts.push(`fit=${options.fit}`);
    if (options.format)
        optionParts.push(`format=${options.format}`);
    if (options.gravity)
        optionParts.push(`gravity=${options.gravity}`);
    if (options.blur)
        optionParts.push(`blur=${options.blur}`);
    if (options.sharpen)
        optionParts.push(`sharpen=${options.sharpen}`);
    // Remove leading slash from image path if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    // If no options, return direct URL
    if (optionParts.length === 0) {
        return `${baseUrl}/${cleanPath}`;
    }
    // Build Cloudflare Image Resizing URL
    const optionString = optionParts.join(',');
    return `${baseUrl}/cdn-cgi/image/${optionString}/${cleanPath}`;
}
/**
 * Generate responsive srcset for an image
 * @param baseUrl - Base URL for images
 * @param imagePath - Path to the image (R2 key)
 * @param widths - Array of widths to generate (default: [320, 640, 1024, 1920])
 * @param options - Additional resizing options
 * @returns srcset string
 */
export function generateImageSrcSet(baseUrl, imagePath, widths = [320, 640, 1024, 1920], options = {}) {
    return widths
        .map((width) => {
        const url = generateImageResizingUrl(baseUrl, imagePath, {
            ...options,
            width,
        });
        return `${url} ${width}w`;
    })
        .join(', ');
}
/**
 * Get optimal image format based on user agent (browser support)
 * @param userAgent - User agent string
 * @returns Optimal format or 'auto'
 */
export function getOptimalImageFormat(userAgent) {
    if (!userAgent)
        return 'auto';
    // Check for AVIF support (Chrome 85+, Edge 121+, Firefox 93+)
    if (/Chrome\/([8-9]\d|1\d{2,})/.test(userAgent) ||
        /Edg\/1([2-9]\d|[1-9]\d{2,})/.test(userAgent) ||
        /Firefox\/(9[3-9]|[1-9]\d{2,})/.test(userAgent)) {
        return 'avif';
    }
    // Check for WebP support (Chrome 23+, Firefox 65+, Safari 14+, Edge 18+)
    if (/Chrome\/([2-9]\d|1\d{2,})/.test(userAgent) ||
        /Firefox\/(6[5-9]|[7-9]\d|[1-9]\d{2,})/.test(userAgent) ||
        /Safari\/6([0-9]{2}|[1-9]\d{2,})/.test(userAgent) ||
        /Edg\//.test(userAgent)) {
        return 'webp';
    }
    return 'auto';
}
/**
 * Extract dimensions from an image file
 * Note: This is a browser-only function
 */
export function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        // @ts-ignore - Image and URL.createObjectURL are browser APIs, not available in Workers
        const img = new Image();
        // @ts-ignore
        const url = URL.createObjectURL(file);
        img.onload = () => {
            // @ts-ignore
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
        };
        img.onerror = () => {
            // @ts-ignore
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}
/**
 * Calculate aspect ratio preserving dimensions
 */
export function calculateAspectRatioDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
    const aspectRatio = originalWidth / originalHeight;
    if (targetWidth && targetHeight) {
        // Both specified, return as-is
        return { width: targetWidth, height: targetHeight };
    }
    if (targetWidth) {
        // Only width specified
        return {
            width: targetWidth,
            height: Math.round(targetWidth / aspectRatio),
        };
    }
    if (targetHeight) {
        // Only height specified
        return {
            width: Math.round(targetHeight * aspectRatio),
            height: targetHeight,
        };
    }
    // Neither specified, return original
    return { width: originalWidth, height: originalHeight };
}
export async function validateImageFile(file, options = {}) {
    const errors = [];
    const { maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], minWidth, minHeight, maxWidth, maxHeight, } = options;
    // Check file type
    if (!allowedTypes.includes(file.type)) {
        errors.push(`Invalid file type. Allowed types: ${allowedTypes.map((t) => t.replace('image/', '')).join(', ')}`);
    }
    // Check file size
    if (file.size > maxSizeBytes) {
        const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        errors.push(`File size exceeds ${maxMB}MB`);
    }
    // Check dimensions (browser only)
    // @ts-ignore - window is not available in Workers
    if (typeof window !== 'undefined' && (minWidth || minHeight || maxWidth || maxHeight)) {
        try {
            const dimensions = await getImageDimensions(file);
            if (minWidth && dimensions.width < minWidth) {
                errors.push(`Image width must be at least ${minWidth}px`);
            }
            if (minHeight && dimensions.height < minHeight) {
                errors.push(`Image height must be at least ${minHeight}px`);
            }
            if (maxWidth && dimensions.width > maxWidth) {
                errors.push(`Image width must not exceed ${maxWidth}px`);
            }
            if (maxHeight && dimensions.height > maxHeight) {
                errors.push(`Image height must not exceed ${maxHeight}px`);
            }
        }
        catch (error) {
            errors.push('Failed to read image dimensions');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
