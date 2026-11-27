"use client";
import { useEffect, useId, useRef, useState } from "react";
import { searchFormulary, type FormularyMatch } from "@/lib/api";
import { cabinetCopy, pick } from "@/lib/copy";
import { formatSalts } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

/**
 * Brand field for the cabinet form. Suggests brands from the curated
 * formulary so the saved name resolves to a salt and can be interaction
 * checked. Free text is still accepted: the server resolves it or stores it
 * as unresolved, and the list then shows it as unknown.
 */
export default function BrandSuggest({
  value,
  onChange,
  onPick,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (match: FormularyMatch) => void;
  placeholder: string;
}) {
  const { language } = useLanguage();
  const copy = pick(cabinetCopy, language);
  const listId = useId();
  const [matches, setMatches] = useState<FormularyMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const picked = useRef("");

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || query === picked.current) {
      setMatches([]);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const results = await searchFormulary(query, controller.signal);
      if (controller.signal.aborted) return;
      setMatches(results);
      setSearched(true);
      setActive(-1);
      setOpen(true);
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  function choose(match: FormularyMatch) {
    picked.current = match.brand_name;
    onPick(match);
    setOpen(false);
    setMatches([]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? matches.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && matches.length > 0;
  const showEmpty = open && searched && matches.length === 0 && value.trim().length >= 3;

  return (
    <div className="brand-suggest">
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        required
        onChange={(event) => {
          picked.current = "";
          onChange(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => matches.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      />
      {showList && (
        <ul className="brand-suggest-list" id={listId} role="listbox" aria-label={copy.suggestions}>
          {matches.map((match, index) => (
            <li
              key={match.brand_name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? "is-active" : undefined}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(match);
              }}
            >
              <strong dir="ltr">{match.brand_name}</strong>
              <span dir="ltr">{formatSalts(match.generic_salts)}</span>
            </li>
          ))}
        </ul>
      )}
      {/* empty state: the name is not in the curated list */}
      {showEmpty && (
        <p className="brand-suggest-empty" role="status">
          {copy.noMatch}
        </p>
      )}
    </div>
  );
}
