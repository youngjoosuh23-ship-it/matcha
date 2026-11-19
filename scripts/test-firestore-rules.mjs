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
const alice = as('alice'), bob = as('bob'), carol = as('carol'), dave = as('dave'), erin = as('erin'), anon = as(null);

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

// ── 번개(events) ──
const checkIn = (db, uid, placeId, expMs = H) => setDoc(doc(db, 'checkins', uid), {
  userId: uid, placeId, placeName: placeId, location: { lat: 37.5, lng: 127 },
  checkInAt: serverTimestamp(), expiresAt: at(expMs), userName: uid, userPhoto: '', userStyle: 'light', userTags: [],
});
const event = (uid, over = {}) => ({
  creatorId: uid, creatorName: uid, creatorPhoto: '', title: '번개', description: '', location: { lat: 37.5, lng: 127 },
  locationName: '카페', placeId: 'P1', radiusKm: 1, startAt: at(0), endAt: at(2 * H),
  attendees: [uid], attendeeNames: { [uid]: uid }, attendeePhotos: { [uid]: '' }, createdAt: at(0), ...over,
});
const boltJoin = (db, id, uid) => updateDoc(doc(db, 'events', id), { attendees: arrayUnion(uid), [`attendeeNames.${uid}`]: uid });
const boltLeave = (db, id, uid) => updateDoc(doc(db, 'events', id), { attendees: arrayRemove(uid) });

await deny('체크인 안 하고 번개 열기', setDoc(doc(alice, 'events', 'b0'), event('alice')));
await allow('alice P1 체크인', checkIn(alice, 'alice', 'P1'));
await allow('carol OTHER 체크인', checkIn(carol, 'carol', 'OTHER'));
await allow('dave LEGACY 체크인', checkIn(dave, 'dave', 'LEGACY'));
await deny('다른 장소에서 번개 열기', setDoc(doc(alice, 'events', 'b0'), event('alice', { placeId: 'P9' })));
await deny('번개 종료 26시간 뒤', setDoc(doc(alice, 'events', 'b0'), event('alice', { endAt: at(26 * H) })));
await deny('장소 없는 번개', setDoc(doc(alice, 'events', 'b0'), (({ placeId, ...rest }) => rest)(event('alice'))));
await deny('번개에 남을 참가자로 넣기', setDoc(doc(alice, 'events', 'b0'), event('alice', { attendees: ['alice', 'bob'] })));
await deny('번개에 모르는 필드', setDoc(doc(alice, 'events', 'b0'), event('alice', { hack: 1 })));
await allow('체크인한 장소에서 번개 열기', setDoc(doc(alice, 'events', 'b1'), event('alice')));
await deny('체크인 안 한 bob 참가', boltJoin(bob, 'b1', 'bob'));
await deny('다른 곳 체크인한 carol 참가', boltJoin(carol, 'b1', 'carol'));
await allow('bob P1 체크인', checkIn(bob, 'bob', 'P1'));
await allow('같은 곳 체크인한 bob 참가', boltJoin(bob, 'b1', 'bob'));
await deny('bob이 carol 추가', boltJoin(bob, 'b1', 'carol'));
await allow('bob 번개 나가기', boltLeave(bob, 'b1', 'bob'));
await allow('erin 만료된 체크인', checkIn(erin, 'erin', 'P1', -60e3));
await deny('체크인 만료된 erin 참가', boltJoin(erin, 'b1', 'erin'));
await allow('연 사람이 제목 수정', updateDoc(doc(alice, 'events', 'b1'), { title: '번개 2' }));
await deny('연 사람이 종료 시각 연장', updateDoc(doc(alice, 'events', 'b1'), { endAt: at(48 * H) }));
await deny('연 사람이 장소 변경', updateDoc(doc(alice, 'events', 'b1'), { placeId: 'P9' }));
await deny('남이 번개 삭제', deleteDoc(doc(bob, 'events', 'b1')));
await allow('연 사람이 번개 삭제', deleteDoc(doc(alice, 'events', 'b1')));
await deny('비로그인 번개 읽기', getDoc(doc(anon, 'events', 'b1')));

// ── placeStats ── (번개를 만들 때만 +1. 위에서 alice·bob은 P1, carol은 OTHER, dave는 LEGACY에 체크인)
const stat = (eventId) => ({ placeId: 'P1', totalEvents: increment(1), lastEventAt: serverTimestamp(), lastEventId: eventId });
const withEvent = (db, uid, statOverride, eventOver = {}, statDoc = 'P1') => {
  const ref = doc(collection(db, 'events'));
  const b = writeBatch(db);
  b.set(ref, event(uid, eventOver));
  b.set(doc(db, 'placeStats', statDoc), (statOverride ?? stat)(ref.id), { merge: true });
  return b.commit().then(() => ref.id);
};
await deny('이벤트 없이 placeStats 생성', setDoc(doc(alice, 'placeStats', 'P1'), { placeId: 'P1', totalEvents: 1, lastEventAt: serverTimestamp(), lastEventId: 'nope' }));
let e1;
await allow('이벤트 + placeStats batch 생성', withEvent(alice, 'alice').then(id => { e1 = id; }));
await allow('두 번째 이벤트로 +1', withEvent(bob, 'bob'));
await deny('기존 이벤트 재사용 +1', setDoc(doc(alice, 'placeStats', 'P1'), stat(e1), { merge: true }));
await deny('새 이벤트와 함께 +2 증가', withEvent(alice, 'alice', (id) => ({ ...stat(id), totalEvents: increment(2) })));
await deny('다른 장소 번개로 이 장소 +1', withEvent(carol, 'carol', undefined, { placeId: 'OTHER' }));
// 정리 스크립트 이후의 운영 데이터 모양 (lastEventId 없음) — 관리자 REST로 규칙 우회해 시드
const seedLegacy = () => fetch(
  `http://127.0.0.1:8080/v1/projects/demo-matcha/databases/${DB_ID}/documents/placeStats/LEGACY`,
  {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      placeId: { stringValue: 'LEGACY' }, totalEvents: { integerValue: '2' }, lastEventAt: { timestampValue: new Date().toISOString() },
    } }),
  },
).then(r => { if (!r.ok) throw new Error(`seed ${r.status}`); });
await allow('lastEventId 없는 기존 문서에 +1', seedLegacy().then(() =>
  withEvent(dave, 'dave', (id) => ({ ...stat(id), placeId: 'LEGACY' }), { placeId: 'LEGACY' }, 'LEGACY')));
await deny('lastEventId 없는 기존 문서에 이벤트 없이 +1', setDoc(doc(alice, 'placeStats', 'LEGACY'), { totalEvents: increment(1), lastEventAt: serverTimestamp() }, { merge: true }));

await deny('비로그인 placeStats 읽기', getDoc(doc(anon, 'placeStats', 'P1')));
await deny('비로그인 placeStats 쓰기', setDoc(doc(anon, 'placeStats', 'P2'), { placeId: 'P2', totalEvents: 1 }));
await deny('placeName 저장', updateDoc(doc(alice, 'placeStats', 'P1'), { placeName: 'x' }));

console.log(failed ? `\n${failed}개 실패` : '\n전부 통과');
process.exit(failed ? 1 : 0);
