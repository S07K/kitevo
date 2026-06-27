"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

export type DealStatus = "new" | "reviewing" | "negotiating" | "won" | "lost";

export interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  createdAt: string;
  read: boolean;
  status: DealStatus;
  kit: { id: string; name: string; slug: string };
}

const COLUMNS: { id: DealStatus; label: string; color: string; dot: string }[] = [
  { id: "new",         label: "New",         color: "bg-blue-50 dark:bg-blue-950/30",      dot: "bg-blue-400" },
  { id: "reviewing",   label: "Reviewing",   color: "bg-amber-50 dark:bg-amber-950/30",    dot: "bg-amber-400" },
  { id: "negotiating", label: "Negotiating", color: "bg-violet-50 dark:bg-violet-950/30",  dot: "bg-violet-400" },
  { id: "won",         label: "Won",         color: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500" },
  { id: "lost",        label: "Lost",        color: "bg-muted/60",                          dot: "bg-muted-foreground/40" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Draggable card ────────────────────────────────────────────────────────────

interface CardProps {
  inq: InquiryRecord;
  onExpand: (inq: InquiryRecord) => void;
  isDragging?: boolean;
}

function DealCard({ inq, onExpand, isDragging }: CardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: inq.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onExpand(inq)}
      className={`bg-background border-border rounded-xl border p-4 cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold truncate">{inq.name}</p>
          {inq.company && (
            <p className="text-muted-foreground text-xs truncate">{inq.company}</p>
          )}
        </div>
        {!inq.read && (
          <span className="bg-foreground text-background shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
            New
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs mt-2 line-clamp-2 leading-relaxed">
        {inq.message}
      </p>
      <div className="flex items-center mt-3 pt-3 border-t border-border">
        <p className="text-muted-foreground text-[10px]">
          {inq.kit.name} · {timeAgo(inq.createdAt)}
        </p>
      </div>
    </div>
  );
}

// Ghost card shown under the cursor while dragging
function DragGhostCard({ inq }: { inq: InquiryRecord }) {
  return (
    <div className="bg-background border-foreground/20 rounded-xl border p-4 shadow-2xl w-52 rotate-2 opacity-95">
      <p className="text-foreground text-sm font-semibold truncate">{inq.name}</p>
      {inq.company && (
        <p className="text-muted-foreground text-xs truncate">{inq.company}</p>
      )}
      <p className="text-muted-foreground text-xs mt-2 line-clamp-2 leading-relaxed">
        {inq.message}
      </p>
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

interface ColumnProps {
  col: typeof COLUMNS[number];
  cards: InquiryRecord[];
  draggingId: string | null;
  onExpand: (inq: InquiryRecord) => void;
}

function KanbanColumn({ col, cards, draggingId, onExpand }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
        <p className="text-foreground text-xs font-semibold">{col.label}</p>
        {cards.length > 0 && (
          <span className="text-muted-foreground text-[10px] ml-auto">{cards.length}</span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[120px] rounded-2xl p-3 space-y-3 transition-colors ${col.color} ${
          isOver ? "ring-2 ring-foreground/20 brightness-95" : ""
        }`}
      >
        {cards.length === 0 && !isOver ? (
          <p className="text-muted-foreground/50 text-[11px] text-center pt-6">Empty</p>
        ) : (
          cards.map((inq) => (
            <DealCard
              key={inq.id}
              inq={inq}
              onExpand={onExpand}
              isDragging={draggingId === inq.id}
            />
          ))
        )}
        {/* Drop target hint */}
        {isOver && draggingId && !cards.some((c) => c.id === draggingId) && (
          <div className="h-16 rounded-xl border-2 border-dashed border-foreground/20" />
        )}
      </div>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
  inq: InquiryRecord;
  onClose: () => void;
  onMove: (id: string, status: DealStatus) => void;
}

function DetailModal({ inq, onClose, onMove }: DetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border-border w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-foreground text-lg font-semibold">{inq.name}</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              {inq.email}{inq.company ? ` · ${inq.company}` : ""}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {inq.kit.name} · {new Date(inq.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="text-foreground text-sm leading-relaxed">{inq.message}</p>

        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-3">Move to stage</p>
          <div className="flex flex-wrap gap-2">
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => { onMove(inq.id, col.id); onClose(); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                  inq.status === col.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                {col.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <a
            href={`mailto:${inq.email}?subject=Re: collaboration inquiry`}
            className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Reply via email →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="border-border text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

interface Props {
  inquiries: InquiryRecord[];
  onUpdate: (id: string, status: DealStatus) => void;
}

export function DealPipeline({ inquiries, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<InquiryRecord | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const byStatus = (status: DealStatus) =>
    inquiries.filter((i) => (i.status ?? "new") === status);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingId(null);
    if (!over) return;
    const newStatus = over.id as DealStatus;
    const inq = inquiries.find((i) => i.id === active.id);
    if (inq && newStatus !== inq.status) {
      onUpdate(inq.id, newStatus);
    }
  };

  const draggingInq = draggingId ? inquiries.find((i) => i.id === draggingId) : null;
  const total = inquiries.length;
  const wonCount = byStatus("won").length;

  const board = (
    <>
      {total > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-muted-foreground text-xs">{total} deal{total !== 1 ? "s" : ""} total</span>
          {wonCount > 0 && (
            <span className="text-emerald-600 text-xs font-medium">{wonCount} won</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            cards={byStatus(col.id)}
            draggingId={draggingId}
            onExpand={setExpanded}
          />
        ))}
      </div>
    </>
  );

  return (
    <>
      {expanded && (
        <DetailModal
          inq={expanded}
          onClose={() => setExpanded(null)}
          onMove={(id, status) => {
            onUpdate(id, status);
            setExpanded((prev) => prev ? { ...prev, status } : null);
          }}
        />
      )}

      {mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {board}
          <DragOverlay>
            {draggingInq && <DragGhostCard inq={draggingInq} />}
          </DragOverlay>
        </DndContext>
      ) : (
        board
      )}
    </>
  );
}
