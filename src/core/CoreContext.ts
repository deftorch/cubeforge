import { EventBus } from '@/core/events';
import { getSceneManager, SceneManager } from '@/core/scene/SceneManager';
import { CubeManager } from '@/core/scene/CubeManager';
import { HierarchyManager, getHierarchyManager } from '@/core/scene/HierarchyManager';
import { TransformService, setGlobalTransformService } from '@/core/transform/TransformService';
import { SelectionManager, setGlobalSelectionManager } from '@/core/selection/SelectionManager';
import { getMeshFactory } from '@/core/scene/MeshFactory';
import { getMaterialService } from '@/core/scene/MaterialService';
import { ViewportShading, getViewportShading } from '@/core/viewport/ViewportShading';
import { PivotController, getPivotController } from '@/core/transform/PivotController';
import { BoxSelectTool, getBoxSelectTool } from '@/core/tools/BoxSelectTool';
import { CircleSelectTool, getCircleSelectTool } from '@/core/tools/CircleSelectTool';
import { SceneSynchronizer } from '@/core/scene/SceneSynchronizer';

import type { IMaterialService } from '@/core/interfaces';
import type { IEventBus } from '@/core/interfaces';

/**
 * CoreContext - Service Container for Dependency Injection
 * 
 * Centralizes initialization and dependency management.
 * In the future, this will replace the individual get...() singleton accessors.
 */
export class CoreContext {
    public readonly eventBus: IEventBus;
    public readonly sceneManager: SceneManager; // Concrete type for full access
    public readonly hierarchyManager: HierarchyManager;
    public readonly transformService: TransformService;
    public readonly materialService: IMaterialService;
    public readonly selectionManager: SelectionManager;

    // Managers that formerly relied on global singletons, now available here
    public readonly cubeManager: CubeManager;

    // Tools and viewport services
    public readonly viewportShading: ViewportShading;
    public readonly pivotController: PivotController;
    public readonly boxSelectTool: BoxSelectTool;
    public readonly circleSelectTool: CircleSelectTool;
    public readonly sceneSynchronizer: SceneSynchronizer;

    private static instance: CoreContext;

    private constructor() {
        this.eventBus = new EventBus();

        // Layer 1: Base Managers (Singletons for now)
        this.sceneManager = getSceneManager();
        this.hierarchyManager = getHierarchyManager();
        this.materialService = getMaterialService();
        const meshFactory = getMeshFactory();

        // Layer 2: Dependent Services (DI)
        // TransformService - depends on Scene, Hierarchy, MeshFactory
        this.transformService = new TransformService(
            this.sceneManager,
            this.hierarchyManager,
            meshFactory
        );
        setGlobalTransformService(this.transformService);

        // SelectionManager - depends on Scene, Hierarchy
        this.selectionManager = new SelectionManager(
            this.sceneManager,
            this.hierarchyManager
        );
        setGlobalSelectionManager(this.selectionManager);

        // Layer 3: Viewport Services (needed by CubeManager)
        this.viewportShading = getViewportShading();
        this.pivotController = getPivotController();

        // Layer 4: High-level Managers
        // CubeManager - depends on everything including viewportShading
        // Using explicit DI to ensure it uses OUR instances
        this.cubeManager = new CubeManager(
            this.sceneManager,
            this.hierarchyManager,
            this.transformService,
            this.materialService,
            this.eventBus,
        );

        // Layer 5: Selection Tools (singletons wrapped)
        this.boxSelectTool = getBoxSelectTool();
        this.circleSelectTool = getCircleSelectTool();

        // Layer 6: Scene Sync (Visual Updates)
        this.sceneSynchronizer = new SceneSynchronizer(
            this.eventBus,
            this.sceneManager,
            meshFactory,
            this.viewportShading
        );
    }

    public static getInstance(): CoreContext {
        if (!CoreContext.instance) {
            CoreContext.instance = new CoreContext();
        }
        return CoreContext.instance;
    }
}

export const coreContext = CoreContext.getInstance();
