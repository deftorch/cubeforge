import type { IInputHandler } from '@/core/interfaces';

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
    private debugMode = false;

    /**
     * Enable debug logging for event flow
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Register a handler with the dispatcher
     * Handlers are automatically sorted by priority (highest first)
     */
    register(handler: IInputHandler): void {
        // Prevent duplicate registration
        if (this.handlers.some(h => h.id === handler.id)) {
            console.warn(`InputDispatcher: Handler "${handler.id}" is already registered`);
            return;
        }

        this.handlers.push(handler);
        this.sortHandlers();

        handler.onRegister?.();

        if (this.debugMode) {
            console.log(`InputDispatcher: Registered "${handler.id}" (priority: ${handler.priority})`);
        }
    }

    /**
     * Unregister a handler from the dispatcher
     */
    unregister(handler: IInputHandler): void {
        const index = this.handlers.findIndex(h => h.id === handler.id);
        if (index === -1) {
            console.warn(`InputDispatcher: Handler "${handler.id}" is not registered`);
            return;
        }

        this.handlers.splice(index, 1);

        // Clear modal if it was the unregistered handler
        if (this.activeModal?.id === handler.id) {
            this.activeModal = null;
        }

        handler.onUnregister?.();

        if (this.debugMode) {
            console.log(`InputDispatcher: Unregistered "${handler.id}"`);
        }
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
        this.activeModal = handler;

        if (this.debugMode && handler) {
            console.log(`InputDispatcher: Modal activated - "${handler.id}"`);
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
     */
    private dispatchGeneric<K extends keyof IInputHandler>(
        methodName: K,
        event: Event
    ): boolean {
        for (const handler of this.handlers) {
            if (!this.shouldReceiveEvent(handler)) continue;

            const method = handler[methodName];
            if (typeof method !== 'function') continue;

            try {
                // @ts-expect-error - We know the method signature is correct
                const consumed = method.call(handler, event);

                if (consumed) {
                    if (this.debugMode) {
                        console.log(
                            `InputDispatcher: "${handler.id}" consumed ${methodName}`
                        );
                    }
                    return true;
                }
            } catch (error) {
                console.error(
                    `InputDispatcher: Error in "${handler.id}.${methodName}":`,
                    error
                );
            }
        }

        return false;
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
