import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { CameraState } from '@/types';
import type { TransformMode } from '@/stores/uiStore';

import type { ISceneManager } from '@/core/interfaces';
import { InfiniteGrid } from '@/core/viewport/InfiniteGrid';
import { InfiniteAxes } from '@/core/viewport/InfiniteAxes';

/**
 * SceneManager - Manages Three.js scene, camera, renderer, and render loop
 */
export class SceneManager implements ISceneManager {
    // Three.js core
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    // Controls
    public orbitControls: OrbitControls;
    public transformControls: TransformControls;

    // Helpers
    public infiniteGrid: InfiniteGrid;
    public infiniteAxes: InfiniteAxes;

    // Mesh registry
    private meshRegistry: Map<string, THREE.Mesh> = new Map();

    // Animation
    private animationId: number | null = null;
    private isRunning = false;

    // Container
    private container: HTMLElement | null = null;

    // Initial camera config (for reset)
    private initialCameraConfig: CameraState;

    constructor(cameraConfig: CameraState) {
        this.initialCameraConfig = cameraConfig;
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#1a1a2e');

        // Create camera
        const { position, target, fov, near, far } = cameraConfig;
        this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
        this.camera.position.set(...position);
        this.camera.lookAt(new THREE.Vector3(...target));

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Create orbit controls
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.zoomSpeed = 1.2;
        this.orbitControls.panSpeed = 0.8;
        this.orbitControls.rotateSpeed = 0.6;
        this.orbitControls.target.set(...target);

        // Create transform controls
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setSpace('world');
        this.scene.add(this.transformControls.getHelper());

        // Disable orbit controls when using transform controls
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
        });

        // Create infinite grid (Blender-style)
        this.infiniteGrid = new InfiniteGrid({
            size1: 1,
            size2: 10,
            color: new THREE.Color(0x444466),
            distance: 100,
            axisColors: true,
        });
        this.scene.add(this.infiniteGrid);

        // Create infinite axes
        this.infiniteAxes = new InfiniteAxes({
            length: 1000,
            opacity: 0.8,
            fadeDistance: 500,
        });
        this.scene.add(this.infiniteAxes);

        // Setup lighting
        this.setupLighting();
    }

    /**
     * Setup scene lighting
     */
    private setupLighting(): void {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404080, 0.4);
        this.scene.add(ambient);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        mainLight.shadow.bias = -0.001;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Ground plane for shadows
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    /**
     * Mount renderer to a container element
     */
    mount(container: HTMLElement): void {
        this.container = container;
        container.appendChild(this.renderer.domElement);
        this.resize();
        this.start();

        // Handle resize
        window.addEventListener('resize', this.handleResize);

        // Also observe container size changes
        const resizeObserver = new ResizeObserver(() => this.resize());
        resizeObserver.observe(container);
    }

    /**
     * Unmount and cleanup
     */
    unmount(): void {
        this.stop();
        window.removeEventListener('resize', this.handleResize);

        if (this.container && this.renderer.domElement.parentElement) {
            this.container.removeChild(this.renderer.domElement);
        }

        this.container = null;
    }

    /**
     * Handle resize event
     */
    private handleResize = (): void => {
        this.resize();
    };

    /**
     * Resize renderer to container size
     */
    resize(): void {
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Start render loop
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    /**
     * Stop render loop
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate);

        // Update controls
        this.orbitControls.update();

        // Update infinite grid based on camera position
        this.infiniteGrid.updateFromCamera(this.camera);

        // Render
        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Set transform mode
     */
    setTransformMode(mode: TransformMode): void {
        this.transformControls.setMode(mode);
    }

    /**
     * Set transform space (local/world)
     */
    setTransformSpace(space: 'local' | 'world'): void {
        this.transformControls.setSpace(space);
    }

    /**
     * Attach transform controls to a mesh
     */
    attachTransformControls(cubeId: string): void {
        const mesh = this.meshRegistry.get(cubeId);
        if (mesh) {
            this.transformControls.attach(mesh);
        }
    }

    /**
     * Detach transform controls
     */
    detachTransformControls(): void {
        this.transformControls.detach();
    }

    /**
     * Toggle grid visibility
     */
    setGridVisible(visible: boolean): void {
        this.infiniteGrid.setVisible(visible);
    }

    /**
     * Toggle axes visibility
     */
    setAxesVisible(visible: boolean): void {
        this.infiniteAxes.setVisible(visible);
    }

    /**
     * Set grid overlay options
     */
    setGridOverlays(options: {
        showGrid?: boolean;
        showFloor?: boolean;
        showAxisX?: boolean;
        showAxisY?: boolean;
        showAxisZ?: boolean;
    }): void {
        this.infiniteGrid.setOverlays(options);
    }

    /**
     * Set origins visibility
     */
    setOriginsVisible(visible: boolean): void {
        this.meshRegistry.forEach((mesh) => {
            // Check if axes helper exists
            const axes = mesh.getObjectByName('OriginAxes');
            if (visible) {
                if (!axes) {
                    const newAxes = new THREE.AxesHelper(1.0);
                    newAxes.name = 'OriginAxes';
                    // Make sure axes renders on top of its parent mesh if inside
                    (newAxes.material as THREE.Material).depthTest = false;
                    (newAxes.material as THREE.Material).depthWrite = false;
                    newAxes.renderOrder = 999;
                    mesh.add(newAxes);
                } else {
                    axes.visible = true;
                }
            } else {
                if (axes) {
                    axes.visible = false;
                }
            }
        });
    }

    /**
     * Add a mesh to the scene
     */
    addMesh(cubeId: string, mesh: THREE.Mesh): void {
        this.meshRegistry.set(cubeId, mesh);
        this.scene.add(mesh);

        // Add Origin Axis if needed (re-check state from store if we had access, 
        // but easier to just add it hidden or check global flag if stored consistently)
        // For now, let's just rely on the toggle update loop or check UI store? 
        // Accessing UI store here creates a circular dependency potentially if UI store imports SceneManager.
        // Instead, we can just leave it to the next update cycle or add it hidden by default.
    }

    /**
     * Remove a mesh from the scene
     */
    removeMesh(cubeId: string): void {
        const mesh = this.meshRegistry.get(cubeId);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }

            // Cleanup children (like axes)
            mesh.children.forEach(child => {
                if (child instanceof THREE.AxesHelper) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });

            this.meshRegistry.delete(cubeId);
        }
    }

    /**
     * Get mesh by cube ID
     */
    getMesh(cubeId: string): THREE.Mesh | undefined {
        return this.meshRegistry.get(cubeId);
    }

    /**
     * Get all meshes
     */
    getAllMeshes(): THREE.Mesh[] {
        return Array.from(this.meshRegistry.values());
    }

    /**
     * Focus camera on target
     */
    focusOn(target: THREE.Vector3): void {
        this.orbitControls.target.copy(target);

        // Animate camera position
        const direction = this.camera.position.clone().sub(this.orbitControls.target).normalize();
        const distance = 5;
        const newPosition = target.clone().add(direction.multiplyScalar(distance));

        this.camera.position.copy(newPosition);
        this.orbitControls.update();
    }

    /**
     * Reset camera to default position
     */
    resetCamera(): void {
        const { position, target } = this.initialCameraConfig;
        this.camera.position.set(...position);
        this.orbitControls.target.set(...target);
        this.orbitControls.update();
    }

    /**
     * Convert screen coordinates to world position
     * Uses raycasting on a ground plane (Y=0.5 for cube center height)
     */
    screenToWorld(clientX: number, clientY: number): THREE.Vector3 {
        if (!this.container) {
            return new THREE.Vector3(0, 0.5, 0);
        }

        const rect = this.container.getBoundingClientRect();

        // Convert to normalized device coordinates (-1 to +1)
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;

        // Create raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        // Create a ground plane at Y = 0.5 (cube center height)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
        const intersection = new THREE.Vector3();

        // Find intersection with ground plane
        if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
            return intersection;
        }

        // Fallback: project to a point 10 units in front of camera
        return raycaster.ray.at(10, new THREE.Vector3());
    }

    /**
     * Get canvas element
     */
    getCanvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        this.stop();

        // Dispose all meshes
        for (const cubeId of this.meshRegistry.keys()) {
            this.removeMesh(cubeId);
        }

        // Dispose controls
        this.orbitControls.dispose();
        this.transformControls.dispose();

        // Dispose renderer
        this.renderer.dispose();
    }
}

// Singleton instance
let sceneManagerInstance: SceneManager | null = null;

// Import sceneStore only for the singleton factory function
import { sceneStore } from '@/stores/sceneStore';

export function getSceneManager(): SceneManager {
    if (!sceneManagerInstance) {
        sceneManagerInstance = new SceneManager(sceneStore.camera);
    }
    return sceneManagerInstance;
}

export function resetSceneManager(): void {
    if (sceneManagerInstance) {
        sceneManagerInstance.dispose();
        sceneManagerInstance = null;
    }
}
