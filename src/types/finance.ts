export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'confirmed' | 'forecast';
export type AccountType = 'bank' | 'cash' | 'savings' | 'digital_wallet' | 'investment';

export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'transfer';
    icon?: string;
    subcategories?: string[];
}

export interface Tag {
    id: string;
    name: string;
    color?: string;
}

export interface Account {
    id: string;
    name: string;
    institution: string;
    institutionId?: string; // For banking logo/color mapping
    type: 'checking' | 'savings' | 'investment' | 'cash' | 'other';
    initialBalance: number;
    currentBalance: number;
    predictedBalance: number;
    currency: string;
    status: 'active' | 'archived';
    color: string;
    includeInTotal: boolean;
}

export interface Invoice {
    id: string;
    creditCardId: string;
    month: string; // YYYY-MM
    status: 'open' | 'closed' | 'paid';
    totalValue: number;
    dueDate: string;
    paymentDate?: string;
    paymentAccountId?: string;
}

export interface CreditCard {
    id: string;
    name: string;
    institution?: string;
    institutionId?: string;
    limitTotal: number;
    limitAvailable: number;
    closingDay: number;
    dueDay: number;
    color?: string;
    status: 'active' | 'archived';
    linkedAccountId?: string; // Optional account to pay from
}

export interface Project {
    id: string;
    name: string;
    status: 'active' | 'completed' | 'on_hold';
    color?: string;
}

export interface CostCenter {
    id: string;
    name: string;
    status: 'active' | 'archived';
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense' | 'transfer';
    value: number;
    date: string; // Competence Date
    paymentDate?: string; // Optional actual payment date
    accountId?: string; // Origin Account
    toAccountId?: string; // For transfers
    creditCardId?: string; // If paid via credit card
    categoryId: string;
    subcategory?: string;
    projectId?: string; // Advanced: Project tracking
    costCenterId?: string; // Advanced: Cost centers
    tags: string[];
    description: string;
    notes?: string;
    status: TransactionStatus;
    reconciled: boolean; // New: Verification flag
    isFixed: boolean;
    isIgnored: boolean;
    isRecurring: boolean;
    recurrence?: {
        type: 'fixed' | 'installments' | 'recurrent';
        installmentsCount?: number;
        frequency: 'weekly' | 'monthly' | 'yearly';
        excludedDates?: string[]; // Format YYYY-MM
        endDate?: string; // Format YYYY-MM (Inclusive)
    };
    parentTransactionId?: string;
    occurrenceDate?: string; // New: Specific occurrence indicator
    attachmentUrl?: string;
    createdAt: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    limit: number;
    month: string; // YYYY-MM
    alertThreshold?: number; // % to alert (ex: 80)
}

export interface FinancialGoal {
    id: string;
    name: string;
    targetValue: number;
    currentValue: number;
    deadline: string;
    type: 'savings' | 'reduction' | 'free';
    linkedTransactions?: string[];
}

export type ContextType = 'personal' | 'business';

export interface FinanceContextData {
    transactions: Transaction[];
    accounts: Account[];
    creditCards: CreditCard[];
    invoices: Invoice[];
    categories: Category[];
    tags: Tag[];
    budgets: Budget[];
    goals: FinancialGoal[];
    projects: Project[];
    costCenters: CostCenter[];
}
