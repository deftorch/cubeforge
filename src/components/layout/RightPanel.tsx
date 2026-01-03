import { Component, Show, createMemo } from 'solid-js';
import * as THREE from 'three';
import { sceneStore, sceneActions } from '@/stores/sceneStore';
import { selectionStore, selectionActions } from '@/stores/selectionStore';
import { useCoreContext } from '@/components/CoreProvider';
import { Vector3Input } from '@/components/ui/Input';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { HorizontalSlider } from '@/components/ui/HorizontalSlider';
import { radToDeg, degToRad } from '@/utils/math';

export const RightPanel: Component = () => {
    const { cubeManager, hierarchyManager } = useCoreContext();

    // Get first selected cube for editing
    const selectedCube = createMemo(() => {
        const ids = selectionActions.getSelectedIds();
        if (ids.length === 0) return null;
        return sceneStore.cubes[ids[0]];
    });

    const selectionCount = () => selectionStore.selectedIds.size;

    // Get cubes that are valid parents (delegates to HierarchyManager)
    const getAvailableParents = (cubeId: string) => hierarchyManager.getAvailableParents(cubeId);

    // Handle transform updates
    const updatePosition = (value: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateTransform(cube.id, {
            position: new THREE.Vector3(value.x, value.y, value.z),
        });
    };

    const commitPosition = (value: { x: number; y: number; z: number }, originalValue: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateCubeWithUndo(
            cube.id,
            {
                transform: {
                    ...cube.transform,
                    position: new THREE.Vector3(value.x, value.y, value.z)
                }
            },
            `Move ${cube.name}`,
            {
                transform: {
                    ...cube.transform,
                    position: new THREE.Vector3(originalValue.x, originalValue.y, originalValue.z)
                }
            }
        );
    };

    const updateRotation = (value: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateTransform(cube.id, {
            rotation: new THREE.Euler(
                degToRad(value.x),
                degToRad(value.y),
                degToRad(value.z)
            ),
        });
    };

    const commitRotation = (value: { x: number; y: number; z: number }, originalValue: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateCubeWithUndo(
            cube.id,
            {
                transform: {
                    ...cube.transform,
                    rotation: new THREE.Euler(
                        degToRad(value.x),
                        degToRad(value.y),
                        degToRad(value.z)
                    )
                }
            },
            `Rotate ${cube.name}`,
            {
                transform: {
                    ...cube.transform,
                    rotation: new THREE.Euler(
                        degToRad(originalValue.x),
                        degToRad(originalValue.y),
                        degToRad(originalValue.z)
                    )
                }
            }
        );
    };

    const updateScale = (value: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateTransform(cube.id, {
            scale: new THREE.Vector3(value.x, value.y, value.z),
        });
    };

    const commitScale = (value: { x: number; y: number; z: number }, originalValue: { x: number; y: number; z: number }) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateCubeWithUndo(
            cube.id,
            {
                transform: {
                    ...cube.transform,
                    scale: new THREE.Vector3(value.x, value.y, value.z)
                }
            },
            `Scale ${cube.name}`,
            {
                transform: {
                    ...cube.transform,
                    scale: new THREE.Vector3(originalValue.x, originalValue.y, originalValue.z)
                }
            }
        );
    };

    // Handle material updates
    const updateColor = (color: string) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterial(cube.id, { color });
    };

    const commitColor = (color: string, originalColor: string) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterialWithUndo(cube.id, { color }, { color: originalColor });
    };

    const updateMetalness = (metalness: number) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterial(cube.id, { metalness });
    };

    const commitMetalness = (metalness: number, originalMetalness: number) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterialWithUndo(cube.id, { metalness }, { metalness: originalMetalness });
    };

    const updateRoughness = (roughness: number) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterial(cube.id, { roughness });
    };

    const commitRoughness = (roughness: number, originalRoughness: number) => {
        const cube = selectedCube();
        if (!cube) return;

        cubeManager.updateMaterialWithUndo(cube.id, { roughness }, { roughness: originalRoughness });
    };

    // Handle name change
    const updateName = (event: Event) => {
        const cube = selectedCube();
        if (!cube) return;

        const name = (event.target as HTMLInputElement).value;
        cubeManager.rename(cube.id, name);
    };

    const commitName = (event: Event) => {
        const cube = selectedCube();
        if (!cube) return;

        const name = (event.target as HTMLInputElement).value;
        cubeManager.renameWithUndo(cube.id, name);
    };

    return (
        <div class="w-72 bg-surface-800 border-l border-surface-700 flex flex-col">
            {/* Header */}
            <div class="px-3 py-2 border-b border-surface-700">
                <h2 class="text-sm font-medium text-surface-200">Properties</h2>
            </div>

            {/* Content */}
            <div class="flex-1 overflow-y-auto">
                <Show
                    when={selectedCube()}
                    fallback={
                        <div class="p-4 text-center text-surface-500 text-sm">
                            Select a cube to edit its properties.
                        </div>
                    }
                >
                    {(cube) => (
                        <div class="p-3 space-y-4">
                            {/* Multi-selection info */}
                            <Show when={selectionCount() > 1}>
                                <div class="px-2 py-1.5 bg-primary-600/20 border border-primary-500/30 rounded text-sm text-primary-200">
                                    {selectionCount()} cubes selected
                                </div>
                            </Show>

                            {/* Name */}
                            <div>
                                <label class="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={cube().name}
                                    onInput={updateName}
                                    onChange={commitName}
                                    class="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-100
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            {/* Parent Selector */}
                            <div>
                                <label class="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                                    Parent
                                </label>
                                <select
                                    value={cube().parentId ?? ''}
                                    onChange={(e) => {
                                        const newParentId = e.currentTarget.value || undefined;
                                        cubeManager.parentCube(cube().id, newParentId);
                                    }}
                                    class="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-100
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">None</option>
                                    {getAvailableParents(cube().id).map(c => (
                                        <option value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Transform Section */}
                            <div class="space-y-3">
                                <h3 class="text-xs font-semibold text-surface-300 uppercase tracking-wider border-b border-surface-700 pb-1">
                                    Transform
                                </h3>

                                {/* Position */}
                                <Vector3Input
                                    label="Position"
                                    value={{
                                        x: cube().transform.position.x,
                                        y: cube().transform.position.y,
                                        z: cube().transform.position.z,
                                    }}
                                    onChange={updatePosition}
                                    onCommit={commitPosition}
                                    step={0.1}
                                />

                                {/* Rotation (in degrees for UI) */}
                                <Vector3Input
                                    label="Rotation"
                                    value={{
                                        x: radToDeg(cube().transform.rotation.x),
                                        y: radToDeg(cube().transform.rotation.y),
                                        z: radToDeg(cube().transform.rotation.z),
                                    }}
                                    onChange={updateRotation}
                                    onCommit={commitRotation}
                                    step={5}
                                />

                                {/* Scale */}
                                <Vector3Input
                                    label="Scale"
                                    value={{
                                        x: cube().transform.scale.x,
                                        y: cube().transform.scale.y,
                                        z: cube().transform.scale.z,
                                    }}
                                    onChange={updateScale}
                                    onCommit={commitScale}
                                    step={0.1}
                                />
                            </div>

                            {/* Material Section */}
                            <div class="space-y-3">
                                <h3 class="text-xs font-semibold text-surface-300 uppercase tracking-wider border-b border-surface-700 pb-1">
                                    Material
                                </h3>

                                {/* Color */}
                                <ColorPicker
                                    label="Color"
                                    value={cube().material.color}
                                    onChange={updateColor}
                                    onCommit={commitColor}
                                />

                                {/* Metallic */}
                                <HorizontalSlider
                                    label="Metallic"
                                    value={cube().material.metalness}
                                    min={0}
                                    max={1}
                                    step={0.001}
                                    precision={3}
                                    onChange={updateMetalness}
                                    onCommit={commitMetalness}
                                    fillColor="#4a9eff"
                                />

                                {/* Roughness */}
                                <HorizontalSlider
                                    label="Roughness"
                                    value={cube().material.roughness}
                                    min={0}
                                    max={1}
                                    step={0.001}
                                    precision={3}
                                    onChange={updateRoughness}
                                    onCommit={commitRoughness}
                                    fillColor="#4a9eff"
                                />
                            </div>
                        </div>
                    )}
                </Show>
            </div>
        </div>
    );
};
