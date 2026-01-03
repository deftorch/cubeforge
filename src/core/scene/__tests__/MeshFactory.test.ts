import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { MeshFactory, getMeshFactory } from '../MeshFactory';
import type { Cube, CubeMaterial } from '@/types';

// Mock cube data
const createMockCube = (overrides: Partial<Cube> = {}): Cube => ({
    id: 'test-cube-1',
    name: 'Test Cube',
    transform: {
        position: new THREE.Vector3(1, 2, 3),
        rotation: new THREE.Euler(0.1, 0.2, 0.3),
        scale: new THREE.Vector3(1, 1, 1),
    },
    material: {
        color: '#ff0000',
        metalness: 0.5,
        roughness: 0.5,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0,
    },
    layerId: 'default-layer',
    visible: true,
    locked: false,
    ...overrides,
});

describe('MeshFactory', () => {
    let factory: MeshFactory;

    beforeEach(() => {
        factory = new MeshFactory();
    });

    describe('createMesh', () => {
        it('should create a mesh with correct properties', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            expect(mesh).toBeInstanceOf(THREE.Mesh);
            expect(mesh.name).toBe(cube.id);
            expect(mesh.userData.cubeId).toBe(cube.id);
        });

        it('should apply transform correctly', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            expect(mesh.position.x).toBe(1);
            expect(mesh.position.y).toBe(2);
            expect(mesh.position.z).toBe(3);
        });

        it('should enable shadows', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            expect(mesh.castShadow).toBe(true);
            expect(mesh.receiveShadow).toBe(true);
        });

        it('should use BoxGeometry', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
        });
    });

    describe('createMaterial', () => {
        it('should create MeshStandardMaterial with correct properties', () => {
            const materialData: CubeMaterial = {
                color: '#00ff00',
                metalness: 0.8,
                roughness: 0.2,
                opacity: 0.9,
                emissive: '#111111',
                emissiveIntensity: 0.5,
            };

            const material = factory.createMaterial(materialData);

            expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
            expect(material.metalness).toBe(0.8);
            expect(material.roughness).toBe(0.2);
            expect(material.opacity).toBe(0.9);
            expect(material.transparent).toBe(true); // opacity < 1
        });

        it('should not be transparent when opacity is 1', () => {
            const materialData: CubeMaterial = {
                color: '#ffffff',
                metalness: 0,
                roughness: 1,
                opacity: 1,
                emissive: '#000000',
                emissiveIntensity: 0,
            };

            const material = factory.createMaterial(materialData);

            expect(material.transparent).toBe(false);
        });
    });

    describe('updateMeshMaterial', () => {
        it('should update color', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            factory.updateMeshMaterial(mesh, { color: '#0000ff' });

            const material = mesh.material as THREE.MeshStandardMaterial;
            expect(material.color.getHexString()).toBe('0000ff');
        });

        it('should update metalness and roughness', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            factory.updateMeshMaterial(mesh, { metalness: 0.9, roughness: 0.1 });

            const material = mesh.material as THREE.MeshStandardMaterial;
            expect(material.metalness).toBe(0.9);
            expect(material.roughness).toBe(0.1);
        });

        it('should update opacity and transparency', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            factory.updateMeshMaterial(mesh, { opacity: 0.5 });

            const material = mesh.material as THREE.MeshStandardMaterial;
            expect(material.opacity).toBe(0.5);
            expect(material.transparent).toBe(true);
        });
    });

    describe('updateMeshTransform', () => {
        it('should update position', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            factory.updateMeshTransform(mesh, {
                position: new THREE.Vector3(10, 20, 30),
            });

            expect(mesh.position.x).toBe(10);
            expect(mesh.position.y).toBe(20);
            expect(mesh.position.z).toBe(30);
        });

        it('should update scale', () => {
            const cube = createMockCube();
            const mesh = factory.createMesh(cube);

            factory.updateMeshTransform(mesh, {
                scale: new THREE.Vector3(2, 3, 4),
            });

            expect(mesh.scale.x).toBe(2);
            expect(mesh.scale.y).toBe(3);
            expect(mesh.scale.z).toBe(4);
        });
    });

    describe('getMeshFactory singleton', () => {
        it('should return the same instance', () => {
            const instance1 = getMeshFactory();
            const instance2 = getMeshFactory();

            expect(instance1).toBe(instance2);
        });
    });
});
