import type { IInputHandler } from './IInputHandler';

/**
 * IInputContext - Context grouping for input handlers
 * 
 * Similar to Unity's Action Maps, contexts allow grouping handlers
 * by application state (Object Mode, Edit Mode, Tool Active, etc.)
 * 
 * When a context is disabled, none of its handlers receive events.
 * Multiple contexts can be active simultaneously.
 */
export interface IInputContext {
    /** Unique identifier for this context */
    readonly id: string;

    /** Human-readable name for UI display */
    readonly name: string;

    /** Whether this context is currently active */
    enabled: boolean;

    /**
     * Priority for context-level ordering
     * Higher priority contexts are checked first when resolving handlers
     */
    readonly priority: number;

    /**
     * If true, this context is mutually exclusive with other exclusive contexts
     * Only one exclusive context can be active at a time
     */
    readonly exclusive?: boolean;

    /**
     * Parent context ID - if parent is disabled, this context is also disabled
     */
    readonly parentId?: string;
}

/**
 * Predefined context IDs for common application states
 */
export const InputContextId = {
    /** Global context - always active */
    GLOBAL: 'global',
    /** Object mode context */
    OBJECT_MODE: 'object-mode',
    /** Edit mode context */
    EDIT_MODE: 'edit-mode',
    /** When a tool is actively being used */
    TOOL_ACTIVE: 'tool-active',
    /** When a modal dialog is open */
    MODAL_DIALOG: 'modal-dialog',
    /** Viewport-specific shortcuts */
    VIEWPORT: 'viewport',
} as const;

export type InputContextIdType = typeof InputContextId[keyof typeof InputContextId];

/**
 * Handler registration with context binding
 */
export interface IContextualHandler {
    handler: IInputHandler;
    contextId: string;
}
