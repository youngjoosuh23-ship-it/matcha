import { useState, useRef } from 'react';
import { UserProfile, ChatStyle } from '../types';
import { X, Camera, Plus, Trash2, Save, Languages, Briefcase, LogOut, User, Info, Bell } from 'lucide-react';
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth, leaveOpenRoom } from '../lib/firebase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { panelBg, cardBg, inputStyle } from '../design/tokens';

interface ProfilePanelProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (updated: UserProfile) => void;
}

const COMMON_TAGS = ['Marketing', 'Development', 'Design', 'Tutor', 'Startup', 'Crypto', 'AI', 'Travel', 'Reading'];
const LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export default function ProfilePanel({ profile, onClose, onUpdate }: ProfilePanelProps) {
  const [tab, setTab] = useState<'profile' | 'settings'>('profile');
  const [edited, setEdited] = useState<UserProfile>({ ...profile });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanDone, setCleanDone] = useState(false);
  const [myOpenRooms, setMyOpenRooms] = useState<{ id: string; placeName: string; description?: string }[] | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const handleCleanupAll = async () => {
    setCleaning(true);
    try {
      const uid = profile.uid;

      // 본인 체크인 삭제
      await deleteDoc(doc(db, 'checkins', uid)).catch(() => {});

      // 오픈채팅방 — 나가기 (마지막 멤버면 삭제 시도)
      const roomsSnap = await getDocs(
        query(collection(db, 'openRooms'), where('members', 'array-contains', uid))
      );
      await Promise.all(roomsSnap.docs.map(d => {
        const members: string[] = d.data().members ?? [];
        return leaveOpenRoom(d.id, uid, members.length === 1);
      }));

      // 개인 채팅 — endedAt 으로 숨김 처리 (rules상 delete 불가)
      const chatsSnap = await getDocs(
        query(collection(db, 'chats'), where('participants', 'array-contains', uid))
      );
      await Promise.all(chatsSnap.docs.map(d =>
        updateDoc(doc(db, 'chats', d.id), { endedAt: Timestamp.now() })
      ));

      setCleanDone(true);
    } catch (e) {
      console.error('cleanup error:', e);
    } finally {
      setCleaning(false);
    }
  };
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [notifGranted, setNotifGranted] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    return localStorage.getItem('notifEnabled') !== 'false';
  });

  const handleRequestNotif = async () => {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setNotifGranted(true);
      setNotifEnabled(true);
      localStorage.setItem('notifEnabled', 'true');
    }
  };

  const toggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('notifEnabled', String(next));
  };

  const loadMyOpenRooms = async () => {
    if (myOpenRooms !== null) return;
    const snap = await getDocs(
      query(collection(db, 'openRooms'), where('members', 'array-contains', profile.uid))
    );
    setMyOpenRooms(snap.docs.map(d => ({
      id: d.id,
      placeName: d.data().placeName as string,
      description: d.data().description as string | undefined,
    })));
  };

  const handleDeleteRoom = async (roomId: string) => {
    setDeletingRoomId(roomId);
    try {
      await deleteDoc(doc(db, 'openRooms', roomId));
      setMyOpenRooms(prev => prev?.filter(r => r.id !== roomId) ?? null);
    } catch (e) {
      console.error('deleteRoom error:', e);
      alert('삭제에 실패했어요. 방장만 삭제할 수 있어요.');
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, { ...edited });

      const checkinRef = doc(db, 'checkins', profile.uid);
      const checkinSnap = await getDoc(checkinRef);
      if (checkinSnap.exists()) {
        await updateDoc(checkinRef, {
          userName: edited.displayName,
          userPhoto: edited.photoURL,
          userStyle: edited.chatStyle,
          userTags: edited.professionalTags,
          userField: edited.field ?? '',
          userBio: edited.bio ?? '',
        });
      }

      onUpdate(edited);
      onClose();
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    setEdited(prev => ({
      ...prev,
      professionalTags: prev.professionalTags.includes(tag)
        ? prev.professionalTags.filter(t => t !== tag)
        : [...prev.professionalTags, tag]
    }));
  };

  const addCustomTag = () => {
    if (newTag && !edited.professionalTags.includes(newTag)) {
      setEdited(prev => ({ ...prev, professionalTags: [...prev.professionalTags, newTag] }));
      setNewTag('');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingPhoto(true);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 300;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      URL.revokeObjectURL(objectUrl);
      setEdited(prev => ({ ...prev, photoURL: canvas.toDataURL('image/jpeg', 0.82) }));
      setUploadingPhoto(false);
    };
    img.src = objectUrl;
  };

  const toggleLanguage = (lang: string) => {
    setEdited(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-[60] bg-black/15 backdrop-blur-[2px] sm:flex sm:justify-end font-sans"
    >
      <div className="h-full w-full sm:max-w-md flex flex-col border-l border-white/60 shadow-2xl" style={panelBg}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="text-xl font-bold text-zinc-800">내 프로필</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
            style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {([
            { key: 'profile', label: '프로필' },
            { key: 'settings', label: '환경설정' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                tab === key ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'
              )}
              style={tab === key ? { background: 'rgba(255,255,255,0.82)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <img
                    src={edited.photoURL}
                    alt={edited.displayName}
                    className="w-28 h-28 rounded-[32px] object-cover shadow-xl"
                    style={{ border: '3px solid rgba(255,255,255,0.8)' }}
                    referrerPolicy="no-referrer"
                  />
                  <div
                    className="absolute inset-0 rounded-[32px] bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {uploadingPhoto
                      ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-7 h-7 text-white" />
                    }
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
                <div className="text-center space-y-2 w-full max-w-[260px]">
                  <input
                    type="text"
                    value={edited.displayName}
                    onChange={(e) => setEdited({ ...edited, displayName: e.target.value })}
                    className="text-2xl font-bold text-zinc-800 text-center bg-transparent border-b-2 border-transparent hover:border-zinc-300 focus:border-zinc-600 outline-none transition-colors w-full"
                  />
                  <textarea
                    value={edited.bio}
                    onChange={(e) => setEdited({ ...edited, bio: e.target.value })}
                    placeholder="한 줄 소개를 입력해보세요"
                    rows={2}
                    className="w-full text-sm text-zinc-500 placeholder:text-zinc-300 outline-none resize-none text-center bg-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Field */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  전문 분야
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['IT', 'Marketing', 'Design', 'Finance', 'Other'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setEdited({ ...edited, field: f })}
                      className="py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border"
                      style={edited.field === f
                        ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
                        : { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Style */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400">말차 성향</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'quiet', emoji: '🤫', label: '조용히 각자 작업해요' },
                    { value: 'light', emoji: '💬', label: '30분 가볍게 얘기해요' },
                    { value: 'business', emoji: '💼', label: '비즈니스 미팅 찾아요' },
                    { value: 'language', emoji: '🌍', label: '언어 교환해요' },
                  ] as { value: ChatStyle; emoji: string; label: string }[]).map(({ value, emoji, label }) => (
                    <button
                      key={value}
                      onClick={() => setEdited({ ...edited, chatStyle: value })}
                      className="p-3 rounded-2xl flex items-center gap-2 transition-all border text-xs font-bold text-left"
                      style={edited.chatStyle === value
                        ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
                        : { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }
                      }
                    >
                      <span className="text-lg shrink-0">{emoji}</span>
                      <span className="leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" />
                  사용 가능 언어
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => toggleLanguage(lang.code)}
                      className="px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all border"
                      style={edited.languages.includes(lang.code)
                        ? { background: '#1a2418', borderColor: 'transparent', color: 'white' }
                        : { background: 'rgba(255,255,255,0.55)', borderColor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)' }
                      }
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400">전문 분야 태그</label>
                <div className="flex flex-wrap gap-2">
                  {edited.professionalTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700" style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)' }}>
                      {tag}
                      <button onClick={() => toggleTag(tag)} className="text-zinc-400 hover:text-zinc-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="커스텀 태그 추가..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none text-zinc-800 placeholder:text-zinc-400"
                    style={inputStyle}
                  />
                  <button
                    onClick={addCustomTag}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-zinc-500 hover:text-zinc-800 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.filter(tag => !edited.professionalTags.includes(tag)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-6 py-5 flex gap-3 border-t border-white/60" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <button
                onClick={onClose}
                className="flex-1 py-3.5 font-bold text-zinc-500 hover:text-zinc-700 rounded-2xl transition-colors border border-white/60"
                style={{ background: 'rgba(255,255,255,0.55)' }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-white"
                style={{ background: '#1a2418', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.3)' }}
              >
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                저장하기
              </button>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {/* Account */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">계정</p>
              <div className="rounded-2xl overflow-hidden border border-white/60" style={cardBg}>
                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)' }}>
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-500">이메일</p>
                    <p className="text-sm font-medium text-zinc-800 truncate">{auth.currentUser?.email ?? '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => auth.signOut()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-50/40"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <LogOut className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-sm font-bold text-red-500">로그아웃</span>
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">알림</p>
              <div className="rounded-2xl border border-white/60" style={cardBg}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)' }}>
                    <Bell className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-800">채팅 요청 알림</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {notifGranted ? (notifEnabled ? '알림이 켜져 있어요' : '알림이 꺼져 있어요') : '브라우저 알림 권한이 필요해요'}
                    </p>
                  </div>
                  {notifGranted ? (
                    <button
                      onClick={toggleNotif}
                      className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
                      style={{ background: notifEnabled ? '#1a2418' : 'rgba(0,0,0,0.15)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                        style={{ left: notifEnabled ? '22px' : '2px' }}
                      />
                    </button>
                  ) : (
                    <button
                      onClick={handleRequestNotif}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shrink-0"
                      style={{ background: '#1a2418' }}
                    >
                      허용
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Data cleanup */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">데이터</p>
              <div className="rounded-2xl border border-white/60 overflow-hidden" style={cardBg}>
                {/* 오픈채팅방 개별 삭제 */}
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)' }}>
                      <Trash2 className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-800">내 오픈채팅방 관리</p>
                    </div>
                    <button
                      onClick={loadMyOpenRooms}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', color: '#3f3f46' }}
                    >
                      불러오기
                    </button>
                  </div>
                  {myOpenRooms !== null && (
                    myOpenRooms.length === 0
                      ? <p className="text-xs text-zinc-400 pl-11">참여 중인 오픈채팅방이 없어요</p>
                      : <div className="pl-11 space-y-1.5">
                          {myOpenRooms.map(room => (
                            <div key={room.id} className="flex items-center gap-2">
                              <p className="flex-1 text-xs text-zinc-700 font-medium truncate">
                                {room.placeName}{room.description ? ` — ${room.description}` : ''}
                              </p>
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                disabled={deletingRoomId === room.id}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 disabled:opacity-40 transition-all active:scale-95"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)' }}
                              >
                                {deletingRoomId === room.id
                                  ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                                  : '삭제'}
                              </button>
                            </div>
                          ))}
                        </div>
                  )}
                </div>
                {/* 전체 초기화 */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-800">모든 채팅 · 오픈룸 삭제</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {cleanDone ? '✓ 완료됐어요' : '내가 참여한 채팅과 오픈채팅방을 모두 지워요'}
                    </p>
                  </div>
                  <button
                    onClick={handleCleanupAll}
                    disabled={cleaning || cleanDone}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 disabled:opacity-40 transition-all active:scale-95"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    {cleaning
                      ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : cleanDone ? '완료' : '초기화'}
                  </button>
                </div>
              </div>
            </div>

            {/* App info */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">앱 정보</p>
              <div className="rounded-2xl border border-white/60" style={cardBg}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.65)' }}>
                    <Info className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-800">Matcha</p>
                    <p className="text-xs text-zinc-400">장소 기반 오픈 네트워킹</p>
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">v0.1</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
