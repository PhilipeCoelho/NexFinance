import { Transaction, Account, CreditCard, Invoice, LedgerEntry, CashflowTimelineEntry } from '@/types/finance';

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

    /**
     * Gera um Ledger (Livro Razão) imutável com o histórico de saldo progressivo.
     * Útil para auditoria.
     */
    static generateLedger(
        transactions: Transaction[],
        accounts: Account[]
    ): LedgerEntry[] {
        const ledger: LedgerEntry[] = [];

        // Inicializa saldos progressivos baseado no initialBalance
        const runningBalances: Record<string, number> = {};
        accounts.forEach(acc => {
            runningBalances[acc.id] = acc.initialBalance || 0;
        });

        // Transações confirmadas, em ordem cronológica
        const confirmedTxs = transactions
            .filter(t => t.status === 'confirmed' && t.accountId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const t of confirmedTxs) {
            const val = Number(t.value) || 0;

            if (t.type === 'transfer' && t.accountId && t.toAccountId) {
                // Saída
                runningBalances[t.accountId] -= val;
                ledger.push({
                    id: `${t.id}-out`,
                    transactionId: t.id,
                    accountId: t.accountId,
                    date: t.date,
                    type: 'transfer_out',
                    value: -val,
                    balanceAfter: runningBalances[t.accountId],
                    description: `Transferência enviada: ${t.description}`,
                    timestamp: t.createdAt
                });

                // Entrada
                runningBalances[t.toAccountId] += val;
                ledger.push({
                    id: `${t.id}-in`,
                    transactionId: t.id,
                    accountId: t.toAccountId,
                    date: t.date,
                    type: 'transfer_in',
                    value: val,
                    balanceAfter: runningBalances[t.toAccountId],
                    description: `Transferência recebida: ${t.description}`,
                    timestamp: t.createdAt
                });
            } else if (t.accountId) {
                const modifier = t.type === 'income' ? 1 : -1;
                const impact = val * modifier;
                runningBalances[t.accountId] += impact;

                ledger.push({
                    id: t.id,
                    transactionId: t.id,
                    accountId: t.accountId,
                    date: t.date,
                    type: t.type as 'income' | 'expense',
                    value: impact,
                    balanceAfter: runningBalances[t.accountId],
                    description: t.description,
                    timestamp: t.createdAt
                });
            }
        }

        return ledger;
    }

    /**
     * Gera a Timeline de Fluxo de Caixa (projeção no tempo)
     */
    static generateCashflowTimeline(
        transactions: Transaction[],
        currentLiquidBalance: number,
        settings?: { referenceMonth?: string }
    ): CashflowTimelineEntry[] {
        const timeline: CashflowTimelineEntry[] = [];
        let runningBalance = currentLiquidBalance;

        // Pegamos apenas transações futuras ou pendentes (não confirmadas)
        // Se quisermos apenas olhar do momento atual pra frente:
        const forecastTxs = transactions
            .filter(t => {
                const effStatus = this.getEffectiveTransactionStatus(t, settings?.referenceMonth || new Date().toISOString().slice(0, 7));
                return effStatus === 'forecast' && !t.isIgnored;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const t of forecastTxs) {
            const val = Number(t.value) || 0;
            let impact = 0;

            if (t.type === 'income') impact = val;
            if (t.type === 'expense') impact = -val;
            if (t.type === 'transfer') impact = 0; // Transações entre próprias contas não alteram a liquidez total

            // Se for cartão de crédito e cair como expense, diminui a liquidez
            if (impact !== 0 || t.type !== 'transfer') {
                runningBalance += impact;
                timeline.push({
                    date: t.date,
                    transactionId: t.id,
                    description: t.description,
                    type: t.type,
                    value: impact,
                    balanceAfter: runningBalance,
                    status: 'forecast'
                });
            }
        }

        return timeline;
    }

    /**
     * Roda uma simulação financeira em memória
     * @param currentStateData Os dados atuais do usuário
     * @param simulatedTransactions Lista de novas transações hipotéticas sendo testadas
     * @returns A CashflowTimeline apenas daquele cenário
     */
    static simulateScenario(
        currentTransactions: Transaction[],
        simulatedTransactions: Transaction[],
        currentLiquidBalance: number,
        referenceMonth: string
    ): CashflowTimelineEntry[] {
        // Junta o real com as ideias simuladas (que terão status 'forecast' por natureza do teste)
        const combinedTransactions = [...currentTransactions, ...simulatedTransactions];

        return this.generateCashflowTimeline(combinedTransactions, currentLiquidBalance, { referenceMonth });
    }
}
