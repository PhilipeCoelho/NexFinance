import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Repeat,
  Wallet,
  Check,
  Plus,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';
import DeleteTransactionModal from '@/components/DeleteTransactionModal';
import PeriodController from '@/components/PeriodController';
import { useFinanceStore, useCurrentData, getVisibleTransactions } from '@/hooks/use-store';
import { Transaction } from '@/types/finance';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import PageLayout from '@/components/PageLayout';
import { FinancialEngine } from '@/lib/FinancialEngine';

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const data = useCurrentData();
  const { settings, updateTransaction, deleteTransaction, referenceMonth } = useFinanceStore();

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleDuplicate = (t: Transaction) => {
    const { id, ...duplicateData } = t;
    setEditingTransaction({ ...duplicateData, description: `${t.description} (Cópia)` } as Transaction);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (t: Transaction) => {
    setTransactionToDelete(t);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (scope: 'all' | 'single' | 'future') => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id, scope, referenceMonth);
      setTransactionToDelete(null);
    }
    setIsDeleteModalOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
  };

  const { transactions: visibleTransactions } = useMemo(() => {
    if (!data?.transactions) return { transactions: [], hiddenCount: 0, hiddenValue: 0 };
    return getVisibleTransactions(data.transactions, {
      viewMonth: referenceMonth,
      searchTerm,
      type: filterType,
      showIgnored
    });
  }, [data, searchTerm, referenceMonth, showIgnored, filterType]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...visibleTransactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key !== 'isIgnored') {
          if (a.isIgnored && !b.isIgnored) return 1;
          if (!a.isIgnored && b.isIgnored) return -1;
        }

        let valA: any;
        let valB: any;

        if (sortConfig.key === 'status') {
          const statusA = FinancialEngine.getEffectiveTransactionStatus(a, referenceMonth);
          const statusB = FinancialEngine.getEffectiveTransactionStatus(b, referenceMonth);
          valA = statusA === 'forecast' ? 0 : 1;
          valB = statusB === 'forecast' ? 0 : 1;
        } else if (sortConfig.key === 'categoryId') {
          valA = data.categories.find(c => c.id === a.categoryId)?.name || '';
          valB = data.categories.find(c => c.id === b.categoryId)?.name || '';
        } else if (sortConfig.key === 'accountId') {
          valA = data.accounts?.find(acc => acc.id === a.accountId)?.name || '';
          valB = data.accounts?.find(acc => acc.id === b.accountId)?.name || '';
        } else if (sortConfig.key === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        } else {
          valA = a[sortConfig.key as keyof typeof a];
          valB = b[sortConfig.key as keyof typeof b];
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;

        if (sortConfig.key !== 'date') {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateA - dateB;
        }

        return 0;
      });
    }
    return sortableItems;
  }, [visibleTransactions, sortConfig, data, referenceMonth]);

  const stats = useMemo(() => {
    const activeTransactions = visibleTransactions.filter((t: Transaction) => !t.isIgnored);
    const income = activeTransactions.filter((t: Transaction) => t.type === 'income' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc: number, t: Transaction) => acc + t.value, 0);
    const expenses = activeTransactions.filter((t: Transaction) => t.type === 'expense' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc: number, t: Transaction) => acc + t.value, 0);
    const balance = income - expenses;

    return { income, expenses, balance };
  }, [visibleTransactions, referenceMonth]);

  // Calculate totals for PeriodController (including forecasting)
  const { incomeTotal, expenseTotal } = useMemo(() => {
    if (!data) return { incomeTotal: 0, expenseTotal: 0 };
    const monthTransactions = data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
    const inTotal = monthTransactions.filter(t => t.type === 'income' && !t.isIgnored).reduce((s, t) => s + (Number(t.value) || 0), 0);
    const exTotal = monthTransactions.filter(t => t.type === 'expense' && !t.isIgnored).reduce((s, t) => s + (Number(t.value) || 0), 0);
    return { incomeTotal: inTotal, expenseTotal: exTotal };
  }, [data, referenceMonth]);

  if (!data) return null;

  const summaryPanel = (
    <div className="sys-summary-widget">
      <div className="sys-summary-widget-header">Resumo do Período</div>
      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Entradas Confirmadas</span>
        <span className="sys-summary-block-value color-green">{formatCurrency(stats.income)}</span>
      </div>
      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Saídas Confirmadas</span>
        <span className="sys-summary-block-value color-red">{formatCurrency(stats.expenses)}</span>
      </div>
      <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
        <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>Balanço Líquido</span>
        <span className={`sys-summary-block-value ${stats.balance >= 0 ? 'color-green' : 'color-red'}`} style={{ fontSize: '24px' }}>
          {formatCurrency(stats.balance)}
        </span>
      </div>
    </div>
  );

  const headerActions = (
    <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
      <Plus size={18} /> NOVA TRANSAÇÃO
    </button>
  );

  return (
    <PageLayout title="Movimentação" actions={headerActions} summaryPanel={summaryPanel} hideMonthSelector={true}>
      <PeriodController 
        incomeTotal={incomeTotal} 
        expenseTotal={expenseTotal} 
      />
      <div className="sys-card" style={{ padding: '20px' }}>
        <div className="sys-filters-row">
          <div className="sys-quick-filters">
            <button className={`sys-filter-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>Todas</button>
            <button className={`sys-filter-btn ${filterType === 'income' ? 'active' : ''}`} onClick={() => setFilterType('income')}>Receitas</button>
            <button className={`sys-filter-btn ${filterType === 'expense' ? 'active' : ''}`} onClick={() => setFilterType('expense')}>Despesas</button>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className={`sys-btn-minimal ${showIgnored ? 'active' : ''}`}
              title={showIgnored ? 'Ocultar ignorados' : 'Ver ignorados'}
              style={{ color: showIgnored ? 'var(--sys-blue)' : '#94a3b8' }}
            >
              {showIgnored ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <div className="sys-search-input-wrapper">
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 12 }} />
              <input
                type="text"
                className="sys-search-input"
                placeholder="Pesquisar descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sys-table-container" style={{ border: 'none' }}>
          <table className="sys-table">
            <thead>
              <tr>
                <th className="col-status" onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status</th>
                <th className="col-date" onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Data</th>
                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>Descrição</th>
                <th onClick={() => handleSort('categoryId')} style={{ cursor: 'pointer' }}>Categoria</th>
                <th onClick={() => handleSort('accountId')} style={{ cursor: 'pointer' }}>Conta</th>
                <th className="col-value" onClick={() => handleSort('value')} style={{ cursor: 'pointer' }}>Valor</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map(t => {
                const isConfirmed = FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed';
                return (
                  <tr key={t.id} className="sys-table-row-compact" style={{ opacity: t.isIgnored ? 0.4 : 1 }}>
                    <td>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        {isConfirmed ? (
                          <CheckCircle2 size={18} className={t.type === 'income' ? 'color-green' : 'color-blue'} />
                        ) : (
                          <AlertCircle size={18} className="color-yellow" />
                        )}
                        {(t.isFixed || t.isRecurring) && (
                          <Repeat size={10} style={{ position: 'absolute', bottom: -4, right: -4, color: '#64748b' }} />
                        )}
                      </div>
                    </td>
                    <td className="col-date" style={{ fontSize: '12px', color: '#64748b' }}>
                      {format(new Date(FinancialEngine.getAdjustedDate(t.date, referenceMonth) + 'T12:00:00'), 'dd MMM', { locale: ptBR })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>{t.description}</span>
                          {t.isRecurring && t.recurrence?.installmentsCount && (
                            <span style={{ fontSize: '10px', color: isConfirmed ? 'var(--sys-green)' : 'var(--sys-blue)', backgroundColor: isConfirmed ? 'var(--sys-bg-green)' : 'var(--sys-bg-blue)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                {FinancialEngine.getInstallmentText(t, referenceMonth)} {isConfirmed ? (t.type === 'income' ? 'RECEBIDA' : 'PAGA') : 'PENDENTE'}
                            </span>
                          )}
                        </div>
                        {t.notes && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t.notes}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="sys-status-dot" style={{ backgroundColor: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)' }} />
                        <span style={{ fontSize: '13px', color: '#475569' }}>{data.categories.find(c => c.id === t.categoryId)?.name || 'Outros'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wallet size={14} opacity={0.5} />
                        {data.accounts.find(a => a.id === t.accountId)?.name || 'Carteira'}
                      </div>
                    </td>
                    <td className="col-value">
                      <span className={`sys-financial-val-sm ${t.type === 'income' ? 'color-green' : 'color-red'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                      </span>
                    </td>
                    <td className="col-actions">
                      <div className="sys-table-actions">
                        <button className="sys-action-btn" onClick={() => updateTransaction(t.id, { status: isConfirmed ? 'forecast' : 'confirmed' }, (t.isFixed || t.isRecurring) ? 'single' : 'all', referenceMonth)} title={isConfirmed ? "Marcar pendente" : "Marcar pago"}>
                          <Check size={16} color={isConfirmed ? 'var(--sys-green)' : 'currentColor'} />
                        </button>
                        <button className="sys-action-btn" onClick={() => handleDuplicate(t)} title="Duplicar"><Copy size={16} /></button>
                        <button className="sys-action-btn" onClick={() => handleEdit(t)} title="Editar"><Edit3 size={16} /></button>
                        <button className="sys-action-btn delete" onClick={() => handleDeleteClick(t)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedTransactions.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Activity size={40} color="var(--sys-border)" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma transação encontrada para este período.</p>
            </div>
          )}
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }} 
        editingTransaction={editingTransaction || undefined}
      />

      <DeleteTransactionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        transaction={transactionToDelete}
        referenceMonth={referenceMonth}
      />
    </PageLayout>
  );
};

export default Transactions;
