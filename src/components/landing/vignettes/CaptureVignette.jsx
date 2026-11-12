import { Image } from "@/components/ui/image";

export default function CaptureVignette() {
  return (
    <div className="relative h-[300px] overflow-hidden rounded-t-[26px] sm:h-[330px]">
      <Image src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80" alt="Freshly finished interior seen during a house walk" className="h-full w-full object-cover" />
      <div className="glass-panel absolute left-4 top-4 flex items-center gap-2.5 rounded-full px-4 py-2 text-[13px] font-semibold"><span className="h-2 w-2 rounded-full bg-destructive" />Recording<span className="tabular-money font-normal text-muted-foreground">0:27</span></div>
      <p className="glass-panel absolute inset-x-4 bottom-4 rounded-[22px] px-5 py-4 text-[15px] leading-snug">“Hallway, eight by one-two. Walls only, ceiling optional at one ninety.”</p>
    </div>
  );
}