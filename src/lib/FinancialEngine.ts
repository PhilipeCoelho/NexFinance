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
        if (t.status !== 'confirmed' || t.isIgnored) {
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
        if (t.status !== 'confirmed' || t.isIgnored) {
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

        const confirmedTransactions = transactions.filter(t => t.status === 'confirmed' && !t.isIgnored);
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
     * Gera o fluxo detalhado de um mês específico, incluindo transações já confirmadas.
     */
    static getMonthFlow(
        transactions: Transaction[],
        accounts: Account[],
        targetMonth: string
    ) {
        const startBalance = this.calculateProjectedInitialBalance(transactions, accounts, targetMonth);
        const events: any[] = [];
        let runningBalance = startBalance;
        const todayMonth = this.getLisbonDate('month');

        const monthlyTxs = transactions.filter(t =>
            !t.isIgnored && this.isTransactionInMonth(t, targetMonth)
        );

        // Transformar transações em eventos de timeline
        const allEvents = monthlyTxs.map(t => {
            const dateParts = t.date.split('-');
            const rawDay = dateParts[2] || '01';
            const day = String(parseInt(rawDay)).padStart(2, '0');

            return {
                id: `${t.id}-${targetMonth}`,
                originalId: t.id,
                date: `${targetMonth}-${day}`,
                description: t.description,
                value: Number(t.value) || 0,
                type: t.type,
                category: t.categoryId,
                status: this.getEffectiveTransactionStatus(t, targetMonth)
            };
        });

        // Ordenar por data
        allEvents.sort((a, b) => a.date.localeCompare(b.date));

        // Calcular saldo corrido
        allEvents.forEach(evt => {
            let shouldAffectBalance = true;
            const original = transactions.find(t => t.id === evt.originalId);

            if (original) {
                // Filtro de inclusão
                if (original.accountId) {
                    const acc = accounts.find(a => a.id === original.accountId);
                    if (acc && !acc.includeInTotal) shouldAffectBalance = false;
                }

                // Mesma lógica de calculateProjectedInitialBalance:
                // No mês atual, confirmados em conta já estão no startBalance
                if (targetMonth === todayMonth && shouldAffectBalance) {
                    if (evt.status === 'confirmed' && !original.creditCardId) {
                        shouldAffectBalance = false;
                    }
                }
            }

            const modifier = evt.type === 'income' ? 1 : (evt.type === 'expense' ? -1 : 0);
            if (shouldAffectBalance) {
                runningBalance += (evt.value * modifier);
            }
            events.push({ ...evt, resultingBalance: runningBalance });
        });

        return { events, startBalance, endBalance: runningBalance };
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
                        // Incluir todos os eventos previstos ('forecast'). 
                        // Itens atrasados no mês atual também devem ser incluídos pois 
                        // ainda não afetaram o saldo real (currentRealLiquidity).
                        const dateParts = (t.date || '').split('-');
                        const rawDay = dateParts[2] || '01';
                        const day = String(parseInt(rawDay)).padStart(2, '0');
                        const eventDate = `${month}-${day}`;

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

            // Respect End Date if defined
            if (t.recurrence?.endDate && monthStr > t.recurrence.endDate) return false;

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
     * Retorna o texto da parcela (ex: 3/5) para uma transação em um mês específico.
     */
    static getInstallmentText(t: Transaction, monthStr: string): string | null {
        if (!t.isRecurring || !t.recurrence?.installmentsCount || !t.date) return null;

        const [refYear, refMonth] = monthStr.split('-').map(Number);
        const tDateParts = t.date.split('-');
        const tYear = parseInt(tDateParts[0]);
        const tMonth = parseInt(tDateParts[1]);

        if (isNaN(refYear) || isNaN(refMonth) || isNaN(tYear) || isNaN(tMonth)) return null;

        const currentInstallment = (refYear - tYear) * 12 + (refMonth - tMonth) + 1;

        if (currentInstallment < 1 || currentInstallment > t.recurrence.installmentsCount) return null;

        return `${currentInstallment}/${t.recurrence.installmentsCount}`;
    }

    /**
     * Calcula o saldo inicial projetado para um mês específico.
     *
     * Lógica correcta:
     * - A Liquidez Real (saldos das contas) já reflecte TODAS as transações confirmadas.
     * - Para o Saldo Projetado do mês actual, partimos da Liquidez Real
     *   e adicionamos apenas as transações PENDENTES (forecast) do mês.
     * - Para meses futuros, propagamos mês a mês somando TODAS as transações.
     */
    static calculateProjectedInitialBalance(
        transactions: Transaction[],
        accounts: Account[],
        targetMonth: string
    ): number {
        const currentRealLiquidity = this.calculateRealLiquidity(accounts);
        const todayMonth = this.getLisbonDate('month');

        if (targetMonth === todayMonth) {
            return currentRealLiquidity;
        }

        if (targetMonth < todayMonth) {
            return currentRealLiquidity;
        }

        // Para meses futuros: partir da liquidez real de hoje e propagar
        let runningBalance = currentRealLiquidity;
        let iterMonth = todayMonth;
        let safety = 0;

        while (iterMonth < targetMonth && safety < 120) {
            safety++;
            const monthTxs = transactions.filter(t => !t.isIgnored && this.isTransactionInMonth(t, iterMonth));

            monthTxs.forEach(t => {
                // IGNORAR se a conta não estiver no total
                if (t.accountId) {
                    const acc = accounts.find(a => a.id === t.accountId);
                    if (acc && !acc.includeInTotal) return;
                }

                const effectiveStatus = this.getEffectiveTransactionStatus(t, iterMonth);

                // No mês actual, só somamos o que ainda não afectou o saldo real (currentRealLiquidity)
                if (iterMonth === todayMonth) {
                    // Confirmados em conta já estão no saldo das contas.
                    // Confirmados em cartão OU pendentes (forecast) ainda não.
                    if (effectiveStatus === 'confirmed' && !t.creditCardId) return;
                }

                const val = Number(t.value) || 0;
                const modifier = (t.type === 'income' ? 1 : (t.type === 'expense' ? -1 : 0));
                runningBalance += (val * modifier);
            });

            let [y, m] = iterMonth.split('-').map(Number);
            m++;
            if (m > 12) { m = 1; y++; }
            iterMonth = `${y}-${String(m).padStart(2, '0')}`;
        }

        return runningBalance;
    }

    /**
     * Calcula o total gasto em uma categoria específica em um mês.
     */
    static calculateCategorySpending(transactions: Transaction[], categoryId: string, month: string): number {
        return transactions
            .filter(t => t.categoryId === categoryId && t.type === 'expense' && !t.isIgnored && this.isTransactionInMonth(t, month))
            .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    }

    /**
     * Calcula indicadores de saúde financeira para um período.
     */
    static getFinancialHealth(transactions: Transaction[], month: string) {
        const monthTxs = transactions.filter(t => !t.isIgnored && this.isTransactionInMonth(t, month));
        const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.value) || 0), 0);
        const expenses = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.value) || 0), 0);

        const savings = income - expenses;
        const savingRate = income > 0 ? (savings / income) * 100 : 0;
        const expenseRatio = income > 0 ? (expenses / income) * 100 : (expenses > 0 ? 100 : 0);

        return {
            income,
            expenses,
            savings,
            savingRate: Math.max(0, savingRate),
            expenseRatio,
            status: savingRate > 20 ? 'excellent' : savingRate > 10 ? 'good' : savingRate > 0 ? 'warning' : 'critical'
        };
    }

    /**
     * Ajusta a data de uma transação para o dia correspondente em um mês de referência.
     */
    static getAdjustedDate(date: string, referenceMonth: string): string {
        const day = date.split('-')[2] || '01';
        return `${referenceMonth}-${day.padStart(2, '0')}`;
    }

    /**
     * Detecta o primeiro momento em que o saldo projetado ficará negativo.
     */
    static getNegativeBalanceAlert(transactions: Transaction[], accounts: Account[], horizonMonths: number = 3) {
        const flow = this.generateFinancialFlow(transactions, accounts, horizonMonths);
        const riskEvent = flow.events.find(e => e.resultingBalance < 0);

        if (riskEvent) {
            return {
                hasRisk: true,
                date: riskEvent.date,
                value: riskEvent.resultingBalance,
                description: riskEvent.description
            };
        }

        return { hasRisk: false };
    }

    /**
     * Identifica despesas recorrentes relevantes baseado em padrões.
     */
    static identifyRecurringExpenses(transactions: Transaction[]) {
        const expenses = transactions.filter(t => t.type === 'expense' && !t.isIgnored);
        const recurringMap: Record<string, Transaction[]> = {};

        expenses.forEach(t => {
            const key = `${t.description.toLowerCase()}-${Math.round(Number(t.value))}`;
            if (!recurringMap[key]) recurringMap[key] = [];
            recurringMap[key].push(t);
        });

        return Object.values(recurringMap)
            .filter(group => group.length >= 2 || group[0].isFixed || group[0].isRecurring)
            .map(group => ({
                description: group[0].description,
                value: Number(group[0].value),
                frequency: group.length,
                categoryId: group[0].categoryId,
                isFixed: group[0].isFixed,
                lastDate: group.sort((a, b) => b.date.localeCompare(a.date))[0].date
            }))
            .sort((a, b) => b.value - a.value);
    }

    /**
     * Gera insights automáticos baseados na saúde financeira e comportamento de gastos.
     */
    static generateInsights(transactions: Transaction[], accounts: Account[], referenceMonth: string) {
        const insights: any[] = [];
        const health = this.getFinancialHealth(transactions, referenceMonth);

        // 1. Alerta de Saldo Negativo
        const negAlert = this.getNegativeBalanceAlert(transactions, accounts);
        if (negAlert.hasRisk) {
            insights.push({
                type: 'critical',
                title: 'Risco de Saldo Negativo',
                message: `Atenção: Seu saldo projetado pode ficar negativo em ${negAlert.date} devido à despesa "${negAlert.description}".`,
                icon: 'AlertCircle'
            });
        }

        // 2. Análise de Variação de Gastos (vs Mês Anterior)
        const [yr, mo] = referenceMonth.split('-').map(Number);
        const prevMonthDate = new Date(yr, mo - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const prevHealth = this.getFinancialHealth(transactions, prevMonthStr);

        if (health.expenses > prevHealth.expenses * 1.15 && prevHealth.expenses > 0) {
            const variation = ((health.expenses - prevHealth.expenses) / prevHealth.expenses) * 100;
            insights.push({
                type: 'warning',
                title: 'Aumento de Gastos',
                message: `Seus gastos este mês estão ${variation.toFixed(0)}% acima da média do mês passado. Recomendamos revisar suas categorias de maior consumo.`,
                icon: 'TrendingUp'
            });
        }

        // 3. Taxa de Poupança
        if (health.savingRate > 20) {
            insights.push({
                type: 'success',
                title: 'Excelente Taxa de Poupança',
                message: `Parabéns! Você está economizando ${health.savingRate.toFixed(0)}% da sua receita. Considere investir parte desse valor.`,
                icon: 'Star'
            });
        } else if (health.savingRate < 5 && health.income > 0) {
            insights.push({
                type: 'info',
                title: 'Oportunidade de Economia',
                message: 'Sua margem de sobra está baixa este mês. Tente reduzir gastos não essenciais para fortalecer sua reserva.',
                icon: 'Target'
            });
        }

        // 4. Despesas Recorrentes Impactantes
        const recurring = this.identifyRecurringExpenses(transactions);
        const bigRecurring = recurring.find(r => r.value > health.income * 0.1);
        if (bigRecurring) {
            insights.push({
                type: 'info',
                title: 'Compromisso Recorrente Relevante',
                message: `A despesa "${bigRecurring.description}" representa mais de 10% da sua receita mensal. Certifique-se de que este valor está otimizado.`,
                icon: 'Clock'
            });
        }

        return insights;
    }
}
