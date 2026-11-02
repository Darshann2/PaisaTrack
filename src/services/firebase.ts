import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import {
  Transaction,
  Account,
  Budget,
  SavingsGoal,
  RecurringBill,
  CategoryItem,
  AppSettings,
  NetWorthProfile,
} from '../types';

// Firebase configuration.
// Values come from VITE_FIREBASE_* environment variables (see .env.example) and fall back
// to the existing project config in firebase-applet-config.json, so the original
// Firebase project and its users keep working with zero setup.
// NOTE: Firebase web config values are identifiers, not secrets; access is enforced by
// Firestore security rules. Never put service-account keys in this project.
const env = import.meta.env as Record<string, string | undefined>;
const pick = (key: string, fallback: string | undefined) =>
  (env[key] && env[key]!.trim() !== '' ? env[key]!.trim() : fallback) ?? '';

const firebaseConfig = {
  projectId: pick('VITE_FIREBASE_PROJECT_ID', appletConfig.projectId),
  appId: pick('VITE_FIREBASE_APP_ID', appletConfig.appId),
  apiKey: pick('VITE_FIREBASE_API_KEY', appletConfig.apiKey),
  authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', appletConfig.authDomain),
  storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', appletConfig.storageBucket),
  messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', appletConfig.messagingSenderId),
  firestoreDatabaseId: pick('VITE_FIREBASE_FIRESTORE_DATABASE_ID', appletConfig.firestoreDatabaseId),
};

const app = initializeApp({
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
});
export const auth = getAuth(app);
// An empty/"(default)" database id selects the default Firestore database.
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
export const firebaseProjectId = firebaseConfig.projectId;

// Enforce local persistence for sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set auth persistence:', err);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // The rules deny everything outside /users/{uid}, so "permission-denied" means the
    // server answered and Firestore is reachable.
    if (error?.code === 'permission-denied') return true;
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is offline or unreachable.');
    }
    return false;
  }
}

// --- AUTHENTICATION APIS ---

export async function loginWithEmail(email: string, pass: string) {
  try {
    return await signInWithEmailAndPassword(auth, email.trim(), pass);
  } catch (error: any) {
    console.error(`Firebase Auth error [Email/Password Sign-In]:`, {
      code: error?.code,
      message: error?.message,
      providerId: 'password',
      projectId: firebaseConfig.projectId,
    });
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string, displayName: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      const cleanName = displayName.trim() || email.trim().split('@')[0] || 'User';
      await updateProfile(cred.user, { displayName: cleanName });
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn('Failed to send verification email:', e);
      }

      // Initialize user profile in Firestore
      const userRef = doc(db, 'users', cred.user.uid);
      try {
        await setDoc(userRef, {
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: cleanName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
      }
    }
    return cred;
  } catch (error: any) {
    console.error(`Firebase Auth error [Email/Password Registration]:`, {
      code: error?.code,
      message: error?.message,
      providerId: 'password',
      projectId: firebaseConfig.projectId,
    });
    throw error;
  }
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      const userRef = doc(db, 'users', cred.user.uid);
      try {
        const existing = await getDoc(userRef);
        if (!existing.exists()) {
          await setDoc(userRef, {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cred.user.displayName || 'Google User',
            photoURL: cred.user.photoURL || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
      }
    }
    return cred;
  } catch (error: any) {
    console.error(`Firebase Auth error [Google Sign-In]:`, {
      code: error?.code,
      message: error?.message,
      providerId: 'google.com',
      projectId: firebaseConfig.projectId,
    });
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    return await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.error(`Firebase Auth error [Password Reset]:`, {
      code: error?.code,
      message: error?.message,
      providerId: 'password',
      projectId: firebaseConfig.projectId,
    });
    throw error;
  }
}

export async function resendVerificationEmail(user: User) {
  return sendEmailVerification(user);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function updateUserDisplayName(name: string) {
  if (!auth.currentUser) throw new Error('No user logged in');
  await updateProfile(auth.currentUser, { displayName: name.trim() });
  const userRef = doc(db, 'users', auth.currentUser.uid);
  try {
    await setDoc(
      userRef,
      { displayName: name.trim(), updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
  }
}

export async function changeUserPassword(currentPass: string, newPass: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('User not logged in');

  const credential = EmailAuthProvider.credential(user.email, currentPass);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPass);
}

export async function deleteUserAccountWithReauth(password?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not logged in');

  if (password && user.email) {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  // Erase all user records in Firestore first
  await deleteAllUserFirestoreData(user.uid);

  // Delete auth record
  await deleteUser(user);
}

// Helper to recursively strip undefined properties so Firestore never rejects payloads
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// --- FIRESTORE CRUD OPERATIONS (USER SCOPED) ---

export async function saveUserDoc<T extends { id: string }>(
  userId: string,
  subcollection: string,
  data: T
) {
  const sanitized = sanitizeForFirestore(data);
  const docRef = doc(db, 'users', userId, subcollection, data.id);
  try {
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/${subcollection}/${data.id}`);
  }
}

export type UserWriteOp =
  | { kind: 'set'; subcollection: string; data: { id: string } }
  | { kind: 'delete'; subcollection: string; id: string };

/**
 * Apply several writes atomically (all succeed or none do). Used so a transaction and the
 * account balance(s) it affects can never get out of sync if one write is rejected.
 */
export async function commitUserWrites(userId: string, ops: UserWriteOp[]) {
  if (ops.length === 0) return;
  const batch = writeBatch(db);
  for (const op of ops) {
    if (op.kind === 'set') {
      batch.set(doc(db, 'users', userId, op.subcollection, op.data.id), sanitizeForFirestore(op.data));
    } else {
      batch.delete(doc(db, 'users', userId, op.subcollection, op.id));
    }
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/[batch:${ops.length} ops]`);
  }
}

export async function deleteUserDoc(userId: string, subcollection: string, docId: string) {
  const docRef = doc(db, 'users', userId, subcollection, docId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/${subcollection}/${docId}`);
  }
}

export async function saveUserSettingsDoc(userId: string, settings: AppSettings) {
  const sanitized = sanitizeForFirestore(settings);
  const docRef = doc(db, 'users', userId, 'settings', 'preferences');
  try {
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/settings/preferences`);
  }
}

export async function saveUserNetWorthDoc(userId: string, netWorth: NetWorthProfile) {
  const sanitized = sanitizeForFirestore({
    ...netWorth,
    updatedAt: new Date().toISOString(),
  });
  const docRef = doc(db, 'users', userId, 'net_worth', 'profile');
  try {
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/net_worth/profile`);
  }
}

export async function deleteAllUserFirestoreData(userId: string) {
  const subcollections = [
    'transactions',
    'accounts',
    'budgets',
    'goals',
    'recurring',
    'categories',
    'settings',
    'net_worth',
  ];

  for (const sub of subcollections) {
    const colRef = collection(db, 'users', userId, sub);
    try {
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.warn(`Error clearing subcollection ${sub}:`, err);
    }
  }

  // Delete user profile doc
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Error deleting user profile:', err);
  }
}

// Batch import data into user Firestore
export async function batchImportUserFirestoreData(
  userId: string,
  data: {
    transactions: Transaction[];
    accounts: Account[];
    budgets: Budget[];
    goals: SavingsGoal[];
    recurring: RecurringBill[];
    categories: CategoryItem[];
    settings?: AppSettings;
  }
) {
  const batch = writeBatch(db);

  data.transactions.forEach((t) => {
    const ref = doc(db, 'users', userId, 'transactions', t.id);
    batch.set(ref, sanitizeForFirestore(t));
  });

  data.accounts.forEach((a) => {
    const ref = doc(db, 'users', userId, 'accounts', a.id);
    batch.set(ref, sanitizeForFirestore(a));
  });

  data.budgets.forEach((b) => {
    const ref = doc(db, 'users', userId, 'budgets', b.id);
    batch.set(ref, sanitizeForFirestore(b));
  });

  data.goals.forEach((g) => {
    const ref = doc(db, 'users', userId, 'goals', g.id);
    batch.set(ref, sanitizeForFirestore(g));
  });

  data.recurring.forEach((r) => {
    const ref = doc(db, 'users', userId, 'recurring', r.id);
    batch.set(ref, sanitizeForFirestore(r));
  });

  data.categories.forEach((c) => {
    const ref = doc(db, 'users', userId, 'categories', c.id);
    batch.set(ref, sanitizeForFirestore(c));
  });

  if (data.settings) {
    const ref = doc(db, 'users', userId, 'settings', 'preferences');
    batch.set(ref, sanitizeForFirestore(data.settings));
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/[batch_import]`);
  }
}

// Real-time listener for user data
export interface UserDataSnapshot {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  categories: CategoryItem[];
  settings: AppSettings | null;
  netWorth: NetWorthProfile | null;
  isInitialLoadComplete: boolean;
}

export function subscribeToUserData(
  userId: string,
  onData: (data: UserDataSnapshot) => void,
  onError?: (message: string, path: string) => void
) {
  // Track WHICH collections have delivered their first snapshot. (Counting every snapshot,
  // as before, could flag "loaded" early or never, e.g. when one listener errored.)
  const loaded = new Set<string>();
  const TOTAL = 8;

  const current: UserDataSnapshot = {
    transactions: [],
    accounts: [],
    budgets: [],
    goals: [],
    recurring: [],
    categories: [],
    settings: null,
    netWorth: null,
    isInitialLoadComplete: false,
  };

  const emit = (name: string) => {
    loaded.add(name);
    onData({
      ...current,
      isInitialLoadComplete: loaded.size >= TOTAL,
    });
  };

  const fail = (path: string) => (err: any) => {
    // Never throw inside a snapshot error callback (it would be an unhandled exception and
    // the UI would silently show "0 records"). Log and report to the UI instead.
    console.error(`Firestore listener error at ${path}:`, err?.code, err?.message);
    const code = err?.code ? ` (${err.code})` : '';
    onError?.(
      err?.code === 'permission-denied'
        ? `Firestore denied access to ${path}${code}. Make sure firestore.rules is deployed to this database and you are signed in.`
        : `Could not load ${path}${code}. ${err?.message || ''}`.trim(),
      path
    );
    // Mark as loaded so the app does not spin forever; the error banner explains why.
    emit(path);
  };

  const unsubs: (() => void)[] = [];

  const listenCollection = <T,>(sub: string, assign: (items: T[]) => void) => {
    const path = `users/${userId}/${sub}`;
    unsubs.push(
      onSnapshot(
        collection(db, 'users', userId, sub),
        (snap) => {
          assign(snap.docs.map((d) => d.data() as T));
          emit(sub);
        },
        fail(path)
      )
    );
  };

  listenCollection<Transaction>('transactions', (v) => (current.transactions = v));
  listenCollection<Account>('accounts', (v) => (current.accounts = v));
  listenCollection<Budget>('budgets', (v) => (current.budgets = v));
  listenCollection<SavingsGoal>('goals', (v) => (current.goals = v));
  listenCollection<RecurringBill>('recurring', (v) => (current.recurring = v));
  listenCollection<CategoryItem>('categories', (v) => (current.categories = v));

  const settingsPath = `users/${userId}/settings/preferences`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', userId, 'settings', 'preferences'),
      (snap) => {
        current.settings = snap.exists() ? (snap.data() as AppSettings) : null;
        emit('settings');
      },
      fail(settingsPath)
    )
  );

  const netWorthPath = `users/${userId}/net_worth/profile`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', userId, 'net_worth', 'profile'),
      (snap) => {
        current.netWorth = snap.exists() ? (snap.data() as NetWorthProfile) : null;
        emit('net_worth');
      },
      fail(netWorthPath)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
