/**
 * Interface for Selection Store operations
 */
export interface ISelectionStore {
    // Read operations
    isSelected(cubeId: string): boolean;
    getSelectedIds(): string[];
    getSelectionCount(): number;
    hasSelection(): boolean;

    // Write operations
    select(cubeId: string): void;
    addToSelection(cubeId: string): void;
    removeFromSelection(cubeId: string): void;
    toggleSelection(cubeId: string): void;
    selectMultiple(cubeIds: string[]): void;
    clearSelection(): void;
    selectAll(allCubeIds: string[]): void;
    setHovered(cubeId: string | null): void;
}
