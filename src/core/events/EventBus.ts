import type { EventName, EventPayload } from './types';

type EventCallback<T extends EventName> = (payload: EventPayload<T>) => void;

interface EventListener {
    callback: EventCallback<any>;
    once: boolean;
}

/**
 * EventBus - Centralized event system for decoupled communication
 * 
 * Usage:
 * ```typescript
 * // Subscribe to an event
 * eventBus.on('cube:created', ({ cube }) => {
 *   console.log('Cube created:', cube.id);
 * });
 * 
 * // Emit an event
 * eventBus.emit('cube:created', { cube });
 * 
 * // Subscribe once
 * eventBus.once('cube:deleted', ({ cubeIds }) => {
 *   console.log('Cubes deleted:', cubeIds);
 * });
 * 
 * // Unsubscribe
 * const unsubscribe = eventBus.on('cube:updated', handler);
 * unsubscribe();
 * ```
 */
import type { IEventBus } from '@/core/interfaces';

/**
 * EventBus - Centralized event system for decoupled communication
 * ...
 */
export class EventBus implements IEventBus {
    private listeners: Map<EventName, EventListener[]> = new Map();

    /**
     * Subscribe to an event
     * @returns Unsubscribe function
     */
    on<T extends EventName>(
        event: T,
        callback: EventCallback<T>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener: EventListener = { callback, once: false };
        this.listeners.get(event)!.push(listener);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event (fires only once)
     */
    once<T extends EventName>(
        event: T,
        callback: EventCallback<T>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener: EventListener = { callback, once: true };
        this.listeners.get(event)!.push(listener);

        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     */
    off<T extends EventName>(
        event: T,
        callback: EventCallback<T>
    ): void {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;

        const index = eventListeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            eventListeners.splice(index, 1);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<T extends EventName>(
        event: T,
        payload: EventPayload<T>
    ): void {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;

        // Create a copy to avoid issues if listeners modify the array
        const listenersToCall = [...eventListeners];

        for (const listener of listenersToCall) {
            try {
                listener.callback(payload);
            } catch (error) {
                console.error(`Error in event listener for "${event}":`, error);
            }

            // Remove one-time listeners
            if (listener.once) {
                this.off(event, listener.callback);
            }
        }
    }

    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event?: EventName): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get listener count for debugging
     */
    listenerCount(event: EventName): number {
        return this.listeners.get(event)?.length ?? 0;
    }
}

// Singleton instance for global event bus
export const eventBus = new EventBus();
