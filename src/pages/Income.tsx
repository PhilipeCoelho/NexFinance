import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    TrendingUp,
    CheckCircle2,
    Repeat,
    CalendarDays,
    Edit3,
    Trash2,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';

const Income: React.FC = () => {
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
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
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

    const filteredIncome = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.filter(t => {
            if (t.type !== 'income') return false;
            const desc = (t.description || '').toLowerCase();
            const cat = data.categories?.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';

            const search = searchTerm.toLowerCase();
            const matchesSearch = desc.includes(search) || cat.includes(search);
            const matchesMonth = isTransactionInMonth(t, referenceMonth);

            return matchesSearch && matchesMonth;
        });
    }, [data, searchTerm, referenceMonth]);

    const sortedIncome = useMemo(() => {
        try {
            return [...filteredIncome].sort((a, b) => {
                if (!sortConfig.key) return 0;
                const dir = sortConfig.direction === 'asc' ? 1 : -1;

                if (sortConfig.key === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
                if (sortConfig.key === 'value') return (a.value - b.value) * dir;
                if (sortConfig.key === 'reconciled') return ((a.reconciled ? 1 : 0) - (b.reconciled ? 1 : 0)) * dir;
                return 0;
            });
        } catch (e) {
            return filteredIncome;
        }
    }, [filteredIncome, sortConfig]);

    const { totalMonthlyIncome, predictableIncome } = useMemo(() => {
        let total = 0;
        let predictable = 0;
        sortedIncome.forEach(t => {
            total += t.value;
            if (t.isRecurring || t.isFixed) {
                predictable += t.value;
            }
        });
        return { totalMonthlyIncome: total, predictableIncome: predictable };
    }, [sortedIncome]);

    const totalIncomeCount = sortedIncome.length;
    const predictabilityRate = totalMonthlyIncome > 0 ? (predictableIncome / totalMonthlyIncome) * 100 : 0;

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getIncomeTrait = (income: any) => {
        if (income.isFixed || income.isRecurring) {
            return {
                type: 'predictable',
                icon: <Repeat size={12} />,
                label: 'Recorrente base',
                theme: 'stable'
            };
        }
        return {
            type: 'one-off',
            icon: <Zap size={12} />,
            label: 'Entrada pontual',
            theme: 'neutral'
        };
    };

    if (!data) return null;

    return (
        <div className="income-page fade-in">
            <header className="page-header">
                <div className="header-titles">
                    <div className="title-with-icon">
                        <div className="title-left">
                            <TrendingUp className="text-success" size={28} />
                            <h1 className="page-title">Previsibilidade de Receitas</h1>
                        </div>
                        <div className="title-divider"></div>
                        <MonthSelector />
                    </div>
                    <p className="page-subtitle">Construção de base financeira, estabilidade e planejamento futuro.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Pesquisar fontes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /><span>Nova Receita</span>
                    </button>
                </div>
            </header>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                forcedType={'income'}
                editingTransaction={transactionToEdit}
            />

            <div className="stability-dashboard glass">
                <div className="stability-header">
                    <div className="stability-info">
                        <ShieldCheck size={20} className="text-success" />
                        <div>
                            <h3 className="stability-title">Índice de Estabilidade</h3>
                            <p className="stability-desc">
                                {predictabilityRate >= 70
                                    ? 'Sua base financeira é sólida e altamente previsível neste mês.'
                                    : predictabilityRate >= 40
                                        ? 'Receitas mistas. Boa parte das entradas dependem de eventos pontuais.'
                                        : 'Atenção ao planejamento: maioria das receitas são pontuais e variáveis.'}
                            </p>
                        </div>
                    </div>
                    <div className="stability-metrics">
                        <div className="metric-box">
                            <span className="metric-label">Base Previsível</span>
                            <span className="metric-value stable">{formatCurrency(predictableIncome)}</span>
                        </div>
                        <div className="metric-box">
                            <span className="metric-label">Rendimento Total</span>
                            <span className="metric-value total">{formatCurrency(totalMonthlyIncome)}</span>
                        </div>
                    </div>
                </div>
                <div className="stability-track">
                    <div className="stability-bar" style={{ width: `${predictabilityRate}%` }}></div>
                </div>
            </div>

            <div className="income-table-container">
                <DataTable
                    data={sortedIncome}
                    columns={[
                        {
                            key: 'reconciled',
                            label: 'OK',
                            sortable: true,
                            align: 'center',
                            render: (t) => (
                                <button
                                    className={`calm-reconcile-btn ${t.reconciled ? 'active' : ''}`}
                                    onClick={() => updateTransaction(t.id, { reconciled: !t.reconciled })}
                                    title={t.reconciled ? "Pendente" : "Confirmar entrada"}
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
                                    return (
                                        <div className="date-wrapper">
                                            <CalendarDays size={12} className="date-icon" />
                                            <span className="income-date">{format(new Date(t.date), "dd/MMM").toUpperCase()}</span>
                                        </div>
                                    )
                                } catch { return 'N/A' }
                            }
                        },
                        {
                            key: 'source',
                            label: 'Fonte Receptora',
                            weight: 'primary',
                            render: (t) => {
                                const trait = getIncomeTrait(t);
                                return (
                                    <div className="income-info">
                                        <div className="income-main-info">
                                            <span className="income-desc">{t.description}</span>
                                            <div className={`trait-badge ${trait.theme}`}>
                                                {trait.icon}
                                                <span>{trait.label}</span>
                                            </div>
                                        </div>
                                        <div className="income-micro">
                                            <span className="income-cat">
                                                {data.categories?.find(c => c.id === t.categoryId)?.name || 'Sem Categoria'}
                                            </span>
                                            <span className="income-dot">•</span>
                                            <span className="income-origin">
                                                {t.accountId
                                                    ? data.accounts?.find(a => a.id === t.accountId)?.name
                                                    : 'Destino não definido'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            }
                        },
                        {
                            key: 'value',
                            label: 'Solidificação',
                            sortable: true,
                            align: 'right',
                            weight: 'primary',
                            render: (t) => {
                                const trait = getIncomeTrait(t);
                                const percentOfTotal = totalMonthlyIncome > 0 ? ((t.value / totalMonthlyIncome) * 100).toFixed(1) : '0';
                                return (
                                    <div className="income-value-wrapper">
                                        <span className={`income-value ${trait.theme}`}>
                                            {formatCurrency(t.value)}
                                        </span>
                                        <div className="income-insight">
                                            <span className="insight-text">Representa {percentOfTotal}% do total</span>
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
                                <div className="income-actions flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                        const trait = getIncomeTrait(t);
                        return `group ${trait.type === 'one-off' ? 'opacity-80 hover:opacity-100' : ''}`;
                    }}
                    emptyStateMessage="Nenhuma receita projetada ou registrada neste período."
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .income-page { display: flex; flex-direction: column; gap: 16px; }
        
        .page-header { margin-bottom: 4px; padding: 0 4px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header-titles { display: flex; flex-direction: column; gap: 4px; }
        .title-with-icon { display: flex; align-items: center; gap: 12px; }
        .title-left { display: flex; align-items: center; gap: 10px; }
        .title-left .text-success { color: var(--success); opacity: 0.9; }
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
        
        /* Stability Dashboard */
        .stability-dashboard {
          padding: 20px 24px; border-radius: 12px; border: 1px solid var(--border-light);
          display: flex; flex-direction: column; gap: 16px; background: rgba(16, 185, 129, 0.02);
        }
        
        .stability-header { display: flex; justify-content: space-between; align-items: flex-start; }
        
        .stability-info { display: flex; align-items: flex-start; gap: 12px; }
        .stability-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .stability-desc { font-size: 12px; margin: 4px 0 0 0; color: var(--text-secondary); max-width: 400px; line-height: 1.4; }
        
        .stability-metrics { display: flex; gap: 24px; }
        .metric-box { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; }
        .metric-value { font-size: 20px; font-weight: 800; font-family: var(--font-display); }
        .metric-value.stable { color: var(--success); }
        .metric-value.total { color: var(--text-primary); }
        
        .stability-track { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
        .stability-bar { height: 100%; background: linear-gradient(90deg, rgba(16,185,129,0.7) 0%, var(--success) 100%); transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }

        /* Reconcile Button - Calmer version */
        .calm-reconcile-btn {
          width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--border);
          background: transparent; color: var(--text-secondary); opacity: 0.3;
          display: inline-flex; align-items: center; justify-content: center; 
          transition: all 0.3s ease; cursor: pointer;
        }
        .calm-reconcile-btn:hover { opacity: 0.8; transform: scale(1.05); }
        .calm-reconcile-btn.active { opacity: 1; color: var(--success); border-color: var(--success); background: rgba(16, 185, 129, 0.05); }
        
        .date-wrapper { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); }
        .date-icon { opacity: 0.5; }
        .income-date { font-family: monospace; font-size: 12px; font-weight: 500; }
        
        /* Info Cell */
        .income-info { display: flex; flex-direction: column; gap: 6px; }
        .income-main-info { display: flex; align-items: center; gap: 10px; }
        .income-desc { font-weight: 500; color: var(--text-primary); font-size: 14px; }
        
        .trait-badge { 
          display: flex; align-items: center; gap: 4px; padding: 3px 8px; 
          border-radius: 12px; font-size: 10px; font-weight: 600;
        }
        .trait-badge.stable { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .trait-badge.neutral { background: var(--bg-tertiary); color: var(--text-secondary); }
        
        .income-micro { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
        .income-dot { opacity: 0.3; font-size: 10px; }
        .income-cat { font-weight: 400; }
        .income-origin { font-weight: 400; }
        
        /* Value Cell */
        .income-value-wrapper { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .income-value { font-family: var(--font-display); font-weight: 600; font-size: 15px; letter-spacing: -0.02em; }
        .income-value.stable { color: var(--text-primary); }
        .income-value.neutral { color: var(--text-secondary); }
        
        .income-insight { font-size: 11px; }
        .insight-text { color: var(--text-secondary); opacity: 0.6; }
        `}} />
        </div>
    );
};

export default Income;
