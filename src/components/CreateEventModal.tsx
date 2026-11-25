import { useState } from 'react';
import { X, MapPin, Zap } from 'lucide-react';
import Sheet from './Sheet';
import { createEvent } from '../lib/firebase';
import type { UserProfile } from '../types';
import { inputStyle } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface CreateEventModalProps {
  myProfile: UserProfile;
  userLocation: { lat: number; lng: number } | null;
  fixedLocation?: { lat: number; lng: number };
  fixedLocationName?: string;
  placeId?: string;
  onClose: () => void;
  onCreated: (eventId: string) => void;
}

const DURATION_OPTIONS_KO = [
  { hours: 1, label: '1시간' },
  { hours: 2, label: '2시간' },
  { hours: 3, label: '3시간' },
  { hours: 6, label: '6시간' },
  { hours: 24, label: '종일' },
];

const DURATION_OPTIONS_EN = [
  { hours: 1, label: '1h' },
  { hours: 2, label: '2h' },
  { hours: 3, label: '3h' },
  { hours: 6, label: '6h' },
  { hours: 24, label: 'All day' },
];

export default function CreateEventModal({ myProfile, userLocation, fixedLocation, fixedLocationName, placeId, onClose, onCreated }: CreateEventModalProps) {
  const { lang, t } = useLanguage();
  const DURATION_OPTIONS = lang === 'ko' ? DURATION_OPTIONS_KO : DURATION_OPTIONS_EN;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(fixedLocationName ?? '');
  const [durationHours, setDurationHours] = useState(2);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const loc = fixedLocation ?? userLocation;
    if (!title.trim()) { setError(t('번개 제목을 입력해주세요.', 'Please enter a title.')); return; }
    if (!loc) { setError(t('위치 정보가 필요해요. 잠시 후 다시 시도해주세요.', 'Location is needed. Please try again shortly.')); return; }
    setCreating(true);
    setError(null);
    try {
      const id = await createEvent(
        myProfile.uid, myProfile.displayName, myProfile.photoURL,
        title.trim(), description.trim(), loc,
        locationName.trim() || t('내 현재 위치', 'My current location'),
        1, durationHours, placeId,   // 반경은 쓰지 않음 (번개는 장소 체크인 기준)
      );
      onCreated(id);
    } catch (e) {
      console.error('create event error:', e);
      setError(t('번개를 열지 못했어요. 이 장소에 체크인했는지 확인해주세요.', 'Could not open the bolt. Make sure you are checked in here.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet onClose={onClose} className="p-6 space-y-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2"><Zap className="w-5 h-5 text-[#b8860b]" />{t('번개 열기', 'Open a bolt')}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{t('지금 바로', 'Right now')}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('번개 제목 *', 'Title *')}</label>
          <input
            type="text"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('예: 30분만 같이 수다 떨어요, 보드게임 한 판', 'e.g. Quick chat for 30 min, one round of board games')}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 transition-all"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('설명', 'Description')} <span className="font-normal">({t('선택', 'optional')})</span></label>
          <textarea
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('어디쯤 앉아 있는지, 무엇을 하는지 알려주세요.', 'Where are you sitting, what are you doing?')}
            rows={2}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 transition-all resize-none"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t('장소', 'Location')}
          </label>
          {fixedLocationName ? (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: 'rgba(143,181,112,0.15)', border: '1px solid rgba(143,181,112,0.3)' }}>
              <span className="text-sm font-bold truncate text-[#2d5a1b]">{fixedLocationName}</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={t('예: 홍대입구역 근처', 'e.g. Near Hongik Univ. Station')}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 placeholder:text-zinc-400 transition-all"
                style={inputStyle}
              />
              {!userLocation && (
                <p className="text-xs text-amber-600">{t('위치 권한이 필요해요', 'Location permission needed')}</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400">{t('진행 시간', 'Duration')}</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => setDurationHours(opt.hours)}
                className="py-2.5 rounded-2xl text-xs font-bold transition-all border"
                style={durationHours === opt.hours
                  ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
                  : { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl font-bold text-zinc-600 hover:text-zinc-800 transition-colors border border-white/60"
            style={{ background: 'rgba(255,255,255,0.55)' }}
          >
            {t('취소', 'Cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="flex-1 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 text-white"
            style={{
              background: '#1a2418',
              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)'
            }}
          >
            {creating
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : t('번개 열기', 'Open bolt')}
          </button>
        </div>
    </Sheet>
  );
}
