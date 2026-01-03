import { createStore } from 'solid-js/store';
import { eventBus } from '@/core/events';

/**
 * Selection Store - Manages selected cube IDs
 */
export interface SelectionStoreState {
    selectedIds: Set<string>;
    hoveredId: string | null;
    lastSelectedId: string | null;
}

const [selectionStore, setSelectionStore] = createStore<SelectionStoreState>({
    selectedIds: new Set(),
    hoveredId: null,
    lastSelectedId: null,
});

/**
 * Helper to emit selection:changed event
 */
function emitSelectionChanged(previousIds: string[], newIds: string[]): void {
    if (JSON.stringify(previousIds.sort()) !== JSON.stringify(newIds.sort())) {
        eventBus.emit('selection:changed', {
            selectedIds: newIds,
            previousIds: previousIds,
        });
    }
}

// Selection Actions
export const selectionActions = {
    /**
     * Select a single cube (replaces current selection)
     */
    select(cubeId: string) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', new Set([cubeId]));
        setSelectionStore('lastSelectedId', cubeId);
        emitSelectionChanged(previousIds, [cubeId]);
    },

    /**
     * Add cube to selection
     */
    addToSelection(cubeId: string) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', prev => {
            const next = new Set(prev);
            next.add(cubeId);
            return next;
        });
        setSelectionStore('lastSelectedId', cubeId);
        emitSelectionChanged(previousIds, Array.from(selectionStore.selectedIds));
    },

    /**
     * Remove cube from selection
     */
    removeFromSelection(cubeId: string) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', prev => {
            const next = new Set(prev);
            next.delete(cubeId);
            return next;
        });
        emitSelectionChanged(previousIds, Array.from(selectionStore.selectedIds));
    },

    /**
     * Toggle cube in selection
     */
    toggleSelection(cubeId: string) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', prev => {
            const next = new Set(prev);
            if (next.has(cubeId)) {
                next.delete(cubeId);
            } else {
                next.add(cubeId);
            }
            return next;
        });
        setSelectionStore('lastSelectedId', cubeId);
        emitSelectionChanged(previousIds, Array.from(selectionStore.selectedIds));
    },

    /**
     * Select multiple cubes
     */
    selectMultiple(cubeIds: string[]) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', new Set(cubeIds));
        if (cubeIds.length > 0) {
            setSelectionStore('lastSelectedId', cubeIds[cubeIds.length - 1]);
        }
        emitSelectionChanged(previousIds, cubeIds);
    },

    /**
     * Clear all selection
     */
    clearSelection() {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', new Set());
        setSelectionStore('lastSelectedId', null);
        emitSelectionChanged(previousIds, []);
    },

    /**
     * Select all cubes
     */
    selectAll(allCubeIds: string[]) {
        const previousIds = Array.from(selectionStore.selectedIds);
        setSelectionStore('selectedIds', new Set(allCubeIds));
        emitSelectionChanged(previousIds, allCubeIds);
    },

    /**
     * Set hovered cube
     */
    setHovered(cubeId: string | null) {
        setSelectionStore('hoveredId', cubeId);
    },

    /**
     * Check if cube is selected
     */
    isSelected(cubeId: string): boolean {
        return selectionStore.selectedIds.has(cubeId);
    },

    /**
     * Get selected cube IDs as array
     */
    getSelectedIds(): string[] {
        return Array.from(selectionStore.selectedIds);
    },

    /**
     * Get selection count
     */
    getSelectionCount(): number {
        return selectionStore.selectedIds.size;
    },

    /**
     * Check if has selection
     */
    hasSelection(): boolean {
        return selectionStore.selectedIds.size > 0;
    },
};

export { selectionStore, setSelectionStore };
