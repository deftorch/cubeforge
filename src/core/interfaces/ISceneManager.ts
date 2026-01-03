import * as THREE from 'three';
import type { TransformMode } from '@/stores/uiStore';

/**
 * Interface for SceneManager
 * Abstracts Three.js scene operations
 */
export interface ISceneManager {
    // Scene access
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;

    // Mesh management
    addMesh(cubeId: string, mesh: THREE.Mesh): void;
    removeMesh(cubeId: string): void;
    getMesh(cubeId: string): THREE.Mesh | undefined;
    getAllMeshes(): THREE.Mesh[];

    // Transform controls
    attachTransformControls(cubeId: string): void;
    detachTransformControls(): void;
    setTransformMode(mode: TransformMode): void;
    setTransformSpace(space: 'local' | 'world'): void;

    // Grid and Axes
    setGridVisible(visible: boolean): void;
    setAxesVisible(visible: boolean): void;

    // Camera
    focusOn(target: THREE.Vector3): void;
    resetCamera(): void;

    // Canvas
    getCanvas(): HTMLCanvasElement;

    // Coordinate conversion
    screenToWorld(clientX: number, clientY: number): THREE.Vector3;
}
