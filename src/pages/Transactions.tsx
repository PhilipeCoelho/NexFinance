import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Edit3,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Activity,
  Infinity,
  CheckCircle2,
  Repeat,
  Copy,
  Calendar,
  Wallet,
  ArrowRightLeft
} from 'lucide-react';
import { useFinanceStore, useCurrentData, getVisibleTransactions } from '@/hooks/use-store';
import { format, parseISO } from 'date-fns';
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
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const data = useCurrentData();
  const { settings, updateTransaction, deleteTransaction, referenceMonth, setReferenceMonth } = useFinanceStore();

  const handleEdit = (t: any) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleDuplicate = (t: any) => {
    const { id, ...duplicateData } = t;
    setTransactionToEdit({ ...duplicateData, description: `${t.description} (Cópia)` });
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
  };

  const { transactions: visibleTransactions, hiddenCount, hiddenValue } = useMemo(() => {
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
  }, [visibleTransactions, sortConfig, data]);

  const stats = useMemo(() => {
    const activeTransactions = visibleTransactions.filter(t => !t.isIgnored);
    const income = activeTransactions.filter(t => t.type === 'income' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const expenses = activeTransactions.filter(t => t.type === 'expense' && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) === 'confirmed').reduce((acc, t) => acc + t.value, 0);
    const balance = income - expenses;

    return { income, expenses, balance };
  }, [visibleTransactions, referenceMonth]);

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
    <PageLayout title="Movimentação" actions={headerActions} summaryPanel={summaryPanel}>
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
                <th className="col-status">Status</th>
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
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--sys-text-primary)' }}>{t.description}</span>
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
                        <button className="sys-action-btn delete" onClick={() => handleDeleteTrigger(t)} title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedTransactions.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Activity size={40} color="#e2e8f0" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma transação encontrada para este período.</p>
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setTransactionToEdit(null); }}
        editingTransaction={transactionToEdit}
        activeMonth={referenceMonth}
      />

      {showDeletePrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="sys-card" style={{ width: 380, textAlign: 'center', padding: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--sys-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Excluir transação repetida?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>Esta transação faz parte de uma série recorrente. Como deseja excluí-la?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="sys-btn-secondary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => confirmDelete('single')}>APENAS DESTE MÊS</button>
              <button className="sys-btn-destructive" style={{ justifyContent: 'center', width: '100%' }} onClick={() => confirmDelete('all')}>TODOS OS MESES</button>
              <button onClick={() => setShowDeletePrompt(false)} style={{ background: 'transparent', border: 'none', marginTop: '12px', fontSize: '13px', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Transactions;
