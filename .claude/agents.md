# Agents — Matcha 프로젝트

Claude Code에서 사용할 수 있는 서브에이전트 목록과 이 프로젝트에서 언제 쓰는지 정리.

## 언제 어떤 에이전트를 쓰나

### Explore
**언제**: 파일이 어디 있는지 모를 때, 특정 함수/컴포넌트가 어디서 쓰이는지 찾을 때
```
예시: "subscribeToOpenRoomsForUser가 어디서 호출되는지 전부 찾아줘"
예시: "Firestore 쿼리 쓰는 파일 전부 찾아줘"
```
직접 `grep`으로 금방 찾을 수 있으면 에이전트 없이 그냥 실행.

### Plan
**언제**: 새 기능을 어떻게 구조화할지 설계가 필요할 때 (파일 수정 없이 계획만)
```
예시: "알림 기능 추가하려면 어떤 파일 건드려야 해?"
예시: "Firebase Functions로 TTL 처리 이관하는 구조 설계해줘"
```

### general-purpose
**언제**: 복잡한 멀티스텝 작업, 외부 문서 리서치, 여러 파일에 걸친 분석
```
예시: "개인정보 보호법 요구사항 조사해서 방침 초안 작성해줘"
예시: "Firebase pricing 계산해줘"
```

### claude-code-guide
**언제**: Claude Code 자체 기능 (hooks, settings, MCP) 에 대한 질문
```
예시: "hooks로 git commit 전에 자동으로 뭔가 실행하려면?"
예시: "settings.json에서 permission 어떻게 설정해?"
```

## 이 프로젝트에서 에이전트 잘 안 써도 되는 경우
- 단일 파일 수정 → 직접 Edit
- 알려진 경로 파일 읽기 → 직접 Read
- 빌드/린트 실행 → 직접 Bash (`npm run lint`)
- 컴포넌트 하나 추가 → 직접 작성
