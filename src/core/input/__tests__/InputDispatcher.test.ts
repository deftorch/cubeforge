import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputDispatcher, resetInputDispatcher } from '../InputDispatcher';
import type { IInputHandler } from '@/core/interfaces';

/**
 * Helper to create a mock handler
 */
function createMockHandler(
    id: string,
    priority: number,
    options: Partial<IInputHandler> = {}
): IInputHandler {
    return {
        id,
        priority,
        enabled: true,
        onMouseDown: vi.fn(() => false),
        onMouseMove: vi.fn(() => false),
        onMouseUp: vi.fn(() => false),
        onClick: vi.fn(() => false),
        onWheel: vi.fn(() => false),
        onKeyDown: vi.fn(() => false),
        dispose: vi.fn(),
        ...options,
    };
}

describe('InputDispatcher', () => {
    let dispatcher: InputDispatcher;

    beforeEach(() => {
        resetInputDispatcher();
        dispatcher = new InputDispatcher();
    });

    describe('registration', () => {
        it('should register a handler', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);

            expect(dispatcher.getAllHandlers()).toHaveLength(1);
            expect(dispatcher.getHandlerById('test')).toBe(handler);
        });

        it('should prevent duplicate registration', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);
            dispatcher.register(handler);

            expect(dispatcher.getAllHandlers()).toHaveLength(1);
        });

        it('should unregister a handler', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);
            dispatcher.unregister(handler);

            expect(dispatcher.getAllHandlers()).toHaveLength(0);
            expect(dispatcher.getHandlerById('test')).toBeUndefined();
        });

        it('should call onRegister when registering', () => {
            const onRegister = vi.fn();
            const handler = createMockHandler('test', 50, { onRegister });
            dispatcher.register(handler);

            expect(onRegister).toHaveBeenCalledOnce();
        });

        it('should call onUnregister when unregistering', () => {
            const onUnregister = vi.fn();
            const handler = createMockHandler('test', 50, { onUnregister });
            dispatcher.register(handler);
            dispatcher.unregister(handler);

            expect(onUnregister).toHaveBeenCalledOnce();
        });
    });

    describe('priority ordering', () => {
        it('should sort handlers by priority (highest first)', () => {
            const lowPriority = createMockHandler('low', 10);
            const highPriority = createMockHandler('high', 90);
            const medPriority = createMockHandler('med', 50);

            dispatcher.register(lowPriority);
            dispatcher.register(highPriority);
            dispatcher.register(medPriority);

            const handlers = dispatcher.getAllHandlers();
            expect(handlers[0].id).toBe('high');
            expect(handlers[1].id).toBe('med');
            expect(handlers[2].id).toBe('low');
        });
    });

    describe('event dispatching', () => {
        it('should dispatch events to all enabled handlers in order', () => {
            const callOrder: string[] = [];
            const handler1 = createMockHandler('h1', 90, {
                onMouseDown: vi.fn(() => {
                    callOrder.push('h1');
                    return false;
                }),
            });
            const handler2 = createMockHandler('h2', 50, {
                onMouseDown: vi.fn(() => {
                    callOrder.push('h2');
                    return false;
                }),
            });

            dispatcher.register(handler1);
            dispatcher.register(handler2);

            const event = new MouseEvent('mousedown');
            dispatcher.dispatchMouseDown(event);

            expect(callOrder).toEqual(['h1', 'h2']);
        });

        it('should stop propagation when handler returns true', () => {
            const handler1 = createMockHandler('h1', 90, {
                onMouseDown: vi.fn(() => true), // Consume event
            });
            const handler2 = createMockHandler('h2', 50);

            dispatcher.register(handler1);
            dispatcher.register(handler2);

            const event = new MouseEvent('mousedown');
            const consumed = dispatcher.dispatchMouseDown(event);

            expect(consumed).toBe(true);
            expect(handler1.onMouseDown).toHaveBeenCalledOnce();
            expect(handler2.onMouseDown).not.toHaveBeenCalled();
        });

        it('should skip disabled handlers', () => {
            const handler = createMockHandler('test', 50, { enabled: false });
            dispatcher.register(handler);

            const event = new MouseEvent('mousedown');
            dispatcher.dispatchMouseDown(event);

            expect(handler.onMouseDown).not.toHaveBeenCalled();
        });

        it('should return false if no handler consumes event', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);

            const event = new MouseEvent('mousedown');
            const consumed = dispatcher.dispatchMouseDown(event);

            expect(consumed).toBe(false);
        });
    });

    describe('modal handlers', () => {
        it('should block lower-priority handlers when modal is active', () => {
            const modalHandler = createMockHandler('modal', 80, { isModal: true });
            const lowHandler = createMockHandler('low', 20);

            dispatcher.register(modalHandler);
            dispatcher.register(lowHandler);
            dispatcher.setModalHandler(modalHandler);

            const event = new MouseEvent('mousedown');
            dispatcher.dispatchMouseDown(event);

            expect(modalHandler.onMouseDown).toHaveBeenCalled();
            expect(lowHandler.onMouseDown).not.toHaveBeenCalled();
        });

        it('should allow higher-priority handlers when modal is active', () => {
            const modalHandler = createMockHandler('modal', 50, { isModal: true });
            const highHandler = createMockHandler('high', 90);

            dispatcher.register(modalHandler);
            dispatcher.register(highHandler);
            dispatcher.setModalHandler(modalHandler);

            const event = new MouseEvent('mousedown');
            dispatcher.dispatchMouseDown(event);

            expect(highHandler.onMouseDown).toHaveBeenCalled();
            expect(modalHandler.onMouseDown).toHaveBeenCalled();
        });

        it('should allow same-priority handlers when modal is active', () => {
            const modalHandler = createMockHandler('modal', 50, { isModal: true });
            const samePriorityHandler = createMockHandler('same', 50);

            dispatcher.register(modalHandler);
            dispatcher.register(samePriorityHandler);
            dispatcher.setModalHandler(modalHandler);

            const event = new MouseEvent('mousedown');
            dispatcher.dispatchMouseDown(event);

            expect(samePriorityHandler.onMouseDown).toHaveBeenCalled();
        });

        it('should return the active modal', () => {
            const handler = createMockHandler('modal', 50);
            dispatcher.register(handler);
            dispatcher.setModalHandler(handler);

            expect(dispatcher.getActiveModal()).toBe(handler);
        });

        it('should clear modal when handler is unregistered', () => {
            const handler = createMockHandler('modal', 50);
            dispatcher.register(handler);
            dispatcher.setModalHandler(handler);
            dispatcher.unregister(handler);

            expect(dispatcher.getActiveModal()).toBeNull();
        });
    });

    describe('different event types', () => {
        it('should dispatch wheel events', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);

            const event = new WheelEvent('wheel');
            dispatcher.dispatchWheel(event);

            expect(handler.onWheel).toHaveBeenCalledWith(event);
        });

        it('should dispatch keyboard events', () => {
            const handler = createMockHandler('test', 50);
            dispatcher.register(handler);

            const event = new KeyboardEvent('keydown');
            dispatcher.dispatchKeyDown(event);

            expect(handler.onKeyDown).toHaveBeenCalledWith(event);
        });
    });

    describe('error handling', () => {
        it('should catch and log handler errors', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const handler = createMockHandler('test', 50, {
                onMouseDown: vi.fn(() => {
                    throw new Error('Test error');
                }),
            });

            dispatcher.register(handler);
            dispatcher.dispatchMouseDown(new MouseEvent('mousedown'));

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('dispose', () => {
        it('should dispose all handlers', () => {
            const handler1 = createMockHandler('h1', 50);
            const handler2 = createMockHandler('h2', 50);
            dispatcher.register(handler1);
            dispatcher.register(handler2);

            dispatcher.dispose();

            expect(handler1.dispose).toHaveBeenCalled();
            expect(handler2.dispose).toHaveBeenCalled();
            expect(dispatcher.getAllHandlers()).toHaveLength(0);
        });
    });
});
