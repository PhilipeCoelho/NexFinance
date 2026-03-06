import { Transaction, Account, CreditCard, Invoice } from '@/types/finance';

export class FinancialEngine {

    /**
     * Calcula a Liquidez Real baseada nos saldos das contas (apenas contas ativas e incluídas no total).
     */
    static calculateRealLiquidity(accounts: Account[]): number {
        return accounts
            .filter((acc) => acc.includeInTotal && acc.status === 'active')
            .reduce((sum, acc) => sum + (Number(acc.currentBalance) || 0), 0);
    }

    /**
     * Obtém o status efetivo de uma transação dado um mês de referência
     */
    static getEffectiveTransactionStatus(t: Transaction, referenceMonth: string): 'confirmed' | 'forecast' {
        if (!t.date) return 'forecast';
        // Se não for fixa nem recorrente, obedece o status original
        if (!t.isRecurring && !t.isFixed) return t.status;

        const originalMonth = t.date.slice(0, 7);
        // Para transações recorrentes/fixas, apenas a emissão original pode ser confirmada,
        // as futuras sempre são previstas ('forecast')
        if (originalMonth === referenceMonth) return t.status;

        return 'forecast';
    }

    /**
     * Aplica o impacto financeiro de uma transação confirmada aos saldos
     */
    static applyTransactionImpact(
        t: Transaction,
        accounts: Account[],
        creditCards: CreditCard[],
        invoices: Invoice[]
    ): { updatedAccounts: Account[], updatedCards: CreditCard[], updatedInvoices: Invoice[] } {
        if (t.status !== 'confirmed') {
            return { updatedAccounts: accounts, updatedCards: creditCards, updatedInvoices: invoices };
        }

        let updatedAccounts = [...accounts];
        let updatedCards = [...creditCards];
        let updatedInvoices = [...invoices];

        if (t.type === 'transfer') {
            updatedAccounts = updatedAccounts.map(acc => {
                if (acc.id === t.accountId) return { ...acc, currentBalance: acc.currentBalance - Number(t.value) };
                if (acc.id === t.toAccountId) return { ...acc, currentBalance: acc.currentBalance + Number(t.value) };
                return acc;
            });
        } else if (t.accountId) {
            updatedAccounts = updatedAccounts.map(acc => {
                if (acc.id === t.accountId) {
                    const modifier = t.type === 'income' ? 1 : -1;
                    return { ...acc, currentBalance: acc.currentBalance + (Number(t.value) * modifier) };
                }
                return acc;
            });
        } else if (t.creditCardId) {
            const monthStr = t.date.slice(0, 7);
            updatedCards = updatedCards.map(card => {
                if (card.id === t.creditCardId) return { ...card, limitAvailable: card.limitAvailable - Number(t.value) };
                return card;
            });
            const invIdx = updatedInvoices.findIndex(inv => inv.creditCardId === t.creditCardId && inv.month === monthStr);
            if (invIdx >= 0) {
                updatedInvoices[invIdx] = { ...updatedInvoices[invIdx], totalValue: updatedInvoices[invIdx].totalValue + Number(t.value) };
            } else {
                updatedInvoices.push({
                    id: Math.random().toString(36).substr(2, 9),
                    creditCardId: t.creditCardId,
                    month: monthStr,
                    status: 'open',
                    totalValue: Number(t.value),
                    dueDate: `${monthStr}-10`
                });
            }
        }

        return { updatedAccounts, updatedCards, updatedInvoices };
    }

    /**
     * Reverte o impacto financeiro de uma transação previamente confirmada
     */
    static revertTransactionImpact(
        t: Transaction,
        accounts: Account[],
        creditCards: CreditCard[],
        invoices: Invoice[]
    ): { updatedAccounts: Account[], updatedCards: CreditCard[], updatedInvoices: Invoice[] } {
        if (t.status !== 'confirmed') {
            return { updatedAccounts: accounts, updatedCards: creditCards, updatedInvoices: invoices };
        }

        let updatedAccounts = [...accounts];
        let updatedCards = [...creditCards];
        let updatedInvoices = [...invoices];

        if (t.type === 'transfer') {
            updatedAccounts = updatedAccounts.map(acc => {
                if (acc.id === t.accountId) return { ...acc, currentBalance: acc.currentBalance + Number(t.value) };
                if (acc.id === t.toAccountId) return { ...acc, currentBalance: acc.currentBalance - Number(t.value) };
                return acc;
            });
        } else if (t.accountId) {
            updatedAccounts = updatedAccounts.map(acc => {
                if (acc.id === t.accountId) {
                    const modifier = t.type === 'income' ? -1 : 1;
                    return { ...acc, currentBalance: acc.currentBalance + (Number(t.value) * modifier) };
                }
                return acc;
            });
        } else if (t.creditCardId) {
            const monthStr = t.date.slice(0, 7);
            updatedCards = updatedCards.map(card => {
                if (card.id === t.creditCardId) return { ...card, limitAvailable: card.limitAvailable + Number(t.value) };
                return card;
            });
            updatedInvoices = updatedInvoices.map(inv => {
                if (inv.creditCardId === t.creditCardId && inv.month === monthStr) return { ...inv, totalValue: Math.max(0, inv.totalValue - Number(t.value)) };
                return inv;
            });
        }

        return { updatedAccounts, updatedCards, updatedInvoices };
    }

    /**
     * Reconstrói saldos de todas as contas a partir das transações originais,
     * garantindo consistência matemática real em caso de bug de acúmulo de estado.
     */
    static rebuildBalances(
        transactions: Transaction[],
        accounts: Account[],
        creditCards: CreditCard[],
        invoices: Invoice[]
    ): { rebuiltAccounts: Account[], rebuiltCards: CreditCard[], rebuiltInvoices: Invoice[] } {
        let rebuiltAccounts = accounts.map(acc => ({ ...acc, currentBalance: acc.initialBalance || 0 }));
        let rebuiltCards = creditCards.map(card => ({ ...card, limitAvailable: card.limitTotal || 0 }));
        let rebuiltInvoices = invoices.map(inv => ({ ...inv, totalValue: 0 }));

        // Filtra apenas transações efetivamente confirmadas
        const confirmedTransactions = transactions.filter(t => t.status === 'confirmed');
        // Para garantia lógica, aplicamos em ordem de data
        confirmedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const t of confirmedTransactions) {
            const res = this.applyTransactionImpact(t, rebuiltAccounts, rebuiltCards, rebuiltInvoices);
            rebuiltAccounts = res.updatedAccounts;
            rebuiltCards = res.updatedCards;
            rebuiltInvoices = res.updatedInvoices;
        }

        return { rebuiltAccounts, rebuiltCards, rebuiltInvoices };
    }
}
