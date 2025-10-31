import { useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../components/ui/hover-card";
import { Button } from "../../components/ui/button";
import { Volume2, Brain } from "lucide-react";
import { speak } from "../utils/tts";
import { storageService } from "../services/StorageService";
import { QuizView } from "./QuizView";
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
  const [showQuiz, setShowQuiz] = useState(false);
  const [cachedQuestions, setCachedQuestions] = useState<
    Record<string, any[]>
  >({});
  const [currentWordKey, setCurrentWordKey] = useState<string>("");

  // Track word changes and reset quiz state
  useEffect(() => {
    if (wordData?.english) {
      const wordKey = `${wordData.english.toLowerCase()}_${language}`;
      setCurrentWordKey(wordKey);

      // Reset quiz view when word changes
      setShowQuiz(false);

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

  const handleStartQuiz = () => {
    setShowQuiz(true);
  };

  const handleEndQuiz = () => {
    setShowQuiz(false);
  };

  const handleQuestionsGenerated = (questions: any[]) => {
    setCachedQuestions((prev) => ({
      ...prev,
      [currentWordKey]: questions,
    }));
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
        className="w-80 p-0 h-[400px] flex flex-col"
        side="top"
        align="center"
        sideOffset={8}
      >
        {!showQuiz ? (
          <div className="flex flex-col h-full">
            {/* Header with Word Translation */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-t-md flex-shrink-0">
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    English
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {wordData.english}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {language === "french" ? "French" : "Spanish"}
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {wordData.translated}
                  </span>
                </div>
              </div>
            </div>

            {/* Body with Stats - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 space-y-3">
                {/* Stats */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Seen:</span>
                    <span className="font-semibold text-gray-900">
                      {timesEncountered}
                    </span>
                    <span className="text-gray-500">
                      {timesEncountered === 1 ? "time" : "times"}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    variant="default"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    {isSpeaking ? "Speaking..." : "Listen"}
                  </Button>
                  <Button
                    onClick={handleStartQuiz}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Practice
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <QuizView
              englishWord={wordData.english}
              translatedWord={wordData.translated}
              language={language}
              onEndQuiz={handleEndQuiz}
              cachedQuestions={cachedQuestions[currentWordKey] || null}
              onQuestionsGenerated={handleQuestionsGenerated}
            />
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
