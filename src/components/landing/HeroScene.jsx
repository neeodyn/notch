import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Mic } from "lucide-react";
import { Image } from "@/components/ui/image";
import HeroQuotePreview from "@/components/landing/HeroQuotePreview";
import { NZ_IMAGERY } from "@/lib/nzImagery";

export default function HeroScene() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  return (
    <motion.div ref={ref} className="hero-scene" style={{ scale }}>
      <div className="hero-scene-media">
        <Image src={NZ_IMAGERY.lounge} alt="Sunlit Ponsonby villa lounge with freshly painted walls, cornice and sash windows" className="block h-full w-full" />
        <div className="voice-preview glass-panel">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Mic size={18} /></span><div><p className="text-[15px] font-semibold leading-tight">Listening</p><p className="text-[13px] text-muted-foreground">Lounge · 0:14</p></div><div className="voice-bars" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div></div>
          <p className="mt-3 text-[15px] leading-snug sm:mt-4 sm:text-[17px]">“Lounge, five by four. Walls and ceiling, two coats. Eleven hundred.”</p>
        </div>
      </div>
      <HeroQuotePreview />
    </motion.div>
  );
}