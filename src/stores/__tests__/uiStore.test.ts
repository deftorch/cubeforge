import { describe, it, expect, beforeEach } from 'vitest';

// Types
type TransformMode = 'translate' | 'rotate' | 'scale';
type TransformSpace = 'local' | 'world';
type ActiveTool = 'select' | 'move' | 'rotate' | 'scale' | 'create';

interface UIStoreState {
    activeTool: ActiveTool;
    transformMode: TransformMode;
    transformSpace: TransformSpace;
    showLeftPanel: boolean;
    showRightPanel: boolean;
    showStatusBar: boolean;
    activeModal: string | null;
    isViewportFocused: boolean;
    showGrid: boolean;
    showGizmo: boolean;
    snapToGrid: boolean;
    snapAngle: boolean;
    gridSize: number;
    angleSnap: number;
    statusMessage: string;
}

// Testable implementation of uiStore logic
function createUIStore() {
    let state: UIStoreState = {
        activeTool: 'select',
        transformMode: 'translate',
        transformSpace: 'world',
        showLeftPanel: true,
        showRightPanel: true,
        showStatusBar: true,
        activeModal: null,
        isViewportFocused: false,
        showGrid: true,
        showGizmo: true,
        snapToGrid: true,
        snapAngle: true,
        gridSize: 1,
        angleSnap: 15,
        statusMessage: 'Ready',
    };

    return {
        getState: () => state,

        setTool(tool: ActiveTool) {
            state.activeTool = tool;

            const modeMap: Partial<Record<ActiveTool, TransformMode>> = {
                move: 'translate',
                rotate: 'rotate',
                scale: 'scale',
            };

            if (modeMap[tool]) {
                state.transformMode = modeMap[tool]!;
            }
        },

        setTransformMode(mode: TransformMode) {
            state.transformMode = mode;
        },

        toggleTransformSpace() {
            state.transformSpace = state.transformSpace === 'local' ? 'world' : 'local';
        },

        toggleLeftPanel() {
            state.showLeftPanel = !state.showLeftPanel;
        },

        toggleRightPanel() {
            state.showRightPanel = !state.showRightPanel;
        },

        openModal(modalId: string) {
            state.activeModal = modalId;
        },

        closeModal() {
            state.activeModal = null;
        },

        setViewportFocused(focused: boolean) {
            state.isViewportFocused = focused;
        },

        toggleGrid() {
            state.showGrid = !state.showGrid;
        },

        toggleGizmo() {
            state.showGizmo = !state.showGizmo;
        },

        toggleSnapToGrid() {
            state.snapToGrid = !state.snapToGrid;
        },

        toggleSnapAngle() {
            state.snapAngle = !state.snapAngle;
        },

        setStatus(message: string) {
            state.statusMessage = message;
        },

        setGridSize(size: number) {
            state.gridSize = size;
        },

        setAngleSnap(degrees: number) {
            state.angleSnap = degrees;
        },
    };
}

describe('uiStore', () => {
    let store: ReturnType<typeof createUIStore>;

    beforeEach(() => {
        store = createUIStore();
    });

    describe('setTool()', () => {
        it('should set active tool', () => {
            store.setTool('move');
            expect(store.getState().activeTool).toBe('move');
        });

        it('should set transformMode to translate when move tool selected', () => {
            store.setTool('move');
            expect(store.getState().transformMode).toBe('translate');
        });

        it('should set transformMode to rotate when rotate tool selected', () => {
            store.setTool('rotate');
            expect(store.getState().transformMode).toBe('rotate');
        });

        it('should set transformMode to scale when scale tool selected', () => {
            store.setTool('scale');
            expect(store.getState().transformMode).toBe('scale');
        });

        it('should not change transformMode for select tool', () => {
            store.setTool('move'); // sets to translate
            store.setTool('select');
            expect(store.getState().transformMode).toBe('translate'); // unchanged
        });
    });

    describe('setTransformMode()', () => {
        it('should set transform mode directly', () => {
            store.setTransformMode('scale');
            expect(store.getState().transformMode).toBe('scale');
        });
    });

    describe('toggleTransformSpace()', () => {
        it('should toggle from world to local', () => {
            expect(store.getState().transformSpace).toBe('world');
            store.toggleTransformSpace();
            expect(store.getState().transformSpace).toBe('local');
        });

        it('should toggle from local to world', () => {
            store.toggleTransformSpace(); // world -> local
            store.toggleTransformSpace(); // local -> world
            expect(store.getState().transformSpace).toBe('world');
        });
    });

    describe('panel toggles', () => {
        it('should toggle left panel', () => {
            expect(store.getState().showLeftPanel).toBe(true);
            store.toggleLeftPanel();
            expect(store.getState().showLeftPanel).toBe(false);
        });

        it('should toggle right panel', () => {
            expect(store.getState().showRightPanel).toBe(true);
            store.toggleRightPanel();
            expect(store.getState().showRightPanel).toBe(false);
        });
    });

    describe('modal management', () => {
        it('should open modal', () => {
            store.openModal('settings');
            expect(store.getState().activeModal).toBe('settings');
        });

        it('should close modal', () => {
            store.openModal('settings');
            store.closeModal();
            expect(store.getState().activeModal).toBeNull();
        });
    });

    describe('viewport toggles', () => {
        it('should toggle grid', () => {
            expect(store.getState().showGrid).toBe(true);
            store.toggleGrid();
            expect(store.getState().showGrid).toBe(false);
        });

        it('should toggle gizmo', () => {
            expect(store.getState().showGizmo).toBe(true);
            store.toggleGizmo();
            expect(store.getState().showGizmo).toBe(false);
        });

        it('should set viewport focused', () => {
            store.setViewportFocused(true);
            expect(store.getState().isViewportFocused).toBe(true);
        });
    });

    describe('snapping', () => {
        it('should toggle snap to grid', () => {
            expect(store.getState().snapToGrid).toBe(true);
            store.toggleSnapToGrid();
            expect(store.getState().snapToGrid).toBe(false);
        });

        it('should toggle angle snapping', () => {
            expect(store.getState().snapAngle).toBe(true);
            store.toggleSnapAngle();
            expect(store.getState().snapAngle).toBe(false);
        });

        it('should set grid size', () => {
            store.setGridSize(0.5);
            expect(store.getState().gridSize).toBe(0.5);
        });

        it('should set angle snap', () => {
            store.setAngleSnap(45);
            expect(store.getState().angleSnap).toBe(45);
        });
    });

    describe('status message', () => {
        it('should set status message', () => {
            store.setStatus('Cube created');
            expect(store.getState().statusMessage).toBe('Cube created');
        });
    });
});
