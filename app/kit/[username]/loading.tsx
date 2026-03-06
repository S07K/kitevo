import { PublicKitSkeleton } from "@/app/components/Skeleton";

export default function KitPageLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between bg-[#FAF9F7]/95 backdrop-blur-md border-b border-[#E8E6E3]">
        <span className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
          Media Kit Pro
        </span>
      </header>
      <PublicKitSkeleton />
    </div>
  );
}
