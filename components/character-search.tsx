"use client";

import { useEffect, useState } from "react";
import { type Character, searchCharacters } from "@/lib/characters";

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

export default function CharacterSearch({
  onSelect,
  excludeIds = [],
  placeholder = "Rechercher un personnage…",
}: {
  onSelect: (character: Character) => void;
  excludeIds?: number[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results synchronously when the search box is emptied
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setIsSearching(true);
      searchCharacters(trimmed)
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const suggestions = results.filter((c) => !excludeIds.includes(c.external_id));

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${fieldClassName}`}
      />
      {isSearching && (
        <p className="mt-1 text-xs text-foreground/50">Recherche…</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
          {suggestions.map((c) => (
            <button
              key={c.external_id}
              type="button"
              onClick={() => {
                onSelect(c);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              <span className="text-foreground">{c.name}</span>
              {c.player_name && (
                <span className="text-xs text-foreground/50">
                  {c.player_name}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
