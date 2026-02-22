
import { openDB, IDBPDatabase } from 'idb';
import { Proof, AppState } from '../types.ts';

const DB_NAME = 'VeritasVaultDB';
const DB_VERSION = 2;
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
          // Stores the heavy binary data (Blobs) keyed by proof ID
          db.createObjectStore(PROOF_STORE_NAME, { keyPath: 'id' });
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
          // Stores the lightweight Redux-like application state
          db.createObjectStore(STATE_STORE_NAME);
        }
      }
    },
  });
  return dbPromise;
};

// --- App State Persistence ---

/**
 * Saves the lightweight application state (metadata only).
 * Ensure that the state passed here does NOT contain base64 strings in dataUrl fields
 * to maintain performance.
 */
export const saveState = async (state: AppState): Promise<void> => {
  const db = await initDB();
  await db.put(STATE_STORE_NAME, state, 'mainState');
};

/**
 * Loads the application state. This contains Proof metadata (IDs, filenames),
 * but not the actual file contents.
 */
export const loadState = async (): Promise<AppState | undefined> => {
    const db = await initDB();
    return await db.get(STATE_STORE_NAME, 'mainState');
};


// --- Proof Blob Storage (IndexedDB) ---

/**
 * Saves the physical file (Blob) to IndexedDB.
 * Returns the proof ID to confirm storage.
 * Call this BEFORE dispatching the Proof metadata to AppState.
 */
export const saveProof = async (proof: Proof, dataBlob: Blob): Promise<string> => {
  const db = await initDB();
  const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
  const store = tx.objectStore(PROOF_STORE_NAME);
  
  // We only store the ID and the Data Blob here.
  // Metadata lives in AppState.
  await store.put({ id: proof.id, data: dataBlob });
  await tx.done;
  return proof.id;
};

/**
 * Retrieves the file Blob for a specific proof ID.
 * Used by UI components (via hooks) to generate temporary object URLs for display.
 */
export const getProofBlob = async (proofId: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const record = await db.get(PROOF_STORE_NAME, proofId);
  return record?.data;
};

/**
 * Deletes a proof's binary data from IndexedDB.
 * Should be called when removing an item or a specific proof from the inventory.
 */
export const deleteProof = async (proofId: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
  await tx.objectStore(PROOF_STORE_NAME).delete(proofId);
  await tx.done;
};

/**
 * Wipes all binary proof data.
 * Useful for factory reset or clearing storage.
 */
export const clearAllProofs = async (): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(PROOF_STORE_NAME, 'readwrite');
    await tx.objectStore(PROOF_STORE_NAME).clear();
    await tx.done;
};
