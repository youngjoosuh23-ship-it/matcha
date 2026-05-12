const EMOJIS = [
  '😊','😂','🥰','🤔','😭','😅','🤣','😎','🥹','😤',
  '👍','👏','🙏','🫶','💪','🙌','👋','✌️','🤝','🫠',
  '❤️','🔥','✨','🎉','🎊','🌟','💫','🍵','☕','🌸',
  '😆','😮','😱','🤩','😴','🫡','🥳','😇','🤗','😌',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-3xl shadow-2xl border border-zinc-100 p-3 z-50"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-10 gap-0.5">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-zinc-100 rounded-xl transition-colors active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
