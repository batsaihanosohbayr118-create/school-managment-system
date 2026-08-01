"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, HeartHandshake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listSchoolResource } from "@/lib/school-api";
import type { AppCopy } from "@/lib/i18n";

/**
 * The student-facing half of the Wellbeing Corner: a floating button pinned to
 * the bottom-right of the dashboard that opens the questions an administrator
 * published under the `wellbeing` resource. Read-only — nothing is submitted
 * back, so a student can think about a prompt without it being recorded.
 */

type Prompt = {
  question: string;
  category: string;
  note: string;
  date: string;
};

function toPrompts(columns: string[], rows: string[][]): Prompt[] {
  const at = (name: string) => columns.findIndex((column) => column.toLowerCase() === name.toLowerCase());
  const questionIndex = at("Question");
  const categoryIndex = at("Category");
  const noteIndex = at("Note");
  const dateIndex = at("Date");

  if (questionIndex < 0) return [];

  return rows
    .map((row) => ({
      question: (row[questionIndex] ?? "").trim(),
      category: (row[categoryIndex] ?? "").trim(),
      note: (row[noteIndex] ?? "").trim(),
      date: (row[dateIndex] ?? "").trim()
    }))
    .filter((prompt) => prompt.question.length > 0);
}

export function WellbeingCorner({ copy }: { copy: AppCopy }) {
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = copy.wellbeing;

  /**
   * Opening is an event, not a synchronization — so the fetch lives here rather
   * than in an effect. Re-fetching on every open means a question the
   * psychologist publishes mid-session shows up without a page reload.
   */
  async function openCorner() {
    setIndex(0);
    setOpen(true);
    setLoading(true);
    setFailed(false);

    try {
      const data = await listSchoolResource("wellbeing", { mode: "summary" });
      setPrompts(toPrompts(data.columns, data.rows));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setIndex((current) => Math.min(prompts.length - 1, current + 1));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, prompts.length]);

  // Clamp rather than reset on load: a shorter list must never leave a blank card.
  const safeIndex = Math.min(index, Math.max(0, prompts.length - 1));
  const current = prompts[safeIndex];

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="wellbeing-fab"
        onClick={() => void openCorner()}
        title={text.openLabel}
        type="button"
      >
        <HeartHandshake size={20} />
        <span>{text.openLabel}</span>
      </button>

      {open ? (
        <div className="modal-layer" onClick={() => setOpen(false)}>
          <div
            aria-labelledby="wellbeing-title"
            aria-modal="true"
            className="wellbeing-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <strong id="wellbeing-title">{text.title}</strong>
              <button aria-label={copy.common.closeModal} onClick={() => setOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <p className="wellbeing-subtitle">{text.subtitle}</p>

            {loading ? (
              <p className="wellbeing-status">{text.loading}</p>
            ) : failed ? (
              <p className="wellbeing-status">{text.loadFailed}</p>
            ) : !current ? (
              <div className="wellbeing-empty">
                <strong>{text.emptyTitle}</strong>
                <p>{text.emptyBody}</p>
              </div>
            ) : (
              <div className="wellbeing-prompt">
                <div className="wellbeing-meta">
                  {current.category ? <span className="wellbeing-chip">{current.category}</span> : null}
                  {current.date ? <span className="wellbeing-date">{current.date}</span> : null}
                </div>
                <p className="wellbeing-question">{current.question}</p>
                {current.note ? <p className="wellbeing-note">{current.note}</p> : null}
              </div>
            )}

            {prompts.length > 1 ? (
              <div className="wellbeing-pager">
                <Button
                  disabled={safeIndex === 0}
                  onClick={() => setIndex(Math.max(0, safeIndex - 1))}
                  type="button"
                  variant="ghost"
                >
                  <ChevronLeft size={16} />
                  {text.previous}
                </Button>
                <span aria-live="polite">{text.counter(safeIndex + 1, prompts.length)}</span>
                <Button
                  disabled={safeIndex === prompts.length - 1}
                  onClick={() => setIndex(Math.min(prompts.length - 1, safeIndex + 1))}
                  type="button"
                  variant="ghost"
                >
                  {text.next}
                  <ChevronRight size={16} />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default WellbeingCorner;
