
import { openDB, IDBPDatabase } from 'idb';
import { Proof, AppState } from '../types.ts';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

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

// Keep track of previous state to only write changes to Firestore
let previousState: AppState | null = null;

export const saveState = async (state: AppState): Promise<void> => {
  const localDb = await initDB();
  await localDb.put(STATE_STORE_NAME, state, 'mainState');

  const user = auth.currentUser;
  if (!user) return; // Only sync to Firestore if logged in

  try {
    const batch = writeBatch(db);
    let writeCount = 0;

    // Helper to sync a collection
    const syncCollection = (collectionName: string, currentItems: any[], previousItems: any[] = []) => {
      const currentMap = new Map(currentItems.map(i => [i.id, i]));
      const previousMap = new Map(previousItems.map(i => [i.id, i]));

      // Add or update
      for (const [id, item] of currentMap) {
        const prevItem = previousMap.get(id);
        if (!prevItem || JSON.stringify(item) !== JSON.stringify(prevItem)) {
          const docRef = doc(db, `users/${user.uid}/${collectionName}`, id);
          batch.set(docRef, { ...item, uid: user.uid }, { merge: true });
          writeCount++;
        }
      }

      // Delete removed items
      for (const id of previousMap.keys()) {
        if (!currentMap.has(id)) {
          const docRef = doc(db, `users/${user.uid}/${collectionName}`, id);
          batch.delete(docRef);
          writeCount++;
        }
      }
    };

    syncCollection('inventory', state.inventory, previousState?.inventory);
    syncCollection('policies', state.policies, previousState?.policies);
    syncCollection('claims', state.claims, previousState?.claims);
    syncCollection('tasks', state.tasks, previousState?.tasks);
    syncCollection('proofs', state.unlinkedProofs, previousState?.unlinkedProofs);

    if (writeCount > 0) {
      await batch.commit();
    }
    
    previousState = JSON.parse(JSON.stringify(state)); // Deep copy
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user?.uid}`);
  }
};

export const loadState = async (): Promise<AppState | undefined> => {
    const localDb = await initDB();
    const localState = await localDb.get(STATE_STORE_NAME, 'mainState');

    const user = auth.currentUser;
    if (!user) return localState;

    try {
        const fetchCollection = async (collectionName: string) => {
            const snapshot = await getDocs(collection(db, `users/${user.uid}/${collectionName}`));
            return snapshot.docs.map(doc => {
                const data = doc.data();
                delete data.uid; // Remove uid before putting in local state
                return data;
            });
        };

        const [inventory, policies, claims, tasks, unlinkedProofs] = await Promise.all([
            fetchCollection('inventory'),
            fetchCollection('policies'),
            fetchCollection('claims'),
            fetchCollection('tasks'),
            fetchCollection('proofs')
        ]);

        const newState = {
            ...localState,
            inventory: inventory.length > 0 ? inventory : localState?.inventory || [],
            policies: policies.length > 0 ? policies : localState?.policies || [],
            claims: claims.length > 0 ? claims : localState?.claims || [],
            tasks: tasks.length > 0 ? tasks : localState?.tasks || [],
            unlinkedProofs: unlinkedProofs.length > 0 ? unlinkedProofs : localState?.unlinkedProofs || []
        };

        previousState = JSON.parse(JSON.stringify(newState));
        return newState;
    } catch (error) {
        console.error("Failed to load from Firestore, falling back to local state", error);
        return localState;
    }
};

export const saveProof = async (proof: Proof, dataBlob: Blob): Promise<string> => {
  const localDb = await initDB();
  const tx = localDb.transaction(PROOF_STORE_NAME, 'readwrite');
  const store = tx.objectStore(PROOF_STORE_NAME);
  await store.put({ id: proof.id, data: dataBlob });
  await tx.done;
  return proof.id;
};

export const getProofBlob = async (proofId: string): Promise<Blob | undefined> => {
  const localDb = await initDB();
  const record = await localDb.get(PROOF_STORE_NAME, proofId);
  return record?.data;
};

export const deleteProof = async (proofId: string): Promise<void> => {
  const localDb = await initDB();
  const tx = localDb.transaction(PROOF_STORE_NAME, 'readwrite');
  await tx.objectStore(PROOF_STORE_NAME).delete(proofId);
  await tx.done;
};

export const clearAllData = async (): Promise<void> => {
    const localDb = await initDB();
    
    // Clear IndexedDB stores
    const tx = localDb.transaction([PROOF_STORE_NAME, STATE_STORE_NAME], 'readwrite');
    await tx.objectStore(PROOF_STORE_NAME).clear();
    await tx.objectStore(STATE_STORE_NAME).clear();
    await tx.done;

    // Clear Firestore collections if user is logged in
    const user = auth.currentUser;
    if (user) {
        try {
            const collectionsToClear = ['inventory', 'policies', 'claims', 'tasks', 'proofs'];
            
            for (const collectionName of collectionsToClear) {
                const snapshot = await getDocs(collection(db, `users/${user.uid}/${collectionName}`));
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            
            previousState = null;
        } catch (error) {
            console.error("Failed to clear Firestore data", error);
        }
    }
};
