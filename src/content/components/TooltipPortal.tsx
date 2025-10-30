import { useTooltip } from "../contexts/TooltipContext";
import { speakFrench } from "../utils/tts";

export default function TooltipPortal() {
  const { wordData, position } = useTooltip();

  if (!wordData) return null;

  return (
    <div
      className="tooltip"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        background: "white",
        border: "1px solid #e5e7eb",
        padding: "12px 16px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 999999,
        minWidth: "200px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        className="word-info"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <strong style={{ fontSize: "16px", color: "#1f2937" }}>
          {wordData.french}
        </strong>
        <button
          onClick={() => speakFrench(wordData.french)}
          style={{
            background: "#3b82f6",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "16px",
          }}
          title="Pronounce word"
        >
          🔊
        </button>
      </div>
      <div
        className="translation"
        style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}
      >
        English: <span style={{ color: "#1f2937" }}>{wordData.english}</span>
      </div>
      {wordData.pronunciation && (
        <div
          className="pronunciation"
          style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}
        >
          {wordData.pronunciation}
        </div>
      )}
    </div>
  );
}
