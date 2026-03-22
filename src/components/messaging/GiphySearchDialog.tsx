/**
 * GiphySearchDialog Component
 * Search and select GIFs via Giphy API or placeholder grid.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, Image } from 'lucide-react';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';
const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const GIPHY_TRENDING_URL = 'https://api.giphy.com/v1/gifs/trending';

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

interface GiphySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gifUrl: string) => void;
}

// Placeholder GIFs for when no API key is configured
const PLACEHOLDER_GIFS: GiphyGif[] = [
  { id: 'ph1', title: 'Thumbs up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', previewUrl: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif' },
  { id: 'ph2', title: 'Celebration', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', previewUrl: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/200w.gif' },
  { id: 'ph3', title: 'High five', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif', previewUrl: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/200w.gif' },
  { id: 'ph4', title: 'Applause', url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif', previewUrl: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/200w.gif' },
  { id: 'ph5', title: 'Laughing', url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif', previewUrl: 'https://media.giphy.com/media/ZqlvCTNHpqrio/200w.gif' },
  { id: 'ph6', title: 'Mind blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC3nWcJgi/giphy.gif', previewUrl: 'https://media.giphy.com/media/xT0xeJpnrWC3nWcJgi/200w.gif' },
];

export function GiphySearchDialog({ open, onOpenChange, onSelect }: GiphySearchDialogProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Load trending or placeholder on open
      if (GIPHY_API_KEY) {
        fetchTrending();
      } else {
        setGifs(PLACEHOLDER_GIFS);
        setError('No Giphy API key configured. Showing placeholder GIFs.');
      }
    } else {
      setQuery('');
      setGifs([]);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parseGiphyResponse = (data: { data: Array<{ id: string; title: string; images: { original: { url: string }; fixed_width: { url: string } } }> }): GiphyGif[] => {
    return data.data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.original.url,
      previewUrl: gif.images.fixed_width.url,
    }));
  };

  const fetchTrending = async () => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${GIPHY_TRENDING_URL}?api_key=${GIPHY_API_KEY}&limit=12&rating=g`);
      if (!res.ok) throw new Error('Failed to fetch trending GIFs');
      const data = await res.json();
      setGifs(parseGiphyResponse(data));
    } catch {
      setError('Failed to load GIFs. Please try again.');
      setGifs(PLACEHOLDER_GIFS);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = useCallback(async (searchQuery: string) => {
    if (!GIPHY_API_KEY) {
      // Filter placeholders by title
      const filtered = PLACEHOLDER_GIFS.filter((g) =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setGifs(filtered.length > 0 ? filtered : PLACEHOLDER_GIFS);
      return;
    }

    if (!searchQuery.trim()) {
      fetchTrending();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${GIPHY_SEARCH_URL}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=12&rating=g`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const results = parseGiphyResponse(data);
      setGifs(results);
      if (results.length === 0) {
        setError('No GIFs found. Try a different search.');
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchGifs(value), 400);
  };

  const handleSelect = (gif: GiphyGif) => {
    onSelect(gif.url);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="w-full max-w-lg mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary-600" aria-hidden="true" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Search GIFs</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <X className="w-4 h-4 text-neutral-500" aria-hidden="true" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search for GIFs..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            {error}
          </div>
        )}

        {/* GIF grid */}
        <div className="px-4 pb-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" aria-hidden="true" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all group"
                  title={gif.title}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Giphy attribution */}
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 text-center">
          <span className="text-[10px] text-neutral-400">Powered by GIPHY</span>
        </div>
      </div>
    </div>
  );
}

export default GiphySearchDialog;
