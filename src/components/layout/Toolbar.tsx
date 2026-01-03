import { Component } from 'solid-js';
import * as THREE from 'three';
import { uiStore, uiActions } from '@/stores/uiStore';
import { sceneStore, sceneActions } from '@/stores/sceneStore';
import { selectionActions, selectionStore } from '@/stores/selectionStore';
import { historyActions, historyStore } from '@/stores/historyStore';
import { useCoreContext } from '@/components/CoreProvider';
import { Button } from '@/components/ui/Button';
import {
    PlusIcon,
    MoveIcon,
    RotateIcon,
    ScaleIcon,
    UndoIcon,
    RedoIcon,
    CopyIcon,
    TrashIcon,
    GridIcon,
    SaveIcon,
    FolderIcon,
    EditModeIcon,
} from '@/components/ui/Icons';

export const Toolbar: Component = () => {
    const { cubeManager, selectionManager } = useCoreContext();

    const handleCreateCube = () => {
        const cube = cubeManager.createCubeWithUndo();
        selectionActions.select(cube.id);
        uiActions.setStatus(`Created ${cube.name}`);
    };

    const handleDuplicate = () => {
        const selectedIds = selectionActions.getSelectedIds();
        if (selectedIds.length === 0) return;

        const duplicates = cubeManager.duplicateCubes(selectedIds);
        selectionActions.selectMultiple(duplicates.map(c => c.id));
        uiActions.setStatus(`Duplicated ${duplicates.length} cube(s)`);
    };

    const handleDelete = () => {
        const selectedIds = selectionActions.getSelectedIds();
        if (selectedIds.length === 0) return;

        cubeManager.deleteCubes(selectedIds);
        selectionManager.clearSelection();
        uiActions.setStatus(`Deleted ${selectedIds.length} cube(s)`);
    };

    const handleUndo = () => {
        historyActions.undo();
        uiActions.setStatus('Undo');
    };

    const handleRedo = () => {
        historyActions.redo();
        uiActions.setStatus('Redo');
    };

    const handleSave = async () => {
        const cubes = sceneActions.getAllCubes();
        const data = {
            version: '1.0.0',
            name: sceneStore.name,
            cubes: cubes.map(c => ({
                ...c,
                transform: {
                    position: [c.transform.position.x, c.transform.position.y, c.transform.position.z],
                    rotation: [c.transform.rotation.x, c.transform.rotation.y, c.transform.rotation.z],
                    scale: [c.transform.scale.x, c.transform.scale.y, c.transform.scale.z],
                },
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sceneStore.name || 'cubeforge-project'}.cbf`;
        a.click();
        URL.revokeObjectURL(url);

        sceneActions.markClean();
        uiActions.setStatus('Project saved');
    };

    const handleLoad = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cbf,.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Clear current scene
                sceneActions.reset();

                // Load cubes
                if (data.cubes) {
                    data.cubes.forEach((cubeData: any) => {
                        cubeManager.createCube({
                            id: cubeData.id,
                            name: cubeData.name,
                            transform: {
                                position: new THREE.Vector3(...cubeData.transform.position),
                                rotation: new THREE.Euler(...cubeData.transform.rotation),
                                scale: new THREE.Vector3(...cubeData.transform.scale),
                            },
                            material: cubeData.material,
                            layerId: cubeData.layerId ?? 'default-layer',
                            visible: cubeData.visible ?? true,
                            locked: cubeData.locked ?? false,
                        });
                    });
                }

                sceneActions.setName(data.name ?? 'Loaded Project');
                uiActions.setStatus(`Loaded ${data.name ?? 'project'}`);
            } catch (err) {
                console.error('Failed to load file:', err);
                uiActions.setStatus('Failed to load file');
            }
        };
        input.click();
    };

    return (
        <div class="h-12 bg-surface-800 border-b border-surface-700 flex items-center px-2 gap-1">
            {/* Logo */}
            <div class="flex items-center gap-2 px-2">
                <div class="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                    <span class="text-white font-bold text-xs">C</span>
                </div>
                <span class="font-semibold text-surface-100 hidden sm:block">CubeForge</span>
            </div>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* File operations */}
            <Button variant="ghost" icon size="md" onClick={handleSave} title="Save (Ctrl+S)">
                <SaveIcon />
            </Button>
            <Button variant="ghost" icon size="md" onClick={handleLoad} title="Load (Ctrl+O)">
                <FolderIcon />
            </Button>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* Undo/Redo */}
            <Button
                variant="ghost"
                icon
                size="md"
                onClick={handleUndo}
                disabled={!historyStore.canUndo}
                title="Undo (Ctrl+Z)"
            >
                <UndoIcon />
            </Button>
            <Button
                variant="ghost"
                icon
                size="md"
                onClick={handleRedo}
                disabled={!historyStore.canRedo}
                title="Redo (Ctrl+Shift+Z)"
            >
                <RedoIcon />
            </Button>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* Create cube - draggable to viewport */}
            <div
                draggable={true}
                onDragStart={(e) => {
                    e.dataTransfer?.setData('application/cube-forge-create', 'create-cube');
                    e.dataTransfer?.setData('text/plain', 'New Cube');
                    e.dataTransfer!.effectAllowed = 'copy';

                    // Hide the default drag image (button) so only ghost cube shows
                    const emptyImg = new Image();
                    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                    e.dataTransfer?.setDragImage(emptyImg, 0, 0);
                }}
            >
                <Button variant="primary" icon size="md" onClick={handleCreateCube} title="Create Cube (Shift+A) - or drag to viewport">
                    <PlusIcon />
                </Button>
            </div>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* Transform tools */}
            <Button
                variant="ghost"
                icon
                size="md"
                active={uiStore.transformMode === 'translate'}
                onClick={() => uiActions.setTransformMode('translate')}
                title="Move (G)"
            >
                <MoveIcon />
            </Button>
            <Button
                variant="ghost"
                icon
                size="md"
                active={uiStore.transformMode === 'rotate'}
                onClick={() => uiActions.setTransformMode('rotate')}
                title="Rotate (R)"
            >
                <RotateIcon />
            </Button>
            <Button
                variant="ghost"
                icon
                size="md"
                active={uiStore.transformMode === 'scale'}
                onClick={() => uiActions.setTransformMode('scale')}
                title="Scale (S)"
            >
                <ScaleIcon />
            </Button>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* Edit operations */}
            <Button
                variant="ghost"
                icon
                size="md"
                onClick={handleDuplicate}
                disabled={selectionStore.selectedIds.size === 0}
                title="Duplicate (Shift+D)"
            >
                <CopyIcon />
            </Button>
            <Button
                variant="ghost"
                icon
                size="md"
                onClick={handleDelete}
                disabled={selectionStore.selectedIds.size === 0}
                title="Delete (X)"
            >
                <TrashIcon />
            </Button>

            <div class="w-px h-6 bg-surface-600 mx-2" />

            {/* View options */}
            <Button
                variant="ghost"
                icon
                size="md"
                active={uiStore.showGrid}
                onClick={() => uiActions.toggleGrid()}
                title="Toggle Grid"
            >
                <GridIcon />
            </Button>

            {/* Edit Mode Toggle */}
            <Button
                variant="ghost"
                icon
                size="md"
                active={uiStore.interactionMode === 'edit'}
                onClick={() => uiActions.toggleInteractionMode()}
                title={`Mode: ${uiStore.interactionMode === 'object' ? 'Object' : 'Edit'} (Tab to toggle)`}
            >
                <EditModeIcon />
            </Button>

            {/* Mode indicator */}
            <span class={`text-xs px-2 py-0.5 rounded ${uiStore.interactionMode === 'edit' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-surface-700 text-surface-400'}`}>
                {uiStore.interactionMode === 'edit' ? 'Edit' : 'Object'}
            </span>

            {/* Spacer */}
            <div class="flex-1" />

            {/* Project name */}
            <div class="text-sm text-surface-400 hidden md:block">
                {sceneStore.name}
                {sceneStore.isDirty && <span class="text-primary-400 ml-1">*</span>}
            </div>
        </div>
    );
};
