import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContextType, FinanceContextData, Transaction, Account, Category, Invoice, CreditCard, Budget, FinancialGoal, UIDensity } from '@/types/finance';
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
    uiDensity: UIDensity;
}

interface FinanceState {
    currentContext: ContextType;
    personalData: FinanceContextData;
    businessData: FinanceContextData;
    settings: Settings;
    isLoading: boolean;
    referenceMonth: string;
    viewMonth: string;
    lastUpdatedAt: string;
    isHydrated: boolean;

    // Auth
    session: any | null;
    user: any | null;
    isAuthenticated: boolean;
    authLoading: boolean;

    // Actions
    setContext: (context: ContextType) => void;
    setCurrency: (currency: string) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setUiDensity: (density: UIDensity) => void;
    toggleWidget: (id: string) => void;
    reorderWidgets: (startIndex: number, endIndex: number) => void;
    setReferenceMonth: (month: string) => void;
    setViewMonth: (month: string) => void;
    syncWithStorage: () => void;
    hardReset: () => void;

    // Auth Actions
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    setSession: (session: any) => void;

    // Data Actions
    addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
    updateTransaction: (id: string, transaction: Partial<Transaction>, scope?: 'all' | 'single' | 'future', refMonth?: string) => void;
    deleteTransaction: (id: string, scope?: 'all' | 'single', refMonth?: string) => void;
    addAccount: (account: Omit<Account, 'id' | 'currentBalance' | 'predictedBalance'>) => void;
    updateAccount: (id: string, account: Partial<Account>) => void;
    deleteAccount: (id: string) => void;
    addCreditCard: (card: Omit<CreditCard, 'id' | 'limitAvailable' | 'status'>) => void;
    updateCreditCard: (id: string, card: Partial<CreditCard>) => void;
    deleteCreditCard: (id: string) => void;
    addCategory: (category: Omit<Category, 'id'>) => void;
    updateCategory: (id: string, category: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
    recalculateBalances: () => void;
    addBudget: (budget: any) => void;
    updateBudget: (id: string, budget: any) => void;
    deleteBudget: (id: string) => void;
    addGoal: (goal: any) => void;
    updateGoal: (id: string, goal: Partial<FinancialGoal>) => void;
    deleteGoal: (id: string) => void;
    importVercelBackup: (data: any) => void;
    experimental_recoverData: () => Promise<boolean>;
    pushToCloud: () => Promise<{ success: boolean; error: any }>;
    pullFromCloud: () => Promise<{ success: boolean; error: any }>;
    updateLastUpdate: () => void;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'proj_30', label: 'Projeção 30 dias', visible: true },
    { id: 'chart_flow', label: 'Fluxo Financeiro do Mês', visible: true },
    { id: 'chart_categories', label: 'Distribuição por Categoria', visible: true },
    { id: 'summary_balance', label: 'Balanço do Mês (Lateral)', visible: true },
    { id: 'intelligence', label: 'Inteligência NexFinance', visible: true },
    { id: 'recurring', label: 'Compromissos Recorrentes', visible: true },
    { id: 'predictions', label: 'Previsão de Saldo Futuro', visible: true },
    { id: 'upcoming', label: 'Próximos vencimentos', visible: true },
    { id: 'goals', label: 'Objetivos', visible: true },
    { id: 'orcamento', label: 'Orçamento por Categoria', visible: true },
    { id: 'alertas', label: 'Alertas do Sistema', visible: true },
];

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

export const useFinanceStore = create<FinanceState>()(
    persist(
        (set, get) => ({
            currentContext: 'personal',
            personalData: emptyContext(),
            businessData: emptyContext(),
            settings: {
                currency: 'EUR',
                language: 'pt-PT',
                theme: 'light',
                dashboardWidgets: DEFAULT_WIDGETS,
                uiDensity: typeof window !== 'undefined' && window.innerWidth < 768 ? 'comfortable' : 'compact',
            },
            isLoading: false,
            referenceMonth: FinancialEngine.getLisbonDate('month'),
            viewMonth: FinancialEngine.getLisbonDate('month'),
            lastUpdatedAt: new Date().toISOString(),
            isHydrated: false,

            // Auth Initial State
            session: null,
            user: null,
            isAuthenticated: false,
            authLoading: true,

            setContext: (context) => set({ currentContext: context }),
            setCurrency: (currency) => set((state) => ({ settings: { ...state.settings, currency }, lastUpdatedAt: new Date().toISOString() })),
            setTheme: (theme) => {
                set((state) => ({ settings: { ...state.settings, theme }, lastUpdatedAt: new Date().toISOString() }));
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
            },
            setUiDensity: (density) => {
                set((state) => ({ settings: { ...state.settings, uiDensity: density }, lastUpdatedAt: new Date().toISOString() }));
                document.documentElement.setAttribute('data-ui-density', density);
            },

            toggleWidget: (id) => set((state) => {
                const prevWidgets = state.settings.dashboardWidgets || DEFAULT_WIDGETS;

                // Aggressive Sync: Ensure all DEFAULT widgets exist in the current list
                let currentWidgets = [...prevWidgets];
                DEFAULT_WIDGETS.forEach(def => {
                    if (!currentWidgets.some(w => w.id === def.id)) {
                        currentWidgets.push(def);
                    }
                });

                const updatedWidgets = currentWidgets.map(w =>
                    w.id === id ? { ...w, visible: !w.visible } : w
                );

                return {
                    settings: {
                        ...state.settings,
                        dashboardWidgets: updatedWidgets
                    },
                    lastUpdatedAt: new Date().toISOString()
                };
            }),

            reorderWidgets: (startIndex, endIndex) => set((state) => {
                const widgets = [...(state.settings.dashboardWidgets || DEFAULT_WIDGETS)];
                const [removed] = widgets.splice(startIndex, 1);
                widgets.splice(endIndex, 0, removed);
                return { settings: { ...state.settings, dashboardWidgets: widgets }, lastUpdatedAt: new Date().toISOString() };
            }),

            setReferenceMonth: (month) => set({ referenceMonth: month }),
            setViewMonth: (month) => set({ viewMonth: month }),

            syncWithStorage: () => {
                // This is a placeholder for when storage event triggers - Zustand persist handles most of it
                console.log("STORE: Syncing with storage...");
            },

            hardReset: () => set({
                personalData: emptyContext(),
                businessData: emptyContext(),
                settings: {
                    currency: 'EUR',
                    language: 'pt-PT',
                    theme: 'light',
                    dashboardWidgets: DEFAULT_WIDGETS,
                    uiDensity: typeof window !== 'undefined' && window.innerWidth < 768 ? 'comfortable' : 'compact',
                }
            }),

            // Auth Actions
            signIn: async (email, pass) => {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (data.session) {
                    set({ session: data.session, user: data.user, isAuthenticated: true, authLoading: false });
                }
                return { error };
            },
            signUp: async (email, pass) => {
                const { data, error } = await supabase.auth.signUp({ email, password: pass });
                return { error };
            },
            signOut: async () => {
                await supabase.auth.signOut();
                set({ session: null, user: null, isAuthenticated: false });
            },
            setSession: (session) => set({
                session,
                user: session?.user || null,
                isAuthenticated: !!session,
                authLoading: false
            }),

            // Simplified Data Actions for brevity
            addTransaction: (transaction) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newTransaction = { ...transaction, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() } as Transaction;
                const { updatedAccounts, updatedCards, updatedInvoices } = FinancialEngine.applyTransactionImpact(
                    newTransaction, state[key].accounts, state[key].creditCards, state[key].invoices
                );
                const newState = {
                    [key]: {
                        ...state[key],
                        transactions: [newTransaction, ...state[key].transactions],
                        accounts: updatedAccounts,
                        creditCards: updatedCards,
                        invoices: updatedInvoices
                    },
                    lastUpdatedAt: new Date().toISOString()
                };
                return newState;
            }),

            updateTransaction: (id, updated, scope = 'all', refMonth) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const currentData = state[key];
                const originalIndex = currentData.transactions.findIndex(t => t.id === id);
                if (originalIndex === -1) return state;

                const original = currentData.transactions[originalIndex];
                let updatedTransactions = [...currentData.transactions];

                if (scope === 'single' && refMonth) {
                    // 1. Mark month as excluded in original
                    const updatedOriginal = {
                        ...original,
                        recurrence: {
                            ...original.recurrence!,
                            excludedDates: [...(original.recurrence?.excludedDates || []), refMonth]
                        }
                    };
                    updatedTransactions[originalIndex] = updatedOriginal;

                    // 2. Create a new point instance for this month
                    const currentDay = original.date.split('-')[2] || '01';
                    const newInstance: Transaction = {
                        ...original,
                        ...updated,
                        id: Math.random().toString(36).substr(2, 9),
                        date: `${refMonth}-${currentDay}`,
                        isFixed: false,
                        isRecurring: false,
                        recurrence: undefined,
                        createdAt: new Date().toISOString()
                    };
                    updatedTransactions.unshift(newInstance);
                }
                else if (scope === 'future' && refMonth) {
                    // Logic: "O que passou, passou". Scale back original and start new from here.

                    // 1. End original in the previous month
                    const [year, month] = refMonth.split('-').map(Number);
                    const prevDate = new Date(year, month - 2, 1); // JS months are 0-indexed, month-1 is current, month-2 is prev
                    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

                    const updatedOriginal = {
                        ...original,
                        recurrence: {
                            ...original.recurrence!,
                            endDate: prevMonthStr
                        }
                    };
                    updatedTransactions[originalIndex] = updatedOriginal;

                    // 2. Start a new series from refMonth
                    const currentDay = original.date.split('-')[2] || '01';
                    const newSeries: Transaction = {
                        ...original,
                        ...updated,
                        id: Math.random().toString(36).substr(2, 9),
                        date: `${refMonth}-${currentDay}`,
                        createdAt: new Date().toISOString()
                        // recurrence remains same as updated or original if not in updated
                    };
                    updatedTransactions.unshift(newSeries);
                }
                else {
                    // Standard 'all' scope
                    updatedTransactions = updatedTransactions.map(t => t.id === id ? { ...t, ...updated } : t);
                }

                return { [key]: { ...currentData, transactions: updatedTransactions }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteTransaction: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const transactions = state[key].transactions.filter(t => t.id !== id);
                return { [key]: { ...state[key], transactions }, lastUpdatedAt: new Date().toISOString() };
            }),

            addAccount: (account) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newAccount = { ...account, id: Math.random().toString(36).substr(2, 9), currentBalance: account.initialBalance, predictedBalance: account.initialBalance } as Account;
                return { [key]: { ...state[key], accounts: [...state[key].accounts, newAccount] }, lastUpdatedAt: new Date().toISOString() };
            }),

            updateAccount: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const accounts = state[key].accounts.map(a => a.id === id ? { ...a, ...updated } : a);
                return { [key]: { ...state[key], accounts }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteAccount: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const accounts = state[key].accounts.filter(a => a.id !== id);
                return { [key]: { ...state[key], accounts }, lastUpdatedAt: new Date().toISOString() };
            }),

            addCreditCard: (card) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCard = { ...card, id: Math.random().toString(36).substr(2, 9), limitAvailable: card.limitTotal, status: 'active' } as CreditCard;
                return { [key]: { ...state[key], creditCards: [...state[key].creditCards, newCard] }, lastUpdatedAt: new Date().toISOString() };
            }),

            updateCreditCard: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const creditCards = state[key].creditCards.map(c => c.id === id ? { ...c, ...updated } : c);
                return { [key]: { ...state[key], creditCards }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteCreditCard: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const creditCards = state[key].creditCards.filter(c => c.id !== id);
                return { [key]: { ...state[key], creditCards }, lastUpdatedAt: new Date().toISOString() };
            }),

            addCategory: (category) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCategory = { ...category, id: Math.random().toString(36).substr(2, 9) } as Category;
                return { [key]: { ...state[key], categories: [...state[key].categories, newCategory] }, lastUpdatedAt: new Date().toISOString() };
            }),

            updateCategory: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const categories = state[key].categories.map(c => c.id === id ? { ...c, ...updated } : c);
                return { [key]: { ...state[key], categories }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteCategory: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const categories = state[key].categories.filter(c => c.id !== id);
                return { [key]: { ...state[key], categories }, lastUpdatedAt: new Date().toISOString() };
            }),

            recalculateBalances: () => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const { rebuiltAccounts, rebuiltCards, rebuiltInvoices } = FinancialEngine.rebuildBalances(
                    state[key].transactions, state[key].accounts, state[key].creditCards, state[key].invoices
                );
                return { [key]: { ...state[key], accounts: rebuiltAccounts, creditCards: rebuiltCards, invoices: rebuiltInvoices }, lastUpdatedAt: new Date().toISOString() };
            }),

            addBudget: (budget) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newBudget = { ...budget, id: Math.random().toString(36).substr(2, 9) };
                return { [key]: { ...state[key], budgets: [...state[key].budgets, newBudget] }, lastUpdatedAt: new Date().toISOString() };
            }),

            updateBudget: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const budgets = state[key].budgets.map(b => b.id === id ? { ...b, ...updated } : b);
                return { [key]: { ...state[key], budgets }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteBudget: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const budgets = state[key].budgets.filter(b => b.id !== id);
                return { [key]: { ...state[key], budgets }, lastUpdatedAt: new Date().toISOString() };
            }),

            addGoal: (goal) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newGoal = { ...goal, id: Math.random().toString(36).substr(2, 9) } as FinancialGoal;
                return { [key]: { ...state[key], goals: [...state[key].goals, newGoal] }, lastUpdatedAt: new Date().toISOString() };
            }),

            updateGoal: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const goals = state[key].goals.map(g => g.id === id ? { ...g, ...updated } : g);
                return { [key]: { ...state[key], goals }, lastUpdatedAt: new Date().toISOString() };
            }),

            deleteGoal: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const goals = state[key].goals.filter(g => g.id !== id);
                return { [key]: { ...state[key], goals }, lastUpdatedAt: new Date().toISOString() };
            }),

            importVercelBackup: (data) => {
                if (!data) return;
                set((state) => ({
                    ...state,
                    personalData: data.personalData || state.personalData,
                    businessData: data.businessData || state.businessData,
                    settings: { ...state.settings, ...data.settings }
                }));
            },

            experimental_recoverData: async () => {
                const oldKeys = ['finance-storage', 'nexfinance-data', 'zustand-finance', 'nexfinance-v1'];
                let recovered = false;

                oldKeys.forEach(key => {
                    const oldData = localStorage.getItem(key);
                    if (oldData) {
                        try {
                            const parsed = JSON.parse(oldData);
                            const state = parsed.state || parsed;
                            if (state.personalData?.transactions?.length > 0) {
                                set({
                                    personalData: state.personalData,
                                    businessData: state.businessData || state.businessData,
                                    settings: { ...get().settings, ...state.settings }
                                });
                                recovered = true;
                                console.log(`RECOVERY: Found and restored data from ${key}`);
                            }
                        } catch (e) {
                            console.error(`RECOVERY: Failed to parse ${key}`);
                        }
                    }
                });
                return recovered;
            },

            pushToCloud: async () => {
                const state = get();
                if (!state.session?.user) return { success: false, error: 'Not authenticated' };

                const payload = {
                    currentContext: state.currentContext,
                    personalData: state.personalData,
                    businessData: state.businessData,
                    settings: state.settings,
                    referenceMonth: state.referenceMonth,
                    viewMonth: state.viewMonth
                };

                const { error } = await supabase.from('user_sync').upsert({
                    user_id: state.session.user.id,
                    state: payload,
                    updated_at: new Date().toISOString()
                });

                return { success: !error, error };
            },

            pullFromCloud: async () => {
                const state = get();
                if (!state.session?.user) return { success: false, error: 'Not authenticated' };

                const { data, error } = await supabase.from('user_sync').select('state').eq('user_id', state.session.user.id).single();

                if (data?.state) {
                    set(data.state);
                    return { success: true, error: null };
                }

                return { success: false, error: error || 'No data found' };
            },

            updateLastUpdate: () => set({ lastUpdatedAt: new Date().toISOString() })
        }),
        {
            name: 'nexfinance-storage',
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    if (persistedState?.settings && !persistedState.settings.dashboardWidgets) {
                        persistedState.settings.dashboardWidgets = DEFAULT_WIDGETS;
                    }
                }
                return persistedState;
            },
            version: 1
        }
    )
);

export const useCurrentData = () => {
    const { currentContext, personalData, businessData } = useFinanceStore();
    return currentContext === 'personal' ? personalData : businessData;
};

export const getVisibleTransactions = (transactions: Transaction[], filters: {
    viewMonth: string;
    searchTerm: string;
    type: 'income' | 'expense' | 'all';
    showIgnored: boolean;
}) => {
    const { viewMonth, searchTerm, type, showIgnored } = filters;
    const filtered = transactions.filter(t => {
        if (!FinancialEngine.isTransactionInMonth(t, viewMonth)) return false;
        if (type !== 'all' && t.type !== type) return false;
        if (!showIgnored && t.isIgnored) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const contextTransactions = transactions.filter(t =>
        FinancialEngine.isTransactionInMonth(t, viewMonth) &&
        (type === 'all' || t.type === type)
    );

    const hiddenCount = contextTransactions.filter(t => t.isIgnored && !showIgnored).length;
    const hiddenValue = contextTransactions.filter(t => t.isIgnored && !showIgnored).reduce((sum, t) => sum + t.value, 0);

    return { transactions: filtered, hiddenCount, hiddenValue };
};

// Cloud & Realtime Logic
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'nexfinance-storage') {
            useFinanceStore.getState().syncWithStorage();
        }
    });

    // --- AUTO SYNC LOGIC ---
    let syncTimeout: any = null;

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            console.log("SYNC: User identified, checking cloud state...");
            const { data } = await supabase.from('user_sync').select('state').eq('user_id', session.user.id).single();

            const currentState = useFinanceStore.getState();
            if (data?.state) {
                // Determine which state is newer
                const cloudDate = new Date(data.state.lastUpdatedAt || 0);
                const localDate = new Date(currentState.lastUpdatedAt || 0);

                if (cloudDate > localDate || (currentState.personalData.transactions.length === 0 && data.state.personalData.transactions.length > 0)) {
                    console.log("SYNC: Cloud is newer or local is empty. Restoring cloud state.");
                    useFinanceStore.setState({ ...data.state, session, user: session.user, isHydrated: true });
                } else {
                    console.log("SYNC: Local is newer or same as cloud. Keeping local.");
                    useFinanceStore.setState({ isHydrated: true });
                }
            } else {
                console.log("SYNC: No cloud data found. Starting fresh or with local data.");
                useFinanceStore.setState({ isHydrated: true });
            }
        } else {
            useFinanceStore.setState({ isHydrated: false });
        }
    });

    useFinanceStore.subscribe((state, prevState) => {
        // Only sync if logged in and hydrated (to avoid pushing empty states during boot)
        if (state.session?.user && state.isHydrated) {
            // Check if actual data changed (ignoring meta fields)
            const dataChanged =
                JSON.stringify(state.personalData) !== JSON.stringify(prevState.personalData) ||
                JSON.stringify(state.businessData) !== JSON.stringify(prevState.businessData) ||
                JSON.stringify(state.settings) !== JSON.stringify(prevState.settings);

            if (dataChanged) {
                if (syncTimeout) clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    console.log("SYNC: Auto-pushing changes to cloud...");
                    const payload = {
                        currentContext: state.currentContext,
                        personalData: state.personalData,
                        businessData: state.businessData,
                        settings: state.settings,
                        referenceMonth: state.referenceMonth,
                        viewMonth: state.viewMonth,
                        lastUpdatedAt: new Date().toISOString()
                    };

                    supabase.from('user_sync').upsert({
                        user_id: state.session.user.id,
                        state: payload,
                        updated_at: new Date().toISOString()
                    }).then(({ error }) => {
                        if (error) console.error("SYNC: Failed to push changes", error);
                        else console.log("SYNC: Changes saved to cloud.");
                    });
                }, 2000); // 2 second debounce
            }
        }
    });
}
