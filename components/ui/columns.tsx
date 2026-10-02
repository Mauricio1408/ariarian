"use client";

import { Children, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Spreadsheet-style column resizing for the grid tables.
 *
 * Each table declares its columns once; header and rows share the resulting
 * `grid-template-columns`. Dragging an edge resizes the column on its left, like a
 * spreadsheet. One column may be `"fr"`: it soaks up spare width, and once it is at its
 * minimum the table grows and scrolls sideways inside <TableScroll>. Widths live for the
 * session in a module map, so they survive page changes but not a reload.
 */
export type ColumnDef = { w: number | "fr"; min?: number; fixed?: boolean };

const memory = new Map<string, number[]>();
const FLEX_MIN = 120;
const MIN = 72;

/** Keep the resize cursor and suppress text selection for the whole drag, wherever the pointer goes. */
function bodyDragging(on: boolean) {
  document.body.style.cursor = on ? "col-resize" : "";
  document.body.style.userSelect = on ? "none" : "";
}

const minOf = (d: ColumnDef) => d.min ?? (d.w === "fr" ? FLEX_MIN : MIN);

export function useColumns(id: string, defs: ColumnDef[]) {
  // The flexible column stores its minimum; 0 means "use the declared minimum".
  const defaults = defs.map((d) => (d.w === "fr" ? 0 : d.w));
  const [widths, setWidths] = useState<number[]>(() => memory.get(id) ?? defaults);
  const template = defs
    .map((d, i) => (d.w === "fr" ? `minmax(${Math.max(widths[i], minOf(d))}px, 1fr)` : `${widths[i]}px`))
    .join(" ");
  const update = (next: number[]) => {
    memory.set(id, next);
    setWidths(next);
  };
  return { id, defs, widths, defaults, update, style: { gridTemplateColumns: template } as React.CSSProperties };
}

export type Columns = ReturnType<typeof useColumns>;

/** Horizontal scroller for header + rows; rows stretch to the card but can grow past it. */
export function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden scroll-slim">
      <div className="min-w-full w-max">{children}</div>
    </div>
  );
}

/** Header row: wraps each child in a cell and puts a drag handle on its right edge. */
export function ResizableHeader({ cols, className, children }: { cols: Columns; className?: string; children: React.ReactNode }) {
  const cells = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const items = Children.toArray(children);

  const start = (i: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const d = cols.defs[i];
    const w0 = cells.current[i]?.getBoundingClientRect().width ?? 0;
    const x0 = e.clientX;
    setDrag(i);
    bodyDragging(true);
    const move = (ev: PointerEvent) => {
      const next = [...cols.widths];
      next[i] = Math.round(Math.max(minOf(d), w0 + ev.clientX - x0));
      cols.update(next);
    };
    const up = () => {
      setDrag(null);
      bodyDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const reset = (i: number) => {
    const next = [...cols.widths];
    next[i] = cols.defaults[i];
    cols.update(next);
  };

  return (
    <div className={cn("group/head grid items-center", className)} style={cols.style}>
      {items.map((child, i) => {
        const resizable = i < items.length - 1 && !cols.defs[i]?.fixed;
        return (
          <div key={i} ref={(el) => { cells.current[i] = el; }} className="relative grid items-center h-full min-w-0">
            {child}
            {resizable && (
              <span role="separator" aria-orientation="vertical" aria-label="Resize column" title="Drag to resize · double-click to reset"
                onPointerDown={(e) => start(i, e)} onDoubleClick={() => reset(i)} onClick={(e) => e.stopPropagation()}
                className="absolute -right-[7px] top-1/2 -translate-y-1/2 z-10 h-[70%] w-[13px] grid place-items-center cursor-col-resize touch-none">
                <span className={cn("block w-[2px] h-full rounded-full transition-[background-color,opacity] duration-[120ms]",
                  drag === i ? "bg-brand-500 opacity-100" : "bg-dash opacity-0 group-hover/head:opacity-100 hover:!bg-brand-500")} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
