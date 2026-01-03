import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { sceneActions } from '@/stores/sceneStore';
import { selectionStore, selectionActions } from '@/stores/selectionStore';
import { dragDropStore, dragDropActions } from '@/stores/dragDropStore';
import { useCoreContext } from '@/components/CoreProvider';
import type { Cube } from '@/types';
import { EyeIcon, EyeOffIcon, LockIcon } from '@/components/ui/Icons';

/**
 * CubeItem - Individual cube in the hierarchy tree
 * Supports drag-and-drop for reparenting and reordering
 */
const CubeItem: Component<{
    cube: Cube;
    level: number;
    getChildren: (parentId: string) => Cube[];
    cubeManager: ReturnType<typeof useCoreContext>['cubeManager'];
}> = (props) => {
    const selectedIds = () => selectionStore.selectedIds;
    const isSelected = () => selectedIds().has(props.cube.id);
    const isHovered = () => selectionStore.hoveredId === props.cube.id;
    const children = () => props.getChildren(props.cube.id);

    // Drag and drop state
    const [isDropTarget, setIsDropTarget] = createSignal(false);
    const [dropPosition, setDropPosition] = createSignal<'before' | 'on' | 'after' | null>(null);

    const isDragging = () => dragDropActions.isDraggingCube(props.cube.id);

    const handleSelectCube = (event: MouseEvent) => {
        if (props.cube.locked) return;
        if (event.shiftKey) {
            selectionActions.toggleSelection(props.cube.id);
        } else {
            selectionActions.select(props.cube.id);
        }
    };

    const toggleVisibility = (event: MouseEvent) => {
        event.stopPropagation();
        props.cubeManager.setVisible(props.cube.id, !props.cube.visible);
    };

    const toggleLock = (event: MouseEvent) => {
        event.stopPropagation();
        props.cubeManager.setLocked(props.cube.id, !props.cube.locked);
    };

    // =====================================
    // DRAG HANDLERS
    // =====================================

    const handleDragStart = (event: DragEvent) => {
        if (props.cube.locked) {
            event.preventDefault();
            return;
        }

        event.dataTransfer?.setData('application/cube-forge-move', props.cube.id);
        event.dataTransfer?.setData('text/plain', props.cube.name);
        event.dataTransfer!.effectAllowed = 'move';

        dragDropActions.startDrag(props.cube.id, 'hierarchy');
    };

    const handleDragEnd = () => {
        dragDropActions.endDrag();
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();

        const draggedId = dragDropStore.draggedCubeId;

        // Don't allow dropping on self
        if (draggedId === props.cube.id) {
            event.dataTransfer!.dropEffect = 'none';
            return;
        }

        event.dataTransfer!.dropEffect = 'move';

        // Calculate drop position based on mouse Y
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const y = event.clientY - rect.top;
        const height = rect.height;

        // Top 25% = before, middle 50% = on (reparent), bottom 25% = after
        if (y < height * 0.25) {
            setDropPosition('before');
        } else if (y > height * 0.75) {
            setDropPosition('after');
        } else {
            setDropPosition('on');
        }
        setIsDropTarget(true);
    };

    const handleDragLeave = () => {
        setIsDropTarget(false);
        setDropPosition(null);
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const draggedId = event.dataTransfer?.getData('application/cube-forge-move');
        if (!draggedId || draggedId === props.cube.id) {
            setIsDropTarget(false);
            setDropPosition(null);
            return;
        }

        const position = dropPosition();

        if (position === 'on') {
            // Reparent: make draggedId child of this cube
            props.cubeManager.parentCube(draggedId, props.cube.id);
        } else {
            // Before or After: set same parent as target
            // (Full reorder requires order property - for now just reparent to same parent)
            props.cubeManager.parentCube(draggedId, props.cube.parentId);
        }

        dragDropActions.endDrag();
        setIsDropTarget(false);
        setDropPosition(null);
    };

    // Get drop indicator class
    const getDropIndicatorClass = () => {
        if (!isDropTarget()) return '';
        const pos = dropPosition();
        if (pos === 'before') return 'drop-indicator-before';
        if (pos === 'after') return 'drop-indicator-after';
        if (pos === 'on') return 'drop-target-on';
        return '';
    };

    return (
        <>
            <div
                draggable={!props.cube.locked}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                class={`
                  group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
                  transition-all duration-150 select-none overflow-hidden relative
                  ${isSelected()
                        ? 'bg-primary-600/30 text-primary-100 outline outline-1 outline-primary-500/50'
                        : isHovered()
                            ? 'bg-surface-700/50 text-surface-100'
                            : 'text-surface-300 hover:bg-surface-700/50 hover:text-surface-100'
                    }
                  ${isDragging() ? 'opacity-50' : ''}
                  ${getDropIndicatorClass()}
                `}
                style={{ "padding-left": `${8 + props.level * 16}px` }}
                onClick={handleSelectCube}
            >
                {/* Indent indicator */}
                <Show when={props.level > 0}>
                    <span class="text-surface-600 text-xs">↳</span>
                </Show>

                {/* Cube icon with color indicator */}
                <div
                    class="w-4 h-4 rounded-sm border border-surface-500"
                    style={{ "background-color": props.cube.material.color }}
                />

                {/* Name */}
                <span class="flex-1 text-sm truncate">{props.cube.name}</span>

                {/* Actions */}
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        class={`p-0.5 rounded hover:bg-surface-600 ${props.cube.visible ? 'text-surface-400' : 'text-surface-600'}`}
                        onClick={toggleVisibility}
                        title={props.cube.visible ? 'Hide' : 'Show'}
                    >
                        {props.cube.visible ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                    <button
                        class={`p-0.5 rounded hover:bg-surface-600 ${props.cube.locked ? 'text-yellow-500' : 'text-surface-600'}`}
                        onClick={toggleLock}
                        title={props.cube.locked ? 'Unlock' : 'Lock'}
                    >
                        <LockIcon />
                    </button>
                </div>
            </div>

            {/* Render Children Recursively */}
            <For each={children()}>
                {(child) => (
                    <CubeItem
                        cube={child}
                        level={props.level + 1}
                        getChildren={props.getChildren}
                        cubeManager={props.cubeManager}
                    />
                )}
            </For>
        </>
    );
};

/**
 * LeftPanel - Scene hierarchy panel with drag-and-drop support
 */
export const LeftPanel: Component = () => {
    const { cubeManager } = useCoreContext();
    const cubes = createMemo(() => sceneActions.getAllCubes());

    // Drop state for root/header area
    const [isRootDropTarget, setIsRootDropTarget] = createSignal(false);

    // Get root cubes (no parentId)
    const rootCubes = createMemo(() => cubes().filter(c => !c.parentId));

    // Get children of a specific cube
    const getChildren = (parentId: string) => cubes().filter(c => c.parentId === parentId);

    // =====================================
    // ROOT DROP HANDLERS (for unparenting)
    // =====================================

    const handleRootDragOver = (event: DragEvent) => {
        if (!event.dataTransfer?.types.includes('application/cube-forge-move')) return;

        event.preventDefault();
        event.dataTransfer!.dropEffect = 'move';
        setIsRootDropTarget(true);
    };

    const handleRootDragLeave = () => {
        setIsRootDropTarget(false);
    };

    const handleRootDrop = (event: DragEvent) => {
        event.preventDefault();

        const draggedId = event.dataTransfer?.getData('application/cube-forge-move');
        if (!draggedId) {
            setIsRootDropTarget(false);
            return;
        }

        // Unparent the cube (move to root)
        cubeManager.parentCube(draggedId, undefined);

        dragDropActions.endDrag();
        setIsRootDropTarget(false);
    };

    return (
        <div class="w-64 bg-surface-800 border-r border-surface-700 flex flex-col">
            {/* Header - Drop here to unparent */}
            <div
                class={`px-3 py-2 border-b border-surface-700 transition-colors ${isRootDropTarget() ? 'bg-primary-600/20 border-primary-500/50' : ''
                    }`}
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
            >
                <h2 class="text-sm font-medium text-surface-200">
                    Scene
                </h2>
            </div>

            {/* Cube list (Tree View) */}
            <div
                class="flex-1 overflow-y-auto"
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
            >
                <Show
                    when={cubes().length > 0}
                    fallback={
                        <div class="p-4 text-center text-surface-500 text-sm">
                            No cubes yet.<br />
                            Click <span class="text-primary-400">+</span> to create one.
                        </div>
                    }
                >
                    <div class="p-2 space-y-1">
                        <For each={rootCubes()}>
                            {(cube) => (
                                <CubeItem
                                    cube={cube}
                                    level={0}
                                    getChildren={getChildren}
                                    cubeManager={cubeManager}
                                />
                            )}
                        </For>
                    </div>
                </Show>
            </div>

            {/* Footer with count */}
            <div class="px-3 py-2 border-t border-surface-700 text-xs text-surface-500">
                {cubes().length} cube{cubes().length !== 1 ? 's' : ''}
            </div>
        </div>
    );
};
