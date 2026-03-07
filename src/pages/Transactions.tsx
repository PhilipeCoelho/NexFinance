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
import { useFinanceStore, useCurrentData, getVisibleTransactions } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import PageLayout from '@/components/PageLayout';
import { FinancialEngine } from '@/lib/FinancialEngine';
const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

  const data = useCurrentData();
  const { settings, updateTransaction, deleteTransaction, referenceMonth, setReferenceMonth } = useFinanceStore();

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
      deleteTransaction(transactionToDelete.id, scope, referenceMonth);
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

  const { transactions: visibleTransactions, hiddenCount, hiddenValue } = useMemo(() => {
    if (!data?.transactions) return { transactions: [], hiddenCount: 0, hiddenValue: 0 };
    return getVisibleTransactions(data.transactions, {
      viewMonth: referenceMonth,
      searchTerm,
      type: 'all',
      showIgnored
    });
  }, [data, searchTerm, referenceMonth, showIgnored]);

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
  }, [visibleTransactions, referenceMonth, data]);

  const stats = useMemo(() => {
    const activeTransactions = visibleTransactions.filter(t => !t.isIgnored);
    const income = activeTransactions.filter(t => t.type === 'income' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const expenses = activeTransactions.filter(t => t.type === 'expense' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const balance = income - expenses;

    const expensesList = activeTransactions.filter(t => t.type === 'expense');
    const pending = expensesList.filter(t => FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) !== 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const paid = expensesList.filter(t => FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc, t) => acc + t.value, 0);

    return {
      income,
      expenses,
      balance,
      pending,
      paid
    };
  }, [visibleTransactions, referenceMonth]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronDown size={14} opacity={0.2} style={{ marginLeft: '4px' }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ marginLeft: '4px', color: 'var(--accent-primary)' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px', color: 'var(--accent-primary)' }} />;
  };


  const currentMonthDate = new Date(referenceMonth + '-01T12:00:00');

  const prevMonth = () => {
    const [y, m] = referenceMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    setReferenceMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = referenceMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    setReferenceMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

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

  const incomePercentage = stats.income > 0 ? (stats.income / (stats.income + stats.expenses)) * 100 : 0;
  const expensePercentage = stats.expenses > 0 ? (stats.expenses / (stats.income + stats.expenses)) * 100 : 0;

  const summaryPanel = (
    <div className="sys-summary-widget">
      <div className="sys-summary-widget-header">
        Resumo do Mês
      </div>

      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Receitas</span>
        <span className="sys-summary-block-value color-green">{formatCurrency(stats.income)}</span>
        <div className="sys-progress-bar-bg">
          <div className="sys-progress-bar-fill bg-green" style={{ width: `${incomePercentage}%` }} />
        </div>
      </div>

      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Despesas</span>
        <span className="sys-summary-block-value color-red">{formatCurrency(stats.expenses)}</span>
        <div className="sys-progress-bar-bg">
          <div className="sys-progress-bar-fill bg-red" style={{ width: `${expensePercentage}%` }} />
        </div>
      </div>

      <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
        <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>
          Saldo
        </span>
        <span className={`sys-summary-block-value ${stats.balance >= 0 ? 'color-green' : 'color-red'}`} style={{ fontSize: '24px' }}>
          {formatCurrency(stats.balance)}
        </span>
        {!showIgnored && hiddenValue > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--sys-text-secondary)', marginTop: '4px' }}>
            + {formatCurrency(hiddenValue)} ignorados
          </span>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout title="Todas as Transações" summaryPanel={summaryPanel}>
      <div className="sys-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              className={`sys-btn-minimal ${showIgnored ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: showIgnored ? '#f1f5f9' : 'transparent',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                cursor: 'pointer',
                color: showIgnored ? 'var(--sys-blue)' : '#64748b'
              }}
            >
              {showIgnored ? <Eye size={16} /> : <EyeOff size={16} />}
              {showIgnored ? 'Ocultar ignorados' : 'Ver ignorados'}
            </button>
          </div>
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

        <div className="sys-table-container">
          <table className="sys-table">
            <thead>
              <tr>
                <th className="col-status" onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Sit {getSortIcon('status')}</th>
                <th className="col-date" onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Data {getSortIcon('date')}</th>
                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>Descrição {getSortIcon('description')}</th>
                <th onClick={() => handleSort('categoryId')} style={{ cursor: 'pointer' }}>Categoria {getSortIcon('categoryId')}</th>
                <th onClick={() => handleSort('accountId')} style={{ cursor: 'pointer' }}>Conta {getSortIcon('accountId')}</th>
                <th className="col-value" onClick={() => handleSort('value')} style={{ cursor: 'pointer' }}>Valor {getSortIcon('value')}</th>
                <th className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map(t => (
                <tr key={t.id} style={{ opacity: t.isIgnored ? 0.5 : 1 }}>
                  <td>
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                      {FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed' ? (
                        <CheckCircle2 size={18} className={t.type === 'income' ? 'color-green' : 'color-blue'} />
                      ) : (
                        <AlertCircle size={18} className="color-yellow" />
                      )}
                      {t.isFixed && <Infinity size={10} style={{ position: 'absolute', bottom: -4, right: -4, color: '#64748b' }} />}
                      {t.isRecurring && <Repeat size={10} style={{ position: 'absolute', bottom: -4, right: -4, color: '#64748b' }} />}
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '13px' }}>
                    {format(new Date(FinancialEngine.getAdjustedDate(t.date, referenceMonth) + 'T12:00:00'), 'dd/MM/yyyy')}
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
                  <td className="col-actions">
                    <div className="sys-table-actions">
                      <button className="sys-action-btn" onClick={() => updateTransaction(t.id, { isIgnored: !t.isIgnored }, 'single', referenceMonth)} title={t.isIgnored ? "Considerar" : "Ignorar"}>
                        {t.isIgnored ? <Eye size={16} color="var(--sys-blue)" /> : <EyeOff size={16} />}
                      </button>
                      <button className="sys-action-btn" onClick={() => updateTransaction(t.id, { status: FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed' ? 'forecast' : 'confirmed' }, (t.isFixed || t.isRecurring) ? 'single' : 'all', referenceMonth)} title={FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed' ? "Marcar como pendente" : "Marcar como pago"}>
                        <Check size={16} color={FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed' ? 'var(--sys-green)' : 'currentColor'} />
                      </button>
                      <button className="sys-action-btn" onClick={() => handleEdit(t)}><Edit3 size={16} /></button>
                      <button className="sys-action-btn delete" onClick={() => handleDeleteTrigger(t)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedTransactions.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Nenhuma transação encontrada no período.
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingTransaction={transactionToEdit}
        activeMonth={referenceMonth}
      />

      {
        showDeletePrompt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="sys-card" style={{ width: 350, textAlign: 'center' }}>
              <Trash2 size={32} className="color-red" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Excluir transação repetida?</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Como deseja prosseguir com a exclusão?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="sys-btn-secondary" style={{ justifyContent: 'center' }} onClick={() => confirmDelete('single')}>APENAS DESTE MÊS</button>
                <button className="sys-btn-destructive" style={{ justifyContent: 'center' }} onClick={() => confirmDelete('all')}>TODOS OS MESES</button>
                <button onClick={() => setShowDeletePrompt(false)} style={{ background: 'transparent', border: 'none', marginTop: 12, fontSize: 13, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )
      }
    </PageLayout >
  );
};

export default Transactions;
