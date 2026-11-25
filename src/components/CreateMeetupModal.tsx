import { useState } from 'react';
import { X, MapPin, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { createMeetup, MEETUP_MAX_START_DAYS } from '../lib/firebase';
import { MEETUP_CATEGORIES, type MeetupCategory, type UserProfile } from '../types';
import { panelBg, inputStyle } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface CreateMeetupModalProps {
  myProfile: UserProfile;
  placeId: string;
  placeName: string;                         // Google 장소명 — 입력창에 미리 채우고 사용자가 확인·수정
  location: { lat: number; lng: number };
  onClose: () => void;
  onCreated: (meetupId: string) => void;
}

const DURATION_HOURS = [1, 2, 3, 4, 6];

// <input type="datetime-local">용 로컬 시각 문자열
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const chipStyle = (selected: boolean) => selected
  ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
  : { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' };

export default function CreateMeetupModal({ myProfile, placeId, placeName: initialPlaceName, location, onClose, onCreated }: CreateMeetupModalProps) {
  const { lang, t } = useLanguage();
  const [placeName, setPlaceName] = useState(initialPlaceName);
  const [category, setCategory] = useState<MeetupCategory>('etc');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    d.setHours(19, 0, 0, 0);
    return toLocalInput(d);
  });
  const [durationHours, setDurationHours] = useState(2);
  const [capacity, setCapacity] = useState(6);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxStart = new Date(Date.now() + MEETUP_MAX_START_DAYS * 86400000);

  const handleCreate = async () => {
    const start = new Date(startAt);
    if (!placeName.trim()) { setError(t('장소 이름을 입력해주세요.', 'Please enter the place name.')); return; }
    if (!title.trim()) { setError(t('모임 제목을 입력해주세요.', 'Please enter a title.')); return; }
    if (isNaN(start.getTime()) || start.getTime() <= Date.now()) { setError(t('시작 시각은 지금 이후여야 해요.', 'Start time must be in the future.')); return; }
    if (start > maxStart) { setError(t(`모임은 ${MEETUP_MAX_START_DAYS}일 이내로만 만들 수 있어요.`, `Meetups can be scheduled up to ${MEETUP_MAX_START_DAYS} days ahead.`)); return; }
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 50) { setError(t('정원은 2~50명이에요.', 'Capacity must be 2–50.')); return; }
    setCreating(true);
    setError(null);
    try {
      const id = await createMeetup(myProfile, {
        placeId, placeName: placeName.trim(), location, category,
        title: title.trim(), description: description.trim(),
        startAt: start, durationHours, capacity,
      });
      onCreated(id);
    } catch (e) {
      console.error('create meetup error:', e);
      setError(t('모임 생성에 실패했어요. 다시 시도해주세요.', 'Failed to create the meetup. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/15 backdrop-blur-[2px] font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm rounded-t-[40px] p-6 space-y-5 max-h-[90vh] overflow-y-auto border border-white/60 shadow-2xl"
        style={panelBg}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'rgba(0,0,0,0.12)' }} />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-[#4f7a34]" />{t('모임 만들기', 'Create a meetup')}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{t('날짜를 정해 미리 사람을 모아요 · 최대 4주 뒤까지', 'Pick a date and gather people ahead · up to 4 weeks out')}</p>
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
          <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t('장소 이름 *', 'Place name *')}
          </label>
          <input
            type="text"
            value={placeName}
            maxLength={100}
            onChange={(e) => setPlaceName(e.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none text-[#2d5a1b] transition-all"
            style={{ background: 'rgba(143,181,112,0.15)', border: '1px solid rgba(143,181,112,0.3)' }}
          />
          <p className="text-[11px] text-zinc-400">{t('이름이 맞는지 확인하고 필요하면 고쳐주세요.', 'Check the name and edit it if needed.')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400">{t('관심사', 'Category')}</label>
          <div className="grid grid-cols-3 gap-2">
            {MEETUP_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-1"
                style={chipStyle(category === c.id)}
              >
                <c.icon className="w-3.5 h-3.5 shrink-0" />{lang === 'ko' ? c.ko : c.en}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('모임 제목 *', 'Title *')}</label>
          <input
            type="text"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('예: 퇴근 후 독서모임', 'e.g. After-work book club')}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 placeholder:text-zinc-400 transition-all"
            style={inputStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('시작 일시 *', 'Starts at *')}</label>
          <input
            type="datetime-local"
            value={startAt}
            min={toLocalInput(new Date())}
            max={toLocalInput(maxStart)}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 transition-all"
            style={inputStyle}
          />
          <p className="text-[11px] text-zinc-400">{t(`오늘부터 ${MEETUP_MAX_START_DAYS}일 이내`, `Within ${MEETUP_MAX_START_DAYS} days from today`)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400">{t('진행 시간', 'Duration')}</label>
          <div className="grid grid-cols-5 gap-1.5">
            {DURATION_HOURS.map((h) => (
              <button
                key={h}
                onClick={() => setDurationHours(h)}
                className="py-2.5 rounded-2xl text-xs font-bold transition-all border"
                style={chipStyle(durationHours === h)}
              >
                {t(`${h}시간`, `${h}h`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('정원 (본인 포함, 2~50명)', 'Capacity (incl. you, 2–50)')}</label>
          <input
            type="number"
            inputMode="numeric"
            min={2}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(e.target.valueAsNumber)}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 transition-all"
            style={inputStyle}
          />
          <p className="text-[11px] text-zinc-400">{t('정원이 차면 이후 신청자는 대기열에 들어가요.', 'Once full, new sign-ups join the waitlist.')}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-400">{t('설명', 'Description')} <span className="font-normal">({t('선택', 'optional')})</span></label>
          <textarea
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('무엇을 하는지, 준비물 등을 알려주세요.', 'What will you do? Anything to bring?')}
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 placeholder:text-zinc-400 transition-all resize-none"
            style={inputStyle}
          />
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
            style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
          >
            {creating
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : t('모임 열기', 'Create meetup')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
