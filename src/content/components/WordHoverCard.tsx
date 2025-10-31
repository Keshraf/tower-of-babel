import { useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../components/ui/hover-card";
import { Button } from "../../components/ui/button";
import { speak } from "../utils/tts";
import { storageService } from "../services/StorageService";
import type { SupportedLanguage } from "../utils/translationConfig";

interface WordData {
  english: string;
  translated: string;
  timesEncountered?: number;
}

interface WordHoverCardProps {
  wordData: WordData | null;
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  language: SupportedLanguage;
}

export function WordHoverCard({
  wordData,
  isOpen,
  anchorEl,
  language,
}: WordHoverCardProps) {
  const [timesEncountered, setTimesEncountered] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Fetch times encountered from storage when word changes
  useEffect(() => {
    if (wordData?.english) {
      const fetchWordData = async () => {
        const storedWord = await storageService.getWord(
          language,
          wordData.english.toLowerCase()
        );
        if (storedWord) {
          setTimesEncountered(storedWord.timesEncountered);
        } else {
          setTimesEncountered(1);
        }
      };
      fetchWordData();
    }
  }, [wordData?.english, language]);

  const handleSpeak = async () => {
    if (!wordData) return;

    setIsSpeaking(true);
    try {
      // Get language code for TTS
      const langCode = language === "french" ? "fr-FR" : "es-ES";
      await speak(wordData.translated, langCode);
    } catch (error) {
      console.error("Error speaking word:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (!wordData || !anchorEl) return null;

  return (
    <HoverCard openDelay={200} closeDelay={300}>
      <HoverCardTrigger asChild>
        {/* Invisible trigger positioned at the word */}
        <div
          style={{
            position: "absolute",
            left: `${anchorEl.getBoundingClientRect().left}px`,
            top: `${anchorEl.getBoundingClientRect().top + window.scrollY}px`,
            width: `${anchorEl.getBoundingClientRect().width}px`,
            height: `${anchorEl.getBoundingClientRect().height}px`,
            pointerEvents: "auto",
          }}
        />
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 p-4"
        side="top"
        align="center"
        sideOffset={8}
      >
        <div className="space-y-3">
          {/* Word Translation */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {wordData.english}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-lg font-semibold text-blue-600">
              {wordData.translated}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Stats */}
          <div className="text-sm text-gray-600">
            <span className="font-medium">Encountered:</span>{" "}
            <span className="text-gray-900">{timesEncountered}</span>{" "}
            {timesEncountered === 1 ? "time" : "times"}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSpeak}
              disabled={isSpeaking}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <span className="mr-2">🔊</span>
              {isSpeaking ? "Speaking..." : "Speak"}
            </Button>
            <Button
              disabled
              variant="outline"
              size="sm"
              className="flex-1"
              title="Coming soon!"
            >
              <span className="mr-2">📝</span>
              Practice
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
