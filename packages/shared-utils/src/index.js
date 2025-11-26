// Utility functions for Rental Management Platform
// Date Helpers
export function formatDate(date, format = 'short') {
    const d = typeof date === 'string' ? new Date(date) : date;
    switch (format) {
        case 'iso':
            return d.toISOString().split('T')[0];
        case 'long':
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        case 'short':
        default:
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
    }
}
export function parseDate(dateStr) {
    return new Date(dateStr);
}
export function calculateAge(birthDate) {
    const today = new Date();
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}
export function daysBetween(startDate, endDate) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
export function addDays(date, days) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
export function isDateInPast(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
}
export function isDateInFuture(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d > new Date();
}
// Income/Rent Ratio Calculator
export function calculateIncomeToRentRatio(monthlyIncome, monthlyRent) {
    if (monthlyRent === 0)
        return Infinity;
    return monthlyIncome / monthlyRent;
}
export function meetsIncomeRequirement(monthlyIncome, monthlyRent, requiredRatio = 3) {
    return calculateIncomeToRentRatio(monthlyIncome, monthlyRent) >= requiredRatio;
}
export function getIncomeRatioLabel(ratio) {
    if (ratio >= 4)
        return 'Excellent';
    if (ratio >= 3)
        return 'Good';
    if (ratio >= 2.5)
        return 'Fair';
    if (ratio >= 2)
        return 'Below Standard';
    return 'Poor';
}
// Money Formatting
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}
export function formatCompactCurrency(amount) {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
}
export function parseCurrency(value) {
    return parseFloat(value.replace(/[^0-9.-]+/g, ''));
}
export async function generateR2SignedUrl(options) {
    const { bucket, key, expiresIn = 3600, accountId } = options;
    // This is a placeholder - actual implementation would use AWS SDK v3
    // or Cloudflare's R2 API to generate presigned URLs
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${bucket}/${key}`;
    // In production, this would generate an actual presigned URL
    // For now, return the base URL with expiry parameter
    return `${url}?X-Amz-Expires=${expiresIn}`;
}
export function getR2KeyFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1); // Remove leading slash
}
// String Helpers
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
export function titleCase(text) {
    return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
export function truncate(text, maxLength, suffix = '...') {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
}
// Phone Formatting
export function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
}
export function normalizePhoneNumber(phone) {
    return phone.replace(/\D/g, '');
}
// ID Generation
export function generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    const id = `${timestamp}${random}`;
    return prefix ? `${prefix}_${id}` : id;
}
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
// Validation Helpers
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}
export function isValidZipCode(zipCode) {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
}
// Array Helpers
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}
export function sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal)
            return order === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return order === 'asc' ? 1 : -1;
        return 0;
    });
}
export function unique(array) {
    return [...new Set(array)];
}
// Object Helpers
export function pick(obj, keys) {
    const result = {};
    keys.forEach((key) => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}
export function omit(obj, keys) {
    const result = { ...obj };
    keys.forEach((key) => {
        delete result[key];
    });
    return result;
}
// Error Helpers
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
export function isAppError(error) {
    return error instanceof AppError;
}
// Async Helpers
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function retry(fn, options = {}) {
    const { retries = 3, delay = 1000 } = options;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === retries - 1)
                throw error;
            await sleep(delay * Math.pow(2, i));
        }
    }
    throw new Error('Retry failed');
}
// Export image utilities
export * from './image';
