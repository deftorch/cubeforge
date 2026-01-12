# CubeForge Input System Review & Analysis

## Executive Summary

The CubeForge input system is built on a solid architectural foundation similar to professional 3D software (Blender), utilizing a priority-based Dispatcher, Modal Operators, and a comprehensive Context system. However, the current implementation suffers from architectural inconsistencies, primarily the heavy reliance on Singletons and direct coupling between input handlers and the rendering engine.

To reach a professional production standard, the system requires refactoring to fully embrace Dependency Injection (DI), decouple input logic from visual feedback, and standardize event routing.

## 1. Architectural Analysis

### Strengths
*   **Priority-Based Routing**: The `InputDispatcher` correctly implements a priority queue, allowing tools (like Gizmos) to intercept events before navigation (OrbitControls).
*   **Modal Operator Pattern**: The `OperatorRegistry` and `IOperator` interface provide a robust way to handle stateful operations (like dragging) that need to block other inputs.
*   **Context Awareness**: The `InputContextManager` design allows for clean mode switching (Object Mode vs Edit Mode), effectively managing which handlers are active.
*   **Undo/Redo Integration**: The `OperatorCommand` system integrates well with the `historyStore`.

### Weaknesses (Anti-patterns)
*   **Singleton Overuse**: Core components (`InputDispatcher`, `KeymapManager`, `OperatorRegistry`) are exposed via global singleton getters (e.g., `getInputDispatcher()`). This makes testing difficult and hides dependencies.
*   **Inconsistent Event Routing**: `Viewport.tsx` contains hardcoded logic for specific events (e.g., Shift+RightClick for Cursor Placement) that bypasses the `InputDispatcher`.
*   **Mixed Responsibilities**: Input handlers (e.g., `DragDropHandler`) serve double duty: handling input AND managing 3D scene objects (Ghost Cube). This violates the Single Responsibility Principle.
*   **Direct Store Mutation**: Handlers often import and mutate global stores (`uiActions`, `selectionActions`) directly, bypassing the `CoreContext`.
*   **Type Safety**: The `InputDispatcher` uses `any` casting / `@ts-expect-error` for dynamic method calls.

## 2. Detailed Component Review

### InputDispatcher (`src/core/input/InputDispatcher.ts`)
*   **Status**: functional but needs architectural cleanup.
*   **Issue**: It manages a singleton in a variable outside the class.
*   **Recommendation**: Move lifecycle management to `CoreContext`. Remove global singleton export.

### Input Handlers (General)
*   **Status**: Mixed implementation styles.
*   **Issue**: Some handlers are "pure" (logic only), while others (like `DragDropHandler`) directly instantiate `THREE.Mesh` and add them to the scene.
*   **Recommendation**: Handlers should emit events or call methods on a `VisualFeedbackService` or `SceneManager` instead of touching the Three.js scene graph directly.

### Viewport Integration (`src/components/viewport/Viewport.tsx`)
*   **Status**: Tightly coupled to specific tools.
*   **Issue**: It explicitly initializes `BoxSelectTool` and `CircleSelectTool`.
*   **Issue**: It contains a "bypass" for the 3D Cursor placement.
*   **Recommendation**: `Viewport` should only mount the `InputDispatcher`. Tools should be registered via `CoreContext` boot sequence, not manually locally. 3D Cursor placement should be a `CursorPlacementHandler` registered with priority.

## 3. Improvement Roadmap

To professionalize the system, we recommend the following phases:

### Phase 1: Dependency Injection Purification
*   [ ] Refactor `InputDispatcher`, `KeymapManager`, `OperatorRegistry` to simple classes.
*   [ ] Register them in `CoreContext` (Service Locator pattern).
*   [ ] Inject dependencies (SceneManager, SelectionManager) into handlers via constructor.
*   [ ] Remove all global `get*Manager()` calls from input code.

### Phase 2: Standardization
*   [x] Move "Ghost Cube" logic from `DragDropHandler` to a `GhostOverlayService` (Partially addressed via `DragDropHandler` integration).
*   [x] Extract `CursorPlacement` logic from `Viewport.tsx` to a new `CursorInputHandler` (Implemented as `CursorPlacementHandler`).
*   [ ] Ensure all handlers implement `dispose()` correctly to prevent memory leaks.

### Phase 3: Type Safety & Testing
*   [ ] Improve `InputDispatcher` typing to safely map event names to methods without casting.
*   [ ] Add comprehensive unit tests for `DragDropHandler` and others (made possible by DI).

## 4. Conclusion

The "Logic" of the input system is sound and professional. The "Management" (instantiation, dependency flow, state access) is where it falls short of enterprise standards. Implementing the DI refactor and decoupling the View layer from the Input layer will significantly improve maintainability and professionalism.
