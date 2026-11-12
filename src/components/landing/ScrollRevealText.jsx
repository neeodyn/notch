import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

export default function ScrollRevealText({ text, className }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.8"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>{word}</Word>
      ))}
    </p>
  );
}