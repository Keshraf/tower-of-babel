import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { storageService } from "../../content/services/StorageService";
import type {
  DifficultyLevel,
  DensityLevel,
} from "../../content/utils/translationConfig";

interface SettingsViewProps {
  onBack: () => void;
}

const DIFFICULTY_OPTIONS: {
  value: DifficultyLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Simple, common words",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Balanced word selection",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Complex vocabulary",
  },
];

const DENSITY_OPTIONS: {
  value: DensityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "low",
    label: "Few",
    description: "Translate fewer words",
  },
  {
    value: "medium",
    label: "Moderate",
    description: "Balanced translation",
  },
  {
    value: "high",
    label: "Many",
    description: "Translate more words",
  },
];

export function SettingsView({ onBack }: SettingsViewProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner");
  const [density, setDensity] = useState<DensityLevel>("high");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [currentDifficulty, currentDensity] = await Promise.all([
        storageService.getDifficulty(),
        storageService.getDensity(),
      ]);
      setDifficulty(currentDifficulty);
      setDensity(currentDensity);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        storageService.setDifficulty(difficulty),
        storageService.setDensity(density),
      ]);
      console.log("Settings saved:", { difficulty, density });

      // Notify content scripts about settings change
      chrome.runtime.sendMessage({
        type: "SETTINGS_CHANGED",
        difficulty,
        density,
      });

      // Go back after successful save
      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Difficulty Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Word Difficulty
          </h3>
          <div className="space-y-2">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDifficulty(option.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  difficulty === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
                {difficulty === option.value && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Density Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Translation Density
          </h3>
          <div className="space-y-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDensity(option.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  density === option.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
                {density === option.value && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="default"
          className="w-full h-11"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
