import { openDB, IDBPDatabase } from 'idb';
import { Proof, AppState } from '../types.ts';

const DB_NAME = 'VeritasVaultDB';
const DB_VERSION = 2; // Incremented version for new object store
const PROOF_STORE_NAME = 'proofs';
const STATE_STORE_NAME = 'app_state';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(PROOF_STORE_NAME)) {
          db.createObjectStore(PROOF_STORE_NAME, { keyPath: 'id' });
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
          db.createObjectStore(STATE_STORE_NAME);
        }
      }
    },
  });
  return dbPromise;
};

// --- App State Persistence ---
export const saveState = async (state: AppState): Promise<void> => {
  const db = await initDB();
  // Use a fixed key 'mainState' to always overwrite the single state object
  await db.put(STATE_STORE_NAME, state, 'mainState');
};

export const loadState = async (): Promise<AppState | undefined> => {
    const db = await initDB();
    return await db.get(STATE_STORE_NAME, 'mainState');
};


// --- Proof Blob Storage ---
export const saveProof = async (proof: Proof, dataBlob: Blob): Promise<string> => {
  const db = await initDB();
  const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
  const store = tx.objectStore(PROOF_STORE_NAME);
  await store.put({ id: proof.id, data: dataBlob });
  await tx.done;
  return proof.id;
};

export const getProofBlob = async (proofId: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const record = await db.get(PROOF_STORE_NAME, proofId);
  return record?.data;
};

export const deleteProof = async (proofId: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
  await tx.objectStore(PROOF_STORE_NAME).delete(proofId);
  await tx.done;
};

export const clearAllProofs = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
    await tx.objectStore(PROOF_STORE_NAME).clear();
    await tx.done;
};
