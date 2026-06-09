# 말차 (Matcha)

**장소 기반 오픈 네트워킹 앱**

---

## 제품 개요

말차(Matcha)는 지금 같은 장소에 있는 사람들과 실시간으로 연결되는 장소 기반 오픈 네트워킹 앱입니다.

지도로 활성 장소를 탐색하고, 관심 있는 상대에게 채팅을 신청하거나 공개 이벤트에 참여해 새로운 연결을 만들어냅니다. LinkedIn 같은 비동기 플랫폼이 채우지 못하는 "지금, 여기"라는 공간적 맥락을 활용해 낯선 사람과의 첫 만남 장벽을 낮추고, 가게 주인은 이벤트로 손님을 모으며, 방문객은 같은 공간의 사람들과 자연스럽게 연결됩니다.

**배포 URL:** https://gen-lang-client-0751433140.web.app

---

## 비즈니스 목표 및 지표

### 비즈니스 목적

- 오프라인 장소를 기반으로 한 실시간 소셜 네트워킹 시장 개척
- 방문객 간 연결 성사율 및 장소 체류 시간 극대화
- 가게 사장님의 이벤트 홍보 채널로서의 플랫폼 가치 확보

### 핵심 성과 지표 (KPI)

| KPI | 설명 | 목표 수치 |
|-----|------|----------|
| 채팅 성사율 | (수락된 요청 수) / (전송된 요청 수) | ≥ 30% |
| 체크인 → 요청 전환율 | 체크인 후 채팅 요청을 보낸 비율 | ≥ 40% |
| 이벤트 참여율 | 이벤트 조회 후 참여 신청 비율 | ≥ 25% |
| 재방문율 | 월 2회 이상 앱을 사용하는 유저 비율 | ≥ 50% |
| 신규 유저 유입 | 월간 신규 가입자 수 | 1차 목표: 500명 |

---

## 핵심 사용자 정의

| 유형 | 설명 |
|------|------|
| **네트워킹 지향형** | 창업자, 프리랜서, 직장인 — 채팅을 통해 인사이트·협업 기회를 찾는 사람 |
| **언어 교환형** | 외국어 실력을 키우고 싶은 학생·직장인 — 네이티브와 짧은 대화 기회를 원하는 사람 |
| **캐주얼 연결형** | 혼자 왔지만 대화 상대가 생기면 좋겠다는 개방적인 사람 |
| **가게 사장님** | 카페·식당·공간 운영자 — 이벤트를 열어 방문객을 모으고 가게를 홍보하려는 사람 |

---

## 기능적 요구 사항

### Must Have ✅

- [x] Google OAuth 로그인
- [x] 지도 기반 장소 탐색 (체크인 수 배지 마커)
- [x] GPS 사용자 위치 실시간 표시
- [x] 체크인 / 체크아웃 (1시간 TTL, 자동 만료)
- [x] 채팅 요청 보내기 / 수락 / 거절
- [x] 인앱 채팅 (메시지, 이미지 첨부, 이모지 피커)
- [x] 요청 패널(Bell)과 채팅 패널(MessageCircle) 분리
- [x] 읽지 않은 채팅 뱃지
- [x] 이벤트 생성 / 참여 / 취소 / 삭제

### Should Have ✅

- [x] 핫플 현황 패널 — "지금 현황" / "📌 근처 추천" / "🕰️ 히스토리" 탭
- [x] 거절 후 30분 재요청 쿨다운
- [x] 커스텀 위치 체크인 (지도 핀 없는 장소)
- [x] 보낸 요청 로그 + 취소
- [x] 프로필 설정 페이지 (분야, 목적, 언어 등록)
- [x] 이벤트 지도 마커 표시
- [x] 이벤트 히스토리 — 장소별 누적 이벤트 기록 (히스토리 패널에만 표시)
- [x] 마킹(📌) — 드래그 핀으로 장소 등록, 공유 설정
- [x] 지도 오버레이 — 관광지, 문화행사, 공중화장실, 전통시장
- [ ] 언어·분야·목적 필터
- [ ] 푸시 알림 (채팅 요청 수신, 이벤트 시작 알림)

### Could Have

- [ ] 팔로우 / 연락처 교환
- [ ] 단골 장소 저장 및 주간 추천 알림
- [ ] 신뢰 프로필 (누적 평판 기반 배지)
- [x] 오픈채팅방 (장소 단위 그룹 채팅)
- [ ] 다국어 지원 UI
- [ ] 사장님 인증 배지
- [ ] 이벤트 참여자 간 그룹 채팅

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4, motion/react (Framer Motion) |
| Maps | Google Maps (`@vis.gl/react-google-maps`) |
| Backend (DB/Auth/Storage) | Firebase Firestore / Auth / Storage |
| Backend (서버) | Firebase Cloud Functions v2 (Node.js 20, 서울 리전) |
| 배포 | Firebase Hosting |
| UI Icons | lucide-react |

---

## 배포 구조

```
Firebase Hosting (gen-lang-client-0751433140.web.app)
│
├── /                  → React SPA (dist/)
├── /tourapi/**        → Cloud Function: tourApiProxy
├── /cultureapi/**     → Cloud Function: cultureApiProxy
└── /overpass          → Cloud Function: overpassProxy
```

### Cloud Functions (asia-northeast3 — 서울)

| 함수 | 역할 |
|------|------|
| `tourApiProxy` | 한국관광공사 TourAPI CORS 프록시 (`apis.data.go.kr`) |
| `cultureApiProxy` | 한국문화정보원 cultureinfo API CORS 프록시 (`apis.data.go.kr`) |
| `overpassProxy` | OpenStreetMap Overpass API CORS 프록시 |

브라우저에서 외부 API를 직접 호출하면 CORS 오류가 발생하므로, 모든 외부 API 호출은 Cloud Functions를 통해 중계됩니다.

---

## 코드 구조

```
matcha/
├── src/
│   ├── App.tsx                      # 루트 컴포넌트, 인증 상태 관리
│   ├── types.ts                     # 전체 타입 정의
│   ├── components/
│   │   ├── MainMap.tsx              # 지도 메인 (모든 마커·오버레이 관리)
│   │   ├── CafeDetails.tsx          # 장소 상세 패널 (체크인, 이벤트, 채팅방)
│   │   ├── HotplPanel.tsx           # 🔥 핫플 패널 (현황/근처추천/히스토리)
│   │   ├── MarksPanel.tsx           # 📌 마킹 목록 패널
│   │   ├── EventPanel.tsx           # 이벤트 상세
│   │   ├── TourFestivalPanel.tsx    # 관광공사 축제/행사 상세
│   │   ├── CultureEventPanel.tsx    # 문화정보원 문화행사 상세
│   │   ├── CreateEventModal.tsx     # 이벤트 생성 모달
│   │   ├── RequestsPanel.tsx        # 채팅 요청 수신함
│   │   ├── ChatsPanel.tsx           # 채팅 목록
│   │   ├── ChatModal.tsx            # 인앱 채팅
│   │   ├── ProfilePanel.tsx         # 프로필 설정
│   │   ├── Header.tsx               # 상단 헤더 (검색, 알림 뱃지)
│   │   └── ...
│   ├── lib/
│   │   ├── firebase/                # Firebase 연동 모듈
│   │   │   ├── config.ts            # Firebase 초기화
│   │   │   ├── auth.ts              # Google OAuth
│   │   │   ├── events.ts            # 이벤트 CRUD, placeStats
│   │   │   ├── chats.ts             # 채팅 요청/수락/메시지
│   │   │   ├── marks.ts             # 마킹 CRUD
│   │   │   ├── openRooms.ts         # 오픈채팅방
│   │   │   └── ...
│   │   ├── tourapi.ts               # 한국관광공사 TourAPI (관광지, 축제)
│   │   ├── cultureapi.ts            # 한국문화정보원 API (문화행사)
│   │   ├── attractionsapi.ts        # OSM Overpass (유적지, 박물관, 사찰 등)
│   │   ├── restroomapi.ts           # OSM Overpass (공중화장실)
│   │   ├── attractionMarker.tsx     # 나라별 마커 SVG (한옥/도리이/파고다 등)
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChats.ts
│   │   └── useRequests.ts
│   └── design/
│       └── tokens.ts                # 디자인 토큰 (glassmorphism 스타일)
├── functions/
│   ├── src/index.ts                 # Cloud Functions 3개
│   └── tsconfig.json
├── firebase.json                    # Hosting 라우팅 + Functions 설정
└── .firebaserc                      # Firebase 프로젝트 ID
```

---

## 지도 오버레이 데이터 소스

| 마커 | 데이터 소스 | 줌 조건 | 비고 |
|------|-----------|---------|------|
| 체크인 장소 | Firebase Firestore | 항상 | 실시간 |
| 이벤트 | Firebase Firestore | 항상 | 진행 중인 이벤트만 |
| 관광지·축제 | 한국관광공사 TourAPI | 항상 | `/tourapi` 프록시 |
| 문화행사 | 한국문화정보원 cultureinfo | 항상 | `/cultureapi` 프록시 |
| 유적지·박물관·사찰 등 | OSM Overpass API | zoom ≥ 12 | `/overpass` 프록시 |
| 전통시장 | OSM Overpass API | zoom ≥ 12 | `/overpass` 프록시 |
| 공중화장실 | OSM Overpass API | zoom ≥ 15 | `/overpass` 프록시 |

### 마커 이모지 / 아이콘

| 마커 | 아이콘 | 설명 |
|------|--------|------|
| 체크인 장소 | 🌿 (Leaf 아이콘, 초록 테두리) | 현재 체크인 인원 수 배지 표시 |
| 검색 결과 | 🌿 (Leaf 아이콘, 회색) | 체크인 없는 검색된 장소 |
| 관광공사 관광지 | 🏛️ (주황 테두리 원) | TourAPI contentTypeId=12 |
| 관광공사 축제/행사 | 🎪 (노랑 테두리 원) | TourAPI contentTypeId=15 |
| 문화정보원 문화행사 | 🎭 (보라 테두리 원) | 한국문화정보원 cultureinfo |
| 사용자 마킹 | 📌 | 수동 등록 장소 |
| 공중화장실 | 🚻 | OSM `amenity=toilets` |
| 궁궐·성·요새 | 🏯 | `historic=palace/castle/fort` |
| 사찰·신사 | ⛩️ | `historic=temple/shrine` |
| 불교·유교 사원 | 🛕 | `amenity=place_of_worship` + `religion=buddhism/confucian` |
| 박물관·유적지 | 🏛️ | `tourism=museum`, `historic=ruins/archaeological_site` |
| 갤러리·미술관 | 🎨 | `tourism=gallery` |
| 테마파크 | 🎡 | `tourism=theme_park` |
| 동물원 | 🦁 | `tourism=zoo` |
| 수족관 | 🐟 | `tourism=aquarium` |
| 전망대 | 🔭 | `tourism=viewpoint` (wikidata 필요) |
| 기념비 | 🗿 | `historic=monument` (wikidata 필요) |
| 기념물 | 🕊️ | `historic=memorial` (wikidata 필요) |
| 전통시장 | 🏪 | `amenity=marketplace` |
| 기타 명소 | ⭐ | 위 분류 외 |

### OSM 필터링 규칙
- **항상 표시**: 박물관, 테마파크, 갤러리, 동물원, 수족관, 궁궐, 사찰, 성곽, 유적지, 전통시장
- **Wikidata 있는 것만**: 기념비(monument), 기념물(memorial), viewpoint, attraction
- **제외**: `disused:*`, `abandoned:*`, `disused=yes` 태그 (폐업/폐쇄)

---

## Firebase 컬렉션 구조

| 컬렉션 | 설명 |
|--------|------|
| `checkins/{userId}` | 체크인 (1시간 TTL 자동 만료) |
| `chat_requests/{requestId}` | 채팅 요청 |
| `chats/{chatId}/messages` | 채팅 메시지 (endedAt soft delete) |
| `events/{eventId}` | 이벤트 (제목, 기간, 참여자 목록) |
| `placeStats/{placeId}` | 장소별 이벤트 히스토리 (totalEvents, lastEventAt) |
| `users/{userId}` | 유저 프로필 |
| `marks/{markId}` | 수동 마킹 (장소명, 메모, 공유 설정) |
| `openRooms/{roomId}` | 오픈채팅방 (장소 단위 그룹) |

---

## 프로젝트 일정

| 단계 | 내용 | 상태 |
|------|------|------|
| **v0.1** | 지도, 체크인, 요청, 채팅 | ✅ 완료 |
| **v0.2** | 핫플 현황, 요청/채팅 분리, 이미지 전송 | ✅ 완료 |
| **v0.3** | 이벤트 생성·참여·관리, 오픈채팅 | ✅ 완료 |
| **v0.3.1** | 이벤트 히스토리, 마킹(📌), 드래그 핀 UX | ✅ 완료 |
| **v0.4** | Firebase Hosting 배포, 지도 오버레이 (관광지/문화행사/화장실/시장), 핫플 근처추천 탭 | ✅ 완료 |
| **v0.5** | 언어·분야·목적 필터, 푸시 알림 | 🔄 예정 |
| **v0.6** | 사장님 인증, 이벤트 참여자 채팅 | 📅 예정 |
| **v1.0** | 성능 최적화, 보안 규칙 강화, 정식 출시 | 📅 예정 |

---

## 로컬 실행

**사전 준비:** Node.js 20+

```bash
# 의존성 설치
npm install

# .env.local에 API 키 설정
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# 개발 서버 실행 (http://localhost:3000)
npm run dev
```

## 배포

```bash
# 프론트엔드 빌드
npm run build

# Cloud Functions 빌드
cd functions && npm run build && cd ..

# 전체 배포
firebase deploy

# 호스팅만 배포
firebase deploy --only hosting

# 함수만 배포
firebase deploy --only functions
```
