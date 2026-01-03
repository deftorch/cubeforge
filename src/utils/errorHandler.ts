/**
 * Error handling utilities for CubeForge
 */

export interface AppError {
    code: string;
    message: string;
    details?: unknown;
    timestamp: Date;
}

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error codes for CubeForge
 */
export const ErrorCodes = {
    // Scene errors
    SCENE_LOAD_FAILED: 'SCENE_LOAD_FAILED',
    SCENE_SAVE_FAILED: 'SCENE_SAVE_FAILED',
    SCENE_CORRUPT: 'SCENE_CORRUPT',

    // Cube errors
    CUBE_NOT_FOUND: 'CUBE_NOT_FOUND',
    CUBE_CREATE_FAILED: 'CUBE_CREATE_FAILED',
    CUBE_INVALID_DATA: 'CUBE_INVALID_DATA',

    // 3D errors
    WEBGL_NOT_SUPPORTED: 'WEBGL_NOT_SUPPORTED',
    RENDERER_INIT_FAILED: 'RENDERER_INIT_FAILED',
    MESH_CREATE_FAILED: 'MESH_CREATE_FAILED',

    // File errors
    FILE_READ_FAILED: 'FILE_READ_FAILED',
    FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
    FILE_INVALID_FORMAT: 'FILE_INVALID_FORMAT',

    // General
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Error handler class
 */
class ErrorHandler {
    private errors: AppError[] = [];
    private listeners: ((error: AppError) => void)[] = [];
    private maxErrors = 100;

    /**
     * Log an error
     */
    log(code: string, message: string, details?: unknown): AppError {
        const error: AppError = {
            code,
            message,
            details,
            timestamp: new Date(),
        };

        // Store error
        this.errors.push(error);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Console log for development
        console.error(`[${code}] ${message}`, details);

        // Notify listeners
        this.listeners.forEach(listener => {
            try {
                listener(error);
            } catch (e) {
                console.error('Error in error listener:', e);
            }
        });

        return error;
    }

    /**
     * Handle error with severity
     */
    handle(error: unknown, severity: ErrorSeverity = 'error'): AppError {
        let code = ErrorCodes.UNKNOWN_ERROR;
        let message = 'An unknown error occurred';
        let details = error;

        if (error instanceof Error) {
            message = error.message;
            details = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        } else if (typeof error === 'string') {
            message = error;
        }

        // Log based on severity
        switch (severity) {
            case 'info':
                console.info(`[INFO] ${message}`);
                break;
            case 'warning':
                console.warn(`[WARNING] ${message}`);
                break;
            case 'critical':
                console.error(`[CRITICAL] ${message}`, details);
                break;
            default:
                console.error(`[ERROR] ${message}`, details);
        }

        return this.log(code, message, details);
    }

    /**
     * Subscribe to errors
     */
    subscribe(listener: (error: AppError) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Get recent errors
     */
    getRecentErrors(count: number = 10): AppError[] {
        return this.errors.slice(-count);
    }

    /**
     * Clear errors
     */
    clearErrors(): void {
        this.errors = [];
    }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Try-catch wrapper with error logging
 */
export function tryCatch<T>(
    fn: () => T,
    errorCode: string = ErrorCodes.UNKNOWN_ERROR,
    fallback?: T
): T | undefined {
    try {
        return fn();
    } catch (error) {
        errorHandler.log(errorCode, error instanceof Error ? error.message : String(error), error);
        return fallback;
    }
}

/**
 * Async try-catch wrapper
 */
export async function tryCatchAsync<T>(
    fn: () => Promise<T>,
    errorCode: string = ErrorCodes.UNKNOWN_ERROR,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (error) {
        errorHandler.log(errorCode, error instanceof Error ? error.message : String(error), error);
        return fallback;
    }
}

/**
 * Assert condition and throw if false
 */
export function assert(condition: boolean, message: string, code: string = ErrorCodes.UNKNOWN_ERROR): asserts condition {
    if (!condition) {
        const error = new Error(message);
        errorHandler.log(code, message, error);
        throw error;
    }
}

/**
 * Check WebGL support
 */
export function checkWebGLSupport(): { supported: boolean; version: number; error?: string } {
    try {
        const canvas = document.createElement('canvas');

        // Try WebGL 2 first
        let gl = canvas.getContext('webgl2');
        if (gl) {
            return { supported: true, version: 2 };
        }

        // Fall back to WebGL 1
        gl = canvas.getContext('webgl') as WebGL2RenderingContext | null;
        if (gl) {
            return { supported: true, version: 1 };
        }

        return {
            supported: false,
            version: 0,
            error: 'WebGL is not supported in this browser'
        };
    } catch (error) {
        return {
            supported: false,
            version: 0,
            error: error instanceof Error ? error.message : 'Unknown WebGL error'
        };
    }
}

/**
 * Validate cube data
 */
export function validateCubeData(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('Cube data must be an object');
        return { valid: false, errors };
    }

    const cube = data as Record<string, unknown>;

    if (typeof cube.id !== 'string' || !cube.id) {
        errors.push('Cube must have a valid id');
    }

    if (typeof cube.name !== 'string') {
        errors.push('Cube must have a name');
    }

    if (!cube.transform || typeof cube.transform !== 'object') {
        errors.push('Cube must have a transform');
    }

    if (!cube.material || typeof cube.material !== 'object') {
        errors.push('Cube must have a material');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate scene file data
 */
export function validateSceneFile(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('Scene file must be an object');
        return { valid: false, errors };
    }

    const scene = data as Record<string, unknown>;

    if (!scene.version) {
        errors.push('Scene file must have a version');
    }

    if (!Array.isArray(scene.cubes)) {
        errors.push('Scene file must have a cubes array');
    }

    return { valid: errors.length === 0, errors };
}
