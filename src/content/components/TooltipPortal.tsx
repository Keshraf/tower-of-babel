import { createPortal } from "react-dom";
import { useWordHover } from "../contexts/TooltipContext";
import { WordHoverCard } from "./WordHoverCard";

export default function TooltipPortal() {
  const { wordData, isOpen, anchorEl, language } = useWordHover();

  return createPortal(
    <WordHoverCard
      wordData={wordData}
      isOpen={isOpen}
      anchorEl={anchorEl}
      language={language}
    />,
    document.body
  );
}
