import { createStore } from 'solid-js/store';
import { getInputContextManager } from '@/core/input/InputContextManager';
import { InputContextId } from '@/core/interfaces';

/**
 * Transform modes for the gizmo
 */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * Transform space (local vs world)
 */
export type TransformSpace = 'local' | 'world';

/**
 * Active tool
 */
export type ActiveTool = 'select' | 'move' | 'rotate' | 'scale' | 'create';

/**
 * Interaction mode (Object mode vs Edit mode)
 * Object Mode: Transforms affect parent hierarchy
 * Edit Mode: Transforms are local to the cube only (ignores parent influence)
 */
export type InteractionMode = 'object' | 'edit';

/**
 * UI Store - Manages UI state
 */
export interface UIStoreState {
    // Tool state
    activeTool: ActiveTool;
    transformMode: TransformMode;
    transformSpace: TransformSpace;
    interactionMode: InteractionMode;

    // Panel visibility
    showLeftPanel: boolean;
    showRightPanel: boolean;
    showStatusBar: boolean;

    // Modal state
    activeModal: string | null;

    // Viewport
    isViewportFocused: boolean;
    showGrid: boolean;
    showGizmo: boolean;

    // Snapping
    snapToGrid: boolean;
    snapAngle: boolean;
    gridSize: number;
    angleSnap: number;

    // Status message
    statusMessage: string;
}

const [uiStore, setUIStore] = createStore<UIStoreState>({
    // Tool state
    activeTool: 'select',
    transformMode: 'translate',
    transformSpace: 'world',
    interactionMode: 'object',

    // Panel visibility
    showLeftPanel: true,
    showRightPanel: true,
    showStatusBar: true,

    // Modal state
    activeModal: null,

    // Viewport
    isViewportFocused: false,
    showGrid: true,
    showGizmo: true,

    // Snapping
    snapToGrid: true,
    snapAngle: true,
    gridSize: 1,
    angleSnap: 15,

    // Status message
    statusMessage: 'Ready',
});

// UI Actions
export const uiActions = {
    /**
     * Set active tool
     */
    setTool(tool: ActiveTool) {
        setUIStore('activeTool', tool);

        // Map tool to transform mode
        const modeMap: Partial<Record<ActiveTool, TransformMode>> = {
            move: 'translate',
            rotate: 'rotate',
            scale: 'scale',
        };

        if (modeMap[tool]) {
            setUIStore('transformMode', modeMap[tool]!);
        }
    },

    /**
     * Set transform mode
     */
    setTransformMode(mode: TransformMode) {
        setUIStore('transformMode', mode);
    },

    /**
     * Toggle transform space
     */
    toggleTransformSpace() {
        setUIStore('transformSpace', prev => (prev === 'local' ? 'world' : 'local'));
    },

    /**
     * Toggle interaction mode (Object vs Edit)
     */
    toggleInteractionMode() {
        const newMode = uiStore.interactionMode === 'object' ? 'edit' : 'object';
        this.setInteractionMode(newMode);
    },

    /**
     * Set interaction mode
     * Also syncs with InputContextManager for context-aware input handling
     */
    setInteractionMode(mode: InteractionMode) {
        setUIStore('interactionMode', mode);

        // Sync with InputContextManager
        const contextManager = getInputContextManager();
        if (mode === 'edit') {
            contextManager.switchContext(InputContextId.OBJECT_MODE, InputContextId.EDIT_MODE);
        } else {
            contextManager.switchContext(InputContextId.EDIT_MODE, InputContextId.OBJECT_MODE);
        }
    },

    /**
     * Toggle left panel
     */
    toggleLeftPanel() {
        setUIStore('showLeftPanel', prev => !prev);
    },

    /**
     * Toggle right panel
     */
    toggleRightPanel() {
        setUIStore('showRightPanel', prev => !prev);
    },

    /**
     * Open modal
     */
    openModal(modalId: string) {
        setUIStore('activeModal', modalId);
    },

    /**
     * Close modal
     */
    closeModal() {
        setUIStore('activeModal', null);
    },

    /**
     * Set viewport focus state
     */
    setViewportFocused(focused: boolean) {
        setUIStore('isViewportFocused', focused);
    },

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        setUIStore('showGrid', prev => !prev);
    },

    /**
     * Toggle gizmo visibility
     */
    toggleGizmo() {
        setUIStore('showGizmo', prev => !prev);
    },

    /**
     * Toggle snap to grid
     */
    toggleSnapToGrid() {
        setUIStore('snapToGrid', prev => !prev);
    },

    /**
     * Toggle angle snapping
     */
    toggleSnapAngle() {
        setUIStore('snapAngle', prev => !prev);
    },

    /**
     * Set status message
     */
    setStatus(message: string) {
        setUIStore('statusMessage', message);
    },

    /**
     * Set grid size
     */
    setGridSize(size: number) {
        setUIStore('gridSize', size);
    },

    /**
     * Set angle snap value
     */
    setAngleSnap(degrees: number) {
        setUIStore('angleSnap', degrees);
    },
};

export { uiStore, setUIStore };
