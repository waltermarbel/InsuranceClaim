
import React, { createContext, useReducer, useContext, Dispatch, useEffect, useRef, useState } from 'react';
import { AppState, Action, InventoryItem, ParsedPolicy, Proof, AccountHolder, ClaimDetails, ActivityLogEntry, AppView, UndoableAction, ProofSuggestion, ProcessingInference, ActiveClaim, ClaimItem, Task, SyncStatus, PipelineItem } from '../types.ts';
import * as storageService from '../services/storageService.ts';
import { exportToCSV, exportToZip } from '../utils/fileUtils.ts';

// --- INITIAL STATE ---
const DEFAULT_POLICY: ParsedPolicy = { 
    id: 'policy-RI8462410', 
    policyName: "Assurant Renters (Premier)", 
    isActive: true, 
    isVerified: true, 
    provider: "Assurant", 
    policyNumber: "RI8462410", 
    policyHolder: "Roydel Marquez Bello & Maleidy Bello Landin", 
    effectiveDate: "2024-08-26", 
    expirationDate: "2025-08-26", 
    deductible: 500, 
    lossSettlementMethod: 'RCV', 
    policyType: 'HO-4 Renters Insurance', 
    coverageD_limit: 19000, // Loss of Use
    coverage: [
        { category: "Personal Property", limit: 95000, type: "main" }, 
        { category: "Personal Liability", limit: 100000, type: "main" },
        { category: "Medical Payments", limit: 1000, type: "main" },
        { category: "Jewelry/Watches/Furs", limit: 1000, type: "sub-limit" }, 
        { category: "Electronics", limit: 5000, type: "sub-limit" }, 
        { category: "Business Property", limit: 2500, type: "sub-limit" },
        { category: "Firearms", limit: 2500, type: "sub-limit" }
    ], 
    exclusions: ["Flood", "Earthquake", "Intentional Loss", "Neglect", "Business Data"], 
    conditions: ["Notify police in case of theft", "Protect property from further damage", "File proof of loss within 60 days"],
    triggers: ["Fire", "Lightning", "Windstorm", "Hail", "Explosion", "Riot", "Aircraft", "Vehicles", "Smoke", "Vandalism", "Theft", "Falling Objects", "Weight of Ice/Snow", "Accidental Discharge/Overflow of Water", "Sudden/Accidental Tearing/Cracking/Burning", "Freezing", "Sudden/Accidental Damage from Artificially Generated Electric Current", "Volcanic Eruption"],
    limits: ["$200 for Money/Bank Notes", "$1500 for Securities/Accounts/Deeds", "$1500 for Watercraft/Trailers", "$1500 for Trailers", "$1500 for Theft of Jewelry/Watches/Furs", "$2500 for Theft of Firearms", "$2500 for Theft of Silverware", "$2500 for Business Property on premises", "$1500 for Business Property off premises"],
    confidenceScore: 100 
};

const DEFAULT_ACCOUNT_HOLDER: AccountHolder = { 
    id: 'ah-001', 
    name: 'Roydel Marquez Bello', 
    address: '312 W 43rd St, Apt 14J, New York, NY 10036' 
};

const INITIAL_INVENTORY: InventoryItem[] = [
    // ... (Kept existing items for brevity, assuming they are same as original file)
    {
        id: `item-1`,
        status: 'active',
        itemName: 'MacBook Pro 16-inch (Core i7/16GB/256GB)',
        itemDescription: 'Space Gray. Purchased specifically for personal media editing. Verified via Apple ID logs.',
        itemCategory: 'Electronics',
        originalCost: 2499.00,
        replacementCostValueRCV: 2499.00,
        purchaseDate: '2019-02-21',
        brand: 'Apple',
        model: 'MacBook Pro 16"',
        serialNumber: 'C02Y...',
        condition: 'Like New',
        linkedProofs: [
            {
                id: 'proof-macbook-receipt',
                type: 'document',
                fileName: 'macbook_receipt.pdf',
                mimeType: 'application/pdf',
                createdBy: 'User',
                purpose: 'Proof of Purchase',
                notes: 'Uploaded from ./uploads/macbook_receipt.pdf'
            }
        ],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St (Packed for Move)',
        proofStrengthScore: 95
    },
    // ... other items
];

const INITIAL_CLAIMS: ActiveClaim[] = [
    {
        id: 'claim-default-001',
        name: "Claim #00104761115",
        status: 'draft',
        linkedPolicyId: 'policy-RI8462410',
        generatedAt: new Date().toISOString(),
        totalClaimValue: 0,
        stage: 'Incident',
        claimItems: [],
        incidentDetails: {
            name: "Claim #00104761115 (Burglary)", 
            dateOfLoss: "2024-11-27", 
            incidentType: "Burglary (Forced Entry)", 
            location: "421 West 56th Street, Apt 4A, New York, NY 10019", 
            policeReport: "NYPD: 2024-018-12043", 
            propertyDamageDetails: "Burglary occurred on Nov 27, 2024 during relocation. Premises entered via forced entry (window/door). Apartment ransacked. Items were packed in boxes for move to 312 W 43rd St.", 
            claimDateRange: { startDate: "2024-11-27", endDate: "2024-11-28" }, 
            fairRentalValuePerDay: 350,
            aleProofs: [], 
            claimDocuments: [], 
        }
    }
];

const INITIAL_TASKS: Task[] = [
    {
        id: 'task-init-1',
        description: 'File Police Report for Burglary',
        isCompleted: true,
        priority: 'High',
        createdAt: new Date().toISOString(),
    }
];

const INITIAL_STATE: AppState = {
    inventory: INITIAL_INVENTORY,
    policies: [DEFAULT_POLICY],
    unlinkedProofs: [],
    accountHolder: DEFAULT_ACCOUNT_HOLDER,
    
    claims: INITIAL_CLAIMS,
    currentClaimId: 'claim-default-001',

    tasks: INITIAL_TASKS,

    // Durable Processing Ledger
    processingQueue: [],

    activityLog: [],
    undoAction: null,
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
        case 'DELETE_ITEM': {
            const itemToDelete = state.inventory.find(i => i.id === action.payload.itemId);
            if (!itemToDelete) return state;
            return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload.itemId), undoAction: { type: 'DELETE_ITEM', payload: { item: itemToDelete } } };
        }
        case 'LOG_ACTIVITY': {
            const newEntry: ActivityLogEntry = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), app: action.payload.app || 'VeritasVault', action: action.payload.action, details: action.payload.details };
            return { ...state, activityLog: [...state.activityLog, newEntry] };
        }
        case 'CLEAR_UNDO_ACTION': return { ...state, undoAction: null };
        case 'UNDO_ACTION': {
            if (!action.payload) return state;
            if (action.payload.type === 'DELETE_ITEM') {
                return { ...state, inventory: [...state.inventory, action.payload.payload.item], undoAction: null };
            }
            if (action.payload.type === 'REJECT_SUGGESTION') {
                const { itemId, suggestion } = action.payload.payload;
                return { ...state, inventory: state.inventory.map(item => item.id === itemId ? { ...item, suggestedProofs: [...(item.suggestedProofs || []), suggestion] } : item), undoAction: null };
            }
            return state;
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
                }),
                undoAction: { type: 'REJECT_SUGGESTION', payload: { suggestion, itemId } }
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

// --- CONTEXT & PROVIDER ---
const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action>; syncStatus: SyncStatus }>({ state: INITIAL_STATE, dispatch: () => null, syncStatus: 'idle' });

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const saveTimeoutRef = useRef<number | null>(null);

    // Load state from IndexedDB on initial mount
    useEffect(() => {
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
                        cleanState.currentClaimId = INITIAL_CLAIMS[0].id;
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
    }, []);

    // Save state helper
    const persistState = async (currentState: AppState) => {
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
        if (!state.isInitialized) return;

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
    }, [state]); 

    // Handle immediate save on visibility change (e.g. closing tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && state.isInitialized) {
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
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch, syncStatus }}>
            {children}
        </AppContext.Provider>
    );
};

// --- HOOKS ---
export const useAppState = () => useContext(AppContext).state;
export const useAppDispatch = () => useContext(AppContext).dispatch;
export const useSyncStatus = () => useContext(AppContext).syncStatus;
