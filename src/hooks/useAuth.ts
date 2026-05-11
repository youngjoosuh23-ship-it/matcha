// 구글 로그인 상태를 감지하고, 로그인한 유저의 Firestore 프로필을 로드(없으면 신규 생성)한다.
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profilePath = `users/${currentUser.uid}`;
        try {
          const profileRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Anonymous',
              photoURL: currentUser.photoURL || '',
              bio: '',
              professionalTags: [],
              languages: ['ko'],
              chatStyle: 'light',
            };
            setProfile(newProfile);
            await setDoc(profileRef, newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, profilePath);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return { user, profile, setProfile, loading };
}
