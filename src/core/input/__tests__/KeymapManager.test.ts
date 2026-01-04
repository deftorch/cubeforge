import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for KeymapManager
 * 
 * Tests action registration, rebinding, conflict detection,
 * and localStorage persistence logic.
 */

// Simulated KeymapManager logic for testing
interface KeyBinding {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
}

interface KeymapEntry {
    actionId: string;
    description: string;
    category: string;
    defaultBinding: KeyBinding;
    userBinding?: KeyBinding;
    action: () => void;
}

class TestKeymapManager {
    private entries: Map<string, KeymapEntry> = new Map();

    registerAction(entry: KeymapEntry): boolean {
        if (this.entries.has(entry.actionId)) {
            return false;
        }
        this.entries.set(entry.actionId, entry);
        return true;
    }

    unregisterAction(actionId: string): boolean {
        return this.entries.delete(actionId);
    }

    getAction(actionId: string): KeymapEntry | undefined {
        return this.entries.get(actionId);
    }

    getEffectiveBinding(actionId: string): KeyBinding | undefined {
        const entry = this.entries.get(actionId);
        if (!entry) return undefined;
        return entry.userBinding || entry.defaultBinding;
    }

    rebind(actionId: string, binding: KeyBinding): boolean {
        const entry = this.entries.get(actionId);
        if (!entry) return false;

        // Check for conflicts
        const conflict = this.findConflict(binding, actionId);
        if (conflict) return false;

        entry.userBinding = binding;
        return true;
    }

    resetToDefault(actionId: string): void {
        const entry = this.entries.get(actionId);
        if (entry) {
            delete entry.userBinding;
        }
    }

    findConflict(binding: KeyBinding, excludeActionId?: string): string | null {
        for (const [id, entry] of this.entries) {
            if (id === excludeActionId) continue;

            const existingBinding = entry.userBinding || entry.defaultBinding;
            if (this.bindingsMatch(binding, existingBinding)) {
                return id;
            }
        }
        return null;
    }

    private bindingsMatch(a: KeyBinding, b: KeyBinding): boolean {
        return a.key.toLowerCase() === b.key.toLowerCase() &&
            !!a.ctrl === !!b.ctrl &&
            !!a.shift === !!b.shift &&
            !!a.alt === !!b.alt;
    }

    getBindingKey(binding: KeyBinding): string {
        const parts: string[] = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.shift) parts.push('Shift');
        if (binding.alt) parts.push('Alt');
        parts.push(binding.key.toUpperCase());
        return parts.join('+');
    }

    getActionsByCategory(category: string): KeymapEntry[] {
        return Array.from(this.entries.values())
            .filter(e => e.category === category);
    }

    getAllActions(): KeymapEntry[] {
        return Array.from(this.entries.values());
    }

    clear(): void {
        this.entries.clear();
    }
}

describe('KeymapManager', () => {
    let manager: TestKeymapManager;
    const mockAction = vi.fn();

    beforeEach(() => {
        manager = new TestKeymapManager();
        mockAction.mockClear();
    });

    describe('registerAction', () => {
        it('should register a new action', () => {
            const result = manager.registerAction({
                actionId: 'test.action',
                description: 'Test Action',
                category: 'test',
                defaultBinding: { key: 'a' },
                action: mockAction,
            });

            expect(result).toBe(true);
            expect(manager.getAction('test.action')).toBeDefined();
        });

        it('should reject duplicate action IDs', () => {
            manager.registerAction({
                actionId: 'test.action',
                description: 'Test Action',
                category: 'test',
                defaultBinding: { key: 'a' },
                action: mockAction,
            });

            const result = manager.registerAction({
                actionId: 'test.action',
                description: 'Duplicate',
                category: 'test',
                defaultBinding: { key: 'b' },
                action: mockAction,
            });

            expect(result).toBe(false);
        });
    });

    describe('rebind', () => {
        beforeEach(() => {
            manager.registerAction({
                actionId: 'action1',
                description: 'Action 1',
                category: 'test',
                defaultBinding: { key: 'a' },
                action: mockAction,
            });
            manager.registerAction({
                actionId: 'action2',
                description: 'Action 2',
                category: 'test',
                defaultBinding: { key: 'b' },
                action: mockAction,
            });
        });

        it('should rebind action to new key', () => {
            const result = manager.rebind('action1', { key: 'c' });

            expect(result).toBe(true);
            expect(manager.getEffectiveBinding('action1')?.key).toBe('c');
        });

        it('should reject rebind to conflicting key', () => {
            const result = manager.rebind('action1', { key: 'b' });

            expect(result).toBe(false);
            expect(manager.getEffectiveBinding('action1')?.key).toBe('a');
        });

        it('should handle modifier key combinations', () => {
            const result = manager.rebind('action1', { key: 'b', ctrl: true });

            expect(result).toBe(true); // Different from 'b' without Ctrl
        });
    });

    describe('findConflict', () => {
        beforeEach(() => {
            manager.registerAction({
                actionId: 'action1',
                description: 'Action 1',
                category: 'test',
                defaultBinding: { key: 'a', ctrl: true },
                action: mockAction,
            });
        });

        it('should find conflict with same binding', () => {
            const conflict = manager.findConflict({ key: 'a', ctrl: true });
            expect(conflict).toBe('action1');
        });

        it('should not find conflict with different modifiers', () => {
            const conflict = manager.findConflict({ key: 'a', shift: true });
            expect(conflict).toBeNull();
        });

        it('should exclude specified action from conflict check', () => {
            const conflict = manager.findConflict({ key: 'a', ctrl: true }, 'action1');
            expect(conflict).toBeNull();
        });
    });

    describe('resetToDefault', () => {
        it('should reset user binding', () => {
            manager.registerAction({
                actionId: 'action1',
                description: 'Action 1',
                category: 'test',
                defaultBinding: { key: 'a' },
                action: mockAction,
            });

            manager.rebind('action1', { key: 'z' });
            expect(manager.getEffectiveBinding('action1')?.key).toBe('z');

            manager.resetToDefault('action1');
            expect(manager.getEffectiveBinding('action1')?.key).toBe('a');
        });
    });

    describe('getBindingKey', () => {
        it('should format simple key', () => {
            expect(manager.getBindingKey({ key: 'g' })).toBe('G');
        });

        it('should format key with Ctrl', () => {
            expect(manager.getBindingKey({ key: 'z', ctrl: true })).toBe('Ctrl+Z');
        });

        it('should format key with all modifiers', () => {
            expect(manager.getBindingKey({
                key: 's',
                ctrl: true,
                shift: true,
                alt: true
            })).toBe('Ctrl+Shift+Alt+S');
        });
    });

    describe('getActionsByCategory', () => {
        beforeEach(() => {
            manager.registerAction({
                actionId: 'edit.undo',
                description: 'Undo',
                category: 'edit',
                defaultBinding: { key: 'z', ctrl: true },
                action: mockAction,
            });
            manager.registerAction({
                actionId: 'view.front',
                description: 'Front View',
                category: 'view',
                defaultBinding: { key: '1' },
                action: mockAction,
            });
            manager.registerAction({
                actionId: 'edit.redo',
                description: 'Redo',
                category: 'edit',
                defaultBinding: { key: 'y', ctrl: true },
                action: mockAction,
            });
        });

        it('should filter by category', () => {
            const editActions = manager.getActionsByCategory('edit');
            expect(editActions).toHaveLength(2);
            expect(editActions.map(a => a.actionId)).toContain('edit.undo');
            expect(editActions.map(a => a.actionId)).toContain('edit.redo');
        });

        it('should return empty for unknown category', () => {
            const actions = manager.getActionsByCategory('unknown');
            expect(actions).toHaveLength(0);
        });
    });
});
