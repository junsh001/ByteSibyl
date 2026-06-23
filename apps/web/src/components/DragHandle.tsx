import { GripVertical } from 'lucide-react';

/**
 * The grab handle for a card. The `.drag-handle` class is what react-grid-layout
 * uses as `draggableHandle`, so only this element initiates a drag.
 */
export function DragHandle() {
  return (
    <span
      className="drag-handle -ml-1 mr-0.5 cursor-grab active:cursor-grabbing text-muted/40 hover:text-muted transition shrink-0"
      title="拖动 / drag"
    >
      <GripVertical size={14} />
    </span>
  );
}
