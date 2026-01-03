import { Component, createMemo } from 'solid-js';
import { NavigationGizmo } from './NavigationGizmo';
import { ViewportHeader, ViewportFooter } from './ViewportControls';
import { sceneActions } from '@/stores/sceneStore';
import { selectionStore } from '@/stores/selectionStore';

/**
 * ViewportOverlay - Contains all viewport UI elements
 */
export const ViewportOverlay: Component = () => {
    const cubeCount = createMemo(() => sceneActions.getCubeCount());
    const selectedCount = createMemo(() => selectionStore.selectedIds.size);

    return (
        <div class="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {/* Header with shading controls */}
            <ViewportHeader />

            {/* Navigation gizmo - top right */}
            <NavigationGizmo />

            {/* Footer with stats */}
            <ViewportFooter cubeCount={cubeCount()} selectedCount={selectedCount()} />
        </div>
    );
};
