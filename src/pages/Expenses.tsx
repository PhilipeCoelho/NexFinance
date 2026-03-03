import React, { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    CheckCircle2,
    AlertCircle,
    Check,
    Edit3,
    Trash2,
    EyeOff,
    Eye,
    Repeat,
    Infinity,
    MoreVertical,
    Activity,
    Paperclip,
    Scale,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';

const Expenses: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    const [showIgnored, setShowIgnored] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

    const data = useCurrentData();
    const { settings, updateTransaction, deleteTransaction, viewMonth, setViewMonth } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const handleEdit = (t: any) => {
        setExpenseToEdit(t);
        setIsModalOpen(true);
    };

    const handleDeleteTrigger = (t: any) => {
        if (t.isFixed || t.isRecurring) {
            setTransactionToDelete(t);
            setShowDeletePrompt(true);
        } else {
            if (confirm('Deseja excluir esta despesa?')) {
                deleteTransaction(t.id);
            }
        }
    };

    const confirmDelete = (scope: 'all' | 'single') => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete.id, scope, viewMonth);
        }
        setShowDeletePrompt(false);
        setTransactionToDelete(null);
    };

    const isTransactionInMonth = (t: any, monthStr: string) => {
        if (t.date.startsWith(monthStr)) {
            if (t.recurrence?.excludedDates?.includes(monthStr)) return false;
            return true;
        }
        if (t.isFixed || t.isRecurring) {
            if (t.recurrence?.excludedDates?.includes(monthStr)) return false;
            const tDate = new Date(t.date + 'T12:00:00');
            const [y, m] = monthStr.split('-').map(Number);
            const targetDate = new Date(y, m - 1, 10);
            if (targetDate < tDate) return false;
            if (t.isFixed) return true;
            if (t.isRecurring && t.recurrence) {
                const diffMonths = (targetDate.getFullYear() - tDate.getFullYear()) * 12 + (targetDate.getMonth() - tDate.getMonth());
                return diffMonths >= 0 && diffMonths < (t.recurrence.installmentsCount || 1);
            }
        }
        return false;
    };

    const getInstallmentInfo = (t: any, monthStr: string) => {
        if (!t.isRecurring || !t.recurrence?.installmentsCount) return null;
        const tDate = new Date(t.date + 'T12:00:00');
        const [y, m] = monthStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, 10);
        const diffMonths = (targetDate.getFullYear() - tDate.getFullYear()) * 12 + (targetDate.getMonth() - tDate.getMonth());
        return `${diffMonths + 1}/${t.recurrence.installmentsCount}`;
    };

    const filteredExpenses = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.filter(t =>
            t.type === 'expense' &&
            isTransactionInMonth(t, viewMonth) &&
            (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm, viewMonth]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedExpenses = useMemo(() => {
        let sortableItems = [...filteredExpenses];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (sortConfig.key !== 'isIgnored') {
                    if (a.isIgnored && !b.isIgnored) return 1;
                    if (!a.isIgnored && b.isIgnored) return -1;
                }
                let valA: any = a[sortConfig.key as keyof typeof a];
                let valB: any = b[sortConfig.key as keyof typeof b];
                if (sortConfig.key === 'categoryId') {
                    valA = data.categories.find(c => c.id === a.categoryId)?.name || '';
                    valB = data.categories.find(c => c.id === b.categoryId)?.name || '';
                } else if (sortConfig.key === 'accountId') {
                    valA = data.accounts.find(acc => acc.id === a.accountId)?.name || '';
                    valB = data.accounts.find(acc => acc.id === b.accountId)?.name || '';
                } else if (sortConfig.key === 'date') {
                    valA = new Date(valA).getTime();
                    valB = new Date(valB).getTime();
                }
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredExpenses, sortConfig, data]);

    const finalDisplayExpenses = useMemo(() => {
        if (showIgnored) return sortedExpenses;
        return sortedExpenses.filter(e => !e.isIgnored);
    }, [sortedExpenses, showIgnored]);

    const ignoredCount = useMemo(() => {
        return sortedExpenses.filter(e => e.isIgnored).length;
    }, [sortedExpenses]);

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDown size={14} opacity={0.2} style={{ marginLeft: '4px' }} />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ marginLeft: '4px', color: 'var(--mobills-red)' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px', color: 'var(--mobills-red)' }} />;
    };

    const stats = useMemo(() => {
        const pending = filteredExpenses.filter(t => t.status !== 'confirmed').reduce((acc, t) => acc + t.value, 0);
        const paid = filteredExpenses.filter(t => t.status === 'confirmed').reduce((acc, t) => acc + t.value, 0);
        return { pending, paid, total: pending + paid };
    }, [filteredExpenses]);

    const currentMonthDate = new Date(viewMonth + '-01T12:00:00');

    const changeMonth = (offset: number) => {
        const [y, m] = viewMonth.split('-').map(Number);
        const date = new Date(y, m - 1 + offset, 1);
        setViewMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const prevMonth = () => changeMonth(-1);
    const nextMonth = () => changeMonth(1);

    const getAdjustedDate = (dateStr: string, monthStr: string) => {
        try {
            const [y, m, d] = dateStr.split('-');
            const [refY, refM] = monthStr.split('-');
            if (dateStr.startsWith(monthStr)) return dateStr;
            return `${refY}-${refM}-${d}`;
        } catch (e) {
            return dateStr;
        }
    };

    if (!data) return null;

    return (
        <div className="expenses-page-mobills fade-in">
            <main className="mobills-main-content">
                <div className="work-area">
                    <header className="page-header-mobills" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div className="header-left">
                            <button className="category-pill-dropdown-mob">
                                <TrendingDown size={18} className="mr-2" />
                                Despesas
                                <ChevronDown size={14} className="ml-2" />
                            </button>
                        </div>
                        <div className="header-actions-mob">
                            <button className="btn-nova-despesa-mob" onClick={() => setIsModalOpen(true)}>
                                <Plus size={16} className="mr-2" />
                                NOVA DESPESA
                            </button>
                            <button className="header-icon-btn-mob"><Search size={18} /></button>
                            <button className="header-icon-btn-mob"><Filter size={18} /></button>
                            <button className="header-icon-btn-mob"><MoreVertical size={18} /></button>
                        </div>
                    </header>

                    <div className="month-navigator-mob">
                        <button className="nav-arrow-mob" onClick={prevMonth}><ChevronLeft size={20} /></button>
                        <div className="month-display-mob">
                            {format(currentMonthDate, "MMMM yyyy", { locale: ptBR })}
                        </div>
                        <button className="nav-arrow-mob" onClick={nextMonth}><ChevronRight size={20} /></button>
                    </div>

                    {showDeletePrompt && (
                        <div className="modal-overlay" onClick={() => setShowDeletePrompt(false)}>
                            <div className="mobills-modal glass fade-in" style={{ width: '350px', padding: '32px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        background: 'rgba(248, 113, 113, 0.1)',
                                        width: '64px', height: '64px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px'
                                    }}>
                                        <Trash2 size={32} color="var(--mobills-red)" />
                                    </div>
                                    <h3 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Excluir despesa</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
                                        Esta é uma despesa repetida.<br />O que você deseja excluir?
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button className="btn-mobills-save expense" style={{ width: '100%' }} onClick={() => confirmDelete('single')}>APENAS ESTE MÊS</button>
                                        <button className="btn-mobills-save neutral" style={{ width: '100%' }} onClick={() => confirmDelete('all')}>TODOS OS MESES</button>
                                        <button className="btn-text-only" style={{ marginTop: '8px' }} onClick={() => setShowDeletePrompt(false)}>Cancelar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mobills-table-card">
                        <table className="mobills-table">
                            <thead>
                                <tr>
                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                                        SIT {getSortIcon('status')}
                                    </th>
                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                                        DATA {getSortIcon('date')}
                                    </th>
                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('description')}>
                                        DESCRIÇÃO {getSortIcon('description')}
                                    </th>
                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('categoryId')}>
                                        CATEGORIA {getSortIcon('categoryId')}
                                    </th>
                                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('accountId')}>
                                        CONTA {getSortIcon('accountId')}
                                    </th>
                                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('value')}>
                                        VALOR {getSortIcon('value')}
                                    </th>
                                    <th style={{ textAlign: 'right' }}>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {finalDisplayExpenses.map(t => (
                                    <tr key={t.id} className={t.isIgnored ? "mobills-row ignored" : "mobills-row"}>
                                        <td className="status-cell">
                                            <div className="status-indicator-wrapper">
                                                {t.status === 'confirmed' ? (
                                                    <div className="status-indicator-filled confirmed" style={{ background: 'var(--mobills-green)' }}>
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div className="status-indicator-filled pending" style={{ background: '#f87171' }}>
                                                        <span style={{ fontWeight: 900, fontSize: '14px' }}>!</span>
                                                    </div>
                                                )}
                                                {t.isFixed && (
                                                    <div className="recurring-mini-icon" title="Fixo">
                                                        <Infinity size={10} />
                                                    </div>
                                                )}
                                                {t.isRecurring && (
                                                    <div className="installment-badge" title="Parcelado">
                                                        {getInstallmentInfo(t, viewMonth)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="date-cell">
                                            {format(new Date(getAdjustedDate(t.date, viewMonth) + 'T12:00:00'), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="desc-cell">
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span className="desc-text">{t.description}</span>
                                                {t.notes && <span className="notes-preview" style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>{t.notes}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cat-cell">
                                                <div className="cat-bullet" style={{ background: 'var(--mobills-red)' }}></div>
                                                {data.categories.find(c => c.id === t.categoryId)?.name || 'Outros'}
                                            </div>
                                        </td>
                                        <td className="account-cell">{data.accounts.find(a => a.id === t.accountId)?.name || 'Carteira'}</td>
                                        <td className="value-cell text-right">
                                            <span className="value-num red">{formatCurrency(t.value)}</span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button
                                                    onClick={() => {
                                                        const isRecurring = t.isFixed || t.isRecurring;
                                                        updateTransaction(
                                                            t.id,
                                                            { status: t.status === 'confirmed' ? 'forecast' : 'confirmed' },
                                                            isRecurring ? 'single' : 'all',
                                                            viewMonth
                                                        );
                                                    }}
                                                    title="Confirmar"
                                                >
                                                    <Check size={16} color={t.status === 'confirmed' ? 'var(--mobills-green)' : '#cbd5e1'} />
                                                </button>
                                                <button onClick={() => updateTransaction(t.id, { isIgnored: !t.isIgnored })} title={t.isIgnored ? "Considerar" : "Ignorar"}>
                                                    {t.isIgnored ? <EyeOff size={16} color="var(--mobills-red)" /> : <Eye size={16} />}
                                                </button>
                                                <button onClick={() => handleEdit(t)} title="Editar"><Edit3 size={16} /></button>
                                                <button onClick={() => handleDeleteTrigger(t)} title="Excluir"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {!showIgnored && ignoredCount > 0 && (
                                    <tr className="ignored-summary-row" onClick={() => setShowIgnored(true)}>
                                        <td colSpan={7}>
                                            <div className="ignored-summary-content">
                                                <EyeOff size={14} className="mr-2" />
                                                <span>{ignoredCount} {ignoredCount === 1 ? 'despesa ignorada' : 'despesas ignoradas'} ocultas</span>
                                                <button className="reveal-btn">MOSTRAR</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {showIgnored && ignoredCount > 0 && (
                                    <tr className="ignored-summary-row active" onClick={() => setShowIgnored(false)}>
                                        <td colSpan={7}>
                                            <div className="ignored-summary-content">
                                                <Eye size={14} className="mr-2" />
                                                <span>Ocultar despesas ignoradas</span>
                                                <button className="reveal-btn">OCULTAR</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {filteredExpenses.length === 0 && <div className="empty-state-mobills">Nenhuma despesa para este mês.</div>}
                        <footer className="pagination-footer-lite">
                            <span>Linhas por página: 50</span>
                            <span>1-{filteredExpenses.length} de {filteredExpenses.length}</span>
                        </footer>
                    </div>
                </div>

                <aside className="summary-sidebar">
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Despesas pendentes <ChevronRight size={10} /></span>
                            <span className="value">{formatCurrency(stats.pending)}</span>
                        </div>
                        <div className="icon-bg gray"><ArrowUp size={20} /></div>
                    </div>
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Despesas pagas <ChevronRight size={10} /></span>
                            <span className="value">{formatCurrency(stats.paid)}</span>
                        </div>
                        <div className="icon-bg red"><ArrowDown size={20} /></div>
                    </div>
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Total <ChevronRight size={10} /></span>
                            <span className="value">{formatCurrency(stats.total)}</span>
                        </div>
                        <div className="icon-bg red"><Scale size={20} /></div>
                    </div>
                </aside>
            </main >

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setExpenseToEdit(null); }}
                editingTransaction={expenseToEdit}
                forcedType="expense"
                activeMonth={viewMonth}
            />
        </div >
    );
};

export default Expenses;
