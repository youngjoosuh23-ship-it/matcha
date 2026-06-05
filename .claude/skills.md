# Skills — Matcha 프로젝트

이 프로젝트에서 유용한 Claude Code 스킬 목록과 사용 시점.
스킬은 `/스킬명` 으로 실행하거나 자연어로 요청하면 자동 실행됨.

---

## 자주 쓰게 될 스킬

### `/verify` — 변경사항 실제 동작 확인
코드 수정 후 브라우저에서 실제로 작동하는지 확인.
```
사용 예: "체크인 버튼 수정했는데 verify해줘"
사용 예: "PR 변경사항이 실제로 되는지 확인해줘"
```

### `/run` — 앱 실행
개발 서버 시작 (`npm run dev`) 후 기능 동작 스크린샷.
```
사용 예: "앱 실행해서 로그인 화면 보여줘"
사용 예: "PolicyModal이 제대로 뜨는지 확인해줘"
```

### `/simplify` — 코드 품질 검토
변경된 코드에서 중복, 불필요한 복잡성, 개선점 찾아서 수정.
```
사용 예: "이번에 수정한 코드 simplify해줘"
```

### `/security-review` — 보안 검토
현재 브랜치 변경사항 보안 취약점 점검. Firestore rules, 인증 로직 수정 후 유용.
```
사용 예: "Firestore rules 수정했는데 security-review 해줘"
```

### `/review` — PR 코드 리뷰
Pull Request 전체 리뷰.

---

## 이 프로젝트 특화 사용법

### Firestore rules 수정할 때
1. `firestore.rules` 수정
2. `/security-review` 실행해서 취약점 확인
3. `firebase deploy --only firestore:rules` 로 배포

### 새 컴포넌트 추가할 때
- 디자인 토큰은 `src/design/tokens.ts`의 `panelBg`, `cardBg` 사용
- 모달은 `motion/react` AnimatePresence + `panelBg` 패턴 유지
- 기존 `PolicyModal.tsx` 참고

### Firebase Functions 작업할 때
- `functions/` 폴더에 작성
- `firebase.json`에 이미 등록됨
- `npm run lint` 후 `firebase deploy --only functions`

---

## 스킬 아닌 것 (그냥 명령어로 실행)

| 작업 | 명령어 |
|---|---|
| 타입 체크 | `npm run lint` |
| 빌드 | `npm run build` |
| 개발 서버 | `npm run dev` |
| Firebase 전체 배포 | `firebase deploy` |
| rules만 배포 | `firebase deploy --only firestore:rules` |
| functions만 배포 | `firebase deploy --only functions` |
