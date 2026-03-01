import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    TrendingDown,
    CheckCircle2,
    AlertTriangle,
    Pin,
    Edit3,
    Trash2,
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';

const Expenses: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

    const data = useCurrentData();
    const { settings, updateTransaction, deleteTransaction, referenceMonth } = useFinanceStore();

    const handleEdit = (t: any) => {
        setTransactionToEdit(t);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta despesa?')) {
            deleteTransaction(id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTransactionToEdit(null);
    };

    const formatCurrency = (value: number) => {
        if (!settings) return String(value);
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const isTransactionInMonth = (trans: any, monthStr: string) => {
        if (!trans || !trans.date || !monthStr) return false;
        const [refYear, refMonth] = monthStr.split('-').map(Number);
        const tDate = new Date(trans.date);
        if (isNaN(tDate.getTime())) return trans.date.startsWith(monthStr);

        const tYear = tDate.getFullYear();
        const tMonth = tDate.getMonth() + 1;
        const diffMonths = (refYear - tYear) * 12 + (refMonth - tMonth) + 1;

        if (diffMonths <= 0) return trans.date.startsWith(monthStr);
        if (trans.recurrence?.excludedDates?.includes(monthStr)) return false;
        if (trans.isFixed) return true;
        if (!trans.isRecurring) return trans.date.startsWith(monthStr);

        if (trans.recurrence?.installmentsCount) {
            return diffMonths <= trans.recurrence.installmentsCount;
        }
        return true;
    };

    // Pre-calculate category averages across all historical expenses
    const categoryAverages = useMemo(() => {
        if (!data?.transactions) return {};
        const allExpenses = data.transactions.filter(t => t.type === 'expense');
        const sums: Record<string, { total: number, count: number }> = {};

        allExpenses.forEach(t => {
            const catId = t.categoryId || 'uncategorized';
            if (!sums[catId]) sums[catId] = { total: 0, count: 0 };
            sums[catId].total += t.value;
            sums[catId].count += 1;
        });

        const avgs: Record<string, number> = {};
        Object.keys(sums).forEach(k => {
            avgs[k] = sums[k].total / sums[k].count;
        });
        return avgs;
    }, [data]);

    const filteredExpenses = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const desc = (t.description || '').toLowerCase();
            const cat = data.categories?.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';

            const search = searchTerm.toLowerCase();
            const matchesSearch = desc.includes(search) || cat.includes(search);
            const matchesMonth = isTransactionInMonth(t, referenceMonth);

            return matchesSearch && matchesMonth;
        });
    }, [data, searchTerm, referenceMonth]);

    const sortedExpenses = useMemo(() => {
        return [...filteredExpenses].sort((a, b) => {
            if (!sortConfig.key) return 0;
            const dir = sortConfig.direction === 'asc' ? 1 : -1;

            if (sortConfig.key === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
            if (sortConfig.key === 'value') return (a.value - b.value) * dir;
            if (sortConfig.key === 'reconciled') return ((a.reconciled ? 1 : 0) - (b.reconciled ? 1 : 0)) * dir;
            return 0;
        });
    }, [filteredExpenses, sortConfig]);

    const totalMonthlyExpenses = useMemo(() => {
        return sortedExpenses.reduce((acc, curr) => acc + curr.value, 0);
    }, [sortedExpenses]);

    const totalExpensesCount = sortedExpenses.length;
    const reconciledCount = sortedExpenses.filter(t => t.reconciled).length;
    const reconciliationProgress = totalExpensesCount > 0 ? (reconciledCount / totalExpensesCount) * 100 : 0;
    const missingReconciliation = totalExpensesCount - reconciledCount;

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getExpenseImpact = (expense: any) => {
        const isUncategorized = !expense.categoryId;
        if (isUncategorized) return { type: 'error', reason: 'Sem categoria', action: 'Classificar agora' };

        const catAvg = categoryAverages[expense.categoryId] || 0;
        const isOutlier = expense.value > catAvg * 1.5 && expense.value > 50; // Arbitrary 50 threshold to ignore micro-outliers

        if (isOutlier) return { type: 'warning', reason: 'Fora do padrão', detail: `Média da categoria: ${formatCurrency(catAvg)}` };

        return { type: 'normal' };
    };

    if (!data) return null;

    return (
        <div className="expenses-page fade-in">
            <header className="page-header">
                <div className="header-titles">
                    <div className="title-with-icon">
                        <div className="title-left">
                            <TrendingDown className="text-error" size={28} />
                            <h1 className="page-title">Controle de Despesas</h1>
                        </div>
                        <div className="title-divider"></div>
                        <MonthSelector />
                    </div>
                    <p className="page-subtitle">Monitoramento de saídas, exceções e varredura financeira.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar despesas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /><span>Nova Despesa</span>
                    </button>
                </div>
            </header>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                forcedType={'expense'}
                editingTransaction={transactionToEdit}
            />

            <div className={`reconciliation-dashboard glass ${missingReconciliation > 0 ? 'needs-attention' : 'all-good'}`}>
                <div className="reconciliation-info">
                    <div>
                        <h3 className="reconciliation-title">Reconciliação Mensal</h3>
                        <p className="reconciliation-desc">
                            {missingReconciliation === 0
                                ? 'Todas as despesas foram verificadas. O controle está em dia.'
                                : `${missingReconciliation} despesa${missingReconciliation > 1 ? 's' : ''} aguardando verificação de saída.`}
                        </p>
                    </div>
                    <div className="reconciliation-stats">
                        {reconciledCount} / {totalExpensesCount}
                    </div>
                </div>
                <div className="reconciliation-track">
                    <div className="reconciliation-bar" style={{ width: `${reconciliationProgress}%` }}></div>
                </div>
            </div>

            <DataTable
                data={sortedExpenses}
                columns={[
                    {
                        key: 'reconciled',
                        label: 'OK',
                        sortable: true,
                        align: 'center',
                        render: (t) => (
                            <button
                                className={`quick-reconcile-btn ${t.reconciled ? 'active' : ''}`}
                                onClick={() => updateTransaction(t.id, { reconciled: !t.reconciled })}
                                title={t.reconciled ? "Marcar como pendente" : "Confirmar saída"}
                            >
                                <CheckCircle2 size={18} />
                            </button>
                        )
                    },
                    {
                        key: 'date',
                        label: 'Data',
                        sortable: true,
                        render: (t) => {
                            try {
                                return <span className="expense-date">{format(new Date(t.date), "dd/MMM").toUpperCase()}</span>;
                            } catch { return 'N/A' }
                        }
                    },
                    {
                        key: 'details',
                        label: 'Detalhes',
                        weight: 'primary',
                        render: (t) => {
                            const impact = getExpenseImpact(t);
                            const isUncategorized = !t.categoryId;
                            return (
                                <div className="expense-info">
                                    <div className="expense-main-info">
                                        <span className="expense-desc">
                                            {t.description}
                                            {t.isFixed && <Pin size={12} className="fixed-icon" />}
                                        </span>
                                        {impact.type === 'error' && (
                                            <div className="inline-action-error" onClick={() => handleEdit(t)}>
                                                <AlertTriangle size={14} />
                                                <span>{impact.action}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="expense-micro">
                                        <span className="expense-cat">
                                            {data.categories?.find(c => c.id === t.categoryId)?.name || 'Sem Categoria'}
                                        </span>
                                        {!isUncategorized && <span className="expense-dot">•</span>}
                                        {!isUncategorized && (
                                            <span className="expense-origin">
                                                {t.accountId
                                                    ? data.accounts?.find(a => a.id === t.accountId)?.name
                                                    : data.creditCards?.find(cc => cc.id === t.creditCardId)?.name || 'Origem não definida'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    },
                    {
                        key: 'value',
                        label: 'Valor & Impacto',
                        sortable: true,
                        align: 'right',
                        weight: 'primary',
                        render: (t) => {
                            const impact = getExpenseImpact(t);
                            const percentOfTotal = totalMonthlyExpenses > 0 ? ((t.value / totalMonthlyExpenses) * 100).toFixed(1) : '0';
                            return (
                                <div className="expense-value-wrapper">
                                    <span className={`expense-value ${impact.type}`}>
                                        {formatCurrency(t.value)}
                                    </span>
                                    <div className="expense-insight">
                                        {impact.type === 'warning' ? (
                                            <span className="insight-warning" title={impact.detail}>
                                                Acima da média
                                            </span>
                                        ) : (
                                            <span className="insight-neutral">{percentOfTotal}% do mês</span>
                                        )}
                                    </div>
                                </div>
                            )
                        }
                    },
                    {
                        key: 'actions',
                        label: 'Ações',
                        align: 'center',
                        render: (t) => (
                            <div className="expense-actions flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[var(--bg-tertiary)]" onClick={() => handleEdit(t)}>
                                    <Edit3 size={14} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[rgba(239,68,68,0.1)] hover:text-red-500" onClick={() => handleDelete(t.id)}>
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        )
                    }
                ]}
                onSort={handleSort}
                sortConfig={sortConfig}
                selectable
                rowClassName={(t) => {
                    const impact = getExpenseImpact(t);
                    return `group ${impact.type === 'error' ? 'bg-[rgba(239,68,68,0.03)] border-l-2 border-l-red-500' : impact.type === 'warning' ? 'bg-[rgba(245,158,11,0.02)]' : ''}`;
                }}
                emptyStateMessage="Nenhuma despesa registrada neste período."
            />

            <style dangerouslySetInnerHTML={{
                __html: `
        .expenses-page { display: flex; flex-direction: column; gap: 16px; }
        
        .page-header { margin-bottom: 4px; padding: 0 4px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header-titles { display: flex; flex-direction: column; gap: 4px; }
        .title-with-icon { display: flex; align-items: center; gap: 12px; }
        .title-left { display: flex; align-items: center; gap: 10px; }
        .title-divider { height: 24px; width: 1px; background-color: var(--border); margin: 0 4px; }
        .page-title { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }
        .page-subtitle { font-size: 12px; color: var(--text-secondary); opacity: 0.8; }
        
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .search-bar { 
          display: flex; align-items: center; gap: 10px; padding: 0 12px;
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 10px; height: 36px; width: 240px; color: var(--text-secondary);
        }
        .search-bar input { background: transparent; border: none; font-size: 12px; color: var(--text-primary); width: 100%; outline: none; }
        
        /* Reconciliation Dashboard */
        .reconciliation-dashboard {
          padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-light);
          display: flex; flex-direction: column; gap: 12px; transition: all 0.3s ease;
        }
        .reconciliation-dashboard.needs-attention { border-left: 4px solid var(--warning); background: rgba(245, 158, 11, 0.05); }
        .reconciliation-dashboard.all-good { border-left: 4px solid var(--success); background: rgba(16, 185, 129, 0.05); }
        
        .reconciliation-info { display: flex; justify-content: space-between; align-items: center; }
        .reconciliation-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .reconciliation-desc { font-size: 11px; margin: 4px 0 0 0; color: var(--text-secondary); }
        .reconciliation-stats { font-size: 18px; font-weight: 800; font-family: var(--font-display); color: var(--text-primary); }
        
        .reconciliation-track { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
        .reconciliation-bar { height: 100%; background: var(--success); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        .needs-attention .reconciliation-bar { background: var(--warning); }
        
        .unreconciled-tension { position: relative; }
        .unreconciled-tension::after {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; 
          background: var(--border); opacity: 0.5;
        }

        /* Reconcile Button */
        .quick-reconcile-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 2px solid transparent;
          background: var(--bg-tertiary); color: var(--text-secondary); opacity: 0.4;
          display: inline-flex; align-items: center; justify-content: center; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
        }
        .quick-reconcile-btn:hover { opacity: 1; transform: scale(1.05); background: var(--bg-secondary); border-color: var(--border); }
        .quick-reconcile-btn.active { opacity: 1; color: var(--success); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
        
        .expense-date { font-family: monospace; font-size: 11px; color: var(--text-secondary); font-weight: 600; }
        
        /* Info Cell */
        .expense-info { display: flex; flex-direction: column; gap: 4px; }
        .expense-main-info { display: flex; align-items: center; gap: 12px; }
        .expense-desc { font-weight: 600; color: var(--text-primary); font-size: 14px; display: flex; align-items: center; gap: 6px; }
        .fixed-icon { color: var(--text-secondary); opacity: 0.5; }
        
        .inline-action-error {
          display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;
          color: var(--error); background: rgba(239, 68, 68, 0.1); padding: 4px 8px; 
          border-radius: 6px; cursor: pointer; text-transform: uppercase;
        }
        .inline-action-error:hover { background: rgba(239, 68, 68, 0.15); }
        
        .expense-micro { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
        .expense-dot { opacity: 0.5; font-size: 8px; }
        .expense-cat { font-weight: 500; }
        
        /* Value Cell */
        .expense-value-wrapper { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .expense-value { font-family: var(--font-display); font-weight: 700; font-size: 15px; }
        .expense-value.normal { color: var(--text-primary); }
        .expense-value.warning { color: var(--warning); }
        .expense-value.error { color: var(--error); }
        
        .expense-insight { font-size: 10px; font-weight: 600; }
        .insight-neutral { color: var(--text-secondary); opacity: 0.7; }
        .insight-warning { color: var(--warning); background: rgba(245, 158, 11, 0.1); padding: 2px 6px; border-radius: 4px; }
        `}} />
        </div>
    );
};

export default Expenses;
