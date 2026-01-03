import { createContext, useContext, ParentComponent, JSX } from 'solid-js';
import { CoreContext, coreContext } from '@/core/CoreContext';

/**
 * Solid.js Context for CoreContext (Dependency Injection Container)
 * 
 * This provides a way for components to access core managers without
 * importing singletons directly, improving testability and decoupling.
 */
const CoreCtx = createContext<CoreContext>();

/**
 * CoreProvider - Wraps the application to provide CoreContext
 */
export const CoreProvider: ParentComponent = (props): JSX.Element => {
    return (
        <CoreCtx.Provider value={coreContext}>
            {props.children}
        </CoreCtx.Provider>
    );
};

/**
 * useCoreContext - Hook to access the CoreContext from within components
 * 
 * @throws Error if used outside of CoreProvider
 * 
 * @example
 * ```tsx
 * const MyComponent: Component = () => {
 *     const { cubeManager, sceneManager } = useCoreContext();
 *     // ...
 * };
 * ```
 */
export function useCoreContext(): CoreContext {
    const context = useContext(CoreCtx);
    if (!context) {
        throw new Error('useCoreContext must be used within a CoreProvider');
    }
    return context;
}
