import { createStore } from 'solid-js/store';

/**
 * Drag drop target information
 */
export interface DropTarget {
    type: 'cube' | 'root' | 'between' | 'viewport';
    targetId: string | null;
    position: 'before' | 'on' | 'after' | null;
}

/**
 * Drag and Drop State
 */
export interface DragDropState {
    isDragging: boolean;
    draggedCubeId: string | null;
    dragType: 'hierarchy' | 'create' | null;
    dropTarget: DropTarget | null;
}

const initialState: DragDropState = {
    isDragging: false,
    draggedCubeId: null,
    dragType: null,
    dropTarget: null,
};

const [dragDropStore, setDragDropStore] = createStore<DragDropState>(initialState);

export const dragDropActions = {
    /**
     * Start dragging a cube from hierarchy
     */
    startDrag(cubeId: string, type: 'hierarchy' | 'create') {
        setDragDropStore({
            isDragging: true,
            draggedCubeId: cubeId,
            dragType: type,
            dropTarget: null,
        });
    },

    /**
     * Update the current drop target
     */
    setDropTarget(target: DropTarget | null) {
        setDragDropStore('dropTarget', target);
    },

    /**
     * End the drag operation
     */
    endDrag() {
        setDragDropStore(initialState);
    },

    /**
     * Check if a cube is currently being dragged
     */
    isDraggingCube(cubeId: string): boolean {
        return dragDropStore.isDragging && dragDropStore.draggedCubeId === cubeId;
    },

    /**
     * Get the currently dragged cube ID
     */
    getDraggedCubeId(): string | null {
        return dragDropStore.draggedCubeId;
    },
};

export { dragDropStore };
