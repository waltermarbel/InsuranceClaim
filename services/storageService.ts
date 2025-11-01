import { openDB, IDBPDatabase } from 'idb';
import { Proof } from '../types.ts';

const DB_NAME = 'VeritasVaultDB';
const DB_VERSION = 1;
const PROOF_STORE_NAME = 'proofs';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PROOF_STORE_NAME)) {
        db.createObjectStore(PROOF_STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
};

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
}
