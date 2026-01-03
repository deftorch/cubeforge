import * as THREE from 'three';

/**
 * NavigationGizmo - 3D orientation indicator in viewport corner
 * 
 * Like Blender's navigation gizmo:
 * - Shows current camera orientation
 * - Clickable axes to rotate to preset views
 * - Always visible in corner
 */

type ViewPreset = 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left';

interface GizmoAxis {
    mesh: THREE.Mesh;
    label: THREE.Sprite;
    axis: 'x' | 'y' | 'z';
    positive: boolean;
    viewPreset: ViewPreset;
}

export interface NavigationGizmoOptions {
    size?: number;         // Gizmo size in pixels
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    padding?: number;      // Padding from corner
}

export class NavigationGizmo {
    private gizmoScene: THREE.Scene;
    private gizmoCamera: THREE.OrthographicCamera;
    private container: HTMLElement | null = null;
    private gizmoElement: HTMLCanvasElement | null = null;
    private renderer: THREE.WebGLRenderer | null = null;

    private axes: GizmoAxis[] = [];
    private size: number;
    private position: string;
    private padding: number;

    private onViewChange: ((preset: ViewPreset) => void) | null = null;

    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private hoveredAxis: GizmoAxis | null = null;

    // Colors matching Blender
    static readonly COLORS = {
        x: { positive: 0xd64545, negative: 0x732626 },
        y: { positive: 0x5ad645, negative: 0x2e7326 },
        z: { positive: 0x4596d6, negative: 0x264a73 },
    };

    constructor(options: NavigationGizmoOptions = {}) {
        const {
            size = 100,
            position = 'top-right',
            padding = 10,
        } = options;

        this.size = size;
        this.position = position;
        this.padding = padding;

        // Create gizmo scene
        this.gizmoScene = new THREE.Scene();

        // Create orthographic camera for gizmo
        this.gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
        this.gizmoCamera.position.set(0, 0, 5);
        this.gizmoCamera.lookAt(0, 0, 0);

        this.createAxes();
    }

    private createAxes(): void {
        const axisLength = 1.2;
        const coneRadius = 0.15;
        const coneHeight = 0.35;

        // Create axis cones (arrows)
        const axes: { axis: 'x' | 'y' | 'z'; dir: THREE.Vector3; up: THREE.Vector3 }[] = [
            { axis: 'x', dir: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
            { axis: 'y', dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, 1) },
            { axis: 'z', dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
        ];

        const presetMap: Record<string, { positive: ViewPreset; negative: ViewPreset }> = {
            x: { positive: 'right', negative: 'left' },
            y: { positive: 'top', negative: 'bottom' },
            z: { positive: 'front', negative: 'back' },
        };

        axes.forEach(({ axis, dir }) => {
            // Positive direction cone
            const posColor = NavigationGizmo.COLORS[axis].positive;
            const posCone = this.createCone(
                dir.clone().multiplyScalar(axisLength),
                dir,
                coneRadius,
                coneHeight,
                posColor
            );
            const posLabel = this.createLabel(
                axis.toUpperCase(),
                dir.clone().multiplyScalar(axisLength + 0.3),
                posColor
            );

            this.gizmoScene.add(posCone, posLabel);
            this.axes.push({
                mesh: posCone,
                label: posLabel,
                axis,
                positive: true,
                viewPreset: presetMap[axis].positive,
            });

            // Negative direction (smaller, darker)
            const negColor = NavigationGizmo.COLORS[axis].negative;
            const negCone = this.createCone(
                dir.clone().multiplyScalar(-axisLength),
                dir.clone().negate(),
                coneRadius * 0.7,
                coneHeight * 0.7,
                negColor
            );

            this.gizmoScene.add(negCone);
            this.axes.push({
                mesh: negCone,
                label: null as unknown as THREE.Sprite, // No label for negative
                axis,
                positive: false,
                viewPreset: presetMap[axis].negative,
            });

            // Axis line
            const lineGeom = new THREE.BufferGeometry().setFromPoints([
                dir.clone().multiplyScalar(-axisLength * 0.8),
                dir.clone().multiplyScalar(axisLength * 0.8),
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: posColor,
                transparent: true,
                opacity: 0.6,
            });
            const line = new THREE.Line(lineGeom, lineMat);
            this.gizmoScene.add(line);
        });

        // Center sphere
        const sphereGeom = new THREE.SphereGeometry(0.15, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        this.gizmoScene.add(sphere);
    }

    private createCone(
        position: THREE.Vector3,
        direction: THREE.Vector3,
        radius: number,
        height: number,
        color: number
    ): THREE.Mesh {
        const geometry = new THREE.ConeGeometry(radius, height, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const cone = new THREE.Mesh(geometry, material);

        cone.position.copy(position);

        // Rotate cone to point in direction
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
        cone.quaternion.copy(quaternion);

        return cone;
    }

    private createLabel(text: string, position: THREE.Vector3, color: number): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const size = 64;
        canvas.width = size;
        canvas.height = size;

        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(0.5, 0.5, 1);

        return sprite;
    }

    /**
     * Mount gizmo to container
     */
    mount(container: HTMLElement, _mainRenderer: THREE.WebGLRenderer): void {
        this.container = container;

        // Create canvas for gizmo
        this.gizmoElement = document.createElement('canvas');
        this.gizmoElement.width = this.size * window.devicePixelRatio;
        this.gizmoElement.height = this.size * window.devicePixelRatio;
        this.gizmoElement.style.width = `${this.size}px`;
        this.gizmoElement.style.height = `${this.size}px`;
        this.gizmoElement.style.position = 'absolute';
        this.gizmoElement.style.pointerEvents = 'auto';
        this.gizmoElement.style.cursor = 'pointer';

        // Position based on setting
        this.updatePosition();

        container.appendChild(this.gizmoElement);

        // Create separate renderer for gizmo
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.gizmoElement,
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.size, this.size);
        this.renderer.setClearColor(0x000000, 0);

        // Event listeners
        this.gizmoElement.addEventListener('mousemove', this.handleMouseMove);
        this.gizmoElement.addEventListener('click', this.handleClick);
        this.gizmoElement.addEventListener('mouseleave', this.handleMouseLeave);
    }

    private updatePosition(): void {
        if (!this.gizmoElement) return;

        const style = this.gizmoElement.style;
        style.top = '';
        style.bottom = '';
        style.left = '';
        style.right = '';

        switch (this.position) {
            case 'top-left':
                style.top = `${this.padding}px`;
                style.left = `${this.padding}px`;
                break;
            case 'top-right':
                style.top = `${this.padding}px`;
                style.right = `${this.padding}px`;
                break;
            case 'bottom-left':
                style.bottom = `${this.padding}px`;
                style.left = `${this.padding}px`;
                break;
            case 'bottom-right':
                style.bottom = `${this.padding}px`;
                style.right = `${this.padding}px`;
                break;
        }
    }

    private handleMouseMove = (event: MouseEvent): void => {
        if (!this.gizmoElement) return;

        const rect = this.gizmoElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast for hover
        this.raycaster.setFromCamera(this.mouse, this.gizmoCamera);
        const meshes = this.axes.map(a => a.mesh);
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            this.hoveredAxis = this.axes.find(a => a.mesh === hitMesh) || null;
            this.gizmoElement.style.cursor = 'pointer';
        } else {
            this.hoveredAxis = null;
            this.gizmoElement.style.cursor = 'default';
        }
    };

    private handleClick = (): void => {
        if (this.hoveredAxis && this.onViewChange) {
            this.onViewChange(this.hoveredAxis.viewPreset);
        }
    };

    private handleMouseLeave = (): void => {
        this.hoveredAxis = null;
    };

    /**
     * Set callback for view changes
     */
    setOnViewChange(callback: (preset: ViewPreset) => void): void {
        this.onViewChange = callback;
    }

    /**
     * Update gizmo to match main camera orientation
     */
    update(mainCamera: THREE.Camera): void {
        // Copy rotation from main camera to gizmo camera
        // But keep gizmo camera at fixed distance
        const distance = 5;
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(mainCamera.quaternion);

        this.gizmoCamera.position.copy(direction.multiplyScalar(distance));
        this.gizmoCamera.quaternion.copy(mainCamera.quaternion);
    }

    /**
     * Render the gizmo
     */
    render(): void {
        if (!this.renderer) return;
        this.renderer.render(this.gizmoScene, this.gizmoCamera);
    }

    /**
     * Unmount and cleanup
     */
    unmount(): void {
        if (this.gizmoElement) {
            this.gizmoElement.removeEventListener('mousemove', this.handleMouseMove);
            this.gizmoElement.removeEventListener('click', this.handleClick);
            this.gizmoElement.removeEventListener('mouseleave', this.handleMouseLeave);
            this.gizmoElement.remove();
            this.gizmoElement = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.unmount();

        this.axes.forEach(axis => {
            axis.mesh.geometry.dispose();
            (axis.mesh.material as THREE.Material).dispose();
            if (axis.label) {
                (axis.label.material as THREE.SpriteMaterial).map?.dispose();
                (axis.label.material as THREE.SpriteMaterial).dispose();
            }
        });
    }
}

// Singleton
let navigationGizmoInstance: NavigationGizmo | null = null;

export function getNavigationGizmo(): NavigationGizmo {
    if (!navigationGizmoInstance) {
        navigationGizmoInstance = new NavigationGizmo();
    }
    return navigationGizmoInstance;
}

export function resetNavigationGizmo(): void {
    if (navigationGizmoInstance) {
        navigationGizmoInstance.dispose();
        navigationGizmoInstance = null;
    }
}
