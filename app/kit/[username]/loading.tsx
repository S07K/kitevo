import { PublicKitSkeleton } from "@/app/components/Skeleton";

export default function KitPageLoading() {
  return (
    <div className="min-h-screen bg-[#F5F3F0]">
      <header className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between bg-[#F5F3F0]/90 backdrop-blur-md border-b border-[#E5E2DE]">
        <span className="font-display text-sm tracking-wide text-[#6B6560] font-medium">
          Kitevo
        </span>
      </header>
      <PublicKitSkeleton />
    </div>
  );
}
