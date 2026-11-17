// firestore.rules 검증 (meetups, placeStats). 실행:
//   firebase emulators:exec --only firestore --project demo-matcha "node scripts/test-firestore-rules.mjs"
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, doc, collection, setDoc, getDoc, updateDoc, deleteDoc, writeBatch,
  arrayUnion, arrayRemove, deleteField, increment, serverTimestamp, Timestamp,
} from 'firebase/firestore';

const DB_ID = 'ai-studio-83469dda-d152-4d67-83ea-b50033ec8101';
const as = (uid) => {
  const db = getFirestore(initializeApp({ projectId: 'demo-matcha' }, uid ?? 'anon'), DB_ID);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, uid ? { mockUserToken: { sub: uid } } : {});
  return db;
};
const alice = as('alice'), bob = as('bob'), carol = as('carol'), anon = as(null);

let failed = 0;
const check = async (name, shouldPass, p) => {
  const ok = await p.then(() => true, () => false);
  if (ok !== shouldPass) failed++;
  console.log(`${ok === shouldPass ? '✓' : '✗'} ${name}`);
};
const allow = (n, p) => check(n, true, p);
const deny = (n, p) => check(n, false, p);

const H = 3600e3, D = 24 * H;
const at = (ms) => Timestamp.fromDate(new Date(Date.now() + ms));
const meetup = (over = {}) => ({
  hostId: 'alice', hostName: 'A', hostPhoto: '', placeId: 'ChIJtest', placeName: '카페',
  location: { lat: 37.5, lng: 127 }, category: 'reading', title: '독서모임', description: '',
  startAt: at(D), endAt: at(D + 2 * H), capacity: 2,
  participantIds: ['alice'], participants: { alice: { name: 'A', photo: '' } },
  status: 'open', createdAt: serverTimestamp(), purgeAt: at(29 * D - 60e3), ...over,
});
const join = (db, id, uid) => updateDoc(doc(db, 'meetups', id), { participantIds: arrayUnion(uid), [`participants.${uid}`]: { name: uid, photo: '' } });
const leave = (db, id, uid) => updateDoc(doc(db, 'meetups', id), { participantIds: arrayRemove(uid), [`participants.${uid}`]: deleteField() });
const set = (db, id, fields) => updateDoc(doc(db, 'meetups', id), fields);

// ── meetups: 생성 ──
await allow('유효한 모임 생성', setDoc(doc(alice, 'meetups', 'm1'), meetup()));
await deny('startAt 29일 후', setDoc(doc(alice, 'meetups', 'x1'), meetup({ startAt: at(29 * D), endAt: at(29 * D + H) })));
await deny('startAt 과거', setDoc(doc(alice, 'meetups', 'x2'), meetup({ startAt: at(-H), endAt: at(H) })));
await deny('진행 13시간', setDoc(doc(alice, 'meetups', 'x3'), meetup({ endAt: at(D + 13 * H) })));
await deny('purgeAt 30일', setDoc(doc(alice, 'meetups', 'x4'), meetup({ purgeAt: at(30 * D) })));
await deny('남을 호스트로 생성', setDoc(doc(bob, 'meetups', 'x5'), meetup()));
await deny('정원 51', setDoc(doc(alice, 'meetups', 'x6'), meetup({ capacity: 51 })));
await deny('알 수 없는 카테고리', setDoc(doc(alice, 'meetups', 'x7'), meetup({ category: 'party' })));

// ── meetups: 참가/대기열 ──
await allow('bob 참가 (확정)', join(bob, 'm1', 'bob'));
await allow('carol 참가 (대기)', join(carol, 'm1', 'carol'));
await deny('bob이 dave 추가', join(bob, 'm1', 'dave'));
await deny('bob이 carol 제거', leave(bob, 'm1', 'carol'));
await deny('carol이 순서 앞으로', set(carol, 'm1', { participantIds: ['alice', 'carol', 'bob'] }));
await deny('bob이 제목 수정', set(bob, 'm1', { title: '해킹' }));
await allow('bob 취소 → carol 자동 확정', leave(bob, 'm1', 'bob'));
await allow('bob 재참가 (맨 뒤)', join(bob, 'm1', 'bob'));

// ── meetups: 호스트 ──
await deny('호스트가 dave 추가', set(alice, 'm1', { participantIds: ['alice', 'carol', 'bob', 'dave'] }));
await deny('호스트가 순서 변경', set(alice, 'm1', { participantIds: ['alice', 'bob', 'carol'] }));
await deny('호스트가 정원을 확정 인원(2) 미만으로', set(alice, 'm1', { capacity: 1 }));
await allow('호스트가 정원 3으로 증가', set(alice, 'm1', { capacity: 3 }));
await deny('호스트가 정원을 확정 인원(3) 미만으로', set(alice, 'm1', { capacity: 2 }));
await allow('호스트가 bob 제외', leave(alice, 'm1', 'bob'));
await allow('정원 3 / 인원 2 → 정원 2 가능', set(alice, 'm1', { capacity: 2 }));
await deny('호스트가 일시 변경', set(alice, 'm1', { startAt: at(2 * D) }));
await deny('호스트가 종료시각 변경', set(alice, 'm1', { endAt: at(D + 3 * H) }));
await deny('호스트가 장소 변경', set(alice, 'm1', { placeId: 'other' }));
await deny('호스트가 좌표 변경', set(alice, 'm1', { location: { lat: 0, lng: 0 } }));
await deny('비로그인 읽기', getDoc(doc(anon, 'meetups', 'm1')));
await deny('비로그인 참가', updateDoc(doc(anon, 'meetups', 'm1'), { participantIds: arrayUnion('anon') }));
await deny('비로그인 생성', setDoc(doc(anon, 'meetups', 'x8'), meetup({ hostId: 'anon' })));
await allow('호스트가 모임 취소', set(alice, 'm1', { status: 'cancelled' }));
await deny('취소된 모임 참가', join(bob, 'm1', 'bob'));
await allow('취소된 모임에서 본인 빠지기', leave(carol, 'm1', 'carol'));
await deny('비호스트 삭제', deleteDoc(doc(bob, 'meetups', 'm1')));
await allow('호스트 삭제', deleteDoc(doc(alice, 'meetups', 'm1')));

// ── placeStats ──
const event = (uid) => ({ creatorId: uid, title: 't', placeId: 'P1', endAt: at(H) });
const stat = (eventId) => ({ placeId: 'P1', totalEvents: increment(1), lastEventAt: serverTimestamp(), lastEventId: eventId });
const withEvent = (db, uid, statOverride) => {
  const ref = doc(collection(db, 'events'));
  const b = writeBatch(db);
  b.set(ref, event(uid));
  b.set(doc(db, 'placeStats', 'P1'), (statOverride ?? stat)(ref.id), { merge: true });
  return b.commit().then(() => ref.id);
};
await deny('이벤트 없이 placeStats 생성', setDoc(doc(alice, 'placeStats', 'P1'), { placeId: 'P1', totalEvents: 1, lastEventAt: serverTimestamp(), lastEventId: 'nope' }));
let e1;
await allow('이벤트 + placeStats batch 생성', withEvent(alice, 'alice').then(id => { e1 = id; }));
await allow('두 번째 이벤트로 +1', withEvent(bob, 'bob'));
await deny('기존 이벤트 재사용 +1', setDoc(doc(alice, 'placeStats', 'P1'), stat(e1), { merge: true }));
await deny('새 이벤트와 함께 +2 증가', withEvent(alice, 'alice', (id) => ({ ...stat(id), totalEvents: increment(2) })));
await deny('남의 장소 이벤트로 +1', withEvent(alice, 'alice', (id) => ({ ...stat(id), placeId: 'P1' })).then(() => {
  const ref = doc(collection(alice, 'events'));
  const b = writeBatch(alice);
  b.set(ref, { ...event('alice'), placeId: 'OTHER' });
  b.set(doc(alice, 'placeStats', 'P1'), stat(ref.id), { merge: true });
  return b.commit();
}));
await deny('비로그인 placeStats 읽기', getDoc(doc(anon, 'placeStats', 'P1')));
await deny('비로그인 placeStats 쓰기', setDoc(doc(anon, 'placeStats', 'P2'), { placeId: 'P2', totalEvents: 1 }));
await deny('placeName 저장', updateDoc(doc(alice, 'placeStats', 'P1'), { placeName: 'x' }));

console.log(failed ? `\n${failed}개 실패` : '\n전부 통과');
process.exit(failed ? 1 : 0);
