import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';

function waitForAuth(): Promise<string | null> {
  return new Promise(resolve => {
    if (auth.currentUser) {
      auth.currentUser.getIdToken().then(resolve).catch(() => resolve(null));
      return;
    }
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (user) user.getIdToken().then(resolve).catch(() => resolve(null));
      else resolve(null);
    });
  });
}

export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = await waitForAuth();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
