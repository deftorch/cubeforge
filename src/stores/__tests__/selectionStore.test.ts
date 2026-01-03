import { describe, it, expect, beforeEach } from 'vitest';

// Testable implementation of selectionStore logic
interface SelectionStoreState {
    selectedIds: Set<string>;
    hoveredId: string | null;
    lastSelectedId: string | null;
}

function createSelectionStore() {
    let state: SelectionStoreState = {
        selectedIds: new Set(),
        hoveredId: null,
        lastSelectedId: null,
    };

    return {
        getState: () => state,

        select(cubeId: string) {
            state.selectedIds = new Set([cubeId]);
            state.lastSelectedId = cubeId;
        },

        addToSelection(cubeId: string) {
            state.selectedIds = new Set([...state.selectedIds, cubeId]);
            state.lastSelectedId = cubeId;
        },

        removeFromSelection(cubeId: string) {
            const next = new Set(state.selectedIds);
            next.delete(cubeId);
            state.selectedIds = next;
        },

        toggleSelection(cubeId: string) {
            const next = new Set(state.selectedIds);
            if (next.has(cubeId)) {
                next.delete(cubeId);
            } else {
                next.add(cubeId);
            }
            state.selectedIds = next;
            state.lastSelectedId = cubeId;
        },

        selectMultiple(cubeIds: string[]) {
            state.selectedIds = new Set(cubeIds);
            if (cubeIds.length > 0) {
                state.lastSelectedId = cubeIds[cubeIds.length - 1];
            }
        },

        clearSelection() {
            state.selectedIds = new Set();
            state.lastSelectedId = null;
        },

        selectAll(allCubeIds: string[]) {
            state.selectedIds = new Set(allCubeIds);
        },

        setHovered(cubeId: string | null) {
            state.hoveredId = cubeId;
        },

        isSelected(cubeId: string): boolean {
            return state.selectedIds.has(cubeId);
        },

        getSelectedIds(): string[] {
            return Array.from(state.selectedIds);
        },

        getSelectionCount(): number {
            return state.selectedIds.size;
        },

        hasSelection(): boolean {
            return state.selectedIds.size > 0;
        },
    };
}

describe('selectionStore', () => {
    let store: ReturnType<typeof createSelectionStore>;

    beforeEach(() => {
        store = createSelectionStore();
    });

    describe('select()', () => {
        it('should select a single cube', () => {
            store.select('cube-1');

            expect(store.isSelected('cube-1')).toBe(true);
            expect(store.getSelectionCount()).toBe(1);
        });

        it('should replace existing selection', () => {
            store.select('cube-1');
            store.select('cube-2');

            expect(store.isSelected('cube-1')).toBe(false);
            expect(store.isSelected('cube-2')).toBe(true);
            expect(store.getSelectionCount()).toBe(1);
        });

        it('should update lastSelectedId', () => {
            store.select('cube-1');
            expect(store.getState().lastSelectedId).toBe('cube-1');
        });
    });

    describe('addToSelection()', () => {
        it('should add to existing selection', () => {
            store.select('cube-1');
            store.addToSelection('cube-2');

            expect(store.isSelected('cube-1')).toBe(true);
            expect(store.isSelected('cube-2')).toBe(true);
            expect(store.getSelectionCount()).toBe(2);
        });

        it('should not duplicate if already selected', () => {
            store.select('cube-1');
            store.addToSelection('cube-1');

            expect(store.getSelectionCount()).toBe(1);
        });
    });

    describe('removeFromSelection()', () => {
        it('should remove from selection', () => {
            store.selectMultiple(['cube-1', 'cube-2', 'cube-3']);
            store.removeFromSelection('cube-2');

            expect(store.isSelected('cube-2')).toBe(false);
            expect(store.getSelectionCount()).toBe(2);
        });

        it('should handle removing non-selected id', () => {
            store.select('cube-1');
            expect(() => store.removeFromSelection('cube-99')).not.toThrow();
            expect(store.getSelectionCount()).toBe(1);
        });
    });

    describe('toggleSelection()', () => {
        it('should add if not selected', () => {
            store.toggleSelection('cube-1');
            expect(store.isSelected('cube-1')).toBe(true);
        });

        it('should remove if already selected', () => {
            store.select('cube-1');
            store.toggleSelection('cube-1');
            expect(store.isSelected('cube-1')).toBe(false);
        });
    });

    describe('selectMultiple()', () => {
        it('should select multiple cubes', () => {
            store.selectMultiple(['cube-1', 'cube-2', 'cube-3']);

            expect(store.getSelectionCount()).toBe(3);
            expect(store.isSelected('cube-1')).toBe(true);
            expect(store.isSelected('cube-2')).toBe(true);
            expect(store.isSelected('cube-3')).toBe(true);
        });

        it('should replace existing selection', () => {
            store.select('cube-old');
            store.selectMultiple(['cube-1', 'cube-2']);

            expect(store.isSelected('cube-old')).toBe(false);
            expect(store.getSelectionCount()).toBe(2);
        });

        it('should set lastSelectedId to last in array', () => {
            store.selectMultiple(['cube-1', 'cube-2', 'cube-3']);
            expect(store.getState().lastSelectedId).toBe('cube-3');
        });
    });

    describe('clearSelection()', () => {
        it('should clear all selection', () => {
            store.selectMultiple(['cube-1', 'cube-2']);
            store.clearSelection();

            expect(store.hasSelection()).toBe(false);
            expect(store.getSelectionCount()).toBe(0);
        });

        it('should set lastSelectedId to null', () => {
            store.select('cube-1');
            store.clearSelection();

            expect(store.getState().lastSelectedId).toBeNull();
        });
    });

    describe('selectAll()', () => {
        it('should select all provided ids', () => {
            store.selectAll(['cube-1', 'cube-2', 'cube-3', 'cube-4']);
            expect(store.getSelectionCount()).toBe(4);
        });
    });

    describe('setHovered()', () => {
        it('should set hovered id', () => {
            store.setHovered('cube-1');
            expect(store.getState().hoveredId).toBe('cube-1');
        });

        it('should clear hovered with null', () => {
            store.setHovered('cube-1');
            store.setHovered(null);
            expect(store.getState().hoveredId).toBeNull();
        });
    });

    describe('getSelectedIds()', () => {
        it('should return array of selected ids', () => {
            store.selectMultiple(['cube-1', 'cube-2']);
            const ids = store.getSelectedIds();

            expect(ids).toContain('cube-1');
            expect(ids).toContain('cube-2');
            expect(ids).toHaveLength(2);
        });

        it('should return empty array when nothing selected', () => {
            expect(store.getSelectedIds()).toHaveLength(0);
        });
    });

    describe('hasSelection()', () => {
        it('should return true when has selection', () => {
            store.select('cube-1');
            expect(store.hasSelection()).toBe(true);
        });

        it('should return false when empty', () => {
            expect(store.hasSelection()).toBe(false);
        });
    });
});
