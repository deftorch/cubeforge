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
import {
    InputDispatcher,
    SelectionHandler,
    OrbitControlsHandler,
    TransformControlsHandler,
    KeyboardHandler,
    getKeyboardManager,
    getOperatorRegistry,
    getInputContextManager,
} from '@/core/input';
import { TransformOperator } from '@/core/operators';

import type { IMaterialService } from '@/core/interfaces';
import type { IEventBus } from '@/core/interfaces';
import { InputContextId } from '@/core/interfaces';

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

    // Input system
    public readonly inputDispatcher: InputDispatcher;
    public readonly selectionHandler: SelectionHandler;
    public readonly orbitControlsHandler: OrbitControlsHandler;
    public readonly transformControlsHandler: TransformControlsHandler;
    public readonly keyboardHandler: KeyboardHandler;

    // Transform operators (modal)
    public readonly translateOperator: TransformOperator;
    public readonly rotateOperator: TransformOperator;
    public readonly scaleOperator: TransformOperator;

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

        // Layer 7: Input System
        this.inputDispatcher = new InputDispatcher();

        // Create input handlers
        this.selectionHandler = new SelectionHandler(this.selectionManager);
        this.orbitControlsHandler = new OrbitControlsHandler(this.sceneManager.orbitControls);
        this.transformControlsHandler = new TransformControlsHandler(this.sceneManager.transformControls);
        this.keyboardHandler = new KeyboardHandler(getKeyboardManager());

        // Configure transform controls handler
        this.transformControlsHandler.setDispatcher(this.inputDispatcher);
        this.transformControlsHandler.setOrbitControlsHandler(this.orbitControlsHandler);

        // Configure selection tools to disable camera during selection
        this.boxSelectTool.setOrbitControlsHandler(this.orbitControlsHandler);
        this.circleSelectTool.setOrbitControlsHandler(this.orbitControlsHandler);

        // Register handlers with dispatcher (order doesn't matter, sorted by priority)
        this.inputDispatcher.register(this.transformControlsHandler); // Priority: 95 (MODAL)
        this.inputDispatcher.register(this.boxSelectTool);             // Priority: 75 (TOOL)
        this.inputDispatcher.register(this.circleSelectTool);          // Priority: 75 (TOOL)
        this.inputDispatcher.register(this.selectionHandler);          // Priority: 50 (SELECTION)
        this.inputDispatcher.register(this.orbitControlsHandler);      // Priority: 20 (NAVIGATION)
        this.inputDispatcher.register(this.keyboardHandler);           // Priority: 5 (FALLBACK)

        // Layer 8: Transform Operators (Modal)
        this.translateOperator = new TransformOperator('translate');
        this.rotateOperator = new TransformOperator('rotate');
        this.scaleOperator = new TransformOperator('scale');

        // Configure operators with dispatcher
        this.translateOperator.setDispatcher(this.inputDispatcher);
        this.rotateOperator.setDispatcher(this.inputDispatcher);
        this.scaleOperator.setDispatcher(this.inputDispatcher);

        // Register with OperatorRegistry
        const registry = getOperatorRegistry();
        registry.register(this.translateOperator);
        registry.register(this.rotateOperator);
        registry.register(this.scaleOperator);

        // Register operators with InputDispatcher (they become active when invoked)
        this.inputDispatcher.register(this.translateOperator);
        this.inputDispatcher.register(this.rotateOperator);
        this.inputDispatcher.register(this.scaleOperator);

        // Layer 9: Context-Aware Input System
        // Enable context-based routing for mode-specific shortcuts
        const contextManager = getInputContextManager();
        this.inputDispatcher.setContextManager(contextManager, false);

        // Register handlers to their appropriate contexts
        // GLOBAL handlers work in all modes
        contextManager.registerHandler(this.keyboardHandler, InputContextId.GLOBAL);
        contextManager.registerHandler(this.orbitControlsHandler, InputContextId.GLOBAL);
        contextManager.registerHandler(this.selectionHandler, InputContextId.GLOBAL);

        // OBJECT_MODE handlers only work in object mode
        contextManager.registerHandler(this.translateOperator, InputContextId.OBJECT_MODE);
        contextManager.registerHandler(this.rotateOperator, InputContextId.OBJECT_MODE);
        contextManager.registerHandler(this.scaleOperator, InputContextId.OBJECT_MODE);
        contextManager.registerHandler(this.transformControlsHandler, InputContextId.OBJECT_MODE);

        // TOOL_ACTIVE handlers (tools self-register when activated)
        // BoxSelectTool and CircleSelectTool already handle this internally
    }

    public static getInstance(): CoreContext {
        if (!CoreContext.instance) {
            CoreContext.instance = new CoreContext();
        }
        return CoreContext.instance;
    }
}

export const coreContext = CoreContext.getInstance();
