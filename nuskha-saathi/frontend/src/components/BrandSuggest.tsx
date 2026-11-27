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

