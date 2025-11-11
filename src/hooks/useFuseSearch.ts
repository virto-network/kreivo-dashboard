import { useMemo, useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import type { FuseResultMatch } from 'fuse.js';
import { commands, Command, defaultSuggestions } from '@/data/commands.en';

interface UseFuseSearchOptions {
  debounceMs?: number;
  maxResults?: number;
}

interface SearchResult {
  item: Command;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

export const useFuseSearch = (options: UseFuseSearchOptions = {}) => {
  const { debounceMs = 150, maxResults = 5 } = options;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Memoize Fuse instance to avoid recreating it on every render
  // This is crucial for performance - Fuse.js indexes all items on initialization
  const fuse = useMemo(() => {
    return new Fuse(commands, {
      keys: [
        {
          name: 'label',
          weight: 0.7,
        },
        {
          name: 'keywords',
          weight: 0.3,
        },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      findAllMatches: false,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      const defaultCommands = defaultSuggestions
        .map((id) => commands.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is Command => cmd !== undefined)
        .map((cmd) => ({ item: cmd }));
      setResults(defaultCommands);
      return;
    }

    // Perform fuzzy search
    const searchResults = fuse.search(debouncedQuery, {
      limit: maxResults,
    });

    // Transform Fuse results to our SearchResult format
    const transformedResults: SearchResult[] = searchResults.map((result) => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));

    setResults(transformedResults);
  }, [debouncedQuery, fuse, maxResults]);

  return {
    query,
    setQuery,
    results,
    debouncedQuery,
  };
};


