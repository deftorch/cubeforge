import * as THREE from 'three';

/**
 * InfiniteAxes - Shader-based infinite axis lines like Blender
 * 
 * Features:
 * - Infinite X (red), Y (green), Z (blue) axis lines
 * - Passes through world origin (0,0,0)
 * - Properly handles depth with transparency fade
 */

// Vertex shader for axes
const vertexShader = `
attribute vec3 instanceColor;
varying vec3 vColor;
varying float vDepth;

void main() {
    vColor = instanceColor;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for axes
const fragmentShader = `
uniform float uFadeDistance;
uniform float uOpacity;

varying vec3 vColor;
varying float vDepth;

void main() {
    // Fade based on distance from camera
    float fade = 1.0 - smoothstep(0.0, uFadeDistance, vDepth);
    float alpha = uOpacity * fade;
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(vColor, alpha);
}
`;

export interface InfiniteAxesOptions {
    length?: number;       // Half-length of each axis line
    opacity?: number;      // Base opacity
    fadeDistance?: number; // Distance at which axes start fading
    lineWidth?: number;    // Line width (may not work on all GPUs)
}

export class InfiniteAxes extends THREE.Group {
    private xLine: THREE.Line;
    private yLine: THREE.Line;
    private zLine: THREE.Line;
    private material: THREE.ShaderMaterial;

    // Standard axis colors (Blender convention)
    static readonly X_COLOR = new THREE.Color(0xd64545); // Red
    static readonly Y_COLOR = new THREE.Color(0x5ad645); // Green  
    static readonly Z_COLOR = new THREE.Color(0x4596d6); // Blue

    constructor(options: InfiniteAxesOptions = {}) {
        super();

        const {
            length = 1000,
            opacity = 0.8,
            fadeDistance = 500,
        } = options;


        // Create shared material
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uFadeDistance: { value: fadeDistance },
                uOpacity: { value: opacity },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
        });

        // Create X axis (red) - along X direction
        this.xLine = this.createAxisLine(
            new THREE.Vector3(-length, 0, 0),
            new THREE.Vector3(length, 0, 0),
            InfiniteAxes.X_COLOR
        );

        // Create Y axis (green) - along Y direction (up in Three.js)
        this.yLine = this.createAxisLine(
            new THREE.Vector3(0, -length, 0),
            new THREE.Vector3(0, length, 0),
            InfiniteAxes.Y_COLOR
        );

        // Create Z axis (blue) - along Z direction
        this.zLine = this.createAxisLine(
            new THREE.Vector3(0, 0, -length),
            new THREE.Vector3(0, 0, length),
            InfiniteAxes.Z_COLOR
        );

        this.add(this.xLine, this.yLine, this.zLine);

        this.name = 'InfiniteAxes';
        this.renderOrder = 0;
    }

    private createAxisLine(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color): THREE.Line {
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array([
            start.x, start.y, start.z,
            end.x, end.y, end.z,
        ]);

        const colors = new Float32Array([
            color.r, color.g, color.b,
            color.r, color.g, color.b,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('instanceColor', new THREE.BufferAttribute(colors, 3));

        const material = this.material.clone();
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;

        return line;
    }

    /**
     * Update axes based on camera for infinite appearance
     */
    updateFromCamera(_camera: THREE.Camera): void {
        // For truly infinite appearance, we could reposition axes
        // but with large enough length, this isn't necessary
        // This method is here for API consistency with InfiniteGrid
    }

    /**
     * Set overall visibility
     */
    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    /**
     * Set individual axis visibility
     */
    setAxisVisible(axis: 'x' | 'y' | 'z', visible: boolean): void {
        switch (axis) {
            case 'x':
                this.xLine.visible = visible;
                break;
            case 'y':
                this.yLine.visible = visible;
                break;
            case 'z':
                this.zLine.visible = visible;
                break;
        }
    }

    /**
     * Set opacity
     */
    setOpacity(opacity: number): void {
        this.material.uniforms.uOpacity.value = opacity;
        [this.xLine, this.yLine, this.zLine].forEach(line => {
            (line.material as THREE.ShaderMaterial).uniforms.uOpacity.value = opacity;
        });
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        [this.xLine, this.yLine, this.zLine].forEach(line => {
            line.geometry.dispose();
            (line.material as THREE.ShaderMaterial).dispose();
        });
        this.material.dispose();
    }
}

// Singleton pattern
let infiniteAxesInstance: InfiniteAxes | null = null;

export function getInfiniteAxes(): InfiniteAxes {
    if (!infiniteAxesInstance) {
        infiniteAxesInstance = new InfiniteAxes();
    }
    return infiniteAxesInstance;
}

export function resetInfiniteAxes(): void {
    if (infiniteAxesInstance) {
        infiniteAxesInstance.dispose();
        infiniteAxesInstance = null;
    }
}
