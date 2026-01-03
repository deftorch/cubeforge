import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test for DebugEventBus functionality
 */

// Mock EventBus base class
class MockEventBus {
    private listeners: Map<string, Array<{ callback: Function; once: boolean }>> = new Map();

    on(event: string, callback: Function): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push({ callback, once: false });
        return () => this.off(event, callback);
    }

    off(event: string, callback: Function): void {
        const listeners = this.listeners.get(event);
        if (!listeners) return;
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) listeners.splice(index, 1);
    }

    emit(event: string, payload: unknown): void {
        const listeners = this.listeners.get(event);
        if (!listeners) return;
        for (const listener of [...listeners]) {
            listener.callback(payload);
            if (listener.once) this.off(event, listener.callback);
        }
    }
}

// Testable DebugEventBus
class TestDebugEventBus extends MockEventBus {
    private eventHistory: Array<{
        timestamp: number;
        event: string;
        payload: unknown;
    }> = [];
    private maxHistory = 100;
    private enabled = true;

    emit(event: string, payload: unknown): void {
        if (this.enabled) {
            this.recordHistory(event, payload);
        }
        super.emit(event, payload);
    }

    private recordHistory(event: string, payload: unknown): void {
        this.eventHistory.push({
            timestamp: Date.now(),
            event,
            payload,
        });

        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
    }

    getHistory() {
        return [...this.eventHistory];
    }

    clearHistory(): void {
        this.eventHistory = [];
    }

    getHistoryByEvent(eventName: string) {
        return this.eventHistory
            .filter(h => h.event === eventName)
            .map(({ timestamp, payload }) => ({ timestamp, payload }));
    }

    getRecentEvents(count = 10) {
        return this.eventHistory.slice(-count);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setMaxHistory(max: number): void {
        this.maxHistory = max;
    }
}

describe('DebugEventBus', () => {
    let bus: TestDebugEventBus;

    beforeEach(() => {
        bus = new TestDebugEventBus();
    });

    describe('event history recording', () => {
        it('should record event history when enabled', () => {
            bus.emit('cube:created', { id: 'cube-1' });
            bus.emit('cube:deleted', { cubeIds: ['cube-2'] });

            const history = bus.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].event).toBe('cube:created');
            expect(history[1].event).toBe('cube:deleted');
        });

        it('should not record when disabled', () => {
            bus.setEnabled(false);
            bus.emit('cube:created', { id: 'cube-1' });

            expect(bus.getHistory()).toHaveLength(0);
        });

        it('should still emit events when disabled', () => {
            const handler = vi.fn();
            bus.on('cube:created', handler);
            bus.setEnabled(false);
            bus.emit('cube:created', { id: 'cube-1' });

            expect(handler).toHaveBeenCalled();
        });

        it('should include timestamp in history', () => {
            const before = Date.now();
            bus.emit('test', {});
            const after = Date.now();

            const history = bus.getHistory();
            expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
            expect(history[0].timestamp).toBeLessThanOrEqual(after);
        });

        it('should include payload in history', () => {
            const payload = { cubeId: 'cube-1', color: '#ff0000' };
            bus.emit('cube:material-changed', payload);

            const history = bus.getHistory();
            expect(history[0].payload).toEqual(payload);
        });
    });

    describe('max history limit', () => {
        it('should limit history to maxHistory', () => {
            bus.setMaxHistory(5);

            for (let i = 0; i < 10; i++) {
                bus.emit('event', { index: i });
            }

            const history = bus.getHistory();
            expect(history).toHaveLength(5);
            expect((history[0].payload as { index: number }).index).toBe(5);
            expect((history[4].payload as { index: number }).index).toBe(9);
        });
    });

    describe('clearHistory()', () => {
        it('should clear all history', () => {
            bus.emit('event1', {});
            bus.emit('event2', {});
            bus.emit('event3', {});

            bus.clearHistory();

            expect(bus.getHistory()).toHaveLength(0);
        });
    });

    describe('getHistoryByEvent()', () => {
        it('should filter history by event name', () => {
            bus.emit('cube:created', { id: '1' });
            bus.emit('cube:deleted', { ids: ['2'] });
            bus.emit('cube:created', { id: '3' });
            bus.emit('selection:changed', {});

            const createEvents = bus.getHistoryByEvent('cube:created');
            expect(createEvents).toHaveLength(2);
        });

        it('should return empty array for non-existent event', () => {
            const events = bus.getHistoryByEvent('non:existent');
            expect(events).toHaveLength(0);
        });
    });

    describe('getRecentEvents()', () => {
        it('should return last N events', () => {
            for (let i = 0; i < 20; i++) {
                bus.emit('event', { index: i });
            }

            const recent = bus.getRecentEvents(5);
            expect(recent).toHaveLength(5);
            expect((recent[0].payload as { index: number }).index).toBe(15);
            expect((recent[4].payload as { index: number }).index).toBe(19);
        });

        it('should return all if less than count', () => {
            bus.emit('event', { index: 0 });
            bus.emit('event', { index: 1 });

            const recent = bus.getRecentEvents(10);
            expect(recent).toHaveLength(2);
        });
    });

    describe('isEnabled()', () => {
        it('should return current enabled state', () => {
            expect(bus.isEnabled()).toBe(true);
            bus.setEnabled(false);
            expect(bus.isEnabled()).toBe(false);
        });
    });
});
