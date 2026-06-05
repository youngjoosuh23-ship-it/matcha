# Memory — Matcha 프로젝트 핵심 컨텍스트

코드만 봐서는 알 수 없는 결정들, 설계 배경, 주의사항 정리.
자동 메모리(`~/.claude/projects/.../memory/`)와 역할이 다름 — 이건 코드 작업용 실무 컨텍스트.

---

## 아키텍처 핵심 결정

### 채팅 종료: soft delete (endedAt 필드)
`deleteDoc` 대신 `endedAt` 타임스탬프 필드로 종료 처리.
Firestore rules에서 participants 외 delete 권한을 주기 어렵기 때문.
→ 채팅 관련 쿼리 시 `endedAt == null` 필터 필수.

### 리뷰: feedback 컬렉션에 isReview 플래그
별도 `reviews` 컬렉션 없이 `feedback/{id}`에 `isReview: true` 필드로 구분.
rules를 별도로 추가하지 않아도 되는 단순함 때문.

### lastReadTimes, dismissedIds: localStorage + lifted state
App.tsx에서 상태 관리, localStorage에 동기화.
서버에 저장하지 않는 이유: 기기별 읽음 상태는 UX상 로컬이 더 자연스러움.

### 핫플 점수 공식
`checkins.length * 3 + reviewScore * min(reviews.length, 5)`
클라이언트에서 계산. 가중치는 경험적으로 정한 값.

---

## Firebase 컬렉션 구조

| 컬렉션 | 용도 | 주의 |
|---|---|---|
| `users/{userId}` | 프로필 | list 불가 (get만) |
| `checkins/{userId}` | 체크인 (1시간 TTL) | userId가 문서 ID |
| `chat_requests/{requestId}` | 채팅 요청 | delete 불가 (rules) |
| `chats/{chatId}` | 채팅방 | endedAt으로 종료 |
| `chats/{chatId}/messages` | 메시지 | update/delete 불가 |
| `feedback/{feedbackId}` | 피드백+리뷰 | isReview 플래그 |
| `openRooms/{roomId}` | 오픈채팅방 | roomId = placeId_userId |
| `events/{eventId}` | 이벤트 | |
| `placeStats/{placeId}` | 장소 이벤트 집계 | |
| `marks/{markId}` | 개인 마킹 | creatorId 또는 sharedWith |

---

## 파일 구조 빠른 참조

```
src/
  App.tsx               — 최상위 상태, 로그인 화면, 모달 오케스트레이션
  hooks/
    useAuth.ts          — Google OAuth + Firestore 프로필 로드/생성
    useRequests.ts      — 채팅 요청 수신/발신 구독
    useChats.ts         — 활성 채팅 구독
  lib/firebase/
    config.ts           — Firebase 초기화
    auth.ts             — signInWithGoogle
    chats.ts            — 채팅 CRUD
    requests.ts         — 요청 CRUD
    marks.ts            — 마킹 CRUD
    openRooms.ts        — 오픈채팅방 CRUD
    events.ts           — 이벤트 CRUD
    storage.ts          — 이미지 업로드
  components/
    MainMap.tsx         — 지도 + 카페 마커 + 체크인 패널
    CafeDetails.tsx     — 카페 상세 (compact → expanded)
    PolicyModal.tsx     — 이용약관/개인정보처리방침 모달
  design/tokens.ts      — panelBg, cardBg 등 디자인 토큰
```

---

## 알려진 Firestore Rules 취약점 (2단계 보안 작업 예정)

- `events` 컬렉션: `allow update: if isSignedIn()` — 누구나 수정 가능
- `placeStats` 컬렉션: `allow write: if isSignedIn()` — 누구나 쓰기 가능
- 이 두 곳은 Firebase Functions로 이관 필요

---

## 개발 환경

```bash
npm run dev       # localhost:3000
npm run build     # dist/ 빌드
npm run lint      # tsc --noEmit (타입 체크)
firebase deploy   # Hosting + Functions 배포
```

환경변수: `.env` (gitignore됨) — `VITE_*` 접두사로 클라이언트 노출.
