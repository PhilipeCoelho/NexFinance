import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Edit3,
  Trash2,
  Scale,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Activity,
  Paperclip,
  Infinity,
  CheckCircle2,
  Repeat
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import PageLayout from '@/components/PageLayout';

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

  const data = useCurrentData();
  const { settings, updateTransaction, deleteTransaction, viewMonth, setViewMonth } = useFinanceStore();

  const handleEdit = (t: any) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (t: any) => {
    if (t.isFixed || t.isRecurring) {
      setTransactionToDelete(t);
      setShowDeletePrompt(true);
    } else {
      if (confirm('Deseja excluir esta transação?')) {
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
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

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase());
      const matchesMonth = isTransactionInMonth(t, viewMonth);
      return matchesSearch && matchesMonth;
    });
  }, [data, searchTerm, viewMonth]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...filteredTransactions];
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
          valA = data.accounts?.find(acc => acc.id === a.accountId)?.name || '';
          valB = data.accounts?.find(acc => acc.id === b.accountId)?.name || '';
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
  }, [filteredTransactions, sortConfig, data]);

  const finalDisplayTransactions = useMemo(() => {
    if (showIgnored) return sortedTransactions;
    return sortedTransactions.filter(e => !e.isIgnored);
  }, [sortedTransactions, showIgnored]);

  const ignoredCount = useMemo(() => {
    return sortedTransactions.filter(e => e.isIgnored).length;
  }, [sortedTransactions]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronDown size={14} opacity={0.2} style={{ marginLeft: '4px' }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ marginLeft: '4px', color: 'var(--accent-primary)' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px', color: 'var(--accent-primary)' }} />;
  };

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);

    // For the table footer
    const expensesList = filteredTransactions.filter(t => t.type === 'expense');
    const pending = expensesList.filter(t => t.status !== 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const paid = expensesList.filter(t => t.status === 'confirmed').reduce((acc, t) => acc + t.value, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      pending,
      paid,
      total: income - expenses
    };
  }, [filteredTransactions]);

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

  const summaryPanel = (
    <>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Receitas</span>
          <span className="sys-summary-value color-green">{formatCurrency(stats.income)}</span>
        </div>
        <div className="sys-summary-icon-box bg-green"><TrendingUp size={24} /></div>
      </div>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Despesas</span>
          <span className="sys-summary-value color-red">{formatCurrency(stats.expenses)}</span>
        </div>
        <div className="sys-summary-icon-box bg-red"><TrendingDown size={24} /></div>
      </div>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Saldo</span>
          <span className="sys-summary-value color-blue">{formatCurrency(stats.balance)}</span>
        </div>
        <div className="sys-summary-icon-box bg-blue"><Scale size={24} /></div>
      </div>
    </>
  );

  return (
    <PageLayout title="Todas as Transações" summaryPanel={summaryPanel}>
      <div className="sys-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 10 }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '8px 16px 8px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', width: '250px' }}
            />
          </div>
        </div>

        <table className="sys-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', width: '50px' }}>Sit {getSortIcon('status')}</th>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', width: '100px' }}>Data {getSortIcon('date')}</th>
              <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>Descrição {getSortIcon('description')}</th>
              <th onClick={() => handleSort('categoryId')} style={{ cursor: 'pointer' }}>Categoria {getSortIcon('categoryId')}</th>
              <th onClick={() => handleSort('accountId')} style={{ cursor: 'pointer' }}>Conta {getSortIcon('accountId')}</th>
              <th onClick={() => handleSort('value')} style={{ cursor: 'pointer', textAlign: 'right' }}>Valor {getSortIcon('value')}</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {finalDisplayTransactions.map(t => (
              <tr key={t.id} style={{ opacity: t.isIgnored ? 0.5 : 1 }}>
                <td>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    {t.status === 'confirmed' ? (
                      <CheckCircle2 size={18} className={t.type === 'income' ? 'color-green' : 'color-blue'} />
                    ) : (
                      <AlertCircle size={18} className="color-yellow" />
                    )}
                    {t.isFixed && <Infinity size={10} style={{ position: 'absolute', bottom: -4, right: -4, color: '#64748b' }} />}
                    {t.isRecurring && <Repeat size={10} style={{ position: 'absolute', bottom: -4, right: -4, color: '#64748b' }} />}
                  </div>
                </td>
                <td style={{ color: '#64748b', fontSize: '13px' }}>
                  {format(new Date(getAdjustedDate(t.date, viewMonth) + 'T12:00:00'), 'dd/MM/yyyy')}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500, color: '#1a1d21' }}>{t.description}</span>
                    {t.notes && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t.notes}</span>}
                  </div>
                </td>
                <td style={{ fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)' }} />
                    {data.categories.find(c => c.id === t.categoryId)?.name || 'Outros'}
                  </div>
                </td>
                <td style={{ fontSize: '13px', color: '#64748b' }}>
                  {data.accounts.find(a => a.id === t.accountId)?.name || 'Carteira'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`sys-table-val ${t.type === 'income' ? 'color-green' : 'color-red'}`}>
                    {formatCurrency(t.value)}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => updateTransaction(t.id, { status: t.status === 'confirmed' ? 'forecast' : 'confirmed' }, (t.isFixed || t.isRecurring) ? 'single' : 'all', viewMonth)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Check size={16} color={t.status === 'confirmed' ? '#10b981' : '#cbd5e1'} />
                    </button>
                    <button onClick={() => handleEdit(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Edit3 size={16} color="#94a3b8" /></button>
                    <button onClick={() => handleDeleteTrigger(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} color="#94a3b8" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {finalDisplayTransactions.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Nenhuma transação encontrada no período.
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingTransaction={transactionToEdit}
        activeMonth={viewMonth}
      />

      {showDeletePrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="sys-card" style={{ width: 350, textAlign: 'center' }}>
            <Trash2 size={32} className="color-red" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Excluir transação repetida?</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Como deseja prosseguir com a exclusão?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="sys-btn-primary" style={{ backgroundColor: '#1a1d21', justifyContent: 'center' }} onClick={() => confirmDelete('single')}>APENAS DESTE MÊS</button>
              <button className="sys-btn-primary" style={{ backgroundColor: 'var(--sys-red)', justifyContent: 'center' }} onClick={() => confirmDelete('all')}>TODOS OS MESES</button>
              <button onClick={() => setShowDeletePrompt(false)} style={{ background: 'transparent', border: 'none', marginTop: 12, fontSize: 13, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Transactions;
