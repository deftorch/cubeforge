/**
 * InputLogger - Unified logging utility for the Input System
 * 
 * Provides structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Component tagging
 * - Performance timing
 * - Error tracking
 * 
 * @example
 * ```typescript
 * const logger = InputLogger.create('TransformOperator');
 * logger.debug('Axis constraint set', { axis: 'X' });
 * logger.error('Failed to apply transform', error);
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    component: string;
    message: string;
    data?: unknown;
    error?: Error;
}

export interface InputLoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    maxHistory: number;
    consoleOutput: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class InputLoggerCore {
    private config: InputLoggerConfig = {
        enabled: true,
        minLevel: 'warn',
        maxHistory: 100,
        consoleOutput: true,
    };

    private history: LogEntry[] = [];
    private listeners: Set<(entry: LogEntry) => void> = new Set();

    /**
     * Configure the logger
     */
    configure(config: Partial<InputLoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Enable debug mode (shows all logs)
     */
    enableDebugMode(): void {
        this.config.minLevel = 'debug';
        this.config.consoleOutput = true;
        console.log('[InputLogger] Debug mode enabled');
    }

    /**
     * Disable debug mode (only warnings and errors)
     */
    disableDebugMode(): void {
        this.config.minLevel = 'warn';
    }

    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled(): boolean {
        return this.config.minLevel === 'debug';
    }

    /**
     * Log a message
     */
    log(level: LogLevel, component: string, message: string, data?: unknown): void {
        if (!this.config.enabled) return;

        const levelPriority = LOG_LEVEL_PRIORITY[level];
        const minPriority = LOG_LEVEL_PRIORITY[this.config.minLevel];

        if (levelPriority < minPriority) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            component,
            message,
            data,
        };

        // Add to history
        this.history.push(entry);
        if (this.history.length > this.config.maxHistory) {
            this.history.shift();
        }

        // Console output
        if (this.config.consoleOutput) {
            this.outputToConsole(entry);
        }

        // Notify listeners
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (e) {
                console.error('[InputLogger] Listener error:', e);
            }
        }
    }

    /**
     * Log an error with stack trace
     */
    logError(component: string, message: string, error: Error, data?: unknown): void {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level: 'error',
            component,
            message,
            data,
            error,
        };

        this.history.push(entry);
        if (this.history.length > this.config.maxHistory) {
            this.history.shift();
        }

        if (this.config.consoleOutput) {
            console.error(
                `[${component}] ${message}`,
                data ? data : '',
                '\n',
                error
            );
        }

        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (e) {
                console.error('[InputLogger] Listener error:', e);
            }
        }
    }

    /**
     * Output log entry to console
     */
    private outputToConsole(entry: LogEntry): void {
        const prefix = `[${entry.component}]`;
        const args = entry.data !== undefined ? [prefix, entry.message, entry.data] : [prefix, entry.message];

        switch (entry.level) {
            case 'debug':
                console.debug(...args);
                break;
            case 'info':
                console.info(...args);
                break;
            case 'warn':
                console.warn(...args);
                break;
            case 'error':
                console.error(...args);
                break;
        }
    }

    /**
     * Get log history
     */
    getHistory(filter?: { level?: LogLevel; component?: string }): LogEntry[] {
        if (!filter) return [...this.history];

        return this.history.filter(entry => {
            if (filter.level && entry.level !== filter.level) return false;
            if (filter.component && entry.component !== filter.component) return false;
            return true;
        });
    }

    /**
     * Clear log history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Add a listener for log events
     */
    addListener(listener: (entry: LogEntry) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Create a component-specific logger
     */
    createLogger(component: string): ComponentLogger {
        return new ComponentLogger(this, component);
    }

    /**
     * Start performance timing
     */
    startTimer(label: string): () => number {
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.log('debug', 'Performance', `${label} took ${duration.toFixed(2)}ms`);
            return duration;
        };
    }
}

/**
 * Component-specific logger with bound component name
 */
export class ComponentLogger {
    constructor(
        private core: InputLoggerCore,
        private component: string
    ) { }

    debug(message: string, data?: unknown): void {
        this.core.log('debug', this.component, message, data);
    }

    info(message: string, data?: unknown): void {
        this.core.log('info', this.component, message, data);
    }

    warn(message: string, data?: unknown): void {
        this.core.log('warn', this.component, message, data);
    }

    error(message: string, error?: Error | unknown, data?: unknown): void {
        if (error instanceof Error) {
            this.core.logError(this.component, message, error, data);
        } else {
            this.core.log('error', this.component, message, { error, ...data as object });
        }
    }

    /**
     * Start a performance timer
     */
    time(label: string): () => number {
        return this.core.startTimer(`${this.component}:${label}`);
    }

    /**
     * Wrap a function with error handling and logging
     */
    wrapWithErrorHandling<T extends (...args: unknown[]) => unknown>(
        fn: T,
        errorMessage: string
    ): T {
        return ((...args: unknown[]) => {
            try {
                return fn(...args);
            } catch (error) {
                this.error(errorMessage, error as Error, { args });
                return undefined;
            }
        }) as T;
    }
}

// Singleton instance
const inputLoggerCore = new InputLoggerCore();

/**
 * Global InputLogger access
 */
export const InputLogger = {
    /**
     * Create a component-specific logger
     */
    create(component: string): ComponentLogger {
        return inputLoggerCore.createLogger(component);
    },

    /**
     * Configure the logger
     */
    configure(config: Partial<InputLoggerConfig>): void {
        inputLoggerCore.configure(config);
    },

    /**
     * Enable debug mode
     */
    enableDebug(): void {
        inputLoggerCore.enableDebugMode();
    },

    /**
     * Disable debug mode
     */
    disableDebug(): void {
        inputLoggerCore.disableDebugMode();
    },

    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled(): boolean {
        return inputLoggerCore.isDebugEnabled();
    },

    /**
     * Get log history
     */
    getHistory(filter?: { level?: LogLevel; component?: string }): LogEntry[] {
        return inputLoggerCore.getHistory(filter);
    },

    /**
     * Clear log history
     */
    clearHistory(): void {
        inputLoggerCore.clearHistory();
    },

    /**
     * Add a listener for log events
     */
    addListener(listener: (entry: LogEntry) => void): () => void {
        return inputLoggerCore.addListener(listener);
    },

    /**
     * Start a performance timer
     */
    time(label: string): () => number {
        return inputLoggerCore.startTimer(label);
    },
};

// Make available globally in dev mode for debugging
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    (window as unknown as { InputLogger: typeof InputLogger }).InputLogger = InputLogger;
}

export default InputLogger;
