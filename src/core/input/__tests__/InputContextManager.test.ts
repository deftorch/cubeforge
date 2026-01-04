import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputContextManager, resetInputContextManager, getInputContextManager } from '../InputContextManager';
import { InputContextId } from '@/core/interfaces';
import type { IInputHandler } from '@/core/interfaces';

// Mock handler factory
function createMockHandler(id: string, priority: number = 50): IInputHandler {
    return {
        id,
        priority,
        enabled: true,
        onMouseDown: vi.fn().mockReturnValue(false),
        onMouseMove: vi.fn().mockReturnValue(false),
        onMouseUp: vi.fn().mockReturnValue(false),
    };
}

describe('InputContextManager', () => {
    let manager: InputContextManager;

    beforeEach(() => {
        resetInputContextManager();
        manager = new InputContextManager();
    });

    describe('Default Contexts', () => {
        it('should create default contexts on initialization', () => {
            expect(manager.getContext(InputContextId.GLOBAL)).toBeDefined();
            expect(manager.getContext(InputContextId.OBJECT_MODE)).toBeDefined();
            expect(manager.getContext(InputContextId.EDIT_MODE)).toBeDefined();
            expect(manager.getContext(InputContextId.TOOL_ACTIVE)).toBeDefined();
            expect(manager.getContext(InputContextId.MODAL_DIALOG)).toBeDefined();
            expect(manager.getContext(InputContextId.VIEWPORT)).toBeDefined();
        });

        it('should have GLOBAL context enabled by default', () => {
            expect(manager.isContextEnabled(InputContextId.GLOBAL)).toBe(true);
        });

        it('should have OBJECT_MODE enabled and EDIT_MODE disabled by default', () => {
            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(true);
            expect(manager.isContextEnabled(InputContextId.EDIT_MODE)).toBe(false);
        });
    });

    describe('Context Enable/Disable', () => {
        it('should enable a context', () => {
            manager.disableContext(InputContextId.OBJECT_MODE);
            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(false);

            manager.enableContext(InputContextId.OBJECT_MODE);
            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(true);
        });

        it('should disable a context', () => {
            manager.disableContext(InputContextId.OBJECT_MODE);
            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(false);
        });

        it('should handle exclusive contexts - enabling one disables others', () => {
            // OBJECT_MODE and EDIT_MODE are both exclusive
            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(true);
            expect(manager.isContextEnabled(InputContextId.EDIT_MODE)).toBe(false);

            // Enable EDIT_MODE - should disable OBJECT_MODE
            manager.enableContext(InputContextId.EDIT_MODE);

            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(false);
            expect(manager.isContextEnabled(InputContextId.EDIT_MODE)).toBe(true);
        });

        it('should track active exclusive context', () => {
            expect(manager.getActiveExclusiveContext()).toBe(InputContextId.OBJECT_MODE);

            manager.enableContext(InputContextId.EDIT_MODE);
            expect(manager.getActiveExclusiveContext()).toBe(InputContextId.EDIT_MODE);
        });

        it('should switch between contexts atomically', () => {
            manager.switchContext(InputContextId.OBJECT_MODE, InputContextId.EDIT_MODE);

            expect(manager.isContextEnabled(InputContextId.OBJECT_MODE)).toBe(false);
            expect(manager.isContextEnabled(InputContextId.EDIT_MODE)).toBe(true);
        });
    });

    describe('Handler Registration', () => {
        it('should register handler to a context', () => {
            const handler = createMockHandler('test-handler');
            manager.registerHandler(handler, InputContextId.GLOBAL);

            const handlers = manager.getHandlersForContext(InputContextId.GLOBAL);
            expect(handlers).toContain(handler);
        });

        it('should register to GLOBAL by default', () => {
            const handler = createMockHandler('test-handler');
            manager.registerHandler(handler);

            const handlers = manager.getHandlersForContext(InputContextId.GLOBAL);
            expect(handlers).toContain(handler);
        });

        it('should prevent duplicate handler registration', () => {
            const handler = createMockHandler('test-handler');
            manager.registerHandler(handler, InputContextId.GLOBAL);
            manager.registerHandler(handler, InputContextId.GLOBAL);

            const handlers = manager.getHandlersForContext(InputContextId.GLOBAL);
            expect(handlers.filter(h => h.id === 'test-handler')).toHaveLength(1);
        });

        it('should unregister handler from specific context', () => {
            const handler = createMockHandler('test-handler');
            manager.registerHandler(handler, InputContextId.GLOBAL);
            manager.unregisterHandler('test-handler', InputContextId.GLOBAL);

            const handlers = manager.getHandlersForContext(InputContextId.GLOBAL);
            expect(handlers).not.toContain(handler);
        });

        it('should unregister handler from all contexts', () => {
            const handler = createMockHandler('test-handler');
            manager.registerHandler(handler, InputContextId.GLOBAL);
            manager.registerHandler(handler, InputContextId.OBJECT_MODE);
            manager.unregisterHandler('test-handler');

            expect(manager.getHandlersForContext(InputContextId.GLOBAL)).not.toContain(handler);
            expect(manager.getHandlersForContext(InputContextId.OBJECT_MODE)).not.toContain(handler);
        });
    });

    describe('Active Handlers Retrieval', () => {
        it('should return handlers from enabled contexts only', () => {
            const globalHandler = createMockHandler('global-handler');
            const objectHandler = createMockHandler('object-handler');
            const editHandler = createMockHandler('edit-handler');

            manager.registerHandler(globalHandler, InputContextId.GLOBAL);
            manager.registerHandler(objectHandler, InputContextId.OBJECT_MODE);
            manager.registerHandler(editHandler, InputContextId.EDIT_MODE);

            const activeHandlers = manager.getActiveHandlers();

            expect(activeHandlers).toContain(globalHandler);
            expect(activeHandlers).toContain(objectHandler);
            expect(activeHandlers).not.toContain(editHandler); // EDIT_MODE disabled
        });

        it('should sort handlers by context priority, then handler priority', () => {
            const lowPriorityGlobal = createMockHandler('low-global', 10);
            const highPriorityGlobal = createMockHandler('high-global', 90);
            const objectHandler = createMockHandler('object', 50);

            manager.registerHandler(lowPriorityGlobal, InputContextId.GLOBAL);
            manager.registerHandler(highPriorityGlobal, InputContextId.GLOBAL);
            manager.registerHandler(objectHandler, InputContextId.OBJECT_MODE);

            const activeHandlers = manager.getActiveHandlers();

            // OBJECT_MODE has higher context priority (10) than GLOBAL (0)
            // So object handlers should come first
            const objectIndex = activeHandlers.findIndex(h => h.id === 'object');
            const highGlobalIndex = activeHandlers.findIndex(h => h.id === 'high-global');
            const lowGlobalIndex = activeHandlers.findIndex(h => h.id === 'low-global');

            expect(objectIndex).toBeLessThan(highGlobalIndex);
            expect(highGlobalIndex).toBeLessThan(lowGlobalIndex);
        });

        it('should exclude disabled handlers', () => {
            const enabledHandler = createMockHandler('enabled');
            const disabledHandler = createMockHandler('disabled');
            disabledHandler.enabled = false;

            manager.registerHandler(enabledHandler, InputContextId.GLOBAL);
            manager.registerHandler(disabledHandler, InputContextId.GLOBAL);

            const activeHandlers = manager.getActiveHandlers();

            expect(activeHandlers).toContain(enabledHandler);
            expect(activeHandlers).not.toContain(disabledHandler);
        });
    });

    describe('Context Hierarchy', () => {
        it('should respect parent context - child disabled when parent disabled', () => {
            // VIEWPORT has GLOBAL as parent
            expect(manager.isContextEnabled(InputContextId.VIEWPORT)).toBe(true);

            // Create a custom context with parent
            manager.createContext({
                id: 'child-context',
                name: 'Child Context',
                enabled: true,
                priority: 5,
                parentId: InputContextId.OBJECT_MODE,
            });

            expect(manager.isContextEnabled('child-context')).toBe(true);

            // Disable parent
            manager.disableContext(InputContextId.OBJECT_MODE);
            expect(manager.isContextEnabled('child-context')).toBe(false);
        });
    });

    describe('Singleton', () => {
        it('should return same instance from getInputContextManager', () => {
            resetInputContextManager();
            const instance1 = getInputContextManager();
            const instance2 = getInputContextManager();

            expect(instance1).toBe(instance2);
        });

        it('should create new instance after reset', () => {
            const instance1 = getInputContextManager();
            resetInputContextManager();
            const instance2 = getInputContextManager();

            expect(instance1).not.toBe(instance2);
        });
    });

    describe('Cleanup', () => {
        it('should clear all handlers', () => {
            const handler = createMockHandler('test');
            manager.registerHandler(handler, InputContextId.GLOBAL);

            manager.clearHandlers();

            expect(manager.getHandlersForContext(InputContextId.GLOBAL)).toHaveLength(0);
        });

        it('should dispose completely', () => {
            manager.dispose();

            expect(manager.getAllContexts()).toHaveLength(0);
        });
    });
});
