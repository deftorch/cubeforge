import type { Cube, Transform, CubeMaterial } from '@/types';

/**
 * Interface for Cube Store operations
 * Abstracts cube data access
 */
export interface ICubeStore {
    // Read operations
    getCube(cubeId: string): Cube | undefined;
    getAllCubes(): Cube[];
    getCubeCount(): number;

    // Write operations
    addCube(cube: Cube): void;
    removeCube(cubeId: string): void;
    updateCube(cubeId: string, updates: Partial<Cube>): void;
    updateCubeTransform(cubeId: string, transform: Partial<Transform>): void;
    updateCubeMaterial(cubeId: string, material: Partial<CubeMaterial>): void;
}
