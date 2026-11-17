import { useState } from 'react';
import { X, MapPin, Clock, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { joinMeetup, leaveMeetup, updateMeetup, confirmedIds, waitlistIds } from '../lib/firebase';
import { MEETUP_CATEGORIES, type Meetup, type UserProfile } from '../types';
import { formatMeetupTime } from '../lib/utils';
import { panelBg, cardBg, inputStyle } from '../design/tokens';
import { useLanguage } from '../lib/i18n';

interface MeetupPanelProps {
  meetup: Meetup;          // 구독 중인 최신 문서를 넘길 것 (참가/대기 상태가 실시간 반영)
  myProfile: UserProfile;
  onClose: () => void;
}

export default function MeetupPanel({ meetup, myProfile, onClose }: MeetupPanelProps) {
  const { lang, t } = useLanguage();
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 호스트 수정 폼 (제목/설명/정원만 — 장소·일시는 규칙상 변경 불가)
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(0);
  // 되돌릴 수 없는 동작(제외, 모임 취소) 전 확인 시트
  const [confirm, setConfirm] = useState<{ message: string; label: string; action: () => Promise<void> } | null>(null);

  const cat = MEETUP_CATEGORIES.find(c => c.id === meetup.category);
  const confirmed = confirmedIds(meetup);
  const waitlist = waitlistIds(meetup);
  const isHost = meetup.hostId === myProfile.uid;
  const myIndex = meetup.participantIds.indexOf(myProfile.uid);
  const isJoined = myIndex >= 0;
  const myWaitNo = myIndex >= meetup.capacity ? myIndex - meetup.capacity + 1 : 0;
  const isFull = confirmed.length >= meetup.capacity;
  const started = meetup.startAt.toMillis() <= Date.now();

  const run = async (action: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      console.error('meetup action error:', e);
      setError(t('처리하지 못했어요. 다시 시도해주세요.', 'Something went wrong. Please try again.'));
    } finally {
      setActing(false);
    }
  };

  const handleJoinLeave = () => run(() =>
    isJoined ? leaveMeetup(meetup.id, myProfile.uid) : joinMeetup(meetup.id, myProfile));

  const handleRemove = (uid: string) => {
    const name = meetup.participants[uid]?.name ?? '';
    setConfirm({
      message: t(`${name}님을 모임에서 제외할까요?`, `Remove ${name} from this meetup?`),
      label: t('제외하기', 'Remove'),
      action: () => leaveMeetup(meetup.id, uid),
    });
  };

  // 취소하면 모든 목록과 지도에서 사라짐 (기록은 자동 삭제 시점까지 남음)
  const handleCancelMeetup = () => setConfirm({
    message: t('모임을 취소할까요? 참가자 모두의 화면에서 사라지고 되돌릴 수 없어요.', 'Cancel this meetup? It disappears for everyone and cannot be undone.'),
    label: t('모임 취소', 'Cancel meetup'),
    action: async () => { await updateMeetup(meetup.id, { status: 'cancelled' }); onClose(); },
  });

  // 규칙과 같은 하한: 확정 인원 = min(신청 인원, 기존 정원) 미만으로는 못 줄임
  const minCapacity = Math.max(2, Math.min(meetup.participantIds.length, meetup.capacity));

  const startEdit = () => {
    setTitle(meetup.title);
    setDescription(meetup.description);
    setCapacity(meetup.capacity);
    setError(null);
    setEditing(true);
  };

  const handleSave = () => {
    if (!title.trim()) { setError(t('모임 제목을 입력해주세요.', 'Please enter a title.')); return; }
    if (!Number.isInteger(capacity) || capacity < minCapacity || capacity > 50) {
      setError(t(`정원은 ${minCapacity}~50명이에요.`, `Capacity must be ${minCapacity}–50.`));
      return;
    }
    run(async () => {
      await updateMeetup(meetup.id, { title: title.trim(), description: description.trim(), capacity });
      setEditing(false);
    });
  };

  const personRow = (uid: string, badge?: string) => {
    const p = meetup.participants[uid];
    return (
      <div key={uid} className="flex items-center gap-2.5 py-1.5">
        {p?.photo
          ? <img src={p.photo} className="w-8 h-8 rounded-full object-cover border-2 border-white shrink-0" referrerPolicy="no-referrer" />
          : <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)' }}><Users className="w-4 h-4 text-zinc-400" /></div>}
        <span className="text-sm font-bold text-zinc-800 truncate flex-1">{p?.name || t('익명', 'Anonymous')}</span>
        {uid === meetup.hostId && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: '#1a2418' }}>{t('호스트', 'Host')}</span>
        )}
        {badge && <span className="text-[10px] font-bold text-zinc-400 shrink-0">{badge}</span>}
        {isHost && uid !== meetup.hostId && (
          <button
            onClick={() => handleRemove(uid)}
            disabled={acting}
            aria-label={t('제외', 'Remove')}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/15 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed z-[60] inset-x-0 bottom-0 rounded-t-[40px] shadow-2xl border border-white/60 font-sans flex flex-col"
        style={{ ...panelBg, maxHeight: '88vh' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4 shrink-0" style={{ background: 'rgba(0,0,0,0.12)' }} />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
          style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {editing ? (
          <div className="px-6 pb-8 space-y-5 overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-800 pr-12">{t('모임 수정', 'Edit meetup')}</h2>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">{t('모임 제목 *', 'Title *')}</label>
              <input
                type="text"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800"
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">{t(`정원 (${minCapacity}~50명)`, `Capacity (${minCapacity}–50)`)}</label>
              <input
                type="number"
                inputMode="numeric"
                min={minCapacity}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(e.target.valueAsNumber)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800"
                style={inputStyle}
              />
              <p className="text-[11px] text-zinc-400">{t('이미 확정된 인원보다 적게 줄일 수 없어요. 늘리면 대기자가 순서대로 확정돼요.', "You can't go below the confirmed count. Raising it confirms people from the waitlist in order.")}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">{t('설명', 'Description')}</label>
              <textarea
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none text-zinc-800 resize-none"
                style={inputStyle}
              />
            </div>
            <p className="text-[11px] text-zinc-400">{t('장소와 일시는 바꿀 수 없어요. 바꾸려면 모임을 새로 만들어주세요.', 'Place and time cannot be changed. Create a new meetup instead.')}</p>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-zinc-600 border border-white/60"
                style={{ background: 'rgba(255,255,255,0.55)' }}
              >
                {t('취소', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={acting || !title.trim()}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
              >
                {t('저장', 'Save')}
              </button>
            </div>
          </div>
        ) : (
        <div className="px-6 pb-8 space-y-5 overflow-y-auto">
          <div className="space-y-2 pr-12">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-[#2d5a1b] inline-block" style={{ background: 'rgba(143,181,112,0.2)' }}>
              {cat?.emoji} {lang === 'ko' ? cat?.ko : cat?.en}
            </span>
            <h2 className="text-2xl font-bold text-zinc-800 leading-tight">{meetup.title}</h2>
            <div className="space-y-1 text-xs text-zinc-500 font-medium">
              <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 shrink-0" />{formatMeetupTime(meetup.startAt, lang)} – {meetup.endAt.toDate().toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' })}</p>
              <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{meetup.placeName}</span></p>
            </div>
          </div>

          {meetup.description && (
            <p className="text-sm text-zinc-600 leading-relaxed rounded-2xl px-4 py-3 whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.06)' }}>
              {meetup.description}
            </p>
          )}

          <div className="rounded-2xl border border-white/60 px-4 py-3" style={cardBg}>
            <p className="text-xs font-bold text-zinc-400 mb-1">
              {t('참가 확정', 'Confirmed')} <span className="text-[#2d5a1b]">{confirmed.length}/{meetup.capacity}</span>
            </p>
            {confirmed.map(uid => personRow(uid))}
          </div>

          {waitlist.length > 0 && (
            <div className="rounded-2xl border border-white/60 px-4 py-3" style={cardBg}>
              <p className="text-xs font-bold text-zinc-400 mb-1">{t(`대기 ${waitlist.length}명`, `Waitlist (${waitlist.length})`)}</p>
              {waitlist.map((uid, i) => personRow(uid, t(`대기 ${i + 1}번`, `#${i + 1}`)))}
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {isHost ? (
            <div className="space-y-2">
              <button
                onClick={startEdit}
                disabled={acting}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
              >
                {t('모임 수정하기', 'Edit meetup')}
              </button>
              <button
                onClick={handleCancelMeetup}
                disabled={acting}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 active:scale-95 text-red-500 hover:text-red-700"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {t('모임 취소', 'Cancel meetup')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {isJoined && (
                <p className="text-xs font-bold text-center text-[#2d5a1b]">
                  {myWaitNo > 0
                    ? t(`대기 ${myWaitNo}번이에요. 자리가 나면 자동으로 확정돼요.`, `You're #${myWaitNo} on the waitlist. You'll be confirmed automatically when a spot opens.`)
                    : t('참가가 확정됐어요', "You're confirmed")}
                </p>
              )}
              {!isJoined && started ? (
                <div className="w-full py-3.5 rounded-2xl font-bold text-sm text-center text-zinc-400" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  {t('이미 시작한 모임이에요', 'This meetup has already started')}
                </div>
              ) : (
                <button
                  onClick={handleJoinLeave}
                  disabled={acting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 text-white"
                  style={isJoined
                    ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }
                    : { background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }
                  }
                >
                  {acting
                    ? <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : isJoined
                      ? (myWaitNo > 0 ? t('대기 취소하기', 'Leave waitlist') : t('참가 취소하기', 'Cancel my spot'))
                      : isFull ? t('대기 신청하기', 'Join waitlist') : t('참가 신청하기', 'Join')}
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </motion.div>

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30" onClick={() => setConfirm(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full sm:max-w-sm rounded-t-[32px] p-6 space-y-5 shadow-2xl bg-white font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-zinc-800 text-center leading-relaxed">{confirm.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-zinc-600"
                style={{ background: 'rgba(0,0,0,0.05)' }}
              >
                {t('돌아가기', 'Go back')}
              </button>
              <button
                onClick={() => { const { action } = confirm; setConfirm(null); run(action); }}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all"
                style={{ background: '#dc2626' }}
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
