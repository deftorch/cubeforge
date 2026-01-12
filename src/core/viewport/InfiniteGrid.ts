import * as THREE from 'three';

/**
 * InfiniteGrid - Shader-based infinite grid like Blender
 * 
 * Features:
 * - Truly infinite (rendered procedurally in shader)
 * - Adaptive subdivision based on camera distance
 * - Fade effect at edges
 * - Support for orthographic and perspective cameras
 * - View-aligned grid planes (XZ, XY, YZ)
 */

// Grid plane types
export type GridPlane = 'xz' | 'xy' | 'yz';

// Vertex shader
const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vPosition;

void main() {
    vPosition = position;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment shader - supports multiple plane orientations
const fragmentShader = `
uniform float uSize1;
uniform float uSize2;
uniform vec3 uColor;
uniform float uDistance;
uniform float uFadeStrength;
uniform float uAxisColorStrength;
uniform int uPlaneType; // 0 = XZ, 1 = XY, 2 = YZ
uniform bool uShowGrid;
uniform bool uShowFloor;
uniform bool uShowAxisX;
uniform bool uShowAxisY;
uniform bool uShowAxisZ;

varying vec3 vWorldPosition;
varying vec3 vPosition;

// Get 2D coordinates based on plane type
vec2 getPlaneCoords() {
    if (uPlaneType == 1) {
        return vWorldPosition.xy; // XY plane (front/back view)
    } else if (uPlaneType == 2) {
        return vWorldPosition.yz; // YZ plane (left/right view)
    }
    return vWorldPosition.xz; // XZ plane (floor - default)
}

float getGrid(float size, vec2 coords) {
    vec2 r = coords / size;
    vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
    float line = min(grid.x, grid.y);
    return 1.0 - min(line, 1.0);
}

void main() {
    vec2 planeCoords = getPlaneCoords();
    float d = 1.0 - min(length(planeCoords) / uDistance, 1.0);
    
    // Grid lines
    float grid = 0.0;
    if (uShowGrid) {
        float g1 = getGrid(uSize1, planeCoords);
        float g2 = getGrid(uSize2, planeCoords);
        grid = g1 * 0.5 + g2;
    }
    
    // Fade based on distance
    float fade = pow(d, uFadeStrength);
    
    // Axis highlighting based on plane type
    vec3 color = uColor;
    float axisWidth = 0.06;
    bool isAxis = false;
    
    if (uPlaneType == 0) {
        // XZ plane: X axis (red) along Z=0, Z axis (blue) along X=0
        if (abs(vWorldPosition.z) < axisWidth * uSize1) {
            if (uShowAxisX) {
                color = mix(color, vec3(0.85, 0.2, 0.2), uAxisColorStrength);
                isAxis = true;
            }
        }
        if (abs(vWorldPosition.x) < axisWidth * uSize1) {
             if (uShowAxisZ) { // Note: Z axis is blue
                color = mix(color, vec3(0.2, 0.4, 0.85), uAxisColorStrength);
                isAxis = true;
            }
        }
    } else if (uPlaneType == 1) {
        // XY plane: X axis (red) along Y=0, Y axis (green) along X=0
        if (abs(vWorldPosition.y) < axisWidth * uSize1) {
            if (uShowAxisX) {
                color = mix(color, vec3(0.85, 0.2, 0.2), uAxisColorStrength);
                isAxis = true;
            }
        }
        if (abs(vWorldPosition.x) < axisWidth * uSize1) {
            if (uShowAxisY) {
                color = mix(color, vec3(0.2, 0.85, 0.2), uAxisColorStrength);
                isAxis = true;
            }
        }
    } else if (uPlaneType == 2) {
        // YZ plane: Y axis (green) along Z=0, Z axis (blue) along Y=0
        if (abs(vWorldPosition.z) < axisWidth * uSize1) {
            if (uShowAxisY) {
                color = mix(color, vec3(0.2, 0.85, 0.2), uAxisColorStrength);
                isAxis = true;
            }
        }
        if (abs(vWorldPosition.y) < axisWidth * uSize1) {
             if (uShowAxisZ) {
                color = mix(color, vec3(0.2, 0.4, 0.85), uAxisColorStrength);
                isAxis = true;
            }
        }
    }
    
    float alpha = grid * fade;

    // Floor visibility (just the axes if grid is off, or everything?)
    // If showFloor is false, we verify if maybe we should still show axes?
    // Usually "Floor" implies the grid plane.
    // If uShowFloor is false, we might want to hide the grid lines but keep axes if they are enabled?
    // Or maybe uShowFloor controls the grid lines visibility primarily on the floor plane?
    // Let's assume uShowGrid controls the lines everywhere.
    // And uShowFloor might be redundant if we just use uShowGrid?
    // In Blender "Floor" checkbox toggles the grid on the floor plane.
    
    // Logic update:
    // If we are on XZ plane (Floor) and uShowFloor is false, hide grid lines.
    // Axes are independent.
    
    if (uPlaneType == 0 && !uShowFloor) {
        alpha = 0.0;
    }
    
    // Always show axes if enabled, even if floor/grid is off
    if (isAxis) {
        alpha = max(alpha, fade); // Ensure axes are visible
    } else {
        // If not an axis, apply grid visibility rules
        if ((!uShowGrid && !isAxis) || (uPlaneType == 0 && !uShowFloor && !isAxis)) {
             alpha = 0.0;
        }
    }
    
    if (alpha <= 0.0) discard;
    
    gl_FragColor = vec4(color, alpha);
}
`;

export interface InfiniteGridOptions {
    size1?: number;        // Small grid size
    size2?: number;        // Large grid size (usually 10x size1)
    color?: THREE.Color;   // Grid color
    distance?: number;     // Fade distance
    fadeStrength?: number; // How quickly grid fades
    axisColors?: boolean;  // Show colored axis lines
    plane?: GridPlane;     // Initial plane orientation
}

export class InfiniteGrid extends THREE.Mesh {
    private uniforms: {
        uSize1: { value: number };
        uSize2: { value: number };
        uColor: { value: THREE.Color };
        uDistance: { value: number };
        uFadeStrength: { value: number };
        uAxisColorStrength: { value: number };
        uPlaneType: { value: number };
        uShowGrid: { value: boolean };
        uShowFloor: { value: boolean };
        uShowAxisX: { value: boolean };
        uShowAxisY: { value: boolean };
        uShowAxisZ: { value: boolean };
    };

    private currentPlane: GridPlane = 'xz';
    private userScale: number = 1.0;
    private userSubdivisions: number = 10;

    constructor(options: InfiniteGridOptions = {}) {
        const {
            size1 = 1,
            size2 = 10,
            color = new THREE.Color(0x444466),
            distance = 100,
            fadeStrength = 1.5,
            axisColors = true,
            plane = 'xz',
        } = options;

        // Create a large plane geometry
        const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

        // Uniforms for shader
        const uniforms = {
            uSize1: { value: size1 },
            uSize2: { value: size2 },
            uColor: { value: color },
            uDistance: { value: distance },
            uFadeStrength: { value: fadeStrength },
            uAxisColorStrength: { value: axisColors ? 1.0 : 0.0 },
            uPlaneType: { value: 0 }, // 0 = XZ, 1 = XY, 2 = YZ
            uShowGrid: { value: true },
            uShowFloor: { value: true },
            uShowAxisX: { value: true },
            uShowAxisY: { value: true },
            uShowAxisZ: { value: false },
        };

        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
        });

        super(geometry, material);

        this.uniforms = uniforms;
        this.currentPlane = plane;

        // Set initial plane orientation
        this.setPlane(plane);

        // Make it render behind other objects but still visible
        this.renderOrder = -1;

        // Disable frustum culling so grid is always rendered
        this.frustumCulled = false;

        this.name = 'InfiniteGrid';
    }

    /**
     * Set the grid plane orientation
     * XZ = floor (default), XY = front/back view, YZ = left/right view
     */
    setPlane(plane: GridPlane): void {
        this.currentPlane = plane;

        // Reset rotation
        this.rotation.set(0, 0, 0);

        switch (plane) {
            case 'xz': // Floor plane (default)
                this.rotation.x = -Math.PI / 2;
                this.uniforms.uPlaneType.value = 0;
                break;
            case 'xy': // Front/Back view plane
                // No rotation needed, plane is already XY
                this.uniforms.uPlaneType.value = 1;
                break;
            case 'yz': // Left/Right view plane
                this.rotation.y = Math.PI / 2;
                this.uniforms.uPlaneType.value = 2;
                break;
        }
    }

    /**
     * Get current plane
     */
    getPlane(): GridPlane {
        return this.currentPlane;
    }

    /**
     * Update grid based on camera position
     * Call this in the render loop for adaptive subdivision
     */
    updateFromCamera(camera: THREE.Camera): void {
        // Position the grid plane based on current orientation
        switch (this.currentPlane) {
            case 'xz': // Floor
                this.position.x = camera.position.x;
                this.position.z = camera.position.z;
                this.position.y = 0;
                break;
            case 'xy': // Front/Back
                this.position.x = camera.position.x;
                this.position.y = camera.position.y;
                this.position.z = 0;
                break;
            case 'yz': // Left/Right
                this.position.y = camera.position.y;
                this.position.z = camera.position.z;
                this.position.x = 0;
                break;
        }

        // Calculate appropriate grid sizes based on camera distance
        let cameraDistance: number;

        if (camera instanceof THREE.OrthographicCamera) {
            // For orthographic, use the visible height
            cameraDistance = (camera.top - camera.bottom) / camera.zoom;
        } else {
            // For perspective, use distance from grid plane
            switch (this.currentPlane) {
                case 'xz':
                    cameraDistance = Math.abs(camera.position.y);
                    break;
                case 'xy':
                    cameraDistance = Math.abs(camera.position.z);
                    break;
                case 'yz':
                    cameraDistance = Math.abs(camera.position.x);
                    break;
                default:
                    cameraDistance = camera.position.y;
            }
        }

        // Adaptive grid sizing with user scale and subdivisions
        const step = Math.max(2, this.userSubdivisions); // Minimum step of 2 to avoid infinite loop/log issues
        const normalizedDist = Math.max(cameraDistance, 0.001) / this.userScale;

        // Calculate level based on subdivisions step instead of fixed 10
        const level = Math.floor(Math.log(Math.max(normalizedDist, 1)) / Math.log(step));

        // Calculate sizes and apply user scale
        const size1 = Math.pow(step, level - 1) * this.userScale;
        const size2 = Math.pow(step, level) * this.userScale;

        this.uniforms.uSize1.value = size1;
        this.uniforms.uSize2.value = size2;

        // Scale the plane to cover visible area
        const scaleFactor = this.uniforms.uDistance.value * 2;
        this.scale.set(scaleFactor, scaleFactor, 1);
    }

    /**
     * Set grid visibility
     */
    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    /**
     * Set grid color
     */
    setColor(color: THREE.Color): void {
        this.uniforms.uColor.value = color;
    }

    /**
     * Toggle axis colors
     */
    setAxisColors(enabled: boolean): void {
        this.uniforms.uAxisColorStrength.value = enabled ? 1.0 : 0.0;
    }

    /**
     * Set overlays visibility
     */
    setOverlays(options: {
        showGrid?: boolean;
        showFloor?: boolean;
        showAxisX?: boolean;
        showAxisY?: boolean;
        showAxisZ?: boolean;
        gridScale?: number;
        gridSubdivisions?: number;
    }): void {
        if (options.showGrid !== undefined) this.uniforms.uShowGrid.value = options.showGrid;
        if (options.showFloor !== undefined) this.uniforms.uShowFloor.value = options.showFloor;
        if (options.showAxisX !== undefined) this.uniforms.uShowAxisX.value = options.showAxisX;
        if (options.showAxisY !== undefined) this.uniforms.uShowAxisY.value = options.showAxisY;
        if (options.showAxisZ !== undefined) this.uniforms.uShowAxisZ.value = options.showAxisZ;

        if (options.gridScale !== undefined) this.userScale = Math.max(0.001, options.gridScale);
        if (options.gridSubdivisions !== undefined) this.userSubdivisions = Math.max(1, Math.floor(options.gridSubdivisions));
    }

    /**
     * Set fade distance
     */
    setFadeDistance(distance: number): void {
        this.uniforms.uDistance.value = distance;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.geometry.dispose();
        (this.material as THREE.ShaderMaterial).dispose();
    }
}

// Singleton pattern
let infiniteGridInstance: InfiniteGrid | null = null;

export function getInfiniteGrid(): InfiniteGrid {
    if (!infiniteGridInstance) {
        infiniteGridInstance = new InfiniteGrid();
    }
    return infiniteGridInstance;
}

export function resetInfiniteGrid(): void {
    if (infiniteGridInstance) {
        infiniteGridInstance.dispose();
        infiniteGridInstance = null;
    }
}
