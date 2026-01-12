import type { IInputHandler, InputHandlerResult } from '@/core/interfaces';
import { isEventConsumed } from '@/core/interfaces';
import type { InputContextManager } from './InputContextManager';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * InputDispatcher - Central event router for the Input System
 * 
 * Maintains a priority-sorted list of handlers and routes events to them.
 * Events are processed by handlers in priority order (highest first).
 * When a handler returns `true`, the event is considered consumed and 
 * propagation stops.
 * 
 * Modal handlers can block all lower-priority handlers when active.
 * 
 * @example
 * ```typescript
 * const dispatcher = new InputDispatcher();
 * 
 * // Register handlers
 * dispatcher.register(boxSelectTool);
 * dispatcher.register(orbitControlsHandler);
 * 
 * // Route events
 * canvas.addEventListener('mousedown', (e) => dispatcher.dispatchMouseDown(e));
 * ```
 */
export class InputDispatcher {
    private handlers: IInputHandler[] = [];
    private activeModal: IInputHandler | null = null;
    private contextManager: InputContextManager | null = null;
    private useContexts = false;
    private logger: ComponentLogger = InputLogger.create('InputDispatcher');

    /**
     * Set the InputContextManager for context-aware event routing
     * When set and enabled, handlers are resolved from active contexts
     */
    setContextManager(manager: InputContextManager, enable = true): void {
        this.contextManager = manager;
        this.useContexts = enable;
    }

    /**
     * Enable or disable context-based handler resolution
     */
    setUseContexts(enabled: boolean): void {
        this.useContexts = enabled && this.contextManager !== null;
    }

    /**
     * Get whether context-based routing is active
     */
    isUsingContexts(): boolean {
        return this.useContexts && this.contextManager !== null;
    }

    /**
     * Register a handler with the dispatcher
     * Handlers are automatically sorted by priority (highest first)
     */
    register(handler: IInputHandler): void {
        // Prevent duplicate registration
        if (this.handlers.some(h => h.id === handler.id)) {
            this.logger.warn('Handler already registered', { handlerId: handler.id });
            return;
        }

        this.handlers.push(handler);
        this.sortHandlers();

        handler.onRegister?.();

        this.logger.debug('Handler registered', {
            handlerId: handler.id,
            priority: handler.priority
        });
    }

    /**
     * Unregister a handler from the dispatcher
     */
    unregister(handler: IInputHandler): void {
        const index = this.handlers.findIndex(h => h.id === handler.id);
        if (index === -1) {
            this.logger.warn('Handler not registered', { handlerId: handler.id });
            return;
        }

        this.handlers.splice(index, 1);

        // Clear modal if it was the unregistered handler
        if (this.activeModal?.id === handler.id) {
            this.activeModal = null;
        }

        handler.onUnregister?.();

        this.logger.debug('Handler unregistered', { handlerId: handler.id });
    }

    /**
     * Sort handlers by priority (highest first)
     */
    private sortHandlers(): void {
        this.handlers.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Set the active modal handler
     * When a modal is active, only it and higher-priority handlers receive events
     */
    setModalHandler(handler: IInputHandler | null): void {
        const prevModal = this.activeModal;
        this.activeModal = handler;

        if (prevModal !== handler) {
            if (handler) {
                this.logger.info(`Modal activated: ${handler.id}`, { priority: handler.priority });
            } else {
                this.logger.info(`Modal deactivated (was: ${prevModal?.id})`);
            }
        }
    }

    /**
     * Get the currently active modal handler
     */
    getActiveModal(): IInputHandler | null {
        return this.activeModal;
    }

    /**
     * Get a handler by its ID
     */
    getHandlerById(id: string): IInputHandler | undefined {
        return this.handlers.find(h => h.id === id);
    }

    /**
     * Get all registered handlers (sorted by priority)
     */
    getAllHandlers(): IInputHandler[] {
        return [...this.handlers];
    }

    /**
     * Check if a handler should receive events
     */
    private shouldReceiveEvent(handler: IInputHandler): boolean {
        // Handler must be enabled
        if (!handler.enabled) return false;

        // If no modal is active, all enabled handlers receive events
        if (!this.activeModal) return true;

        // If modal is active, only modal and higher-priority handlers receive events
        return handler.priority >= this.activeModal.priority;
    }

    // ============================================
    // DISPATCH METHODS
    // ============================================

    /**
     * Dispatch a mouse down event to handlers
     * @returns true if event was consumed
     */
    dispatchMouseDown(event: MouseEvent): boolean {
        return this.dispatchGeneric('onMouseDown', event);
    }

    /**
     * Dispatch a mouse move event to handlers
     * @returns true if event was consumed
     */
    dispatchMouseMove(event: MouseEvent): boolean {
        return this.dispatchGeneric('onMouseMove', event);
    }

    /**
     * Dispatch a mouse up event to handlers
     * @returns true if event was consumed
     */
    dispatchMouseUp(event: MouseEvent): boolean {
        return this.dispatchGeneric('onMouseUp', event);
    }

    /**
     * Dispatch a click event to handlers
     * @returns true if event was consumed
     */
    dispatchClick(event: MouseEvent): boolean {
        return this.dispatchGeneric('onClick', event);
    }

    /**
     * Dispatch a double click event to handlers
     * @returns true if event was consumed
     */
    dispatchDoubleClick(event: MouseEvent): boolean {
        return this.dispatchGeneric('onDoubleClick', event);
    }

    /**
     * Dispatch a wheel event to handlers
     * @returns true if event was consumed
     */
    dispatchWheel(event: WheelEvent): boolean {
        return this.dispatchGeneric('onWheel', event);
    }

    /**
     * Dispatch a context menu event to handlers
     * @returns true if event was consumed
     */
    dispatchContextMenu(event: MouseEvent): boolean {
        return this.dispatchGeneric('onContextMenu', event);
    }

    /**
     * Dispatch a key down event to handlers
     * @returns true if event was consumed
     */
    dispatchKeyDown(event: KeyboardEvent): boolean {
        return this.dispatchGeneric('onKeyDown', event);
    }

    /**
     * Dispatch a key up event to handlers
     * @returns true if event was consumed
     */
    dispatchKeyUp(event: KeyboardEvent): boolean {
        return this.dispatchGeneric('onKeyUp', event);
    }

    /**
     * Dispatch a drag enter event to handlers
     * @returns true if event was consumed
     */
    dispatchDragEnter(event: DragEvent): boolean {
        return this.dispatchGeneric('onDragEnter', event);
    }

    /**
     * Dispatch a drag over event to handlers
     * @returns true if event was consumed
     */
    dispatchDragOver(event: DragEvent): boolean {
        return this.dispatchGeneric('onDragOver', event);
    }

    /**
     * Dispatch a drag leave event to handlers
     * @returns true if event was consumed
     */
    dispatchDragLeave(event: DragEvent): boolean {
        return this.dispatchGeneric('onDragLeave', event);
    }

    /**
     * Dispatch a drop event to handlers
     * @returns true if event was consumed
     */
    dispatchDrop(event: DragEvent): boolean {
        return this.dispatchGeneric('onDrop', event);
    }

    /**
     * Generic dispatch method for any event type
     * Supports both boolean (legacy) and InputEventResult return values
     */
    private dispatchGeneric<K extends keyof IInputHandler>(
        methodName: K,
        event: Event
    ): boolean {
        // Get handlers - either from context manager or direct registration
        const handlersToProcess = this.getActiveHandlerList();

        for (const handler of handlersToProcess) {
            if (!this.shouldReceiveEvent(handler)) {
                // Optional: Log why handler was skipped (verbose debug only)
                // this.logger.debug('Skipping handler', { handlerId: handler.id, reason: 'blocked' });
                continue;
            }

            const method = handler[methodName];
            if (typeof method !== 'function') continue;

            try {
                // @ts-expect-error - We know the method signature is correct
                const result = method.call(handler, event) as InputHandlerResult;

                // Use isEventConsumed to check both boolean and InputEventResult
                if (result !== undefined && isEventConsumed(result)) {
                    this.logger.info(`Event consumed by ${handler.id}`, {
                        method: methodName,
                        eventType: event.type
                    });
                    return true;
                }
            } catch (error) {
                this.logger.error(`Handler error in ${methodName}`, error as Error, {
                    handlerId: handler.id
                });
            }
        }

        return false;
    }

    /**
     * Get the list of handlers to process
     * Uses context manager if enabled, otherwise uses direct registration
     */
    private getActiveHandlerList(): IInputHandler[] {
        if (this.useContexts && this.contextManager) {
            return this.contextManager.getActiveHandlers();
        }
        return this.handlers;
    }

    /**
     * Dispose all handlers and clear the dispatcher
     */
    dispose(): void {
        for (const handler of this.handlers) {
            handler.dispose?.();
        }
        this.handlers = [];
        this.activeModal = null;
    }
}

// Singleton instance
let inputDispatcherInstance: InputDispatcher | null = null;

export function getInputDispatcher(): InputDispatcher {
    if (!inputDispatcherInstance) {
        inputDispatcherInstance = new InputDispatcher();
    }
    return inputDispatcherInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetInputDispatcher(): void {
    inputDispatcherInstance?.dispose();
    inputDispatcherInstance = null;
}
