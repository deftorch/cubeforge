import { Component, createMemo, Show } from 'solid-js';
import { uiStore } from '@/stores/uiStore';

/**
 * Statistics Overlay
 * Displays scene statistics like object count, vertices, etc.
 */
export const StatisticsOverlay: Component<{ cubeCount: number }> = (props) => {
    // Basic stats calculation for cubes
    // 1 cube = 8 vertices, 12 triangles (2 per face * 6 faces)
    const vertices = createMemo(() => props.cubeCount * 8);
    const triangles = createMemo(() => props.cubeCount * 12);

    return (
        <Show when={uiStore.overlays.showStatistics}>
            <div class="absolute top-12 left-4 p-3 bg-surface-900/90 border border-surface-700 rounded shadow-lg text-xs text-surface-300 font-mono pointer-events-none z-10 backdrop-blur-sm">
                <div class="font-bold text-surface-200 mb-2 border-b border-surface-700 pb-1">Statistics</div>
                <div class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                    <span>Objects</span>
                    <span class="text-right text-surface-100 font-medium">{props.cubeCount}</span>

                    <span>Vertices</span>
                    <span class="text-right text-surface-100 font-medium">{vertices()}</span>

                    <span>Triangles</span>
                    <span class="text-right text-surface-100 font-medium">{triangles()}</span>
                </div>
            </div>
        </Show>
    );
};
