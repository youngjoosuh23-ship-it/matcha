import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './config';

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error.code, error.message);
    if (error.code === 'auth/unauthorized-domain') {
      alert('이 도메인은 Firebase 승인된 도메인 리스트에 없습니다. Firebase 콘솔에서 확인이 필요합니다.');
    }
    throw error;
  }
};
