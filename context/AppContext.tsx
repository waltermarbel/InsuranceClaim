
import React, { createContext, useReducer, useContext, Dispatch, useEffect, useRef } from 'react';
import { AppState, Action, InventoryItem, ParsedPolicy, Proof, AccountHolder, ClaimDetails, ActivityLogEntry, AppView, UndoableAction, ProofSuggestion, ProcessingInference } from '../types.ts';
import * as storageService from '../services/storageService.ts';
import { exportToCSV, exportToZip } from '../utils/fileUtils.ts';

// --- INITIAL STATE ---
const DEFAULT_POLICY: ParsedPolicy = { 
    id: 'policy-00104761115', 
    policyName: "Renter's Policy (Premier)", 
    isActive: true, 
    isVerified: true, 
    provider: "Assurant / Geico", 
    policyNumber: "00104761115", 
    policyHolder: "Roydel Marquez Bello", 
    effectiveDate: "2024-08-26", 
    expirationDate: "2025-08-26", 
    deductible: 500, 
    lossSettlementMethod: 'RCV', 
    policyType: 'HO-4 Renters Insurance', 
    coverageD_limit: 19000, // Per Spec
    coverage: [
        { category: "Personal Property", limit: 95000, type: "main" }, 
        { category: "Personal Liability", limit: 100000, type: "main" },
        { category: "Jewelry", limit: 1000, type: "sub-limit" }, 
        { category: "Electronics", limit: 5000, type: "sub-limit" }, 
        { category: "Business Property", limit: 2500, type: "sub-limit" },
        { category: "Firearms", limit: 2500, type: "sub-limit" }
    ], 
    exclusions: ["Flood", "Earthquake", "Intentional Loss", "Neglect"], 
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
        itemName: 'Apple MacBook Pro 16-inch',
        itemDescription: 'Space Black, M3 Max Chip. Primary work laptop.',
        itemCategory: 'Electronics',
        originalCost: 2499.99,
        replacementCostValueRCV: 2499.99,
        purchaseDate: '2023-11-15',
        brand: 'Apple',
        model: 'MacBook Pro 16"',
        serialNumber: 'H4K92L1M9P',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-01-10',
        createdBy: 'User',
        lastKnownLocation: 'Home Office Desk'
    },
    {
        id: `item-2`,
        status: 'needs-review',
        itemName: 'Hermès Birkin 30',
        itemDescription: 'Black Togo leather with Gold hardware. Purchased 2022.',
        itemCategory: 'Clothing',
        originalCost: 10025.50,
        replacementCostValueRCV: 11500.00,
        purchaseDate: '2022-06-20',
        brand: 'Hermès',
        model: 'Birkin 30',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-02-15',
        createdBy: 'VeritasVault AI',
        lastKnownLocation: 'Master Closet'
    },
    {
        id: `item-3`,
        status: 'active',
        itemName: 'Cartier Tank Watch',
        itemDescription: 'Tank Must de Cartier, Large model, steel. Stolen from jewelry box.',
        itemCategory: 'Jewelry',
        originalCost: 7500.00,
        replacementCostValueRCV: 7500.00,
        purchaseDate: '2021-12-25',
        brand: 'Cartier',
        model: 'Tank Must',
        serialNumber: '8291L0P',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2023-01-05',
        createdBy: 'User',
        lastKnownLocation: 'Master Bedroom'
    },
    {
        id: `item-4`,
        status: 'active',
        itemName: 'Sony A95L BRAVIA XR OLED (65")',
        itemDescription: '65-inch 4K HDR OLED Google TV. Wall mounted.',
        itemCategory: 'Electronics',
        originalCost: 3299.99,
        replacementCostValueRCV: 3299.99,
        purchaseDate: '2023-09-10',
        brand: 'Sony',
        model: 'XR-65A95L',
        serialNumber: 'S0NY-8829-X',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2023-10-01',
        createdBy: 'User',
        lastKnownLocation: 'Living Room'
    },
    {
        id: `item-5`,
        status: 'active',
        itemName: 'Leica Q3 Digital Camera',
        itemDescription: 'Full-frame compact camera, fixed 28mm f/1.7 lens.',
        itemCategory: 'Electronics',
        originalCost: 5995.00,
        replacementCostValueRCV: 6195.00,
        purchaseDate: '2023-08-20',
        brand: 'Leica',
        model: 'Q3',
        serialNumber: '5829103',
        condition: 'Like New',
        linkedProofs: [],
        createdAt: '2024-02-15',
        createdBy: 'User',
        lastKnownLocation: 'Bedroom Closet'
    },
];

const INITIAL_STATE: AppState = {
    inventory: INITIAL_INVENTORY,
    policies: [DEFAULT_POLICY],
    unlinkedProofs: [],
    accountHolder: DEFAULT_ACCOUNT_HOLDER,
    claimDetails: { 
        name: "Claim #00104761115 (Burglary)", 
        dateOfLoss: "2024-11-27", 
        incidentType: "Burglary", 
        location: "312 W 43rd St, Apt 14J, New York, NY 10036", 
        policeReport: "NYPD: 2024-018-012043", 
        propertyDamageDetails: "Burglary occurred on Nov 27, 2024. Premises entered via forced entry. Apartment ransacked. Major high-value items (electronics, luxury goods) missing. Police report filed.", 
        claimDateRange: { startDate: "2024-11-27", endDate: "2024-11-28" }, 
        fairRentalValuePerDay: 350,
        aleProofs: [], 
        claimDocuments: [], 
    },
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
        case 'UPDATE_CLAIM_DETAILS': return { ...state, claimDetails: { ...state.claimDetails, ...action.payload } };
        case 'ADD_CLAIM_DOCUMENT': return { ...state, claimDetails: { ...state.claimDetails, claimDocuments: [...(state.claimDetails.claimDocuments || []), action.payload] }, unlinkedProofs: [...state.unlinkedProofs, action.payload] };
        case 'ADD_PROOFS_TO_ITEM': return { ...state, inventory: state.inventory.map(item => item.id === action.payload.itemId ? { ...item, linkedProofs: [...item.linkedProofs, ...action.payload.proofs] } : item) };
        case 'SET_VIEW': return { ...state, currentView: action.payload };
        case 'SELECT_ITEM': return { ...state, selectedItemId: action.payload, currentView: 'item-detail' };
        case 'UNSELECT_ITEM': return { ...state, selectedItemId: null, currentView: 'dashboard' };
        case 'FINALIZE_INTERACTIVE_PROCESSING': {
            const approved = action.payload.filter(inf => inf.userSelection === 'approved');
            let newInventory = [...state.inventory];
            let newClaimDetails = { ...state.claimDetails };

            approved.forEach((inference, i) => {
                const finalProof: Proof = { ...inference.proof, notes: inference.notes, owner: inference.owner };
                if (inference.analysisType === 'NEW_ITEM') {
                    const synthItem = inference.synthesizedItem || {};
                    newInventory.push({ id: `item-final-${Date.now()}-${i}`, status: 'needs-review', itemName: synthItem.itemName || 'Untitled Item', itemDescription: synthItem.itemDescription || 'No description provided.', itemCategory: synthItem.itemCategory || 'Other', originalCost: synthItem.originalCost || 0, purchaseDate: synthItem.purchaseDate, isGift: synthItem.isGift, giftedBy: synthItem.giftedBy, linkedProofs: [finalProof], createdAt: new Date().toISOString(), createdBy: 'AI Interactive' });
                } else if (inference.analysisType === 'EXISTING_ITEM_MATCH' && inference.matchedItemId) {
                    newInventory = newInventory.map(item => item.id === inference.matchedItemId ? { ...item, linkedProofs: [...item.linkedProofs, finalProof] } : item);
                } else if (inference.analysisType === 'ALE_EXPENSE' && inference.aleDetails) {
                    newClaimDetails.aleProofs = [...(newClaimDetails.aleProofs || []), { ...finalProof, purpose: 'Supporting Document', costType: inference.aleDetails.costType, estimatedValue: inference.aleDetails.amount, summary: `${inference.aleDetails.vendor} - $${inference.aleDetails.amount.toFixed(2)} on ${inference.aleDetails.date}` }];
                }
            });
            return { ...state, inventory: newInventory, claimDetails: newClaimDetails };
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
