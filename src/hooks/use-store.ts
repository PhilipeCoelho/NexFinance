import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContextType, FinanceContextData, Transaction, Account, Category, Invoice, CreditCard } from '@/types/finance';
import { FinancialEngine } from '@/lib/FinancialEngine';
import { supabase } from '@/services/supabase';

interface DashboardWidget {
    id: string;
    label: string;
    visible: boolean;
}

interface Settings {
    currency: string;
    language: string;
    theme: 'light' | 'dark';
    dashboardWidgets: DashboardWidget[];
}

interface FinanceState {
    currentContext: ContextType;
    personalData: FinanceContextData;
    businessData: FinanceContextData;
    settings: Settings;
    isLoading: boolean;
    referenceMonth: string;
    viewMonth: string;

    // Auth
    session: any | null;
    user: any | null;
    isAuthenticated: boolean;
    authLoading: boolean;

    // Actions
    setContext: (context: ContextType) => void;
    setCurrency: (currency: string) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleWidget: (id: string) => void;
    reorderWidgets: (startIndex: number, endIndex: number) => void;
    setReferenceMonth: (month: string) => void;
    setViewMonth: (month: string) => void;
    syncWithStorage: () => void;
    hardReset: () => void;
    importVercelBackup: (data: any) => void;

    // Auth Actions
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    setSession: (session: any) => void;

    // ... (rest of actions)

    // Transactions
    addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
    updateTransaction: (id: string, transaction: Partial<Transaction>, scope?: 'all' | 'single', refMonth?: string) => void;
    deleteTransaction: (id: string, scope?: 'all' | 'single', refMonth?: string) => void;

    // Accounts
    addAccount: (account: Omit<Account, 'id' | 'currentBalance' | 'predictedBalance'>) => void;
    updateAccount: (id: string, account: Partial<Account>) => void;
    deleteAccount: (id: string) => void;

    // Credit Cards
    addCreditCard: (card: Omit<CreditCard, 'id' | 'limitAvailable' | 'status'>) => void;
    updateCreditCard: (id: string, card: Partial<CreditCard>) => void;
    deleteCreditCard: (id: string) => void;

    // Categories
    addCategory: (category: Omit<Category, 'id'>) => void;
    updateCategory: (id: string, category: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
    recalculateBalances: () => void;
}

const emptyContext = (): FinanceContextData => ({
    transactions: [],
    accounts: [],
    categories: [
        { id: 'cat-1', name: 'Salário', type: 'income' },
        { id: 'cat-2', name: 'Vendas', type: 'income' },
        { id: 'cat-3', name: 'Alimentação', type: 'expense' },
        { id: 'cat-4', name: 'Habitação', type: 'expense' },
        { id: 'cat-5', name: 'Transporte', type: 'expense' },
        { id: 'cat-6', name: 'Lazer', type: 'expense' },
        { id: 'cat-7', name: 'Transferência', type: 'transfer' } as Category
    ],
    creditCards: [],
    invoices: [],
    tags: [],
    budgets: [],
    goals: [],
    projects: [],
    costCenters: []
});

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'proj_30', label: 'Projeção 30 dias', visible: true },
    { id: 'upcoming', label: 'Próximos vencimentos', visible: true },
    { id: 'pending', label: 'Despesas pendentes', visible: true },
    { id: 'accounts', label: 'Contas', visible: true },
    { id: 'cards', label: 'Cartões de crédito', visible: true },
    { id: 'categories', label: 'Despesas por categoria', visible: true },
    { id: 'planning', label: 'Planejamento mensal', visible: true },
    { id: 'balance', label: 'Balanço mensal', visible: true },
    { id: 'frequency', label: 'Frequência de gastos', visible: true },
    { id: 'savings', label: 'Economia mensal', visible: true },
    { id: 'goals', label: 'Objetivos', visible: true },
];

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set) => ({
            currentContext: 'personal',
            personalData: emptyContext(),
            businessData: emptyContext(),
            settings: {
                currency: 'EUR',
                language: 'pt-PT',
                theme: 'light',
                dashboardWidgets: DEFAULT_WIDGETS,
            },
            referenceMonth: new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().slice(0, 7),
            viewMonth: new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().slice(0, 7),

            isLoading: false,
            // Auth Initial State
            session: null,
            user: null,
            isAuthenticated: false,
            authLoading: true,

            setContext: (context) => set({ currentContext: context }),

            setCurrency: (currency) => set((state) => ({
                settings: { ...state.settings, currency }
            })),

            setTheme: (theme) => {
                set((state) => ({
                    settings: { ...state.settings, theme }
                }));
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
            },

            setReferenceMonth: (month) => set({ referenceMonth: month }),
            setViewMonth: (month) => set({ viewMonth: month }),

            // Auth Implementations
            setSession: (session) => {
                console.log("AUTH: Session update", !!session);
                set({
                    session,
                    user: session?.user || null,
                    isAuthenticated: !!session,
                    authLoading: false
                });
            },

            signIn: async (email, password) => {
                console.log("AUTH: Attempting Sign In...");
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) {
                        console.error("AUTH: Sign In Error", error);
                        return { error };
                    }
                    if (data.session) {
                        set({
                            session: data.session,
                            user: data.session.user,
                            isAuthenticated: true
                        });
                    }
                    return { error: null };
                } catch (e: any) {
                    console.error("AUTH: Critical Catch", e);
                    return { error: e };
                }
            },

            signUp: async (email, password) => {
                console.log("AUTH: Attempting Sign Up...");
                try {
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error) {
                        console.error("AUTH: Sign Up Error", error);
                        return { error };
                    }
                    if (data.session) {
                        set({
                            session: data.session,
                            user: data.session.user,
                            isAuthenticated: true
                        });
                    }
                    return { error: null };
                } catch (e: any) {
                    console.error("AUTH: Critical Catch", e);
                    return { error: e };
                }
            },

            signOut: async () => {
                await supabase.auth.signOut();
                set({ session: null, user: null, isAuthenticated: false });
            },

            hardReset: () => {
                if (confirm("Isto irá apagar todos os dados locais e recarregar os dados originais da produção. Continuar?")) {
                    localStorage.removeItem('nexfinance-user-data');
                    window.location.reload();
                }
            },

            importVercelBackup: (data: any) => {
                if (data.personal && data.business) {
                    set({
                        personalData: data.personal,
                        businessData: data.business
                    });
                    alert("Dados do Vercel importados com sucesso! O sistema vai recarregar para aplicar.");
                    setTimeout(() => window.location.reload(), 300);
                }
            },

            syncWithStorage: () => {
                const storage = localStorage.getItem('nexfinance-user-data');
                if (storage) {
                    try {
                        const parsed = JSON.parse(storage);
                        if (parsed.state) {
                            set(parsed.state);
                            console.log("STORE: Synced from localStorage (Other Tab)");
                        }
                    } catch (e) {
                        console.error("STORE: Failed to sync from storage", e);
                    }
                }
            },

            toggleWidget: (id) => set((state) => ({
                settings: {
                    ...state.settings,
                    dashboardWidgets: (state.settings.dashboardWidgets || DEFAULT_WIDGETS).map(w =>
                        w.id === id ? { ...w, visible: !w.visible } : w
                    )
                }
            })),

            reorderWidgets: (startIndex, endIndex) => set((state) => {
                const widgets = [...(state.settings.dashboardWidgets || DEFAULT_WIDGETS)];
                const [removed] = widgets.splice(startIndex, 1);
                widgets.splice(endIndex, 0, removed);
                return {
                    settings: {
                        ...state.settings,
                        dashboardWidgets: widgets
                    }
                };
            }),

            addTransaction: (transaction) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const data = state[key];

                const newId = Math.random().toString(36).substr(2, 9);
                const ptDateString = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString();
                console.log("STORE: Adding new transaction:", transaction);
                const newTransaction: Transaction = {
                    ...transaction,
                    id: newId,
                    createdAt: ptDateString,
                } as Transaction;

                const { updatedAccounts, updatedCards, updatedInvoices } = FinancialEngine.applyTransactionImpact(
                    newTransaction,
                    data.accounts,
                    data.creditCards,
                    data.invoices
                );

                return {
                    [key]: {
                        ...data,
                        transactions: [newTransaction, ...data.transactions],
                        accounts: updatedAccounts,
                        creditCards: updatedCards,
                        invoices: updatedInvoices
                    }
                };
            }),

            updateTransaction: (id, updated, scope = 'all', refMonth = '') => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const data = state[key];
                const oldTransaction = data.transactions.find(t => t.id === id);
                if (!oldTransaction) return state;

                // RECURRENCE HANDLING
                // If it's a recurring transaction and we are editing only one month
                if (scope === 'single' && refMonth && (oldTransaction.isFixed || oldTransaction.isRecurring)) {
                    const updatedRecurrence = {
                        ...oldTransaction.recurrence,
                        excludedDates: [...(oldTransaction.recurrence?.excludedDates || []), refMonth]
                    };

                    const newSingleId = Math.random().toString(36).substr(2, 9);
                    const newSingle: Transaction = {
                        ...oldTransaction,
                        ...updated,
                        id: newSingleId,
                        parentTransactionId: id,
                        date: `${refMonth}-${oldTransaction.date.split('-')[2] || '01'}`,
                        isFixed: false,
                        isRecurring: false,
                        recurrence: undefined,
                        createdAt: new Date().toISOString()
                    } as Transaction;

                    const updatedTransactions = [
                        ...data.transactions.map(t => t.id === id ? { ...t, recurrence: updatedRecurrence } : t),
                        newSingle
                    ];

                    const { updatedAccounts, updatedCards, updatedInvoices } = FinancialEngine.applyTransactionImpact(
                        newSingle,
                        data.accounts,
                        data.creditCards,
                        data.invoices
                    );

                    return {
                        [key]: {
                            ...data,
                            transactions: updatedTransactions,
                            accounts: updatedAccounts,
                            creditCards: updatedCards,
                            invoices: updatedInvoices
                        }
                    };
                }

                // DEFAULT 'ALL' UPDATE
                const { updatedAccounts: acc1, updatedCards: cards1, updatedInvoices: inv1 } = FinancialEngine.revertTransactionImpact(
                    oldTransaction,
                    data.accounts,
                    data.creditCards,
                    data.invoices
                );

                const newTransaction = { ...oldTransaction, ...updated } as Transaction;
                const { updatedAccounts: finalAcc, updatedCards: finalCards, updatedInvoices: finalInv } = FinancialEngine.applyTransactionImpact(
                    newTransaction,
                    acc1,
                    cards1,
                    inv1
                );

                return {
                    [key]: {
                        ...data,
                        transactions: data.transactions.map(t => t.id === id ? newTransaction : t),
                        accounts: finalAcc,
                        creditCards: finalCards,
                        invoices: finalInv
                    }
                };
            }),

            deleteTransaction: (id, scope = 'all', refMonth = '') => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const data = state[key];
                const tToDelete = data.transactions.find(t => t.id === id);
                if (!tToDelete) return state;

                // RECURRENCE HANDLING
                if (scope === 'single' && refMonth && (tToDelete.isFixed || tToDelete.isRecurring)) {
                    const updatedRecurrence = {
                        ...tToDelete.recurrence,
                        excludedDates: [...(tToDelete.recurrence?.excludedDates || []), refMonth]
                    };
                    return {
                        [key]: {
                            ...data,
                            transactions: data.transactions.map(t => t.id === id ? { ...t, recurrence: updatedRecurrence } : t)
                        }
                    };
                }

                // DEFAULT 'ALL' DELETE (Parent + all standalone instances)
                const idsToDelete = [id, ...data.transactions.filter(t => t.parentTransactionId === id).map(t => t.id)];
                const transactionsToDelete = data.transactions.filter(t => idsToDelete.includes(t.id));

                let currentAccounts = [...data.accounts];
                let currentCards = [...data.creditCards];
                let currentInvoices = [...data.invoices];

                // Revert impact for each transaction being deleted
                transactionsToDelete.forEach(t => {
                    const { updatedAccounts, updatedCards, updatedInvoices } = FinancialEngine.revertTransactionImpact(
                        t,
                        currentAccounts,
                        currentCards,
                        currentInvoices
                    );
                    currentAccounts = updatedAccounts;
                    currentCards = updatedCards;
                    currentInvoices = updatedInvoices;
                });

                return {
                    [key]: {
                        ...data,
                        transactions: data.transactions.filter(t => !idsToDelete.includes(t.id)),
                        accounts: currentAccounts,
                        creditCards: currentCards,
                        invoices: currentInvoices
                    }
                };
            }),

            addAccount: (account) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newAccount: Account = {
                    ...account,
                    id: Math.random().toString(36).substr(2, 9),
                    currentBalance: account.initialBalance,
                    predictedBalance: account.initialBalance,
                };
                return {
                    [key]: {
                        ...state[key],
                        accounts: [...state[key].accounts, newAccount]
                    }
                };
            }),

            updateAccount: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                return {
                    [key]: {
                        ...state[key],
                        accounts: state[key].accounts.map(acc => acc.id === id ? { ...acc, ...updated } : acc)
                    }
                };
            }),

            deleteAccount: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const hasHistory = state[key].transactions.some(t => t.accountId === id || t.toAccountId === id);
                if (hasHistory) {
                    return {
                        [key]: {
                            ...state[key],
                            accounts: state[key].accounts.map(acc => acc.id === id ? { ...acc, status: 'archived' } : acc)
                        }
                    };
                }
                return {
                    [key]: {
                        ...state[key],
                        accounts: state[key].accounts.filter(acc => acc.id !== id)
                    }
                };
            }),

            // Credit Cards Actions
            addCreditCard: (card) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCard: CreditCard = {
                    ...card,
                    id: Math.random().toString(36).substr(2, 9),
                    limitAvailable: card.limitTotal,
                    status: 'active'
                };
                return {
                    [key]: {
                        ...state[key],
                        creditCards: [...state[key].creditCards, newCard]
                    }
                };
            }),

            updateCreditCard: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                return {
                    [key]: {
                        ...state[key],
                        creditCards: state[key].creditCards.map(c => c.id === id ? { ...c, ...updated } : c)
                    }
                };
            }),

            deleteCreditCard: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                // Archive if has transactions
                const hasHistory = state[key].transactions.some(t => t.creditCardId === id);
                if (hasHistory) {
                    return {
                        [key]: {
                            ...state[key],
                            creditCards: state[key].creditCards.map(c => c.id === id ? { ...c, status: 'archived' } : c)
                        }
                    };
                }
                return {
                    [key]: {
                        ...state[key],
                        creditCards: state[key].creditCards.filter(c => c.id !== id)
                    }
                };
            }),

            // Categories Actions
            addCategory: (category) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCategory: Category = {
                    ...category,
                    id: Math.random().toString(36).substr(2, 9),
                };
                return {
                    [key]: {
                        ...state[key],
                        categories: [...state[key].categories, newCategory]
                    }
                };
            }),

            updateCategory: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                return {
                    [key]: {
                        ...state[key],
                        categories: state[key].categories.map(cat => cat.id === id ? { ...cat, ...updated } : cat)
                    }
                };
            }),

            deleteCategory: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                return {
                    [key]: {
                        ...state[key],
                        categories: state[key].categories.filter(cat => cat.id !== id)
                    }
                };
            }),

            recalculateBalances: () => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const data = state[key];

                const { rebuiltAccounts, rebuiltCards, rebuiltInvoices } = FinancialEngine.rebuildBalances(
                    data.transactions,
                    data.accounts,
                    data.creditCards,
                    data.invoices
                );

                return {
                    [key]: {
                        ...data,
                        accounts: rebuiltAccounts,
                        creditCards: rebuiltCards,
                        invoices: rebuiltInvoices
                    }
                };
            }),
        }),
        { name: 'nexfinance-user-data' }
    )
);

export const useCurrentData = () => {
    const { currentContext, personalData, businessData } = useFinanceStore();
    return currentContext === 'personal' ? personalData : businessData;
};

// Add cross-tab listener and Real-time Cloud Sync
let isMigratingRemote = false;
let cloudTimeout: any;

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'nexfinance-user-data') {
            useFinanceStore.getState().syncWithStorage();
        }
    });

    // Cloud Sync Setup & Realtime Engine
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            console.log("CLOUD: User authenticated, setting up real-time sync...");

            // 1. Subscribe to Cloud Changes (Phone -> PC)
            supabase
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'user_sync', filter: `user_id=eq.${session.user.id}` },
                    (payload: any) => {
                        console.log('CLOUD: Real-time update received from another device!', payload);
                        if (payload.new && payload.new.state) {
                            isMigratingRemote = true; // Block loop
                            useFinanceStore.setState(payload.new.state);
                            setTimeout(() => { isMigratingRemote = false }, 1000);
                        }
                    }
                )
                .subscribe();

            // 2. Initial Fetch
            const { data, error } = await supabase.from('user_sync').select('state').eq('user_id', session.user.id).single();
            if (data?.state && !error) {
                console.log("CLOUD: Pulling latest backup from Supabase");
                isMigratingRemote = true;
                useFinanceStore.setState(data.state);
                setTimeout(() => { isMigratingRemote = false }, 1000);
            }
        }
    });

    useFinanceStore.subscribe((state) => {
        // Safety: Don't sync if the state is empty (prevents cleaning database.json on new browser sessions)
        if (!state.personalData?.accounts?.length && !state.personalData?.transactions?.length) {
            return;
        }

        const statePayload = {
            currentContext: state.currentContext,
            personalData: state.personalData,
            businessData: state.businessData,
            settings: state.settings,
            isLoading: state.isLoading,
            referenceMonth: state.referenceMonth,
            viewMonth: state.viewMonth
        };

        // Auto-sync to Supabase Realtime Table (PC -> Phone)
        // If the state change was triggered BY Supabase (payload incoming), we don't upload it back
        if (isMigratingRemote) return;

        if (state.session?.user) {
            if (cloudTimeout) clearTimeout(cloudTimeout);
            cloudTimeout = setTimeout(async () => {
                try {
                    const { error } = await supabase.from('user_sync').upsert({
                        user_id: state.session.user.id,
                        state: statePayload,
                        updated_at: new Date().toISOString()
                    });
                    if (error) throw error;
                    console.log('CLOUD: ✅ State successfully synced to Supabase!');
                } catch (e) {
                    console.error('CLOUD: ❌ Error syncing to Supabase:', e);
                }
            }, 3000); // 3-second debounce before sending to cloud to save database bandwidth
        }
    });
}
