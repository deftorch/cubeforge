import { EventBus } from './EventBus';
import type { EventName, EventPayload } from './types';

/**
 * Debug-enabled EventBus that logs all events
 * Use this in development to trace event flow and detect issues
 */
export class DebugEventBus extends EventBus {
    private eventHistory: Array<{
        timestamp: number;
        event: EventName;
        payload: unknown;
    }> = [];

    private maxHistory = 100;
    private enabled = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;

    /**
     * Emit event with logging and validation
     */
    emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
        if (this.enabled) {
            this.logEvent(event, payload);
            this.recordHistory(event, payload);
        }

        super.emit(event, payload);
    }

    /**
     * Log event to console with styling
     */
    private logEvent<T extends EventName>(event: T, payload: EventPayload<T>): void {
        const domain = event.split(':')[0];
        const colors: Record<string, string> = {
            cube: '#4a9eff',
            selection: '#ffaa00',
            viewport: '#00cc66',
            transform: '#ff6699',
            tool: '#9966ff',
            history: '#666666',
        };

        const color = colors[domain] || '#888888';

        console.log(
            `%c[EVENT]%c ${event}`,
            `background: ${color}; color: white; padding: 2px 6px; border-radius: 3px;`,
            'color: inherit; font-weight: bold;',
            payload
        );
    }

    /**
     * Record event to history for debugging
     */
    private recordHistory<T extends EventName>(event: T, payload: EventPayload<T>): void {
        this.eventHistory.push({
            timestamp: Date.now(),
            event,
            payload,
        });

        // Trim history
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history for debugging
     */
    getHistory(): ReadonlyArray<{ timestamp: number; event: EventName; payload: unknown }> {
        return [...this.eventHistory];
    }

    /**
     * Clear event history
     */
    clearHistory(): void {
        this.eventHistory = [];
    }

    /**
     * Filter history by event type
     */
    getHistoryByEvent(eventName: EventName): Array<{ timestamp: number; payload: unknown }> {
        return this.eventHistory
            .filter(h => h.event === eventName)
            .map(({ timestamp, payload }) => ({ timestamp, payload }));
    }

    /**
     * Get recent events (last N)
     */
    getRecentEvents(count = 10): ReadonlyArray<{ timestamp: number; event: EventName; payload: unknown }> {
        return this.eventHistory.slice(-count);
    }

    /**
     * Enable/disable debug logging
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if debug logging is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Print formatted history to console
     */
    printHistory(): void {
        console.group('EventBus History');
        this.eventHistory.forEach((h, i) => {
            const time = new Date(h.timestamp).toISOString().slice(11, 23);
            console.log(`${i + 1}. [${time}] ${h.event}`, h.payload);
        });
        console.groupEnd();
    }
}

/**
 * Create debug event bus instance
 * In development, this replaces the standard eventBus
 */
export function createDebugEventBus(): DebugEventBus {
    const debugBus = new DebugEventBus();

    // Expose to window for debugging in dev tools
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && typeof window !== 'undefined') {
        (window as unknown as { __eventBus: DebugEventBus }).__eventBus = debugBus;
        console.log('%c[DEBUG] EventBus available as window.__eventBus', 'color: #888;');
    }

    return debugBus;
}
