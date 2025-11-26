/**
 * Generate R2 key with site_id prefix
 * Format: {siteId}/{entityType}/{entityId}/{timestamp}-{uniqueId}.{ext}
 * Example: default/property/prop_123/1732550400-img_abc123.jpg
 */
export declare function generateR2Key(siteId: string, entityType: 'property' | 'unit', entityId: string, filename: string): string;
/**
 * Image resizing options for Cloudflare Image Resizing API
 */
export interface ImageResizingOptions {
    /** Target width in pixels */
    width?: number;
    /** Target height in pixels */
    height?: number;
    /** Image quality (1-100, default 85) */
    quality?: number;
    /** Fit mode: how the image should fit the dimensions */
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
    /** Output format */
    format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
    /** Gravity for cropping (crop and cover modes) */
    gravity?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center';
    /** Enable blur effect (1-250) */
    blur?: number;
    /** Sharpen amount (0-10) */
    sharpen?: number;
}
/**
 * Standard image size presets
 */
export declare const ImageSizePresets: {
    readonly thumbnail: {
        readonly width: 200;
        readonly height: 200;
        readonly fit: "cover";
        readonly quality: 80;
    };
    readonly card: {
        readonly width: 400;
        readonly height: 300;
        readonly fit: "cover";
        readonly quality: 85;
    };
    readonly medium: {
        readonly width: 800;
        readonly height: 600;
        readonly fit: "scale-down";
        readonly quality: 85;
    };
    readonly hero: {
        readonly width: 1920;
        readonly height: 1080;
        readonly fit: "cover";
        readonly quality: 90;
    };
    readonly full: {
        readonly width: 2560;
        readonly quality: 90;
        readonly fit: "scale-down";
    };
};
/**
 * Generate Cloudflare Image Resizing URL
 * @param baseUrl - Base URL for images (e.g., 'https://files.leaselab.io')
 * @param imagePath - Path to the image (R2 key)
 * @param options - Resizing options
 * @returns Cloudflare Image Resizing URL
 */
export declare function generateImageResizingUrl(baseUrl: string, imagePath: string, options?: ImageResizingOptions): string;
/**
 * Generate responsive srcset for an image
 * @param baseUrl - Base URL for images
 * @param imagePath - Path to the image (R2 key)
 * @param widths - Array of widths to generate (default: [320, 640, 1024, 1920])
 * @param options - Additional resizing options
 * @returns srcset string
 */
export declare function generateImageSrcSet(baseUrl: string, imagePath: string, widths?: number[], options?: Omit<ImageResizingOptions, 'width'>): string;
/**
 * Get optimal image format based on user agent (browser support)
 * @param userAgent - User agent string
 * @returns Optimal format or 'auto'
 */
export declare function getOptimalImageFormat(userAgent?: string): 'auto' | 'webp' | 'avif';
/**
 * Extract dimensions from an image file
 * Note: This is a browser-only function
 */
export declare function getImageDimensions(file: File): Promise<{
    width: number;
    height: number;
}>;
/**
 * Calculate aspect ratio preserving dimensions
 */
export declare function calculateAspectRatioDimensions(originalWidth: number, originalHeight: number, targetWidth?: number, targetHeight?: number): {
    width: number;
    height: number;
};
/**
 * Validate image file
 */
export interface ImageValidationOptions {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
}
export interface ImageValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateImageFile(file: File, options?: ImageValidationOptions): Promise<ImageValidationResult>;
//# sourceMappingURL=image.d.ts.map