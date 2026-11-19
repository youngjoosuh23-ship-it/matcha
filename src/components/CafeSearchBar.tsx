import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search, X } from 'lucide-react';
import { CAFE_TYPES } from '../lib/placePins';
import { useLanguage } from '../lib/i18n';

interface CafeSearchBarProps {
  onSelect: (placeId: string, location: { lat: number; lng: number }) => void;
  rightSlot?: ReactNode;
}

// 상단 카페 검색 — Places 자동완성(세션 토큰). 입력 중 예측은 무료 구간, 고를 때 좌표 하나만 받아 세션을 닫음.
// 결과는 저장하지 않고 화면 표시에만 씀 (Google Places 약관).
export default function CafeSearchBar({ onSelect, rightSlot }: CafeSearchBarProps) {
  const { lang, t } = useLanguage();
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<google.maps.places.PlacePrediction[]>([]);
  const [failed, setFailed] = useState(false);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const input = q.trim();
    if (!placesLib || input.length < 2) { setItems([]); return; }
    const timer = setTimeout(async () => {
      tokenRef.current ??= new placesLib.AutocompleteSessionToken();
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: tokenRef.current,
          includedPrimaryTypes: CAFE_TYPES,
          locationBias: map?.getBounds() ?? undefined,
          language: lang,
          region: 'kr',
        });
        setItems(suggestions.flatMap(s => (s.placePrediction ? [s.placePrediction] : [])));
        setFailed(false);
      } catch (e) {
        console.error('cafe autocomplete error:', e);
        setItems([]);
        setFailed(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, placesLib, map, lang]);

  const choose = async (prediction: google.maps.places.PlacePrediction) => {
    const place = prediction.toPlace();
    try {
      await place.fetchFields({ fields: ['location'] });  // 이름 등은 카페 시트가 불러옴
    } catch (e) {
      console.error('cafe place fetch error:', e);
    }
    tokenRef.current = null;  // 세션 종료 — 다음 검색은 새 토큰
    setQ('');
    setItems([]);
    const location = place.location?.toJSON();
    if (location) onSelect(place.id, location);
  };

  return (
    <div className="w-full pointer-events-auto">
      <div className="flex items-center gap-2">
        <div
          className="flex-1 min-w-0 h-11 flex items-center gap-2 px-4 rounded-full shadow-lg"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)' }}
        >
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            id="cafe-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && items[0]) choose(items[0]); if (e.key === 'Escape') setQ(''); }}
            placeholder={t('카페 이름으로 찾기', 'Search cafes')}
            aria-label={t('카페 검색', 'Search cafes')}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label={t('지우기', 'Clear')} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {rightSlot}
      </div>

      {q.trim().length >= 2 && (
        <div className="mt-2 rounded-3xl shadow-2xl overflow-hidden max-h-[50vh] overflow-y-auto" style={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(0,0,0,0.05)' }}>
          {items.length === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-400 text-center">
              {failed ? t('검색하지 못했어요. 잠시 후 다시 시도해주세요.', 'Search failed. Please try again.') : t('찾는 카페가 없어요', 'No cafes found')}
            </p>
          ) : items.map((p) => (
            <button
              key={p.placeId}
              onClick={() => choose(p)}
              className="w-full px-4 py-3 flex flex-col gap-0.5 text-left hover:bg-zinc-50 border-b border-zinc-50 last:border-0"
            >
              <span className="text-sm font-bold text-zinc-800 truncate">{p.mainText?.text ?? p.text.text}</span>
              {p.secondaryText && <span className="text-xs text-zinc-400 truncate">{p.secondaryText.text}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
