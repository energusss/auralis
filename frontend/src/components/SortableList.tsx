import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
function Item({
  id,
  index,
  count,
  onMove,
  children,
}: {
  id: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const sortableKeyDown = listeners?.onKeyDown;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="sortable-row"
    >
      <button
        className="drag-handle"
        aria-label="Reorder"
        aria-keyshortcuts="ArrowUp ArrowDown"
        {...attributes}
        {...listeners}
        onKeyDown={(event) => {
          if (!isDragging && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            const next = index + (event.key === "ArrowDown" ? 1 : -1);
            if (next >= 0 && next < count) {
              event.preventDefault();
              onMove(index, next);
              return;
            }
          }
          sortableKeyDown?.(event);
        }}
      >
        <GripVertical size={16} />
      </button>
      {children}
    </div>
  );
}
export function SortableList({
  ids,
  onMove,
  children,
}: {
  ids: string[];
  onMove: (from: number, to: number) => void;
  children: (id: string, index: number) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id)
          onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id, index) => (
          <Item id={id} index={index} count={ids.length} onMove={onMove} key={id}>
            {children(id, index)}
          </Item>
        ))}
      </SortableContext>
    </DndContext>
  );
}
