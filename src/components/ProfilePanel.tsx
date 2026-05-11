import { useState } from 'react';
import { UserProfile, ChatStyle } from '../types';
import { X, Camera, Plus, Trash2, Save, Sparkles, Languages, Briefcase } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

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
  const [edited, setEdited] = useState<UserProfile>({ ...profile });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, { ...edited });

      // 체크인 중이면 체크인 문서도 동기화
      const checkinRef = doc(db, 'checkins', profile.uid);
      const checkinSnap = await getDoc(checkinRef);
      if (checkinSnap.exists()) {
        await updateDoc(checkinRef, {
          userName: edited.displayName,
          userPhoto: edited.photoURL,
          userStyle: edited.chatStyle,
          userTags: edited.professionalTags,
          userField: edited.field ?? '',
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
      setEdited(prev => ({
        ...prev,
        professionalTags: [...prev.professionalTags, newTag]
      }));
      setNewTag('');
    }
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
      className="fixed inset-0 z-[60] bg-zinc-950/20 backdrop-blur-sm sm:flex sm:justify-end font-sans"
    >
      <div className="h-full w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900">내 프로필</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
          {/* Visual Identity */}
          <div className="space-y-4">
             <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <img 
                    src={edited.photoURL} 
                    alt={edited.displayName} 
                    className="w-32 h-32 rounded-[40px] object-cover border-4 border-white shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 rounded-[40px] bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-zinc-900">{edited.displayName}</h3>
                  <p className="text-zinc-400 text-sm font-medium">Collaboration Card</p>
                </div>
             </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              나를 표현하는 한 마디
            </label>
            <textarea
              value={edited.bio}
              onChange={(e) => setEdited({ ...edited, bio: e.target.value })}
              placeholder="예: 실리콘밸리 출신 마케터, 말차 한 잔 하며 비즈니스 얘기해요!"
              className="w-full bg-zinc-50 border-0 p-4 rounded-3xl text-sm focus:ring-2 ring-zinc-900/5 min-h-[100px] transition-all resize-none font-medium"
            />
          </div>

          {/* Field */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              전문 분야
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['IT', 'Marketing', 'Design', 'Finance', 'Other'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setEdited({ ...edited, field: f })}
                  className={cn(
                    "py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border",
                    edited.field === f
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                      : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Style */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-zinc-400">말차 성향</label>
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
                  className={cn(
                    "p-3 rounded-2xl flex items-center gap-2 transition-all border text-xs font-bold text-left",
                    edited.chatStyle === value
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                      : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                  )}
                >
                  <span className="text-lg shrink-0">{emoji}</span>
                  <span className="leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-zinc-400 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              사용 가능 언어
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={cn(
                    "px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all border",
                    edited.languages.includes(lang.code)
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-sm"
                      : "bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100"
                  )}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-zinc-400">전문 분야 태그</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {edited.professionalTags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="text-zinc-400 hover:text-zinc-900">
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
                className="w-full bg-zinc-50 border-0 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 ring-zinc-900/5"
              />
              <button 
                onClick={addCustomTag}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm border border-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {COMMON_TAGS.filter(tag => !edited.professionalTags.includes(tag)).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-100 text-zinc-400 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-zinc-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-zinc-500 font-bold hover:bg-zinc-50 rounded-2xl transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-2 flex items-center justify-center gap-2 bg-zinc-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-zinc-900/20 hover:bg-zinc-950 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            설정 저장하기
          </button>
        </div>
      </div>
    </motion.div>
  );
}
