import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { getViewController, ViewPreset } from '@/core/viewport/ViewController';
import { getSceneManager } from '@/core/scene/SceneManager';

interface FaceData {
    name: string;
    viewPreset: ViewPreset;
    oppositePreset: ViewPreset;
    normal: THREE.Vector3;
    color: string;
}

/**
 * Blender-style Interactive 3D Navigation Gizmo
 * A visual cube that shows current camera orientation and allows quick view changes
 */
export const NavigationGizmo: Component = () => {
    let canvasRef: HTMLCanvasElement | undefined;
    let animationId: number;

    // Mini scene for gizmo
    let gizmoScene: THREE.Scene;
    let gizmoCamera: THREE.OrthographicCamera;
    let gizmoRenderer: THREE.WebGLRenderer;
    let gizmoCube: THREE.Group;
    let raycaster: THREE.Raycaster;
    let mouse: THREE.Vector2;

    // Face meshes for raycasting
    let faceMeshes: THREE.Mesh[] = [];
    let cornerMeshes: THREE.Mesh[] = [];

    const [hoveredFace, setHoveredFace] = createSignal<string | null>(null);
    const [isDragging, setIsDragging] = createSignal(false);

    const viewController = getViewController();

    // Face definitions matching Blender's convention
    const faces: FaceData[] = [
        { name: 'FRONT', viewPreset: 'front', oppositePreset: 'back', normal: new THREE.Vector3(0, 0, 1), color: '#3b82f6' },
        { name: 'BACK', viewPreset: 'back', oppositePreset: 'front', normal: new THREE.Vector3(0, 0, -1), color: '#3b82f6' },
        { name: 'RIGHT', viewPreset: 'right', oppositePreset: 'left', normal: new THREE.Vector3(1, 0, 0), color: '#ef4444' },
        { name: 'LEFT', viewPreset: 'left', oppositePreset: 'right', normal: new THREE.Vector3(-1, 0, 0), color: '#ef4444' },
        { name: 'TOP', viewPreset: 'top', oppositePreset: 'bottom', normal: new THREE.Vector3(0, 1, 0), color: '#22c55e' },
        { name: 'BOTTOM', viewPreset: 'bottom', oppositePreset: 'top', normal: new THREE.Vector3(0, -1, 0), color: '#22c55e' },
    ];

    // Corner definitions for isometric views
    const corners = [
        { name: 'FRT', position: new THREE.Vector3(1, 1, 1) },
        { name: 'FLT', position: new THREE.Vector3(-1, 1, 1) },
        { name: 'BRT', position: new THREE.Vector3(1, 1, -1) },
        { name: 'BLT', position: new THREE.Vector3(-1, 1, -1) },
        { name: 'FRB', position: new THREE.Vector3(1, -1, 1) },
        { name: 'FLB', position: new THREE.Vector3(-1, -1, 1) },
        { name: 'BRB', position: new THREE.Vector3(1, -1, -1) },
        { name: 'BLB', position: new THREE.Vector3(-1, -1, -1) },
    ];

    const createGizmo = () => {
        gizmoCube = new THREE.Group();

        // Create cube faces
        const faceGeometry = new THREE.PlaneGeometry(1.8, 1.8);

        faces.forEach((face, index) => {
            // Face mesh
            const faceMaterial = new THREE.MeshBasicMaterial({
                color: 0x2a2a3a,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85,
            });

            const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
            faceMesh.userData = { type: 'face', faceData: face, index };

            // Position and rotate face
            const offset = face.normal.clone().multiplyScalar(1);
            faceMesh.position.copy(offset);
            faceMesh.lookAt(offset.clone().multiplyScalar(2));

            gizmoCube.add(faceMesh);
            faceMeshes.push(faceMesh);

            // Create edge outline for each face
            const edgeGeometry = new THREE.EdgesGeometry(faceGeometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x555566, linewidth: 2 });
            const edgeLine = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            edgeLine.position.copy(faceMesh.position);
            edgeLine.rotation.copy(faceMesh.rotation);
            gizmoCube.add(edgeLine);
        });

        // Create corner spheres for isometric views
        const cornerGeometry = new THREE.SphereGeometry(0.15, 12, 12);

        corners.forEach((corner, index) => {
            const cornerMaterial = new THREE.MeshBasicMaterial({
                color: 0x666677,
                transparent: true,
                opacity: 0.9,
            });

            const cornerMesh = new THREE.Mesh(cornerGeometry, cornerMaterial);
            cornerMesh.position.copy(corner.position);
            cornerMesh.userData = { type: 'corner', cornerData: corner, index };

            gizmoCube.add(cornerMesh);
            cornerMeshes.push(cornerMesh);
        });

        // Create axis indicators at corners
        const axisLength = 0.4;
        const axisRadius = 0.05;

        // X axis (Red) - from center
        const xAxisGeom = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
        const xAxisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const xAxis = new THREE.Mesh(xAxisGeom, xAxisMat);
        xAxis.rotation.z = -Math.PI / 2;
        xAxis.position.set(1 + axisLength / 2, 0, 0);
        gizmoCube.add(xAxis);

        // X axis label sphere
        const xSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        xSphere.position.set(1 + axisLength + 0.15, 0, 0);
        gizmoCube.add(xSphere);

        // Y axis (Green)
        const yAxisGeom = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
        const yAxisMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const yAxis = new THREE.Mesh(yAxisGeom, yAxisMat);
        yAxis.position.set(0, 1 + axisLength / 2, 0);
        gizmoCube.add(yAxis);

        // Y axis label sphere
        const ySphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        ySphere.position.set(0, 1 + axisLength + 0.15, 0);
        gizmoCube.add(ySphere);

        // Z axis (Blue)
        const zAxisGeom = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
        const zAxisMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        const zAxis = new THREE.Mesh(zAxisGeom, zAxisMat);
        zAxis.rotation.x = Math.PI / 2;
        zAxis.position.set(0, 0, 1 + axisLength / 2);
        gizmoCube.add(zAxis);

        // Z axis label sphere
        const zSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
        );
        zSphere.position.set(0, 0, 1 + axisLength + 0.15);
        gizmoCube.add(zSphere);

        gizmoScene.add(gizmoCube);
    };

    const updateHover = (clientX: number, clientY: number) => {
        if (!canvasRef || isDragging()) return;

        const rect = canvasRef.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, gizmoCamera);

        // Check faces first
        const faceIntersects = raycaster.intersectObjects(faceMeshes);
        if (faceIntersects.length > 0) {
            const hit = faceIntersects[0].object as THREE.Mesh;
            const faceData = hit.userData.faceData as FaceData;
            setHoveredFace(faceData.name);

            // Highlight face
            faceMeshes.forEach((mesh) => {
                const mat = mesh.material as THREE.MeshBasicMaterial;
                if (mesh === hit) {
                    mat.color.setHex(0x4a4a5a);
                    mat.opacity = 1;
                } else {
                    mat.color.setHex(0x2a2a3a);
                    mat.opacity = 0.85;
                }
            });
            return;
        }

        // Check corners
        const cornerIntersects = raycaster.intersectObjects(cornerMeshes);
        if (cornerIntersects.length > 0) {
            const hit = cornerIntersects[0].object as THREE.Mesh;
            const cornerData = hit.userData.cornerData;
            setHoveredFace(cornerData.name);

            // Highlight corner
            cornerMeshes.forEach((mesh) => {
                const mat = mesh.material as THREE.MeshBasicMaterial;
                if (mesh === hit) {
                    mat.color.setHex(0x8888aa);
                } else {
                    mat.color.setHex(0x666677);
                }
            });

            // Reset face highlights
            faceMeshes.forEach((mesh) => {
                const mat = mesh.material as THREE.MeshBasicMaterial;
                mat.color.setHex(0x2a2a3a);
                mat.opacity = 0.85;
            });
            return;
        }

        // Reset all highlights
        setHoveredFace(null);
        faceMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.color.setHex(0x2a2a3a);
            mat.opacity = 0.85;
        });
        cornerMeshes.forEach((mesh) => {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.color.setHex(0x666677);
        });
    };

    const handleClick = (e: MouseEvent) => {
        if (!canvasRef || isDragging()) return;

        const rect = canvasRef.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, gizmoCamera);

        // Check faces
        const faceIntersects = raycaster.intersectObjects(faceMeshes);
        if (faceIntersects.length > 0) {
            const hit = faceIntersects[0].object as THREE.Mesh;
            const faceData = hit.userData.faceData as FaceData;
            const preset = e.ctrlKey ? faceData.oppositePreset : faceData.viewPreset;
            viewController.setView(preset);
            return;
        }

        // Check corners for isometric view
        const cornerIntersects = raycaster.intersectObjects(cornerMeshes);
        if (cornerIntersects.length > 0) {
            const hit = cornerIntersects[0].object as THREE.Mesh;
            const cornerData = hit.userData.cornerData;

            // Calculate camera position from corner direction
            const sceneManager = getSceneManager();
            const focusPoint = sceneManager.orbitControls.target.clone();
            const direction = cornerData.position.clone().normalize();
            const distance = 10;
            const newPosition = focusPoint.clone().add(direction.multiplyScalar(distance));

            sceneManager.camera.position.copy(newPosition);
            sceneManager.orbitControls.update();
        }
    };

    // Drag to orbit
    let dragStart = { x: 0, y: 0 };
    let originalCameraPosition = new THREE.Vector3();
    let originalTarget = new THREE.Vector3();

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        dragStart = { x: e.clientX, y: e.clientY };

        const sceneManager = getSceneManager();
        originalCameraPosition.copy(sceneManager.camera.position);
        originalTarget.copy(sceneManager.orbitControls.target);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (e.buttons !== 1) {
            setIsDragging(false);
            updateHover(e.clientX, e.clientY);
            return;
        }

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            setIsDragging(true);

            const sceneManager = getSceneManager();
            const sensitivity = 0.01;

            // Orbit around target
            const offset = sceneManager.camera.position.clone().sub(sceneManager.orbitControls.target);
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(offset);

            spherical.theta -= dx * sensitivity;
            spherical.phi -= dy * sensitivity;

            // Clamp phi to avoid flipping
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

            offset.setFromSpherical(spherical);
            sceneManager.camera.position.copy(sceneManager.orbitControls.target.clone().add(offset));
            sceneManager.orbitControls.update();

            dragStart = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    onMount(() => {
        if (!canvasRef) return;

        const size = 100;

        // Create mini scene
        gizmoScene = new THREE.Scene();

        // Orthographic camera
        gizmoCamera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 100);
        gizmoCamera.position.set(5, 5, 5);
        gizmoCamera.lookAt(0, 0, 0);

        // Renderer
        gizmoRenderer = new THREE.WebGLRenderer({
            canvas: canvasRef,
            alpha: true,
            antialias: true,
        });
        gizmoRenderer.setSize(size, size);
        gizmoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Raycaster setup
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Create the gizmo cube
        createGizmo();

        // Event listeners
        canvasRef.addEventListener('mousemove', (e) => handleMouseMove(e));
        canvasRef.addEventListener('mousedown', handleMouseDown);
        canvasRef.addEventListener('mouseup', handleMouseUp);
        canvasRef.addEventListener('mouseleave', handleMouseUp);
        canvasRef.addEventListener('click', handleClick);

        // Animation loop
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            // Sync with main camera rotation
            const sceneManager = getSceneManager();
            const mainCamera = sceneManager.camera;

            // Get main camera direction
            const direction = new THREE.Vector3();
            mainCamera.getWorldDirection(direction);

            // Position gizmo camera to match main camera orientation
            const distance = 7;
            gizmoCamera.position.copy(direction.multiplyScalar(-distance));
            gizmoCamera.lookAt(0, 0, 0);
            gizmoCamera.up.copy(mainCamera.up);

            gizmoRenderer.render(gizmoScene, gizmoCamera);
        };

        animate();

        onCleanup(() => {
            cancelAnimationFrame(animationId);
            gizmoRenderer.dispose();
            canvasRef?.removeEventListener('mousemove', handleMouseMove);
            canvasRef?.removeEventListener('mousedown', handleMouseDown);
            canvasRef?.removeEventListener('mouseup', handleMouseUp);
            canvasRef?.removeEventListener('mouseleave', handleMouseUp);
            canvasRef?.removeEventListener('click', handleClick);
        });
    });

    return (
        <div class="absolute top-4 right-4 pointer-events-auto">
            {/* 3D Gizmo Canvas */}
            <div class="relative">
                <canvas
                    ref={canvasRef}
                    class="cursor-pointer rounded-xl"
                    style={{
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(circle, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.9) 100%)',
                        'box-shadow': '0 4px 20px rgba(0,0,0,0.4), inset 0 0 30px rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                />

                {/* Face label overlay */}
                {hoveredFace() && (
                    <div
                        class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full
                               mt-2 px-2 py-1 text-[10px] font-medium rounded
                               bg-surface-800/90 text-surface-200 backdrop-blur-sm
                               border border-surface-600/50"
                    >
                        {hoveredFace()}
                    </div>
                )}
            </div>

            {/* Quick view buttons */}
            <div class="flex gap-1 mt-2 justify-center">
                <button
                    class="px-2 py-1 text-[10px] bg-surface-700/80 hover:bg-surface-600 
                         rounded text-surface-300 transition-colors border border-surface-600/50"
                    onClick={() => viewController.toggleProjection()}
                    title="Toggle Ortho/Persp (5)"
                >
                    Persp
                </button>
                <button
                    class="px-2 py-1 text-[10px] bg-surface-700/80 hover:bg-surface-600 
                         rounded text-surface-300 transition-colors border border-surface-600/50"
                    onClick={() => viewController.setView('camera')}
                    title="Reset View"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};
