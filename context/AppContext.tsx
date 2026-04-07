
import React, { createContext, useReducer, useContext, Dispatch, useEffect, useRef, useState } from 'react';
import { AppState, Action, InventoryItem, ParsedPolicy, Proof, AccountHolder, ClaimDetails, ActivityLogEntry, AppView, ProofSuggestion, ProcessingInference, ActiveClaim, ClaimItem, Task, SyncStatus, PipelineItem } from '../types.ts';
import * as storageService from '../services/storageService.ts';
import { exportToCSV, exportToZip } from '../utils/fileUtils.ts';
import { useAuth } from './AuthContext.tsx';

// --- INITIAL STATE ---
const DEFAULT_POLICY: ParsedPolicy = { 
    id: 'policy-default', 
    policyName: "No Policy Loaded", 
    isActive: false, 
    isVerified: false, 
    provider: "", 
    policyNumber: "", 
    policyHolder: "", 
    effectiveDate: "", 
    expirationDate: "", 
    deductible: 0, 
    lossSettlementMethod: 'ACV', 
    policyType: '', 
    coverageD_limit: 0, // Loss of Use
    coverage: [], 
    exclusions: [], 
    conditions: [],
    triggers: [],
    limits: [],
    confidenceScore: 0 
};

const DEFAULT_ACCOUNT_HOLDER: AccountHolder = { 
    id: 'ah-default', 
    name: 'Unknown User', 
    address: '' 
};

const INITIAL_INVENTORY: InventoryItem[] = [];

const INITIAL_CLAIMS: ActiveClaim[] = [];

const INITIAL_TASKS: Task[] = [];

const INITIAL_STATE: AppState = {
    inventory: INITIAL_INVENTORY,
    policies: [],
    unlinkedProofs: [],
    accountHolder: DEFAULT_ACCOUNT_HOLDER,
    
    claims: INITIAL_CLAIMS,
    currentClaimId: null,

    tasks: INITIAL_TASKS,

    // Durable Processing Ledger
    processingQueue: [],

    activityLog: [],
    currentView: 'dashboard',
    selectedItemId: null,
    isInitialized: false,
    lastScrollPosition: 0,
};

// --- REDUCER ---
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'INITIALIZE_STATE': return { ...action.payload, isInitialized: true };
        case 'RESET_STATE': return { ...INITIAL_STATE, activityLog: state.activityLog, isInitialized: true };
        case 'LOAD_FROM_FILE': return { ...state, ...action.payload, currentView: 'dashboard', selectedItemId: null, isInitialized: true };
        
        case 'UPDATE_ITEM': return { ...state, inventory: state.inventory.map(item => item.id === action.payload.id ? action.payload : item) };
        case 'ADD_INVENTORY_ITEMS': return { ...state, inventory: [...state.inventory, ...action.payload] };
        case 'BULK_UPDATE_ITEM_STATUS': return { ...state, inventory: state.inventory.map(item => action.payload.ids.includes(item.id) ? { ...item, status: action.payload.status } : item) };
        case 'BULK_EDIT_ITEMS': return { ...state, inventory: state.inventory.map(item => action.payload.ids.includes(item.id) ? { ...item, ...action.payload.updates } : item) };
        case 'BULK_DELETE_ITEMS': return { ...state, inventory: state.inventory.filter(item => !action.payload.ids.includes(item.id)) };
        case 'DELETE_ITEM': {
            const itemToDelete = state.inventory.find(i => i.id === action.payload.itemId);
            if (!itemToDelete) return state;
            return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload.itemId) };
        }
        case 'LOG_ACTIVITY': {
            const newEntry: ActivityLogEntry = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), app: action.payload.app || 'VeritasVault', action: action.payload.action, details: action.payload.details };
            return { ...state, activityLog: [...state.activityLog, newEntry] };
        }
        case 'SAVE_POLICY_FROM_REPORT': {
            const report = action.payload;
            const newPolicy: ParsedPolicy = { ...report.parsedPolicy, policyName: `Policy ${report.parsedPolicy.provider} ${report.parsedPolicy.effectiveDate.split('-')[0]}`, id: `policy-${Date.now()}`, isVerified: true, isActive: false };
            if (report.analysisType === 'update' && report.targetPolicyId) {
                return { ...state, policies: state.policies.map(p => p.id === report.targetPolicyId ? { ...p, ...newPolicy, id: p.id, isActive: p.isActive } : p) };
            }
            return { ...state, policies: [...state.policies.map(p => ({...p, isActive: false})), { ...newPolicy, isActive: true }] };
        }
        case 'UPDATE_POLICY': {
            return { ...state, policies: state.policies.map(p => p.id === action.payload.id ? action.payload : p) };
        }
        case 'SET_ACTIVE_POLICY': return { ...state, policies: state.policies.map(p => ({ ...p, isActive: p.id === action.payload })) };
        case 'ADD_PROOFS_TO_ITEM': return { ...state, inventory: state.inventory.map(item => item.id === action.payload.itemId ? { ...item, linkedProofs: [...item.linkedProofs, ...action.payload.proofs] } : item) };
        case 'SET_VIEW': return { ...state, currentView: action.payload };
        case 'SELECT_ITEM': return { ...state, selectedItemId: action.payload, currentView: 'item-detail' };
        case 'UNSELECT_ITEM': return { ...state, selectedItemId: null, currentView: 'dashboard' };
        case 'UPDATE_SCROLL': return { ...state, lastScrollPosition: action.payload };
        case 'FINALIZE_INTERACTIVE_PROCESSING': {
            const approved = action.payload.filter(inf => inf.userSelection === 'approved');
            let newInventory = [...state.inventory];
            
            approved.forEach((inference, i) => {
                const finalProof: Proof = { ...inference.proof, notes: inference.notes, owner: inference.owner };
                if (inference.analysisType === 'NEW_ITEM') {
                    const synthItem = inference.synthesizedItem || {};
                    newInventory.push({ id: `item-final-${Date.now()}-${i}`, status: 'needs-review', itemName: synthItem.itemName || 'Untitled Item', itemDescription: synthItem.itemDescription || 'No description provided.', itemCategory: synthItem.itemCategory || 'Other', originalCost: synthItem.originalCost || 0, purchaseDate: synthItem.purchaseDate, isGift: synthItem.isGift, giftedBy: synthItem.giftedBy, linkedProofs: [finalProof], createdAt: new Date().toISOString(), createdBy: 'AI Interactive' });
                } else if (inference.analysisType === 'EXISTING_ITEM_MATCH' && inference.matchedItemId) {
                    newInventory = newInventory.map(item => item.id === inference.matchedItemId ? { ...item, linkedProofs: [...item.linkedProofs, finalProof] } : item);
                }
            });
            return { ...state, inventory: newInventory };
        }
         case 'SUGGEST_PROOF_FOR_ITEM': {
            const { itemId, proof, suggestion } = action.payload;
            const newUnlinkedProofs = [...state.unlinkedProofs, proof];
            const newInventory = state.inventory.map(item => {
                if (item.id === itemId) {
                    return { ...item, suggestedProofs: [...(item.suggestedProofs || []), suggestion] };
                }
                return item;
            });
            return { ...state, inventory: newInventory, unlinkedProofs: newUnlinkedProofs };
        }
        case 'ADD_SUGGESTIONS_TO_ITEM': {
            const { itemId, suggestions } = action.payload;
            return { ...state, inventory: state.inventory.map(item => {
                if (item.id === itemId) {
                    const existingSuggestionIds = new Set((item.suggestedProofs || []).map(s => s.proofId));
                    const newSuggestions = suggestions.filter(s => !existingSuggestionIds.has(s.proofId));
                    return { ...item, suggestedProofs: [...(item.suggestedProofs || []), ...newSuggestions] };
                }
                return item;
            })};
        }
        case 'ACCEPT_SUGGESTION': {
            const { itemId, proofId } = action.payload;
            const proofToLink = state.unlinkedProofs.find(p => p.id === proofId);
            
            if (!proofToLink) return state;

            return {
                ...state,
                // Remove from unlinked
                unlinkedProofs: state.unlinkedProofs.filter(p => p.id !== proofId),
                // Add to item and remove from suggestions
                inventory: state.inventory.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                        ...item,
                        linkedProofs: [...item.linkedProofs, proofToLink],
                        suggestedProofs: (item.suggestedProofs || []).filter(s => s.proofId !== proofId)
                    };
                })
            };
        }
        case 'REJECT_SUGGESTION_PERMANENT': {
            const { itemId, proofId } = action.payload;
             const item = state.inventory.find(i => i.id === itemId);
             const suggestion = item?.suggestedProofs?.find(s => s.proofId === proofId);
             
             if (!item || !suggestion) return state;

            return {
                ...state,
                inventory: state.inventory.map(i => {
                    if (i.id !== itemId) return i;
                    return {
                        ...i,
                        suggestedProofs: (i.suggestedProofs || []).filter(s => s.proofId !== proofId)
                    };
                })
            };
        }
        case 'REMOVE_UNLINKED_PROOF': {
            return { ...state, unlinkedProofs: state.unlinkedProofs.filter(p => p.id !== action.payload) };
        }
        case 'ADD_UNLINKED_PROOFS': {
            return { ...state, unlinkedProofs: [...state.unlinkedProofs, ...action.payload] };
        }
        // CLAIMS ACTIONS
        case 'CREATE_CLAIM': {
            return {
                ...state,
                claims: [...state.claims, action.payload],
                currentClaimId: action.payload.id
            };
        }
        case 'UPDATE_CLAIM_ITEM': {
            const { claimId, item } = action.payload;
            const updatedClaims = state.claims.map(claim => {
                if (claim.id !== claimId) return claim;
                
                const updatedItems = claim.claimItems.map(i => i.id === item.id ? item : i);
                const totalValue = updatedItems.filter(i => i.status === 'included').reduce((acc, i) => acc + i.claimedValue, 0);
                return { ...claim, claimItems: updatedItems, totalClaimValue: totalValue };
            });
            return { ...state, claims: updatedClaims };
        }
        case 'UPDATE_CLAIM_DETAILS': {
            const { claimId, details } = action.payload;
            const updatedClaims = state.claims.map(claim => {
                if (claim.id !== claimId) return claim;
                return { ...claim, incidentDetails: { ...claim.incidentDetails, ...details } };
            });
            return { ...state, claims: updatedClaims };
        }
        case 'UPDATE_CLAIM_STAGE': {
            const { claimId, stage } = action.payload;
            return {
                ...state,
                claims: state.claims.map(c => c.id === claimId ? { ...c, stage } : c)
            };
        }
        case 'SET_CURRENT_CLAIM': {
            return { ...state, currentClaimId: action.payload };
        }
        case 'DELETE_CLAIM': {
            const remaining = state.claims.filter(c => c.id !== action.payload);
            let nextId = state.currentClaimId;
            if (state.currentClaimId === action.payload) {
                nextId = remaining.length > 0 ? remaining[0].id : null;
            }
            return { ...state, claims: remaining, currentClaimId: nextId };
        }
        // TASK ACTIONS
        case 'ADD_TASK': {
            return { ...state, tasks: [...state.tasks, action.payload] };
        }
        case 'TOGGLE_TASK': {
            return { ...state, tasks: state.tasks.map(t => t.id === action.payload ? { ...t, isCompleted: !t.isCompleted } : t) };
        }
        case 'DELETE_TASK': {
            return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
        }
        // PIPELINE ACTIONS
        case 'ENQUEUE_PIPELINE_ITEMS': {
            return { ...state, processingQueue: [...state.processingQueue, ...action.payload] };
        }
        case 'UPDATE_PIPELINE_ITEM_STATUS': {
            const { id, status, error, resultItemId } = action.payload;
            return {
                ...state,
                processingQueue: state.processingQueue.map(item => 
                    item.id === id ? { ...item, status, error, resultItemId } : item
                )
            };
        }
        case 'CLEAR_PROCESSED_PIPELINE_ITEMS': {
            return { ...state, processingQueue: state.processingQueue.filter(i => i.status === 'pending' || i.status === 'processing') };
        }
        default: return state;
    }
};

type HistoryState = {
    past: AppState[];
    present: AppState;
    future: AppState[];
};

const UNDOABLE_ACTIONS = new Set([
    'UPDATE_ITEM', 'ADD_INVENTORY_ITEMS', 'BULK_UPDATE_ITEM_STATUS', 
    'BULK_EDIT_ITEMS', 'BULK_DELETE_ITEMS', 'DELETE_ITEM', 'FINALIZE_INTERACTIVE_PROCESSING', 
    'ADD_PROOFS_TO_ITEM', 'ACCEPT_SUGGESTION', 'REJECT_SUGGESTION_PERMANENT', 
    'REMOVE_UNLINKED_PROOF', 'ADD_UNLINKED_PROOFS', 'CREATE_CLAIM', 
    'UPDATE_CLAIM_ITEM', 'UPDATE_CLAIM_DETAILS', 'UPDATE_CLAIM_STAGE', 
    'DELETE_CLAIM', 'ADD_TASK', 'TOGGLE_TASK', 'DELETE_TASK'
]);

const undoableReducer = (state: HistoryState, action: Action): HistoryState => {
    if (action.type === 'GLOBAL_UNDO') {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, state.past.length - 1);
        const restoredState = {
            ...previous,
            currentView: state.present.currentView,
            selectedItemId: state.present.selectedItemId,
            lastScrollPosition: state.present.lastScrollPosition,
        };
        return {
            past: newPast,
            present: restoredState,
            future: [state.present, ...state.future]
        };
    }

    if (action.type === 'GLOBAL_REDO') {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        const restoredState = {
            ...next,
            currentView: state.present.currentView,
            selectedItemId: state.present.selectedItemId,
            lastScrollPosition: state.present.lastScrollPosition,
        };
        return {
            past: [...state.past, state.present],
            present: restoredState,
            future: newFuture
        };
    }

    const newPresent = appReducer(state.present, action);
    
    if (newPresent === state.present) {
        return state;
    }

    if (UNDOABLE_ACTIONS.has(action.type)) {
        return {
            past: [...state.past, state.present].slice(-50), // Keep last 50 states
            present: newPresent,
            future: []
        };
    }

    return {
        ...state,
        present: newPresent
    };
};

const INITIAL_HISTORY_STATE: HistoryState = {
    past: [],
    present: INITIAL_STATE,
    future: []
};

// --- CONTEXT & PROVIDER ---
const AppContext = createContext<{ 
    state: AppState; 
    dispatch: Dispatch<Action>; 
    syncStatus: SyncStatus;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
}>({ 
    state: INITIAL_STATE, 
    dispatch: () => null, 
    syncStatus: 'idle',
    canUndo: false,
    canRedo: false,
    undo: () => null,
    redo: () => null
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [historyState, dispatch] = useReducer(undoableReducer, INITIAL_HISTORY_STATE);
    const state = historyState.present;
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const saveTimeoutRef = useRef<number | null>(null);
    const { user, isAuthReady } = useAuth();

    // Load state from IndexedDB/Firestore on initial mount or user change
    useEffect(() => {
        if (!isAuthReady) return;

        const load = async () => {
            try {
                const loadedState = await storageService.loadState();
                if (loadedState) {
                    // Clean up persisted syncStatus if accidentally saved
                    const cleanState = { ...loadedState };
                    if ('syncStatus' in cleanState) {
                        delete (cleanState as any).syncStatus;
                    }

                    // Ensure claims array exists if loading old state (migration support)
                    if (!cleanState.claims) {
                        cleanState.claims = INITIAL_CLAIMS;
                        cleanState.currentClaimId = INITIAL_CLAIMS.length > 0 ? INITIAL_CLAIMS[0].id : null;
                    }
                    if (!cleanState.tasks) {
                        cleanState.tasks = INITIAL_TASKS;
                    }
                    if (!cleanState.processingQueue) {
                        cleanState.processingQueue = [];
                    }
                    dispatch({ type: 'INITIALIZE_STATE', payload: cleanState });
                    setSyncStatus('synced');
                } else {
                    // Mark as initialized even if no state was loaded (fresh start)
                    dispatch({ type: 'INITIALIZE_STATE', payload: INITIAL_STATE });
                }
            } catch (error) {
                console.error("Failed to load state from DB", error);
                // Fallback to initial state but mark initialized so app can render
                dispatch({ type: 'INITIALIZE_STATE', payload: INITIAL_STATE });
                setSyncStatus('error');
            }
        };
        load();
    }, [user, isAuthReady]);

    // Save state helper
    const persistState = async (currentState: AppState) => {
        if (!user) return; // Don't persist if not logged in
        try {
            await storageService.saveState(currentState);
            setSyncStatus('synced');
        } catch (error) {
            console.error("Auto-save failed", error);
            setSyncStatus('error');
        }
    };

    // Save state to IndexedDB on change (debounced)
    useEffect(() => {
        if (!state.isInitialized || !user) return;

        setSyncStatus('syncing');
        
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            persistState(state);
        }, 1500); // 1.5-second debounce for fewer writes

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [state, user]); 

    // Handle immediate save on visibility change (e.g. closing tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && state.isInitialized && user) {
                // Try to save immediately if the user is leaving
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
                persistState(state);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [state, user]);

    const undo = () => dispatch({ type: 'GLOBAL_UNDO' });
    const redo = () => dispatch({ type: 'GLOBAL_REDO' });

    return (
        <AppContext.Provider value={{ 
            state, 
            dispatch, 
            syncStatus,
            canUndo: historyState.past.length > 0,
            canRedo: historyState.future.length > 0,
            undo,
            redo
        }}>
            {children}
        </AppContext.Provider>
    );
};

// --- HOOKS ---
export const useAppState = () => useContext(AppContext).state;
export const useAppDispatch = () => useContext(AppContext).dispatch;
export const useSyncStatus = () => useContext(AppContext).syncStatus;
export const useUndoRedo = () => {
    const context = useContext(AppContext);
    return {
        canUndo: context.canUndo,
        canRedo: context.canRedo,
        undo: context.undo,
        redo: context.redo
    };
};
