
import React, { createContext, useReducer, useContext, Dispatch, useEffect, useRef } from 'react';
import { AppState, Action, InventoryItem, ParsedPolicy, Proof, AccountHolder, ClaimDetails, ActivityLogEntry, AppView, UndoableAction, ProofSuggestion, ProcessingInference, ActiveClaim, ClaimItem } from '../types.ts';
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
    confidenceScore: 100 
};

const DEFAULT_ACCOUNT_HOLDER: AccountHolder = { 
    id: 'ah-001', 
    name: 'Roydel Marquez Bello', 
    address: '312 W 43rd St, Apt 14J, New York, NY 10036' 
};

const INITIAL_INVENTORY: InventoryItem[] = [
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
    {
        id: `item-2`,
        status: 'needs-review',
        itemName: 'Hermès Birkin 30',
        itemDescription: 'Black Togo leather with Gold hardware. Stored in dust bag.',
        itemCategory: 'Clothing',
        originalCost: 10025.50,
        replacementCostValueRCV: 11500.00,
        purchaseDate: '2022-06-20',
        brand: 'Hermès',
        model: 'Birkin 30',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St (Packed for Move)',
        proofStrengthScore: 85
    },
    {
        id: `item-3`,
        status: 'active',
        itemName: 'Cartier Tank Watch',
        itemDescription: 'Tank Must de Cartier, Large model, steel. Gift from Omar Gonzalez (Affidavit Attached).',
        itemCategory: 'Jewelry',
        originalCost: 7500.00,
        replacementCostValueRCV: 7500.00,
        purchaseDate: '2021-12-25',
        brand: 'Cartier',
        model: 'Tank Must',
        serialNumber: '8291L0P',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St (Packed for Move)',
        proofStrengthScore: 90
    },
    {
        id: `item-4`,
        status: 'active',
        itemName: 'Samsung 65" 8000 Series 4K UHD Smart TV',
        itemDescription: '4K UHD Smart TV. Wall mounted previously.',
        itemCategory: 'Electronics',
        originalCost: 2011.71,
        replacementCostValueRCV: 2011.71,
        purchaseDate: '2021-09-08',
        brand: 'Samsung',
        model: 'UN65RU8000',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St'
    },
    {
        id: `item-5`,
        status: 'active',
        itemName: 'Alienware Gaming Laptop (M15)',
        itemDescription: 'High-performance gaming laptop.',
        itemCategory: 'Electronics',
        originalCost: 3000.00,
        replacementCostValueRCV: 3000.00,
        purchaseDate: '2023-01-15',
        brand: 'Alienware',
        model: 'M15 R7',
        condition: 'Good',
        linkedProofs: [],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St'
    },
    {
        id: `item-6`,
        status: 'active',
        itemName: 'Sony WH-1000XM3 Headphones (Qty 2)',
        itemDescription: 'Noise canceling headphones. One black, one silver.',
        itemCategory: 'Electronics',
        originalCost: 762.10,
        replacementCostValueRCV: 762.10,
        purchaseDate: '2018-12-24',
        brand: 'Sony',
        model: 'WH-1000XM3',
        condition: 'Good',
        linkedProofs: [],
        createdAt: '2024-11-28',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: '421 W 56th St'
    }
];

const INITIAL_CLAIMS: ActiveClaim[] = [
    {
        id: 'claim-default-001',
        name: "Claim #00104761115",
        status: 'draft',
        linkedPolicyId: 'policy-RI8462410',
        generatedAt: new Date().toISOString(),
        totalClaimValue: 0,
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

const INITIAL_STATE: AppState = {
    inventory: INITIAL_INVENTORY,
    policies: [DEFAULT_POLICY],
    unlinkedProofs: [],
    accountHolder: DEFAULT_ACCOUNT_HOLDER,
    
    claims: INITIAL_CLAIMS,
    currentClaimId: 'claim-default-001',

    activityLog: [],
    undoAction: null,
    currentView: 'dashboard',
    selectedItemId: null,
    isInitialized: false,
};

// --- REDUCER ---
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'INITIALIZE_STATE': return { ...action.payload, isInitialized: true };
        case 'RESET_STATE': return { ...INITIAL_STATE, activityLog: state.activityLog, isInitialized: true };
        case 'LOAD_FROM_FILE': return { ...state, ...action.payload, currentView: 'dashboard', selectedItemId: null };
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
        case 'SET_ACTIVE_POLICY': return { ...state, policies: state.policies.map(p => ({ ...p, isActive: p.id === action.payload })) };
        case 'ADD_PROOFS_TO_ITEM': return { ...state, inventory: state.inventory.map(item => item.id === action.payload.itemId ? { ...item, linkedProofs: [...item.linkedProofs, ...action.payload.proofs] } : item) };
        case 'SET_VIEW': return { ...state, currentView: action.payload };
        case 'SELECT_ITEM': return { ...state, selectedItemId: action.payload, currentView: 'item-detail' };
        case 'UNSELECT_ITEM': return { ...state, selectedItemId: null, currentView: 'dashboard' };
        case 'FINALIZE_INTERACTIVE_PROCESSING': {
            const approved = action.payload.filter(inf => inf.userSelection === 'approved');
            let newInventory = [...state.inventory];
            // Note: ALE handling would need update for specific claims, but leaving simple for now
            
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
        default: return state;
    }
};

// --- CONTEXT & PROVIDER ---
const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({ state: INITIAL_STATE, dispatch: () => null });

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

    // Load state from IndexedDB on initial mount
    useEffect(() => {
        const load = async () => {
            const loadedState = await storageService.loadState();
            if (loadedState) {
                // Ensure claims array exists if loading old state
                if (!loadedState.claims) {
                    loadedState.claims = INITIAL_CLAIMS;
                    loadedState.currentClaimId = INITIAL_CLAIMS[0].id;
                }
                dispatch({ type: 'INITIALIZE_STATE', payload: loadedState });
            } else {
                // Mark as initialized even if no state was loaded
                dispatch({ type: 'INITIALIZE_STATE', payload: INITIAL_STATE });
            }
        };
        load();
    }, []);

    // Save state to IndexedDB on change (debounced)
    useEffect(() => {
        if (!state.isInitialized) return; // Don't save until initialized
        const handler = setTimeout(() => {
            storageService.saveState(state);
        }, 1000); // 1-second debounce
        return () => clearTimeout(handler);
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

// --- HOOKS ---
export const useAppState = () => useContext(AppContext).state;
export const useAppDispatch = () => useContext(AppContext).dispatch;
