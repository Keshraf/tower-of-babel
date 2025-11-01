import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Mic,
  SkipForward,
  Eye,
  X,
  Trophy,
  ArrowLeft,
  Volume2,
} from "lucide-react";
import { quizService } from "../../content/services/QuizService";
import { pronunciationService } from "../../content/services/PronunciationService";
import { storageService } from "../../content/services/StorageService";
import { speak } from "../../content/utils/tts";
import type { SupportedLanguage } from "../../content/utils/translationConfig";

interface QuizQuestion {
  type: "multipleChoice" | "pronunciation";
  question: string;
  options?: string[];
  correctAnswer: string;
  correctIndex?: number;
  translatedWord?: string;
  englishWord: string;
}

interface MixedQuizViewProps {
  language: SupportedLanguage;
  onBack: () => void;
}

export function MixedQuizView({ language, onBack }: MixedQuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<{
    isCorrect: boolean;
    transcription: string;
    feedback: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [noWords, setNoWords] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    generateMixedQuiz();
    return () => {
      quizService.destroy();
      pronunciationService.destroy();
    };
  }, [language]);

  const generateMixedQuiz = async () => {
    setIsLoading(true);
    try {
      // Get all words for the language
      const words = await storageService.getWords(language);
      const wordEntries = Object.entries(words);

      if (wordEntries.length === 0) {
        setNoWords(true);
        setIsLoading(false);
        return;
      }

      // Initialize services
      await quizService.initialize();
      await pronunciationService.initialize();

      // Select random words (max 5 words = 10 questions)
      const numWords = Math.min(5, wordEntries.length);
      const selectedWords = shuffleArray(wordEntries).slice(0, numWords);

      // Generate questions for each word (2 questions per word)
      const allQuestions: QuizQuestion[] = [];

      for (const [wordId, wordData] of selectedWords) {
        // Question 1: Multiple Choice
        const mcQuestion = await quizService.generateMultipleChoiceQuestion(
          wordData.english,
          wordData.translated,
          language
        );

        allQuestions.push({
          type: "multipleChoice",
          question: mcQuestion.question,
          options: mcQuestion.options,
          correctAnswer: mcQuestion.correctAnswer,
          correctIndex: mcQuestion.correctIndex,
          englishWord: wordData.english,
          translatedWord: wordData.translated,
        });

        // Question 2: Pronunciation
        allQuestions.push({
          type: "pronunciation",
          question: `Say the word "${wordData.translated}" in ${
            language === "french" ? "French" : "Spanish"
          }`,
          correctAnswer: wordData.translated,
          translatedWord: wordData.translated,
          englishWord: wordData.english,
        });
      }

      // Shuffle all questions
      const shuffledQuestions = shuffleArray(allQuestions);
      setQuestions(shuffledQuestions);
    } catch (error) {
      console.error("Failed to generate mixed quiz:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleMultipleChoiceAnswer = (index: number) => {
    if (showAnswer) return;

    setSelectedAnswer(index);
    setShowAnswer(true);

    const currentQuestion = questions[currentQuestionIndex];
    if (index === currentQuestion.correctIndex) {
      setScore(score + 1);
    }
  };

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      await pronunciationService.startRecording();
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      const audioBlob = await pronunciationService.stopRecording();

      const currentQuestion = questions[currentQuestionIndex];
      const result = await pronunciationService.validatePronunciation(
        audioBlob,
        currentQuestion.correctAnswer,
        language
      );

      setPronunciationResult(result);
      setShowAnswer(true);

      if (result.isCorrect) {
        setScore(score + 1);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setPronunciationResult(null);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setScore(0);
    setPronunciationResult(null);
    setQuizCompleted(false);
    generateMixedQuiz();
  };

  const handleListen = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || isSpeaking) return;

    setIsSpeaking(true);
    try {
      const langCode = language === "french" ? "fr-FR" : "es-ES";
      // For both question types, speak the translated word (target language)
      const wordToSpeak =
        currentQuestion.translatedWord || currentQuestion.correctAnswer;
      await speak(wordToSpeak, langCode);
    } catch (error) {
      console.error("Error speaking word:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600">Generating quiz...</p>
        </div>
      </div>
    );
  }

  if (noWords) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] space-y-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-900">
            No words encountered yet
          </p>
          <p className="text-sm text-gray-600">
            Start browsing websites to learn new words!
          </p>
        </div>
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="p-6 space-y-4 min-h-[400px] flex flex-col justify-center">
        <div className="text-center space-y-3">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
          <h3 className="text-2xl font-bold text-gray-900">Quiz Complete!</h3>
          <div className="text-4xl font-bold text-blue-600">
            {score}/{questions.length}
          </div>
          <p className="text-lg text-gray-600">{percentage}% Correct</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRestart} variant="default" className="flex-1">
            Try Again
          </Button>
          <Button onClick={onBack} variant="outline" className="flex-1 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-4 p-4 min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="text-sm font-medium text-gray-600">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="text-sm font-semibold text-blue-600">
          Score: {score}/{questions.length}
        </div>
      </div>

      {/* Question */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleListen}
            disabled={isSpeaking}
            className="flex-shrink-0 mt-1 p-1.5 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
            title="Listen to pronunciation"
          >
            <Volume2
              className={`w-5 h-5 text-blue-600 ${
                isSpeaking ? "animate-pulse" : ""
              }`}
            />
          </button>
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-900">
              {currentQuestion.question}
            </p>
            {currentQuestion.englishWord && (
              <p className="text-sm text-gray-600 mt-1">
                Word: {currentQuestion.englishWord}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Multiple Choice Question */}
      {currentQuestion.type === "multipleChoice" && (
        <div className="space-y-2">
          {currentQuestion.options?.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showFeedback = showAnswer;

            let buttonClass =
              "w-full justify-start text-left h-auto py-3 px-4 ";
            if (showFeedback) {
              if (isCorrect) {
                buttonClass += "bg-green-100 border-green-500 text-green-900";
              } else if (isSelected && !isCorrect) {
                buttonClass += "bg-red-100 border-red-500 text-red-900";
              }
            }

            return (
              <Button
                key={index}
                onClick={() => handleMultipleChoiceAnswer(index)}
                variant={isSelected ? "default" : "outline"}
                disabled={showAnswer}
                className={buttonClass}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option}</span>
                  {showFeedback && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      )}

      {/* Pronunciation Question */}
      {currentQuestion.type === "pronunciation" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-4">
            <Button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="gap-2"
            >
              <Mic className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`} />
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>

            {isRecording && (
              <p className="text-sm text-gray-600 animate-pulse">
                Listening...
              </p>
            )}
          </div>

          {pronunciationResult && (
            <div
              className={`rounded-lg p-4 ${
                pronunciationResult.isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {pronunciationResult.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p
                    className={`font-semibold ${
                      pronunciationResult.isCorrect
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {pronunciationResult.isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  <p className="text-sm text-gray-700">
                    You said: "{pronunciationResult.transcription}"
                  </p>
                  <p className="text-sm text-gray-600">
                    {pronunciationResult.feedback}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 pt-2">
        {!showAnswer && (
          <>
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 gap-1.5"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </Button>
            <Button
              onClick={handleShowAnswer}
              variant="outline"
              className="flex-1 gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Show Answer
            </Button>
          </>
        )}
        {showAnswer && (
          <Button onClick={handleNext} variant="default" className="w-full">
            {currentQuestionIndex < questions.length - 1
              ? "Next Question"
              : "Finish Quiz"}
          </Button>
        )}
      </div>
    </div>
  );
}
