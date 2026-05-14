import { useState } from 'react';
import { X, MapPin, Clock, Lock, Users, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { createMark } from '../lib/firebase';
import type { UserProfile, Chat } from '../types';
import { panelBg, inputStyle } from '../design/tokens';

interface CreateMarkModalProps {
  profile: UserProfile;
  location: { lat: number; lng: number };
  placeName: string;
  activeChats: Chat[];
  onClose: () => void;
}

export default function CreateMarkModal({
  profile,
  location,
  placeName,
  activeChats,
  onClose,
}: CreateMarkModalProps) {
  const [memo, setMemo] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 채팅 상대 목록 (중복 제거)
  const chatContacts = (() => {
    const seen = new Set<string>();
    const contacts: { uid: string; name: string; photo: string }[] = [];
    for (const chat of activeChats) {
      for (const uid of chat.participants) {
        if (uid === profile.uid || seen.has(uid)) continue;
        seen.add(uid);
        contacts.push({
          uid,
          name: chat.participantNames[uid] ?? '',
          photo: chat.participantPhotos[uid] ?? '',
        });
      }
    }
    return contacts;
  })();

  const toggleShare = (uid: string) => {
    setSharedWith(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const scheduled = scheduledAt ? new Date(scheduledAt) : null;
      await createMark(
        profile.uid,
        profile.displayName,
        profile.photoURL,
        placeName,
        location,
        memo,
        scheduled,
        sharedWith,
      );
      onClose();
    } catch (err) {
      console.error('Mark creation failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/15 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full sm:max-w-sm rounded-t-[40px] border border-white/60 shadow-2xl flex flex-col max-h-[85vh]"
        style={panelBg}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto my-4 shrink-0" style={{ background: 'rgba(0,0,0,0.12)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">장소 마킹</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-zinc-400" />
              <p className="text-xs text-zinc-500 truncate max-w-[200px]">{placeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Memo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">메모</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="이 장소에서 뭘 할 건지 적어보세요"
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
              예정 시간 (선택)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zinc-900/10 transition-all"
              style={inputStyle}
            />
          </div>

          {/* Share with */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              공유 대상
            </label>

            {/* Private badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold cursor-pointer transition-all"
              style={
                sharedWith.length === 0
                  ? { background: '#1a2418', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#71717a' }
              }
              onClick={() => setSharedWith([])}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              나만 보기
            </div>

            {chatContacts.length > 0 && (
              <div className="space-y-1.5">
                {chatContacts.map(contact => {
                  const selected = sharedWith.includes(contact.uid);
                  return (
                    <button
                      key={contact.uid}
                      onClick={() => toggleShare(contact.uid)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left"
                      style={
                        selected
                          ? { background: 'rgba(143,181,112,0.18)', border: '1.5px solid rgba(143,181,112,0.5)' }
                          : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }
                      }
                    >
                      <img
                        src={contact.photo}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-sm font-bold text-zinc-800 flex-1">{contact.name}</span>
                      {selected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#8fb570' }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {chatContacts.length === 0 && (
              <p className="text-xs text-zinc-400 px-1">채팅 상대가 없으면 나만 볼 수 있어요.</p>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="px-6 pb-8 pt-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
          >
            {saving
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              : '마킹 저장'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
