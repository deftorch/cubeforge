import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { InputDispatcher } from '../InputDispatcher';
import { getKeymapManager } from '../KeymapManager';
import { getOperatorRegistry } from '../OperatorRegistry';
import { InputLogger } from '../InputLogger';
import { getKeyboardManager } from '../KeyboardManager';
import { uiActions } from '@/stores/uiStore';
import { layoutActions } from '@/stores/layoutStore';
import { selectionActions } from '@/stores/selectionStore';
import { DragDropHandler } from '../DragDropHandler';
import { getSceneManager } from '@/core/scene/SceneManager';
import { getCubeManager } from '@/core/scene/CubeManager';
import { registerDefaultShortcuts } from '@/core/input/shortcuts';

// Helper to create events with target (JSDOM/Vitest default events have null target if not dispatched)
function createKeyboardEvent(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key });
    Object.defineProperty(event, 'target', { value: document.body, writable: true });
    return event;
}

// Mock dependencies
vi.mock('@/stores/uiStore', () => ({
    uiActions: {
        setStatus: vi.fn(),
        setTransformMode: vi.fn(),
        toggleLeftPanel: vi.fn(),
        toggleRightPanel: vi.fn(),
    }
}));

vi.mock('@/stores/layoutStore', () => ({
    layoutActions: {
        toggleLeftPanel: vi.fn(),
        toggleRightPanel: vi.fn(),
    }
}));

vi.mock('@/stores/selectionStore', () => ({
    selectionActions: {
        select: vi.fn(),
        deselectAll: vi.fn(),
        invertSelection: vi.fn(),
        selectMultiple: vi.fn(),
        getSelectedIds: vi.fn().mockReturnValue(['cube-1']),
    }
}));

vi.mock('@/stores/sceneStore', () => ({
    sceneActions: {
        getCube: vi.fn().mockReturnValue({
            id: 'cube-1',
            transform: {
                position: new THREE.Vector3(),
                rotation: new THREE.Euler(),
                scale: new THREE.Vector3(1, 1, 1),
            }
        }),
    }
}));

vi.mock('@/stores/historyStore', () => ({
    historyActions: {
        undo: vi.fn(),
        redo: vi.fn(),
    }
}));

// Mock SceneManager and CubeManager
vi.mock('@/core/scene/SceneManager', () => ({
    getSceneManager: vi.fn().mockReturnValue({
        scene: {
            add: vi.fn(),
            remove: vi.fn(),
        },
        screenToWorld: vi.fn().mockReturnValue(new THREE.Vector3(10, 0, 0)),
        getMesh: vi.fn().mockReturnValue({
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            scale: new THREE.Vector3(),
        }),
    })
}));

vi.mock('@/core/scene/CubeManager', () => ({
    getCubeManager: vi.fn().mockReturnValue({
        createCubeWithUndo: vi.fn().mockReturnValue({ id: 'new-cube', name: 'New Cube' }),
        updateTransform: vi.fn(),
        duplicateCubes: vi.fn().mockReturnValue([{ id: 'new-cube' }]),
        deleteCubes: vi.fn(),
    })
}));

// Mock TransformService
vi.mock('@/core/transform/TransformService', () => ({
    getTransformService: vi.fn().mockReturnValue({
        startTransform: vi.fn(),
        updateTransform: vi.fn(),
        endTransform: vi.fn(),
    })
}));

describe('Comprehensive Interaction Verification', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let dispatcher: InputDispatcher;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let loggerSpy: any;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Setup Logger Spy
        loggerSpy = vi.spyOn(InputLogger, 'create').mockReturnValue({
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        } as any);

        // Reset Singletons
        const km = getKeymapManager();
        km['entries'].clear();
        km.initialize();

        const kb = getKeyboardManager();
        kb.clear();

        const opRegistry = getOperatorRegistry();

        // Setup Dispatcher
        dispatcher = new InputDispatcher();

        // Register Shortcuts manually
        registerDefaultShortcuts(getCubeManager(), selectionActions as any);
        // Force sync
        km['syncToKeyboardManager']();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Keyboard Interactions (Shortcuts)', () => {
        it('should handle Transform shortcuts (G, R, S)', () => {
            const registry = getOperatorRegistry();
            const transformSpy = vi.spyOn(registry, 'invoke');

            // Simulate G (Move)
            getKeyboardManager().handleEvent(createKeyboardEvent('g'));
            expect(transformSpy).toHaveBeenCalledWith('transform-translate');

            // Simulate R (Rotate)
            getKeyboardManager().handleEvent(createKeyboardEvent('r'));
            expect(transformSpy).toHaveBeenCalledWith('transform-rotate');

            // Simulate S (Scale)
            getKeyboardManager().handleEvent(createKeyboardEvent('s'));
            expect(transformSpy).toHaveBeenCalledWith('transform-scale');
        });

        it('should handle toggle shortcuts (N, T)', () => {
            getKeyboardManager().handleEvent(createKeyboardEvent('n'));
            expect(layoutActions.toggleRightPanel).toHaveBeenCalled();

            getKeyboardManager().handleEvent(createKeyboardEvent('t'));
            expect(layoutActions.toggleLeftPanel).toHaveBeenCalled();
        });
    });

    describe('Drag & Drop Interactions (DragDropHandler)', () => {
        let handler: DragDropHandler;

        beforeEach(() => {
            handler = new DragDropHandler(getSceneManager(), getCubeManager());
        });

        it('should create ghost cube on drag enter (Create Mode)', () => {
            const event = {
                dataTransfer: {
                    types: ['application/cube-forge-create']
                },
                clientX: 100,
                clientY: 100,
                preventDefault: vi.fn(),
            } as unknown as DragEvent;

            handler.onDragEnter(event);
            expect(getSceneManager().scene.add).toHaveBeenCalled();
        });

        it('should create new cube on drop (Create Mode)', () => {
            const event = {
                dataTransfer: {
                    types: ['application/cube-forge-create'],
                    getData: (type: string) => type === 'application/cube-forge-create' ? 'create-cube' : '',
                },
                clientX: 100,
                clientY: 100,
                preventDefault: vi.fn(),
            } as unknown as DragEvent;

            handler.onDrop(event);

            expect(getCubeManager().createCubeWithUndo).toHaveBeenCalled();
            expect(selectionActions.select).toHaveBeenCalledWith('new-cube');
        });
    });
});
