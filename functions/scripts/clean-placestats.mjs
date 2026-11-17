// placeStats 문서에 남아있는 Google 장소 데이터(placeName, location) 제거.
// 사용법 (functions/ 에서):
//   GOOGLE_APPLICATION_CREDENTIALS=../<서비스계정키>.json node scripts/clean-placestats.mjs           # dry-run
//   GOOGLE_APPLICATION_CREDENTIALS=../<서비스계정키>.json node scripts/clean-placestats.mjs --apply   # 실제 삭제
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0751433140';
const DATABASE_ID = 'ai-studio-83469dda-d152-4d67-83ea-b50033ec8101';
const apply = process.argv.includes('--apply');

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore(DATABASE_ID);

const snap = await db.collection('placeStats').get();
const dirty = snap.docs.filter(d => 'placeName' in d.data() || 'location' in d.data());
const ALLOWED = new Set(['placeId', 'totalEvents', 'lastEventAt', 'lastEventId']);
const extra = new Set(snap.docs.flatMap(d => Object.keys(d.data())).filter(k => !ALLOWED.has(k)));
console.log(`프로젝트 ${PROJECT_ID} / DB ${DATABASE_ID}`);
console.log(`placeStats ${snap.size}개 중 정리 대상 ${dirty.length}개${apply ? '' : ' (dry-run, --apply로 실행)'}`);
console.log(`허용 외 필드: ${[...extra].join(', ') || '(없음)'} — 이 중 placeName, location만 삭제`);

// ponytail: batch 500개 제한 — 문서가 500개 넘으면 청크로 나눌 것
if (apply && dirty.length > 0) {
  const batch = db.batch();
  for (const d of dirty) batch.update(d.ref, { placeName: FieldValue.delete(), location: FieldValue.delete() });
  await batch.commit();
  console.log('완료');
}
