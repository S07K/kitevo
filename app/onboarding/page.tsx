"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppNav } from "../components/AppNav";

const steps = [
  {
    title: "Complete your profile",
    description: "Add your name, username, bio and links. Your username is used for your public kit URL.",
    href: "/dashboard",
    cta: "Go to profile",
  },
  {
    title: "Connect Instagram",
    description: "Link your Instagram Business or Creator account to show live follower stats and recent posts.",
    href: "/dashboard",
    cta: "Connect Instagram",
  },
  {
    title: "Create your first kit",
    description: "Create a media kit with your work samples, rates and brands. You can edit it anytime.",
    href: "/dashboard",
    cta: "Create kit",
  },
  {
    title: "Subscribe",
    description: "Choose a plan to publish your kit and unlock all features.",
    href: "/pricing",
    cta: "View pricing",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    setFinishing(true);
    try {
      const res = await fetch("/api/me/onboarding-complete", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setFinishing(false);
      }
    } catch {
      setFinishing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/pricing", label: "Pricing" },
        ]}
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-semibold text-[#1A1A1A]">
          Welcome to Media Kit Pro
        </h1>
        <p className="mt-2 text-[#5C5C5C]">
          Here’s a quick path to get your first media kit live. You can do these in any order.
        </p>

        <ul className="mt-10 space-y-6">
          {steps.map((step, i) => (
            <li
              key={i}
              className="p-5 border border-[#E8E6E3] rounded-sm bg-white"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-[#8C8C8C]">
                Step {i + 1}
              </span>
              <h2 className="mt-2 font-display text-lg font-semibold text-[#1A1A1A]">
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                {step.description}
              </p>
              <Link
                href={step.href}
                className="mt-4 inline-block px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 pt-8 border-t border-[#E8E6E3]">
          <p className="text-sm text-[#5C5C5C]">
            When you’re ready, go to your dashboard to manage everything in one place.
          </p>
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="mt-4 w-full sm:w-auto px-6 py-3 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
          >
            {finishing ? "Taking you there…" : "Go to Dashboard"}
          </button>
        </div>
      </main>
    </div>
  );
}
