import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 모임 시각 표시: "11월 20일 (목) 오후 7:00" / "Thu, Nov 20, 7:00 PM"
export function formatMeetupTime(ts: { toDate: () => Date }, lang: 'ko' | 'en') {
  return ts.toDate().toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit',
  });
}
