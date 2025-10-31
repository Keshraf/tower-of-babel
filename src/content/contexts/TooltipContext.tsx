import { createContext, useContext, useState, ReactNode } from "react";
import type { SupportedLanguage } from "../utils/translationConfig";

interface WordData {
  english: string;
  translated: string;
}

interface WordHoverContextValue {
  wordData: WordData | null;
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  language: SupportedLanguage;
  show: (data: WordData, element: HTMLElement, lang: SupportedLanguage) => void;
  hide: () => void;
}

const WordHoverContext = createContext<WordHoverContextValue | undefined>(
  undefined
);

export function WordHoverProvider({ children }: { children: ReactNode }) {
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>("french");

  const show = (
    data: WordData,
    element: HTMLElement,
    lang: SupportedLanguage
  ) => {
    setWordData(data);
    setAnchorEl(element);
    setLanguage(lang);
    setIsOpen(true);
  };

  const hide = () => {
    // Just clear the data, let Radix handle the closing
    setWordData(null);
    setAnchorEl(null);
    setIsOpen(false);
  };

  return (
    <WordHoverContext.Provider
      value={{
        wordData,
        isOpen,
        anchorEl,
        language,
        show,
        hide,
      }}
    >
      {children}
    </WordHoverContext.Provider>
  );
}

export function useWordHover() {
  const context = useContext(WordHoverContext);
  if (!context) {
    throw new Error("useWordHover must be used within WordHoverProvider");
  }
  return context;
}

// Legacy export for backward compatibility
export const TooltipProvider = WordHoverProvider;
export const useTooltip = useWordHover;
