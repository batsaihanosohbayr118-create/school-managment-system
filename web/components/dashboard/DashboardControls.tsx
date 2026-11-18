"use client";

import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { type Language, translateValue } from "@/lib/i18n";
import { resolveStoredFileUrl } from "@/lib/subjectContent";

/**
 * A <video> for a lesson video. A stored attachment needs a signed URL — the
 * element cannot send the session header — so it renders once that arrives.
 */
export function LessonVideo({ src }: { src: string }) {
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    resolveStoredFileUrl(src)
      .then((url) => {
        if (!ignore) setResolved({ src, url });
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [src]);

  return resolved?.src === src ? <video controls preload="metadata" src={resolved.url} /> : <video controls preload="none" />;
}

/**
 * Places an open dropdown list with position: fixed beside its trigger, so a
 * scrolling container (the record modal has overflow-y: auto) cannot clip it.
 * Opens upward when there is more room above. Re-measures on scroll/resize.
 */
function useFloatingMenu(open: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const margin = 12;
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const wanted = Math.min(menu.scrollHeight, 240);
      const openUp = spaceBelow < wanted && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(240, openUp ? spaceAbove : spaceBelow));
      const height = Math.min(wanted, maxHeight);
      const top = openUp ? rect.top - gap - height : rect.bottom + gap;

      menu.style.position = "fixed";
      menu.style.top = `${top}px`;
      menu.style.left = `${rect.left}px`;
      menu.style.width = `${rect.width}px`;
      menu.style.maxHeight = `${maxHeight}px`;

      // An ancestor with backdrop-filter or transform turns "fixed" into
      // "relative to that ancestor"; measure and cancel any such offset.
      const actual = menu.getBoundingClientRect();
      const nextStyle: CSSProperties = {
        position: "fixed",
        top: top - (actual.top - top),
        left: rect.left - (actual.left - rect.left),
        width: rect.width,
        maxHeight,
        zIndex: 1000
      };
      Object.assign(menu.style, { top: `${nextStyle.top}px`, left: `${nextStyle.left}px` });
      setStyle(nextStyle);
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return { triggerRef, menuRef, menuStyle: style };
}

export function StatusDropdown({
  labels,
  language,
  onChange,
  options,
  placeholder,
  value
}: {
  /** Display text per option, for lists whose value is not self-explanatory. */
  labels?: Record<string, string>;
  language: Language;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, menuRef, menuStyle } = useFloatingMenu(open);
  const optionLabel = (option: string) => labels?.[option] ?? translateValue(option, language);
  const selectedLabel = value ? optionLabel(value) : placeholder;

  return (
    <div
      className={`ec-select-field${open ? " open" : ""}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-expanded={open}
        className={`ec-input ec-select-trigger${value ? " selected" : ""}`}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className="ec-select-menu" ref={menuRef} role="listbox" style={menuStyle}>
          {options.map((option) => {
            const selected = option === value;

            return (
              <button
                aria-selected={selected}
                className={selected ? "selected" : ""}
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                role="option"
                title={optionLabel(option)}
                type="button"
              >
                <span>{optionLabel(option)}</span>
                {selected ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TopicDropdown({
  onChange,
  options,
  placeholder,
  value
}: {
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);

  return (
    <div
      className={`ec-select-field${open ? " open" : ""}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-expanded={open}
        className={`ec-input ec-select-trigger${selectedOption ? " selected" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div className="ec-select-menu" role="listbox">
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                aria-selected={selected}
                className={selected ? "selected" : ""}
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {selected ? <Check aria-hidden="true" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
