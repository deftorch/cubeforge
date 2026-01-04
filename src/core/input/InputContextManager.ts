import type { IInputHandler, IInputContext, IContextualHandler } from '@/core/interfaces';
import { InputContextId } from '@/core/interfaces';

/**
 * InputContextManager - Manages input contexts (Action Maps)
 * 
 * Provides Unity-style Action Maps for grouping handlers by application state.
 * Contexts can be enabled/disabled to switch between different input modes.
 * 
 * @example
 * ```typescript
 * const manager = new InputContextManager();
 * 
 * // Register a handler for object mode
 * manager.registerHandler(myHandler, 'object-mode');
 * 
 * // Switch to edit mode
 * manager.disableContext('object-mode');
 * manager.enableContext('edit-mode');
 * ```
 */
export class InputContextManager {
    private contexts: Map<string, IInputContext> = new Map();
    private contextHandlers: Map<string, IInputHandler[]> = new Map();
    private activeExclusiveContext: string | null = null;

    constructor() {
        // Create default contexts
        this.createDefaultContexts();
    }

    /**
     * Create the default contexts for CubeForge
     */
    private createDefaultContexts(): void {
        // Global context - always enabled
        this.createContext({
            id: InputContextId.GLOBAL,
            name: 'Global',
            enabled: true,
            priority: 0,
            exclusive: false,
        });

        // Object Mode - default mode
        this.createContext({
            id: InputContextId.OBJECT_MODE,
            name: 'Object Mode',
            enabled: true,
            priority: 10,
            exclusive: true,
        });

        // Edit Mode - for editing cube geometry
        this.createContext({
            id: InputContextId.EDIT_MODE,
            name: 'Edit Mode',
            enabled: false,
            priority: 10,
            exclusive: true,
        });

        // Tool Active - when a selection tool is being used
        this.createContext({
            id: InputContextId.TOOL_ACTIVE,
            name: 'Tool Active',
            enabled: false,
            priority: 20,
            exclusive: false,
        });

        // Modal Dialog - blocks most inputs
        this.createContext({
            id: InputContextId.MODAL_DIALOG,
            name: 'Modal Dialog',
            enabled: false,
            priority: 100,
            exclusive: false,
        });

        // Viewport shortcuts
        this.createContext({
            id: InputContextId.VIEWPORT,
            name: 'Viewport',
            enabled: true,
            priority: 5,
            exclusive: false,
            parentId: InputContextId.GLOBAL,
        });
    }

    /**
     * Create a new context
     */
    createContext(context: IInputContext): void {
        if (this.contexts.has(context.id)) {
            console.warn(`InputContextManager: Context "${context.id}" already exists`);
            return;
        }

        this.contexts.set(context.id, { ...context });
        this.contextHandlers.set(context.id, []);

        // Track exclusive context
        if (context.exclusive && context.enabled) {
            this.activeExclusiveContext = context.id;
        }
    }

    /**
     * Get a context by ID
     */
    getContext(id: string): IInputContext | undefined {
        return this.contexts.get(id);
    }

    /**
     * Get all contexts
     */
    getAllContexts(): IInputContext[] {
        return Array.from(this.contexts.values());
    }

    /**
     * Check if a context is effectively enabled
     * (considers parent context state)
     */
    isContextEnabled(id: string): boolean {
        const context = this.contexts.get(id);
        if (!context) return false;
        if (!context.enabled) return false;

        // Check parent
        if (context.parentId) {
            return this.isContextEnabled(context.parentId);
        }

        return true;
    }

    /**
     * Enable a context
     */
    enableContext(id: string): void {
        const context = this.contexts.get(id);
        if (!context) {
            console.warn(`InputContextManager: Context "${id}" not found`);
            return;
        }

        // Handle exclusive contexts
        if (context.exclusive) {
            // Disable other exclusive contexts
            for (const [otherId, other] of this.contexts) {
                if (other.exclusive && otherId !== id && other.enabled) {
                    other.enabled = false;
                }
            }
            this.activeExclusiveContext = id;
        }

        context.enabled = true;
    }

    /**
     * Disable a context
     */
    disableContext(id: string): void {
        const context = this.contexts.get(id);
        if (!context) {
            console.warn(`InputContextManager: Context "${id}" not found`);
            return;
        }

        context.enabled = false;

        if (context.exclusive && this.activeExclusiveContext === id) {
            this.activeExclusiveContext = null;
        }
    }

    /**
     * Switch between two exclusive contexts atomically
     */
    switchContext(fromId: string, toId: string): void {
        this.disableContext(fromId);
        this.enableContext(toId);
    }

    /**
     * Register a handler with a context
     */
    registerHandler(handler: IInputHandler, contextId: string = InputContextId.GLOBAL): void {
        const handlers = this.contextHandlers.get(contextId);
        if (!handlers) {
            console.warn(`InputContextManager: Context "${contextId}" not found, registering to GLOBAL`);
            this.contextHandlers.get(InputContextId.GLOBAL)?.push(handler);
            return;
        }

        // Prevent duplicates
        if (handlers.some(h => h.id === handler.id)) {
            console.warn(`InputContextManager: Handler "${handler.id}" already registered in context "${contextId}"`);
            return;
        }

        handlers.push(handler);
    }

    /**
     * Unregister a handler from a context
     */
    unregisterHandler(handlerId: string, contextId?: string): void {
        if (contextId) {
            // Remove from specific context
            const handlers = this.contextHandlers.get(contextId);
            if (handlers) {
                const index = handlers.findIndex(h => h.id === handlerId);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        } else {
            // Remove from all contexts
            for (const handlers of this.contextHandlers.values()) {
                const index = handlers.findIndex(h => h.id === handlerId);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        }
    }

    /**
     * Get all active handlers from enabled contexts
     * Sorted by context priority, then handler priority
     */
    getActiveHandlers(): IInputHandler[] {
        const result: Array<{ handler: IInputHandler; contextPriority: number }> = [];

        for (const [contextId, handlers] of this.contextHandlers) {
            if (!this.isContextEnabled(contextId)) continue;

            const context = this.contexts.get(contextId);
            const contextPriority = context?.priority ?? 0;

            for (const handler of handlers) {
                if (handler.enabled) {
                    result.push({ handler, contextPriority });
                }
            }
        }

        // Sort by context priority (desc), then handler priority (desc)
        result.sort((a, b) => {
            if (b.contextPriority !== a.contextPriority) {
                return b.contextPriority - a.contextPriority;
            }
            return b.handler.priority - a.handler.priority;
        });

        return result.map(r => r.handler);
    }

    /**
     * Get handlers for a specific context
     */
    getHandlersForContext(contextId: string): IInputHandler[] {
        return this.contextHandlers.get(contextId) ?? [];
    }

    /**
     * Get the currently active exclusive context
     */
    getActiveExclusiveContext(): string | null {
        return this.activeExclusiveContext;
    }

    /**
     * Clear all handlers (but keep contexts)
     */
    clearHandlers(): void {
        for (const handlers of this.contextHandlers.values()) {
            handlers.length = 0;
        }
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.clearHandlers();
        this.contexts.clear();
        this.contextHandlers.clear();
    }
}

// Singleton instance
let inputContextManagerInstance: InputContextManager | null = null;

export function getInputContextManager(): InputContextManager {
    if (!inputContextManagerInstance) {
        inputContextManagerInstance = new InputContextManager();
    }
    return inputContextManagerInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetInputContextManager(): void {
    inputContextManagerInstance?.dispose();
    inputContextManagerInstance = null;
}
