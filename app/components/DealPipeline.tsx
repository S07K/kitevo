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
import { Columns3, List, Mail } from "lucide-react";
import { Modal } from "@/app/components/workspace/Modal";
import { Button, buttonClass } from "@/app/components/workspace/Button";

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

const COLUMNS: { id: DealStatus; label: string; dot: string }[] = [
  { id: "new",         label: "New",         dot: "bg-primary" },
  { id: "reviewing",   label: "Reviewing",   dot: "bg-amber-500" },
  { id: "negotiating", label: "Negotiating", dot: "bg-violet-500" },
  { id: "won",         label: "Won",         dot: "bg-green-500" },
  { id: "lost",        label: "Lost",        dot: "bg-muted-foreground/50" },
];

const STATUS_BADGE: Record<DealStatus, string> = {
  new:         "bg-primary-soft text-primary-soft-foreground",
  reviewing:   "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  negotiating: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  won:         "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  lost:        "bg-muted text-muted-foreground",
};
const LABEL = Object.fromEntries(COLUMNS.map((c) => [c.id, c.label])) as Record<DealStatus, string>;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const initialOf = (inq: InquiryRecord) => (inq.company || inq.name || "?").trim().charAt(0).toUpperCase();

function StageBadge({ status }: { status: DealStatus }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}>{LABEL[status]}</span>;
}

// ── Draggable card (board) ────────────────────────────────────────────────────

interface CardProps {
  inq: InquiryRecord;
  onExpand: (inq: InquiryRecord) => void;
  isDragging?: boolean;
}

function DealCard({ inq, onExpand, isDragging }: CardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: inq.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onExpand(inq)}
      className={`cursor-grab select-none rounded-xl border border-border bg-background p-3.5 transition-shadow active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{inq.company || inq.name}</p>
        {!inq.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </div>
      {inq.company && <p className="truncate text-xs text-muted-foreground">{inq.name}</p>}
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{inq.message}</p>
      <p className="mt-2.5 text-[11px] text-muted-foreground">{timeAgo(inq.createdAt)}</p>
    </div>
  );
}

// Ghost card shown under the cursor while dragging
function DragGhostCard({ inq }: { inq: InquiryRecord }) {
  return (
    <div className="w-56 rotate-2 rounded-xl border border-foreground/20 bg-background p-3.5 opacity-95 shadow-2xl">
      <p className="truncate text-sm font-semibold text-foreground">{inq.company || inq.name}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{inq.message}</p>
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

interface ColumnProps {
  col: (typeof COLUMNS)[number];
  cards: InquiryRecord[];
  draggingId: string | null;
  onExpand: (inq: InquiryRecord) => void;
}

function KanbanColumn({ col, cards, draggingId, onExpand }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div className="flex w-64 shrink-0 flex-col lg:w-auto lg:min-w-0">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${col.dot}`} aria-hidden />
        <p className="text-sm font-medium text-foreground">{col.label}</p>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[160px] flex-1 space-y-2.5 rounded-2xl border p-2.5 transition-colors ${
          isOver ? "border-foreground/30 bg-muted" : "border-transparent bg-muted/50"
        }`}
      >
        {cards.map((inq) => (
          <DealCard key={inq.id} inq={inq} onExpand={onExpand} isDragging={draggingId === inq.id} />
        ))}
        {cards.length === 0 && !isOver && <p className="pt-8 text-center text-xs text-muted-foreground/70">Drop here</p>}
        {isOver && draggingId && !cards.some((c) => c.id === draggingId) && (
          <div className="h-16 rounded-xl border-2 border-dashed border-foreground/20" />
        )}
      </div>
    </div>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

function DetailDialog({
  inq,
  onClose,
  onMove,
}: {
  inq: InquiryRecord | null;
  onClose: () => void;
  onMove: (id: string, status: DealStatus) => void;
}) {
  return (
    <Modal
      open={!!inq}
      onClose={onClose}
      size="md"
      title={inq ? inq.company || inq.name : ""}
      description={
        inq ? (
          <>
            {inq.company ? `${inq.name} · ` : ""}
            {inq.email} · via {inq.kit.name} · {new Date(inq.createdAt).toLocaleDateString()}
          </>
        ) : undefined
      }
    >
      {inq && (
        <>
          <p className="whitespace-pre-line rounded-xl bg-muted/50 p-4 text-sm leading-relaxed text-foreground">{inq.message}</p>

          <p className="mb-2 mt-5 text-xs font-medium text-muted-foreground">Stage</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
            {COLUMNS.map((col) => {
              const on = inq.status === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onMove(inq.id, col.id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} aria-hidden />
                  {col.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={onClose}>Close</Button>
            <a href={`mailto:${inq.email}?subject=Re: collaboration inquiry`} className={buttonClass({ variant: "primary" })}>
              <Mail size={14} aria-hidden /> Reply by email
            </a>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function InboxList({ inquiries, onExpand }: { inquiries: InquiryRecord[]; onExpand: (inq: InquiryRecord) => void }) {
  const sorted = [...inquiries].sort((a, b) => {
    if (!a.read && b.read) return -1;
    if (a.read && !b.read) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (sorted.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground">Nothing in this stage.</p>;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
      {sorted.map((inq) => (
        <li key={inq.id}>
          <button
            type="button"
            onClick={() => onExpand(inq)}
            className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-5"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {initialOf(inq)}
              {!inq.read && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" aria-label="Unread" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className={`truncate text-sm ${inq.read ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>{inq.company || inq.name}</span>
                {inq.company && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{inq.name}</span>}
              </span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">{inq.message}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StageBadge status={inq.status ?? "new"} />
              <span className="text-[11px] text-muted-foreground">{timeAgo(inq.createdAt)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

interface Props {
  inquiries: InquiryRecord[];
  onUpdate: (id: string, status: DealStatus) => void;
  onMarkRead: (id: string) => void;
}

const VIEW_KEY = "kitevo-pipeline-view";

export function DealPipeline({ inquiries, onUpdate, onMarkRead }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");
  const [stage, setStage] = useState<DealStatus | "all">("all");

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(VIEW_KEY) === "board") setView("board");
    } catch {
      /* storage blocked: default view */
    }
  }, []);

  const chooseView = (v: "list" | "board") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const handleExpand = (inq: InquiryRecord) => {
    setExpandedId(inq.id);
    if (!inq.read) onMarkRead(inq.id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const byStatus = (status: DealStatus) => inquiries.filter((i) => (i.status ?? "new") === status);

  const handleDragStart = (event: DragStartEvent) => setDraggingId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingId(null);
    if (!over) return;
    const newStatus = over.id as DealStatus;
    const inq = inquiries.find((i) => i.id === active.id);
    if (inq && newStatus !== inq.status) onUpdate(inq.id, newStatus);
  };

  const draggingInq = draggingId ? inquiries.find((i) => i.id === draggingId) : null;
  const expanded = expandedId ? (inquiries.find((i) => i.id === expandedId) ?? null) : null;

  const board = (
    // Five fixed-width columns that scroll sideways on smaller screens, instead of wrapping.
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex gap-3 lg:grid lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} cards={byStatus(col.id)} draggingId={draggingId} onExpand={handleExpand} />
        ))}
      </div>
    </div>
  );

  const seg = (on: boolean) =>
    `inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <>
      <DetailDialog inq={expanded} onClose={() => setExpandedId(null)} onMove={onUpdate} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {view === "list" ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
            {[{ id: "all" as const, label: "All", count: inquiries.length }, ...COLUMNS.map((c) => ({ id: c.id, label: c.label, count: byStatus(c.id).length }))].map((f) => {
              const on = stage === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStage(f.id)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span className={`tabular-nums ${on ? "opacity-70" : "opacity-60"}`}>{f.count}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Drag a card to move it to another stage.</p>
        )}
        <div className="flex rounded-full bg-muted p-0.5" role="radiogroup" aria-label="View">
          <button type="button" role="radio" aria-checked={view === "list"} onClick={() => chooseView("list")} className={seg(view === "list")}>
            <List size={13} aria-hidden /> List
          </button>
          <button type="button" role="radio" aria-checked={view === "board"} onClick={() => chooseView("board")} className={seg(view === "board")}>
            <Columns3 size={13} aria-hidden /> Board
          </button>
        </div>
      </div>

      {view === "list" ? (
        <InboxList inquiries={stage === "all" ? inquiries : byStatus(stage)} onExpand={handleExpand} />
      ) : mounted ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {board}
          <DragOverlay>{draggingInq && <DragGhostCard inq={draggingInq} />}</DragOverlay>
        </DndContext>
      ) : (
        board
      )}
    </>
  );
}
