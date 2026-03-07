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

        const confirmedTransactions = transactions.filter(t => t.status === 'confirmed');
        confirmedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const t of confirmedTransactions) {
            const res = this.applyTransactionImpact(t, rebuiltAccounts, rebuiltCards, rebuiltInvoices);
            rebuiltAccounts = res.updatedAccounts;
            rebuiltCards = res.updatedCards;
            rebuiltInvoices = res.updatedInvoices;
        }

        return { rebuiltAccounts, rebuiltCards, rebuiltInvoices };
    }

    /**
     * Gera uma data de hoje no fuso horário de Lisboa no formato YYYY-MM ou YYYY-MM-DD.
     */
    static getLisbonDate(precision: 'month' | 'day' = 'day'): string {
        const d = new Date();
        // sv-SE is one of the few locales that consistently returns YYYY-MM-DD
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Europe/Lisbon',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const formatted = formatter.format(d); // "2026-03-07"

        if (precision === 'month') return formatted.slice(0, 7);
        return formatted;
    }

    /**
     * Gera um fluxo financeiro cronológico baseado na liquidez atual e transações futuras.
     */
    static generateFinancialFlow(
        transactions: Transaction[],
        accounts: Account[],
        horizonMonths: number = 24 // Fixado em 24 meses
    ): { events: any[], riskDate: string | null } {
        const startBalance = this.calculateRealLiquidity(accounts);
        const currentMonthStr = this.getLisbonDate('month');
        const todayStr = this.getLisbonDate('day');

        const events: any[] = [];
        let runningBalance = startBalance;
        let riskDate: string | null = null;

        const startDate = new Date();
        const futureMonths: string[] = [];

        for (let i = 0; i < Math.min(horizonMonths, 60); i++) { // Max safety 5 years
            const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            futureMonths.push(`${y}-${m}`);
        }

        const allPotentialEvents: any[] = [];

        transactions.forEach(t => {
            if (!t || t.isIgnored || !t.date) return;

            futureMonths.forEach(month => {
                if (this.isTransactionInMonth(t, month)) {
                    const status = this.getEffectiveTransactionStatus(t, month);

                    if (status === 'forecast') {
                        const dateParts = t.date.split('-');
                        const rawDay = dateParts[2] || '01';
                        // Forçar sempre 2 dígitos no dia
                        const day = String(parseInt(rawDay)).padStart(2, '0');
                        const eventDate = `${month}-${day}`;

                        // Ignorar datas passadas no mês atual
                        if (month === currentMonthStr && eventDate < todayStr) {
                            return;
                        }

                        allPotentialEvents.push({
                            id: `${t.id}-${month}`,
                            originalId: t.id,
                            date: eventDate,
                            description: t.description,
                            value: Number(t.value) || 0,
                            type: t.type,
                            category: t.categoryId,
                            status: 'forecast'
                        });
                    }
                }
            });
        });

        // Ordenar cronologicamente
        allPotentialEvents.sort((a, b) => a.date.localeCompare(b.date));

        // Aplicar eventos e calcular saldo resultante
        allPotentialEvents.forEach(event => {
            const modifier = event.type === 'income' ? 1 : (event.type === 'expense' ? -1 : 0);
            runningBalance += (event.value * modifier);

            events.push({
                ...event,
                resultingBalance: runningBalance
            });

            if (runningBalance < 0 && !riskDate) {
                riskDate = event.date;
            }
        });

        return { events, riskDate };
    }

    /**
     * Verifica se uma transação (normal, fixa ou recorrente) está ativa em um mês específico.
     */
    static isTransactionInMonth(t: Transaction, monthStr: string): boolean {
        if (!t?.date || !monthStr || monthStr.length < 7) return false;

        try {
            const [refYear, refMonth] = monthStr.split('-').map(Number);
            const tDateParts = t.date.split('-');
            const tYear = parseInt(tDateParts[0]);
            const tMonth = parseInt(tDateParts[1]);

            if (isNaN(refYear) || isNaN(refMonth) || isNaN(tYear) || isNaN(tMonth)) return false;

            const diffMonths = (refYear - tYear) * 12 + (refMonth - tMonth) + 1;

            if (diffMonths <= 0) return t.date.startsWith(monthStr);
            if (t.recurrence?.excludedDates?.includes(monthStr)) return false;
            if (t.isFixed) return true;
            if (!t.isRecurring) return t.date.startsWith(monthStr);

            if (t.recurrence?.installmentsCount) {
                return diffMonths <= t.recurrence.installmentsCount;
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Calcula o saldo inicial projetado para um mês específico.
     */
    static calculateProjectedInitialBalance(
        transactions: Transaction[],
        accounts: Account[],
        targetMonth: string
    ): number {
        const currentRealLiquidity = this.calculateRealLiquidity(accounts);
        const todayMonth = this.getLisbonDate('month');

        if (targetMonth <= todayMonth) {
            return currentRealLiquidity;
        }

        let accumulatedProjection = 0;
        let currentIterMonth = todayMonth;
        let safetyCounter = 0;

        // Máximo de 120 iterações (10 anos) para evitar loop infinito
        while (currentIterMonth < targetMonth && safetyCounter < 120) {
            safetyCounter++;
            const monthlyTxs = transactions.filter(t => this.isTransactionInMonth(t, currentIterMonth));

            const monthlyPendingIncome = monthlyTxs
                .filter(t => t.type === 'income' && !t.isIgnored && this.getEffectiveTransactionStatus(t, currentIterMonth) === 'forecast')
                .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

            const monthlyPendingExpense = monthlyTxs
                .filter(t => t.type === 'expense' && !t.isIgnored && this.getEffectiveTransactionStatus(t, currentIterMonth) === 'forecast')
                .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

            accumulatedProjection += (monthlyPendingIncome - monthlyPendingExpense);

            let parts = currentIterMonth.split('-').map(Number);
            let y = parts[0];
            let m = parts[1];

            if (isNaN(y) || isNaN(m)) break; // Crash prevent

            m += 1;
            if (m > 12) {
                m = 1;
                y += 1;
            }
            currentIterMonth = `${y}-${m.toString().padStart(2, '0')}`;
        }

        return currentRealLiquidity + accumulatedProjection;
    }
}
