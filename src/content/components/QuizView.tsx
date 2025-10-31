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
  Volume2,
} from "lucide-react";
import { quizService } from "../services/QuizService";
import { pronunciationService } from "../services/PronunciationService";
import { speak } from "../utils/tts";
import type { SupportedLanguage } from "../utils/translationConfig";

interface QuizQuestion {
  type: "multipleChoice" | "pronunciation";
  question: string;
  options?: string[];
  correctAnswer: string;
  correctIndex?: number;
  translatedWord?: string;
}

interface QuizViewProps {
  englishWord: string;
  translatedWord: string;
  language: SupportedLanguage;
  onEndQuiz: () => void;
  cachedQuestions?: QuizQuestion[] | null;
  onQuestionsGenerated?: (questions: QuizQuestion[]) => void;
}

export function QuizView({
  englishWord,
  translatedWord,
  language,
  onEndQuiz,
  cachedQuestions,
  onQuestionsGenerated,
}: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    cachedQuestions || []
  );
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
  const [isLoading, setIsLoading] = useState(!cachedQuestions);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Generate quiz questions on mount only if not cached
  useEffect(() => {
    if (!cachedQuestions) {
      generateQuestions();
    }
    return () => {
      // Cleanup only if not preserving state
      if (!onQuestionsGenerated) {
        quizService.destroy();
        pronunciationService.destroy();
      }
    };
  }, [cachedQuestions]);

  const generateQuestions = async () => {
    setIsLoading(true);
    try {
      // Initialize services
      await quizService.initialize();
      await pronunciationService.initialize();

      // Generate Question 1: Multiple Choice
      const mcQuestion = await quizService.generateMultipleChoiceQuestion(
        englishWord,
        translatedWord,
        language
      );

      // Question 2: Pronunciation
      const pronQuestion: QuizQuestion = {
        type: "pronunciation",
        question: `Say the word "${translatedWord}" in ${
          language === "french" ? "French" : "Spanish"
        }`,
        correctAnswer: translatedWord,
        translatedWord: translatedWord,
      };

      const generatedQuestions = [
        {
          type: "multipleChoice" as const,
          question: mcQuestion.question,
          options: mcQuestion.options,
          correctAnswer: mcQuestion.correctAnswer,
          correctIndex: mcQuestion.correctIndex,
          translatedWord: translatedWord,
        },
        pronQuestion,
      ];

      setQuestions(generatedQuestions);

      // Cache the questions
      if (onQuestionsGenerated) {
        onQuestionsGenerated(generatedQuestions);
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMultipleChoiceAnswer = (index: number) => {
    if (showAnswer) return; // Already answered

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

      // Validate pronunciation
      const result = await pronunciationService.validatePronunciation(
        audioBlob,
        translatedWord,
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
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600">Generating quiz...</p>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="p-6 space-y-4">
        <div className="text-center space-y-3">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
          <h3 className="text-2xl font-bold text-gray-900">Quiz Complete!</h3>
          <div className="text-4xl font-bold text-blue-600">
            {score}/{questions.length}
          </div>
          <p className="text-lg text-gray-600">{percentage}% Correct</p>
        </div>

        <Button onClick={onEndQuiz} variant="default" className="w-full">
          Back to Word
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-600">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <Button
          onClick={onEndQuiz}
          variant="ghost"
          size="sm"
          className="gap-1.5"
        >
          <X className="w-4 h-4" />
          End Quiz
        </Button>
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
          <p className="text-lg font-semibold text-gray-900 flex-1">
            {currentQuestion.question}
          </p>
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
