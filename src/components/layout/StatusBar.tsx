import { Component } from 'solid-js';
import { sceneActions } from '@/stores/sceneStore';
import { selectionStore } from '@/stores/selectionStore';
import { uiStore } from '@/stores/uiStore';

export const StatusBar: Component = () => {
    const cubeCount = () => sceneActions.getCubeCount();
    const selectedCount = () => selectionStore.selectedIds.size;

    const toolNames = {
        translate: 'Move',
        rotate: 'Rotate',
        scale: 'Scale',
    };

    return (
        <div class="h-6 bg-surface-800 border-t border-surface-700 flex items-center px-3 text-xs text-surface-400">
            {/* Status message */}
            <span class="flex-1">{uiStore.statusMessage}</span>

            {/* Info */}
            <div class="flex items-center gap-4">
                <span>{cubeCount()} cube{cubeCount() !== 1 ? 's' : ''}</span>
                <span>Selected: {selectedCount()}</span>
                <span>Tool: {toolNames[uiStore.transformMode]} ({uiStore.transformMode[0].toUpperCase()})</span>
                <span class={uiStore.snapToGrid ? 'text-primary-400' : ''}>
                    Snap: {uiStore.snapToGrid ? 'ON' : 'OFF'}
                </span>
            </div>
        </div>
    );
};
