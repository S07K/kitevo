"use client";

import { useEffect, useState } from "react";
import { Inbox, Lock } from "lucide-react";
import { WorkspaceShell, PageHeader, Eyebrow } from "@/app/components/workspace/WorkspaceShell";
import { ButtonLink } from "@/app/components/workspace/Button";
import { Skeleton } from "@/app/components/Skeleton";
import { DealPipeline, type InquiryRecord, type DealStatus } from "@/app/components/DealPipeline";

export function PipelineView() {
  const [inquiries, setInquiries] = useState<InquiryRecord[] | null>(null);
  const [tierId, setTierId] = useState<string | null | undefined>(undefined);

  // Plan and inquiries load in parallel; neither waits on the other.
  useEffect(() => {
    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTierId(d?.tierId ?? null))
      .catch(() => setTierId(null));
    fetch("/api/inquiries", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setInquiries(Array.isArray(d) ? d : []))
      .catch(() => setInquiries([]));
  }, []);

  const patch = (id: string, body: Record<string, unknown>) =>
    fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }).catch(() => {});

  const updateStatus = (id: string, status: DealStatus) => {
    setInquiries((prev) => prev?.map((i) => (i.id === id ? { ...i, status, read: status !== "new" ? true : i.read } : i)) ?? prev);
    patch(id, { status });
  };
  const markRead = (id: string) => {
    setInquiries((prev) => prev?.map((i) => (i.id === id ? { ...i, read: true } : i)) ?? prev);
    patch(id, { read: true });
  };

  const list = inquiries ?? [];
  const count = (s: DealStatus) => list.filter((i) => (i.status ?? "new") === s).length;
  const stats = [
    { label: "Unread", value: list.filter((i) => !i.read).length },
    { label: "Open", value: count("new") + count("reviewing") + count("negotiating") },
    { label: "Won", value: count("won") },
    { label: "Total", value: list.length },
  ];
  // The contact form on a kit is Pro-only (app/kit/[username]/page.tsx: inquiryEnabled).
  const hasInquiryForm = tierId === "pro";
  const loading = inquiries === null || tierId === undefined;

  return (
    <WorkspaceShell width="wide">
      <PageHeader
        eyebrow="Social"
        title="Pipeline"
        description="Brand inquiries from the contact form on your kit. Move each one along until it's a deal."
      />

      {loading ? (
        <div aria-hidden>
          <Skeleton className="mb-6 h-[88px] w-full rounded-2xl" />
          <div className="mb-4 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="space-y-px overflow-hidden rounded-2xl border border-border">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-none" />
            ))}
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
          {hasInquiryForm ? (
            <>
              <Inbox size={20} className="mx-auto text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">No inquiries yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                When a brand fills in the contact form on your kit, it lands here as a deal to track.
              </p>
              <ButtonLink href="/dashboard" className="mt-5">
                Share my kit
              </ButtonLink>
            </>
          ) : (
            <>
              <Lock size={20} className="mx-auto text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">The brand inquiry form is a Pro feature</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                With Pro, your kit gets a contact form, and every inquiry shows up here to track from first message to won deal.
              </p>
              <ButtonLink href="/pricing?plan=pro" variant="primary" className="mt-5">
                See Pro
              </ButtonLink>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
            {stats.map((t) => (
              <div key={t.label} className="bg-background px-5 py-4">
                <Eyebrow>{t.label}</Eyebrow>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">{t.value}</p>
              </div>
            ))}
          </div>
          <DealPipeline inquiries={list} onUpdate={updateStatus} onMarkRead={markRead} />
        </>
      )}
    </WorkspaceShell>
  );
}
