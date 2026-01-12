# CubeForge Input System Documentation

## Overview

CubeForge menggunakan sistem input yang terinspirasi dari Blender dengan:
- **Priority-based InputDispatcher** untuk unified event routing
- **Modal Operators** untuk transform dengan axis constraints
- **Context-Aware Input** untuk Object/Edit mode handling
- **KeymapManager** untuk customizable shortcuts

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DOM Events                           │
│  (mousedown, mousemove, keydown, etc)                  │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 InputDispatcher                          │
│  - Priority-sorted handler list                         │
│  - Modal handler support                                │
│  - Event propagation control                            │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│            IInputHandler Implementations                 │
├─────────────────────────────────────────────────────────┤
│ Priority 95: TransformControlsHandler (Modal)           │
│ Priority 75: BoxSelectTool, CircleSelectTool           │
│ Priority 50: SelectionHandler                           │
│ Priority 20: OrbitControlsHandler                       │
│ Priority 5:  KeyboardHandler → KeyboardManager          │
└─────────────────────────────────────────────────────────┘
```

---

## Key Components

### InputDispatcher (`src/core/input/InputDispatcher.ts`)

Central event router yang:
- Mendispatch events ke handlers berdasarkan priority
- Mendukung modal handlers yang block handlers lower-priority
- Terintegrasi dengan InputContextManager untuk context-aware routing

### KeymapManager (`src/core/input/KeymapManager.ts`)

Customizable shortcut system dengan:
- User rebinding via `rebind(actionId, newBinding)`
- Conflict detection via `findConflict(binding)`
- localStorage persistence
- Category grouping untuk settings UI

### TransformOperator (`src/core/operators/TransformOperator.ts`)

Modal operator untuk transform dengan:
- Axis constraints (X/Y/Z)
- Plane constraints (Shift+X/Y/Z)
- Numeric input untuk precision
- Live preview dan cancel support

---

## Shortcut Categories

| Category | Shortcuts |
|----------|-----------|
| `transform` | G (Move), R (Rotate), S (Scale), , (Pivot) |
| `edit` | Shift+D (Duplicate), Delete/X (Delete), Ctrl+Z (Undo) |
| `selection` | A (Select All), Alt+A (Deselect), Ctrl+I (Invert) |
| `view` | 1/3/7 (Ortho views), 5 (Projection), Z (Wireframe) |
| `tools` | B (Box Select), C (Circle Select) |
| `general` | Escape (Cancel), Tab (Object/Edit mode), N/T (Panels) |

---

## Usage Examples

### Registering a Custom Shortcut

```typescript
import { getKeymapManager } from '@/core/input/KeymapManager';

getKeymapManager().registerAction({
    actionId: 'custom.my_action',
    description: 'My Custom Action',
    category: 'custom',
    defaultBinding: { key: 'q', ctrl: true },
    action: () => {
        console.log('Custom action triggered!');
    },
});
```

### Creating a Custom Operator

```typescript
import type { IOperator } from '@/core/interfaces';

class MyOperator implements IOperator {
    readonly id = 'my-operator';
    readonly priority = InputPriority.MODAL;
    readonly operatorType = 'MODAL';
    enabled = false;

    invoke(): OperatorResult {
        this.enabled = true;
        return 'RUNNING_MODAL';
    }

    execute(): OperatorResult {
        this.enabled = false;
        return 'FINISHED';
    }

    cancel(): void {
        this.enabled = false;
    }
}
```

### Switching Context

```typescript
import { getInputContextManager } from '@/core/input/InputContextManager';
import { InputContextId } from '@/core/interfaces';

// Switch to Edit mode
getInputContextManager().switchContext(
    InputContextId.OBJECT_MODE, 
    InputContextId.EDIT_MODE
);
```

---

## InputLogger

Utility logging terpusat untuk debugging dan performance tracking:

```typescript
import { InputLogger } from '@/core/input/InputLogger';

InputLogger.enableDebug(); // Aktifkan di browser console
InputLogger.getHistory();  // Lihat history log
```

---

## Testing

Unit tests lengkap tersedia (Coverage ~58 tests):
- `TransformOperator.test.ts`: Logic modal, constraints, numeric input
- `KeymapManager.test.ts`: Registration, rebinding, conflict logic
- `OperatorRegistry.test.ts`: Lifecycle & cancellation
- `InputContextManager.test.ts`: Context switching
- `InputDispatcher.test.ts`: Routing logic

Integration tests dilakukan via browser testing.
