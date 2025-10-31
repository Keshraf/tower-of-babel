import { useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../components/ui/hover-card";
import { Button } from "../../components/ui/button";
import { Volume2, Brain, BookOpen } from "lucide-react";
import { speak } from "../utils/tts";
import { storageService } from "../services/StorageService";
import { exampleSentenceService } from "../services/ExampleSentenceService";
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
  const [cachedQuestions, setCachedQuestions] = useState<Record<string, any[]>>(
    {}
  );
  const [currentWordKey, setCurrentWordKey] = useState<string>("");
  const [exampleSentence, setExampleSentence] = useState<{
    target: string;
    english: string;
  } | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [cachedExamples, setCachedExamples] = useState<
    Record<string, { target: string; english: string }>
  >({});

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

      // Generate example sentence
      generateExampleSentence(wordKey);
    }
  }, [wordData?.english, language]);

  const generateExampleSentence = async (wordKey: string) => {
    // Check if we have a cached example for this word
    if (cachedExamples[wordKey]) {
      console.log("[WordHoverCard] Using cached example sentence");
      setExampleSentence(cachedExamples[wordKey]);
      return;
    }

    if (!wordData || !anchorEl) return;

    setIsLoadingExample(true);
    setExampleSentence(null);

    try {
      // Extract page context from the parent element
      const parentElement = anchorEl.parentElement;
      const pageContext = parentElement?.textContent?.trim() || "";

      console.log(
        `[WordHoverCard] Generating example for "${wordData.translated}" with context: "${pageContext.substring(0, 100)}..."`
      );

      const example = await exampleSentenceService.generateExampleSentence(
        wordData.english,
        wordData.translated,
        language,
        pageContext
      );

      setExampleSentence(example);

      // Cache the example
      setCachedExamples((prev) => ({
        ...prev,
        [wordKey]: example,
      }));

      console.log("[WordHoverCard] Example sentence generated and cached");
    } catch (error) {
      console.error("[WordHoverCard] Failed to generate example:", error);
      setExampleSentence({
        target: "Example unavailable",
        english: "Could not generate example sentence",
      });
    } finally {
      setIsLoadingExample(false);
    }
  };

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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-t-md flex-shrink-0 relative">
              <img
                src={chrome.runtime.getURL("public/Logo.png")}
                alt="Tower of Babel"
                className="absolute top-2 right-2 w-5 h-5 opacity-50"
              />
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

                {/* Example Sentence Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Example Sentence
                    </span>
                  </div>

                  {isLoadingExample ? (
                    // Skeleton loading
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                    </div>
                  ) : exampleSentence ? (
                    // Example sentence content
                    <div className="space-y-1.5 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                      <p className="text-sm font-semibold text-indigo-700 leading-relaxed">
                        {exampleSentence.target}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {exampleSentence.english}
                      </p>
                    </div>
                  ) : null}
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
