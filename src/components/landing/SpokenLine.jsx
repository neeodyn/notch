import { Mic } from "lucide-react";

/** Something the painter says out loud, set over the photo of him saying it. */
export default function SpokenLine({ children }) {
  return (
    <figcaption className="spoken-line">
      <span className="spoken-line-mic"><Mic size={15} /></span>
      <span>{children}</span>
    </figcaption>
  );
}