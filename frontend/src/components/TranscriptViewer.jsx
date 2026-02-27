import { useState, useEffect } from "react";
import { updateTranscript } from "../utils/api";

const SPEAKER_COLORS = [
  "#d4a944", "#4ade80", "#3b82f6", "#ef4444",
  "#a855f7", "#f97316", "#06b6d4", "#ec4899",
];

function fmtTime(sec) {
  if (!sec && sec !== 0) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = (sec % 60).toFixed(2);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.padStart(5, "0")}`;
}

export default function TranscriptViewer({ transcript, jobId, onContinue, onUpdate }) {
  const [filter, setFilter] = useState("all");
  const [localTranscript, setLocalTranscript] = useState(transcript);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingSpeakerId, setEditingSpeakerId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalTranscript(transcript);
  }, [transcript]);

  if (!localTranscript) return null;
  const { sentences, speakers, duration, word_count } = localTranscript;

  const filtered =
    filter === "all"
      ? sentences
      : sentences.filter((s) => s.speaker === parseInt(filter));

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(localTranscript, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript_${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSentenceChange = (idx, newText) => {
    const updatedSentences = [...sentences];
    updatedSentences[idx] = { ...updatedSentences[idx], text: newText };
    setLocalTranscript({ ...localTranscript, sentences: updatedSentences });
    setHasChanges(true);
  };

  const handleSpeakerRename = (id, newName) => {
    const updatedSpeakers = speakers.map((s) =>
      s.id === id ? { ...s, name: newName } : s
    );
    const updatedSentences = sentences.map((s) =>
      s.speaker === id ? { ...s, speaker_name: newName } : s
    );
    setLocalTranscript({
      ...localTranscript,
      speakers: updatedSpeakers,
      sentences: updatedSentences,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!jobId) return;
    setIsSaving(true);
    try {
      await updateTranscript(jobId, {
        sentences: localTranscript.sentences,
        speakers: localTranscript.speakers,
      });
      setHasChanges(false);
      if (onUpdate) onUpdate(localTranscript);
      alert("Changes saved successfully!");
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ color: "var(--gold)", fontSize: 16, fontWeight: 600 }}>
          04 — Transcript Review & Editing
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {hasChanges && (
            <span className="tag" style={{ background: "var(--gold)", color: "#000" }}>
              UNSAVED CHANGES
            </span>
          )}
          <span className="tag tag-success">TRANSCRIBED</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Duration", value: fmtTime(duration) },
          { label: "Sentences", value: sentences.length.toLocaleString() },
          { label: "Words", value: word_count.toLocaleString() },
          { label: "Speakers", value: speakers.length },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-secondary)",
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {s.label}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Speaker Filter & Renaming */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`btn btn-sm ${filter === "all" ? "btn-gold" : "btn-outline"}`}
          onClick={() => setFilter("all")}
        >
          All Speakers
        </button>
        {speakers.map((sp) => (
          <div key={sp.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
            {editingSpeakerId === sp.id ? (
              <input
                autoFocus
                className="btn-sm"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--gold)",
                  color: "var(--text-primary)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  width: 100,
                }}
                value={sp.name}
                onChange={(e) => handleSpeakerRename(sp.id, e.target.value)}
                onBlur={() => setEditingSpeakerId(null)}
                onKeyDown={(e) => e.key === "Enter" && setEditingSpeakerId(null)}
              />
            ) : (
              <button
                className={`btn btn-sm ${filter === String(sp.id) ? "btn-gold" : "btn-outline"}`}
                onClick={() => setFilter(String(sp.id))}
                onDoubleClick={() => setEditingSpeakerId(sp.id)}
                title="Double-click to rename"
                style={
                  filter !== String(sp.id)
                    ? {
                        borderColor: SPEAKER_COLORS[sp.id % SPEAKER_COLORS.length] + "50",
                        color: SPEAKER_COLORS[sp.id % SPEAKER_COLORS.length],
                      }
                    : undefined
                }
              >
                {sp.name}
              </button>
            )}
          </div>
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>
          Tip: Double-click speaker or sentence to edit
        </span>
      </div>

      {/* Transcript Body */}
      <div
        style={{
          maxHeight: 420,
          overflowY: "auto",
          background: "var(--bg-secondary)",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          border: editingIndex !== null ? "1px solid var(--gold)" : "1px solid transparent",
        }}
      >
        {filtered.map((s, i) => {
          const globalIdx = sentences.findIndex(orig => orig === s);
          return (
            <div
              key={i}
              onDoubleClick={() => setEditingIndex(globalIdx)}
              style={{
                display: "flex",
                gap: 12,
                padding: "7px 0",
                borderBottom: "1px solid var(--border-color)",
                background: editingIndex === globalIdx ? "rgba(212, 169, 68, 0.05)" : "transparent",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                  minWidth: 85,
                  flexShrink: 0,
                }}
              >
                {fmtTime(s.start)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: SPEAKER_COLORS[(s.speaker || 0) % SPEAKER_COLORS.length],
                  minWidth: 80,
                  flexShrink: 0,
                }}
              >
                {s.speaker_name || `Speaker ${s.speaker}`}
              </span>
              
              {editingIndex === globalIdx ? (
                <textarea
                  autoFocus
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                    resize: "none",
                    outline: "none",
                    padding: 0,
                  }}
                  rows={Math.ceil(s.text.length / 60)}
                  value={s.text}
                  onChange={(e) => handleSentenceChange(globalIdx, e.target.value)}
                  onBlur={() => setEditingIndex(null)}
                />
              ) : (
                <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, flex: 1 }}>
                  {s.text}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-outline" onClick={handleDownload}>
          Download (JSON)
        </button>
        {hasChanges && (
          <button 
            className="btn btn-gold" 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ background: "var(--success)", borderColor: "var(--success)", color: "#000" }}
          >
            {isSaving ? "Saving..." : "Save Edits"}
          </button>
        )}
        <button className="btn btn-gold" onClick={onContinue} style={{ marginLeft: "auto" }}>
          Continue to Story Line →
        </button>
      </div>
    </div>
  );
}
