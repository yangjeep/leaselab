export declare function formatDate(date: string | Date, format?: 'short' | 'long' | 'iso'): string;
export declare function parseDate(dateStr: string): Date;
export declare function calculateAge(birthDate: string | Date): number;
export declare function daysBetween(startDate: string | Date, endDate: string | Date): number;
export declare function addDays(date: string | Date, days: number): Date;
export declare function isDateInPast(date: string | Date): boolean;
export declare function isDateInFuture(date: string | Date): boolean;
export declare function calculateIncomeToRentRatio(monthlyIncome: number, monthlyRent: number): number;
export declare function meetsIncomeRequirement(monthlyIncome: number, monthlyRent: number, requiredRatio?: number): boolean;
export declare function getIncomeRatioLabel(ratio: number): string;
export declare function formatCurrency(amount: number, currency?: string, locale?: string): string;
export declare function formatCompactCurrency(amount: number): string;
export declare function parseCurrency(value: string): number;
export interface R2SignedUrlOptions {
    bucket: string;
    key: string;
    expiresIn?: number;
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
}
export declare function generateR2SignedUrl(options: R2SignedUrlOptions): Promise<string>;
export declare function getR2KeyFromUrl(url: string): string;
export declare function slugify(text: string): string;
export declare function capitalize(text: string): string;
export declare function titleCase(text: string): string;
export declare function truncate(text: string, maxLength: number, suffix?: string): string;
export declare function formatPhoneNumber(phone: string): string;
export declare function normalizePhoneNumber(phone: string): string;
export declare function generateId(prefix?: string): string;
export declare function generateUUID(): string;
export declare function isValidEmail(email: string): boolean;
export declare function isValidPhone(phone: string): boolean;
export declare function isValidZipCode(zipCode: string): boolean;
export declare function groupBy<T>(array: T[], key: keyof T): Record<string, T[]>;
export declare function sortBy<T>(array: T[], key: keyof T, order?: 'asc' | 'desc'): T[];
export declare function unique<T>(array: T[]): T[];
export declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare function isAppError(error: unknown): error is AppError;
export declare function sleep(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, options?: {
    retries?: number;
    delay?: number;
}): Promise<T>;
export * from './image';
//# sourceMappingURL=index.d.ts.map