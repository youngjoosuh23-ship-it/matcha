import { useState } from 'react';
import { X, MapPin, Clock, Lock, Users, Trash2, Plus, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { deleteMark, createMark } from '../lib/firebase';
import type { Mark, UserProfile, Chat } from '../types';
import { panelBg, cardBg, inputStyle } from '../design/tokens';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/i18n';

interface MarksPanelProps {
  myMarks: Mark[];
  sharedMarks: Mark[];
  profile: UserProfile;
  activeChats: Chat[];
  userLocation: { lat: number; lng: number } | null;
  onSelectMark: (mark: Mark) => void;
  onClose: () => void;
}

export default function MarksPanel({
  myMarks, sharedMarks, profile, activeChats, userLocation, onSelectMark, onClose,
}: MarksPanelProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [view, setView] = useState<'list' | 'create'>('list');

  // Create form state
  const [memo, setMemo] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const marks = tab === 'mine' ? myMarks : sharedMarks;

  const formatTime = (ts: any) => {
    if (!ts) return null;
    const date: Date = ts.toDate?.() ?? new Date(ts);
    return date.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const chatContacts = (() => {
    const seen = new Set<string>();
    const contacts: { uid: string; name: string; photo: string }[] = [];
    for (const chat of activeChats) {
      for (const uid of chat.participants) {
        if (uid === profile.uid || seen.has(uid)) continue;
        seen.add(uid);
        contacts.push({ uid, name: chat.participantNames[uid] ?? '', photo: chat.participantPhotos[uid] ?? '' });
      }
    }
    return contacts;
  })();

  const toggleShare = (uid: string) =>
    setSharedWith(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const resetCreateForm = () => { setMemo(''); setScheduledAt(''); setSharedWith([]); };

  const handleCreate = async () => {
    if (saving || !userLocation) return;
    setSaving(true);
    try {
      await createMark(
        profile.uid, profile.displayName, profile.photoURL,
        t('현재 위치', 'Current location'), userLocation,
        memo, scheduledAt ? new Date(scheduledAt) : null, sharedWith,
      );
      resetCreateForm();
      setView('list');
      setTab('mine');
    } catch (err) {
      console.error('Mark creation failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/15 backdrop-blur-[2px] flex items-end justify-center font-sans"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full sm:max-w-sm rounded-t-[36px] border border-white/60 shadow-2xl flex flex-col max-h-[80vh]"
        style={panelBg}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4 shrink-0" style={{ background: 'rgba(0,0,0,0.12)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {view === 'create' && (
              <button
                onClick={() => { setView('list'); resetCreateForm(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <ArrowLeft className="w-4 h-4 text-zinc-600" />
              </button>
            )}
            <h2 className="text-xl font-bold text-zinc-800">
              {view === 'list' ? `📌 ${t('나의 마킹', 'My marks')}` : `📌 ${t('새 마킹', 'New mark')}`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: '#1a2418' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('새 마킹', 'New mark')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <X className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Tabs */}
              <div className="flex px-4 pb-3 gap-2 shrink-0">
                <button
                  onClick={() => setTab('mine')}
                  className={cn('flex-1 py-2 rounded-2xl text-sm font-bold transition-all',
                    tab === 'mine' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500'
                  )}
                  style={tab !== 'mine' ? { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' } : {}}
                >
                  {t('내 마킹', 'Mine')} {myMarks.length > 0 && `(${myMarks.length})`}
                </button>
                <button
                  onClick={() => setTab('shared')}
                  className={cn('flex-1 py-2 rounded-2xl text-sm font-bold transition-all',
                    tab === 'shared' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500'
                  )}
                  style={tab !== 'shared' ? { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' } : {}}
                >
                  {t('공유받은', 'Shared with me')} {sharedMarks.length > 0 && `(${sharedMarks.length})`}
                </button>
              </div>

              {/* Mark list */}
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
                {marks.length === 0 ? (
                  <div className="py-16 flex flex-col items-center gap-3 text-center">
                    <span className="text-4xl">📌</span>
                    <p className="font-bold text-zinc-500">
                      {tab === 'mine' ? t('아직 마킹한 장소가 없어요', 'No marked places yet') : t('공유받은 마킹이 없어요', 'No marks shared with you')}
                    </p>
                    {tab === 'mine' && (
                      <button
                        onClick={() => setView('create')}
                        className="text-sm font-bold text-white px-4 py-2 rounded-2xl active:scale-95"
                        style={{ background: '#1a2418' }}
                      >
                        {t('첫 마킹 추가하기', 'Add your first mark')}
                      </button>
                    )}
                  </div>
                ) : (
                  marks.map(mark => (
                    <button
                      key={mark.id}
                      onClick={() => { onSelectMark(mark); onClose(); }}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-95 transition-all border border-white/60 hover:border-white/80"
                      style={cardBg}
                    >
                      <img
                        src={mark.creatorPhoto}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border-2"
                        style={{ borderColor: mark.creatorId === profile.uid ? '#8fb570' : '#c9b8e8' }}
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                          <p className="font-bold text-zinc-800 text-sm truncate">{mark.placeName}</p>
                        </div>
                        {mark.memo && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{mark.memo}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {mark.scheduledAt && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(mark.scheduledAt)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                            {mark.visibility === 'private'
                              ? <><Lock className="w-3 h-3" /><span>{t('나만', 'Only me')}</span></>
                              : <><Users className="w-3 h-3" /><span>{t(`${mark.sharedWith.length}명 공유`, `Shared with ${mark.sharedWith.length}`)}</span></>
                            }
                          </div>
                        </div>
                      </div>
                      {mark.creatorId === profile.uid && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteMark(mark.id); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-400 transition-colors shrink-0"
                          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                {/* Location */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm text-zinc-500" style={cardBg}>
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-bold truncate">
                    {userLocation ? t('현재 위치', 'Current location') : t('GPS 위치를 확인 중이에요', 'Getting GPS location...')}
                  </span>
                </div>

                {/* Memo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{t('메모', 'Memo')}</label>
                  <textarea
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    placeholder={t('이 장소에서 뭘 할 건지 적어보세요', 'Write what you plan to do here')}
                    rows={3}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 ring-zinc-900/10 transition-all"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                {/* Scheduled time */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5" />
                    {t('예정 시간 (선택)', 'Scheduled time (optional)')}
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/10 transition-all"
                    style={inputStyle}
                  />
                </div>

                {/* Share */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    <Users className="w-3.5 h-3.5" />
                    {t('공유 대상', 'Share with')}
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold cursor-pointer transition-all"
                    style={sharedWith.length === 0
                      ? { background: '#1a2418', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#71717a' }
                    }
                    onClick={() => setSharedWith([])}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    {t('나만 보기', 'Only me')}
                  </div>
                  {chatContacts.length > 0 && chatContacts.map(contact => {
                    const selected = sharedWith.includes(contact.uid);
                    return (
                      <button
                        key={contact.uid}
                        onClick={() => toggleShare(contact.uid)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left"
                        style={selected
                          ? { background: 'rgba(143,181,112,0.18)', border: '1.5px solid rgba(143,181,112,0.5)' }
                          : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }
                        }
                      >
                        <img src={contact.photo} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <span className="text-sm font-bold text-zinc-800 flex-1">{contact.name}</span>
                        {selected && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#8fb570' }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {chatContacts.length === 0 && (
                    <p className="text-xs text-zinc-400 px-1">{t('채팅 상대가 없으면 나만 볼 수 있어요.', "With no chat contacts, only you can see it.")}</p>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="px-6 pb-8 pt-2 shrink-0">
                <button
                  onClick={handleCreate}
                  disabled={saving || !userLocation}
                  className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
                >
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : t('마킹 저장', 'Save mark')
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
