import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../EventBus';

// Mock Cube untuk testing
const mockCube = {
    id: 'test-cube-1',
    name: 'Test Cube',
    transform: {
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
    },
    material: {
        color: '#4a9eff',
        metalness: 0.1,
        roughness: 0.7,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0,
    },
    layerId: 'default',
    visible: true,
    locked: false,
};

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('on()', () => {
        it('should subscribe to events and receive payloads', () => {
            const handler = vi.fn();

            eventBus.on('cube:created', handler);
            eventBus.emit('cube:created', { cube: mockCube as any });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ cube: mockCube });
        });

        it('should return unsubscribe function', () => {
            const handler = vi.fn();

            const unsubscribe = eventBus.on('cube:created', handler);
            unsubscribe();
            eventBus.emit('cube:created', { cube: mockCube as any });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should handle multiple subscribers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on('cube:deleted', handler1);
            eventBus.on('cube:deleted', handler2);
            eventBus.emit('cube:deleted', { cubeIds: ['cube-1', 'cube-2'] });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('once()', () => {
        it('should only fire handler once', () => {
            const handler = vi.fn();

            eventBus.once('selection:cleared', handler);
            eventBus.emit('selection:cleared', {});
            eventBus.emit('selection:cleared', {});

            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('off()', () => {
        it('should unsubscribe specific handler', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on('cube:created', handler1);
            eventBus.on('cube:created', handler2);
            eventBus.off('cube:created', handler1);
            eventBus.emit('cube:created', { cube: mockCube as any });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should handle unsubscribe for non-existent event', () => {
            const handler = vi.fn();

            // Ini tidak boleh throw error
            expect(() => {
                eventBus.off('cube:created', handler);
            }).not.toThrow();
        });
    });

    describe('removeAllListeners()', () => {
        it('should remove all listeners for specific event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on('cube:created', handler1);
            eventBus.on('cube:deleted', handler2);
            eventBus.removeAllListeners('cube:created');

            eventBus.emit('cube:created', { cube: mockCube as any });
            eventBus.emit('cube:deleted', { cubeIds: [] });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should remove all listeners when no event specified', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            eventBus.on('cube:created', handler1);
            eventBus.on('cube:deleted', handler2);
            eventBus.removeAllListeners();

            eventBus.emit('cube:created', { cube: mockCube as any });
            eventBus.emit('cube:deleted', { cubeIds: [] });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('listenerCount()', () => {
        it('should return correct listener count', () => {
            expect(eventBus.listenerCount('cube:created')).toBe(0);

            const unsub1 = eventBus.on('cube:created', vi.fn());
            expect(eventBus.listenerCount('cube:created')).toBe(1);

            eventBus.on('cube:created', vi.fn());
            expect(eventBus.listenerCount('cube:created')).toBe(2);

            unsub1();
            expect(eventBus.listenerCount('cube:created')).toBe(1);
        });
    });

    describe('error handling', () => {
        it('should catch and log errors in handlers without stopping propagation', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            const handler1 = vi.fn(() => { throw new Error('Test error'); });
            const handler2 = vi.fn();

            eventBus.on('cube:created', handler1);
            eventBus.on('cube:created', handler2);
            eventBus.emit('cube:created', { cube: mockCube as any });

            expect(consoleError).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledTimes(1);

            consoleError.mockRestore();
        });
    });
});
