import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ContextType, FinanceContextData, Transaction, Account, Category, Invoice, CreditCard, Budget, FinancialGoal } from '@/types/finance';
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

    // Auth Actions
    signIn: (email: string, pass: string) => Promise<{ error: any }>;
    signUp: (email: string, pass: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    setSession: (session: any) => void;

    // Data Actions
    addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
    updateTransaction: (id: string, transaction: Partial<Transaction>, scope?: 'all' | 'single', refMonth?: string) => void;
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
    updateGoal: (id: string, goal: any) => void;
    deleteGoal: (id: string) => void;
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
            },
            isLoading: false,
            referenceMonth: FinancialEngine.getLisbonDate('month'),
            viewMonth: FinancialEngine.getLisbonDate('month'),

            // Auth Initial State
            session: null,
            user: null,
            isAuthenticated: false,
            authLoading: true,

            setContext: (context) => set({ currentContext: context }),
            setCurrency: (currency) => set((state) => ({ settings: { ...state.settings, currency } })),
            setTheme: (theme) => {
                set((state) => ({ settings: { ...state.settings, theme } }));
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
            },

            toggleWidget: (id) => set((state) => {
                const currentWidgets = state.settings.dashboardWidgets || DEFAULT_WIDGETS;
                const widgetIndex = currentWidgets.findIndex(w => w.id === id);

                let updatedWidgets;
                if (widgetIndex !== -1) {
                    updatedWidgets = currentWidgets.map(w =>
                        w.id === id ? { ...w, visible: !w.visible } : w
                    );
                } else {
                    const defWidget = DEFAULT_WIDGETS.find(w => w.id === id);
                    if (defWidget) {
                        updatedWidgets = [...currentWidgets, { ...defWidget, visible: !defWidget.visible }];
                    } else {
                        updatedWidgets = [...currentWidgets, { id, label: id, visible: false }];
                    }
                }
                return { settings: { ...state.settings, dashboardWidgets: updatedWidgets } };
            }),

            reorderWidgets: (startIndex, endIndex) => set((state) => {
                const widgets = [...(state.settings.dashboardWidgets || DEFAULT_WIDGETS)];
                const [removed] = widgets.splice(startIndex, 1);
                widgets.splice(endIndex, 0, removed);
                return { settings: { ...state.settings, dashboardWidgets: widgets } };
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
                return {
                    [key]: {
                        ...state[key],
                        transactions: [newTransaction, ...state[key].transactions],
                        accounts: updatedAccounts,
                        creditCards: updatedCards,
                        invoices: updatedInvoices
                    }
                };
            }),

            updateTransaction: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const transactions = state[key].transactions.map(t => t.id === id ? { ...t, ...updated } : t);
                return { [key]: { ...state[key], transactions } };
            }),

            deleteTransaction: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const transactions = state[key].transactions.filter(t => t.id !== id);
                return { [key]: { ...state[key], transactions } };
            }),

            addAccount: (account) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newAccount = { ...account, id: Math.random().toString(36).substr(2, 9), currentBalance: account.initialBalance, predictedBalance: account.initialBalance } as Account;
                return { [key]: { ...state[key], accounts: [...state[key].accounts, newAccount] } };
            }),

            updateAccount: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const accounts = state[key].accounts.map(a => a.id === id ? { ...a, ...updated } : a);
                return { [key]: { ...state[key], accounts } };
            }),

            deleteAccount: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const accounts = state[key].accounts.filter(a => a.id !== id);
                return { [key]: { ...state[key], accounts } };
            }),

            addCreditCard: (card) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCard = { ...card, id: Math.random().toString(36).substr(2, 9), limitAvailable: card.limitTotal, status: 'active' } as CreditCard;
                return { [key]: { ...state[key], creditCards: [...state[key].creditCards, newCard] } };
            }),

            updateCreditCard: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const creditCards = state[key].creditCards.map(c => c.id === id ? { ...c, ...updated } : c);
                return { [key]: { ...state[key], creditCards } };
            }),

            deleteCreditCard: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const creditCards = state[key].creditCards.filter(c => c.id !== id);
                return { [key]: { ...state[key], creditCards } };
            }),

            addCategory: (category) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newCategory = { ...category, id: Math.random().toString(36).substr(2, 9) } as Category;
                return { [key]: { ...state[key], categories: [...state[key].categories, newCategory] } };
            }),

            updateCategory: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const categories = state[key].categories.map(c => c.id === id ? { ...c, ...updated } : c);
                return { [key]: { ...state[key], categories } };
            }),

            deleteCategory: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const categories = state[key].categories.filter(c => c.id !== id);
                return { [key]: { ...state[key], categories } };
            }),

            recalculateBalances: () => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const { rebuiltAccounts, rebuiltCards, rebuiltInvoices } = FinancialEngine.rebuildBalances(
                    state[key].transactions, state[key].accounts, state[key].creditCards, state[key].invoices
                );
                return { [key]: { ...state[key], accounts: rebuiltAccounts, creditCards: rebuiltCards, invoices: rebuiltInvoices } };
            }),

            addBudget: (budget) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newBudget = { ...budget, id: Math.random().toString(36).substr(2, 9) };
                return { [key]: { ...state[key], budgets: [...state[key].budgets, newBudget] } };
            }),

            updateBudget: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const budgets = state[key].budgets.map(b => b.id === id ? { ...b, ...updated } : b);
                return { [key]: { ...state[key], budgets } };
            }),

            deleteBudget: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const budgets = state[key].budgets.filter(b => b.id !== id);
                return { [key]: { ...state[key], budgets } };
            }),

            addGoal: (goal) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const newGoal = { ...goal, id: Math.random().toString(36).substr(2, 9) } as FinancialGoal;
                return { [key]: { ...state[key], goals: [...state[key].goals, newGoal] } };
            }),

            updateGoal: (id, updated) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const goals = state[key].goals.map(g => g.id === id ? { ...g, ...updated } : g);
                return { [key]: { ...state[key], goals } };
            }),

            deleteGoal: (id) => set((state) => {
                const key = state.currentContext === 'personal' ? 'personalData' : 'businessData';
                const goals = state[key].goals.filter(g => g.id !== id);
                return { [key]: { ...state[key], goals } };
            }),
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

// Cloud & Realtime Logic
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'nexfinance-storage') {
            useFinanceStore.getState().syncWithStorage();
        }
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const { data } = await supabase.from('user_sync').select('state').eq('user_id', session.user.id).single();
            if (data?.state) {
                useFinanceStore.setState(data.state);
            }
        }
    });

    useFinanceStore.subscribe((state) => {
        if (state.session?.user) {
            const statePayload = {
                currentContext: state.currentContext,
                personalData: state.personalData,
                businessData: state.businessData,
                settings: state.settings,
                referenceMonth: state.referenceMonth,
                viewMonth: state.viewMonth
            };
            supabase.from('user_sync').upsert({
                user_id: state.session.user.id,
                state: statePayload,
                updated_at: new Date().toISOString()
            }).then(({ error }) => {
                if (!error) console.log("CLOUD: Sync complete");
            });
        }
    });
}
