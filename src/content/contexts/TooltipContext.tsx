import { createContext, useContext, useState, ReactNode } from "react";

interface WordData {
  english: string;
  french: string;
  pronunciation?: string;
}

interface TooltipState {
  wordData: WordData | null;
  position: { x: number; y: number };
  show: (data: WordData, x: number, y: number) => void;
  hide: () => void;
}

const TooltipContext = createContext<TooltipState | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const show = (data: WordData, x: number, y: number) => {
    setWordData(data);
    setPosition({ x, y });
  };

  const hide = () => {
    setWordData(null);
  };

  return (
    <TooltipContext.Provider value={{ wordData, position, show, hide }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltip() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("useTooltip must be used within TooltipProvider");
  }
  return context;
}
