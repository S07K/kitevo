"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

const ORBS = [
  { x: "15%", y: "20%", size: 420, color: "rgba(99,102,241,0.18)", delay: 0 },
  { x: "70%", y: "60%", size: 340, color: "rgba(201,123,75,0.14)", delay: 1.2 },
  { x: "55%", y: "10%", size: 260, color: "rgba(201,168,76,0.12)", delay: 0.6 },
  { x: "10%", y: "70%", size: 300, color: "rgba(99,102,241,0.10)", delay: 1.8 },
];

function AnimatedOrb({ orb, index }: { orb: typeof ORBS[0]; index: number }) {
  return (
    <motion.div
      className="absolute rounded-full blur-[80px] pointer-events-none"
      style={{
        left: orb.x,
        top: orb.y,
        width: orb.size,
        height: orb.size,
        background: orb.color,
        translateX: "-50%",
        translateY: "-50%",
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.08, 0.95, 1],
      }}
      transition={{
        duration: 10 + index * 2.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: orb.delay,
      }}
    />
  );
}

export function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — animated dark background ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden bg-[#0e0e0d]">
        {/* Orb animations */}
        {!prefersReducedMotion && ORBS.map((orb, i) => (
          <AnimatedOrb key={i} orb={orb} index={i} />
        ))}

        {/* Noise overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10">
          <Link href="/" className="font-display text-lg font-semibold text-white/90 tracking-tight hover:opacity-70 transition-opacity">
            Kitevo
          </Link>
          <div className="max-w-xs">
            <p className="font-display text-3xl font-semibold text-white leading-snug tracking-tight">
              Your media kit.<br />Your brand. Your deals.
            </p>
            <p className="mt-3 text-sm text-white/40 leading-relaxed">
              Built for creators who take their brand seriously.
            </p>
          </div>
          <p className="text-xs text-white/20">© {new Date().getFullYear()} Kitevo</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Mobile header */}
        <header className="lg:hidden border-b border-border bg-background/95 px-5 py-4 backdrop-blur-md">
          <Link href="/" className="font-display text-foreground text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity">
            Kitevo
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-[360px]">
            <div className="mb-7">
              <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
