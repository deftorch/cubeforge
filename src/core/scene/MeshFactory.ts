import * as THREE from 'three';
import type { Cube, CubeMaterial } from '@/types';

/**
 * MeshFactory - Factory for creating Three.js meshes
 * 
 * Extracted from CubeManager to follow Single Responsibility Principle.
 * Handles only mesh/material creation, not scene management.
 */
export class MeshFactory {
    /**
     * Create Three.js mesh for a cube
     */
    createMesh(cube: Cube): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.createMaterial(cube.material);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = cube.id;
        mesh.userData.cubeId = cube.id;

        // Apply transform
        mesh.position.copy(cube.transform.position);
        mesh.rotation.copy(cube.transform.rotation);
        mesh.scale.copy(cube.transform.scale);

        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    /**
     * Create Three.js material from CubeMaterial
     */
    createMaterial(material: CubeMaterial): THREE.MeshStandardMaterial {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(material.color),
            metalness: material.metalness,
            roughness: material.roughness,
            opacity: material.opacity,
            transparent: material.opacity < 1,
            emissive: new THREE.Color(material.emissive),
            emissiveIntensity: material.emissiveIntensity,
        });
    }

    /**
     * Update Three.js mesh material properties
     */
    updateMeshMaterial(mesh: THREE.Mesh, material: Partial<CubeMaterial>): void {
        if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;

        const mat = mesh.material;

        if (material.color !== undefined) {
            mat.color.set(material.color);
        }
        if (material.metalness !== undefined) {
            mat.metalness = material.metalness;
        }
        if (material.roughness !== undefined) {
            mat.roughness = material.roughness;
        }
        if (material.opacity !== undefined) {
            mat.opacity = material.opacity;
            mat.transparent = material.opacity < 1;
        }
        if (material.emissive !== undefined) {
            mat.emissive.set(material.emissive);
        }
        if (material.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = material.emissiveIntensity;
        }

        mat.needsUpdate = true;
    }

    /**
     * Update mesh transform from cube data
     */
    updateMeshTransform(
        mesh: THREE.Mesh,
        transform: Partial<Cube['transform']>
    ): void {
        if (transform.position) mesh.position.copy(transform.position);
        if (transform.rotation) mesh.rotation.copy(transform.rotation);
        if (transform.scale) mesh.scale.copy(transform.scale);
    }
}

// Singleton instance
let meshFactoryInstance: MeshFactory | null = null;

export function getMeshFactory(): MeshFactory {
    if (!meshFactoryInstance) {
        meshFactoryInstance = new MeshFactory();
    }
    return meshFactoryInstance;
}
