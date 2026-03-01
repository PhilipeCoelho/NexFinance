import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CreditCard as CreditCardIcon,
  TrendingUp,
  TrendingDown,
  Pin,
  EyeOff,
  Repeat
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';

interface TransactionsProps {
  forcedType?: 'income' | 'expense' | 'transfer';
}

const Transactions: React.FC<TransactionsProps> = ({ forcedType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'category' | 'origin' | 'status' | 'reconciled' | 'value' | null, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  const data = useCurrentData();
  const { settings, currentContext, updateTransaction, deleteTransaction, referenceMonth } = useFinanceStore();

  const handleEdit = (t: any) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
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

  const getEffectiveStatus = (t: any): string => {
    if (!t || !t.date) return 'forecast';
    if (!t.isRecurring && !t.isFixed) return t.status || 'forecast';
    const originalMonth = t.date.slice(0, 7);
    if (originalMonth === referenceMonth) return t.status || 'forecast';
    return 'forecast';
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

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const cat = data.categories?.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';
      const proj = t.projectId && data.projects?.find(p => p.id === t.projectId)?.name?.toLowerCase() || '';

      const search = searchTerm.toLowerCase();
      const matchesSearch = desc.includes(search) || cat.includes(search) || proj.includes(search);
      const matchesType = !forcedType || t.type === forcedType;
      const matchesMonth = isTransactionInMonth(t, referenceMonth);

      return matchesSearch && matchesType && matchesMonth;
    });
  }, [data, searchTerm, forcedType, referenceMonth]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;

      if (sortConfig.key === 'date') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
      }
      if (sortConfig.key === 'category') {
        const catA = data?.categories?.find(c => c.id === a.categoryId)?.name || '';
        const catB = data?.categories?.find(c => c.id === b.categoryId)?.name || '';
        return catA.localeCompare(catB) * dir;
      }
      if (sortConfig.key === 'origin') {
        const getOrg = (t: any) => t.accountId
          ? data?.accounts?.find(acc => acc.id === t.accountId)?.name || ''
          : data?.creditCards?.find(cc => cc.id === t.creditCardId)?.name || '';
        return getOrg(a).localeCompare(getOrg(b)) * dir;
      }
      if (sortConfig.key === 'status') {
        return getEffectiveStatus(a).localeCompare(getEffectiveStatus(b)) * dir;
      }
      if (sortConfig.key === 'reconciled') {
        return ((a.reconciled ? 1 : 0) - (b.reconciled ? 1 : 0)) * dir;
      }
      if (sortConfig.key === 'value') {
        return (a.value - b.value) * dir;
      }
      return 0;
    });
  }, [filteredTransactions, sortConfig, data]);

  const totalTransactions = sortedTransactions.length;
  const reconciledCount = sortedTransactions.filter(t => t.reconciled).length;
  const reconciliationProgress = totalTransactions > 0 ? (reconciledCount / totalTransactions) * 100 : 0;

  const handleSort = (key: any) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (!data) return null;

  return (
    <div className="transactions-page fade-in">
      <header className="page-header">
        <div className="header-titles">
          <div className="title-with-icon">
            <div className="title-left">
              {forcedType === 'income' && <TrendingUp className="text-success" size={28} />}
              {forcedType === 'expense' && <TrendingDown className="text-error" size={28} />}
              <h1 className="page-title">{forcedType === 'income' ? 'Receitas' : forcedType === 'expense' ? 'Despesas' : 'Transações'}</h1>
            </div>
            <div className="title-divider"></div>
            <MonthSelector />
          </div>
          <p className="page-subtitle">
            {forcedType === 'income' ? 'Gestão de entradas e faturamentos' : forcedType === 'expense' ? 'Controle de saídas e queima de caixa' : 'Histórico completo'}
          </p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /><span>Novo</span>
          </button>
        </div>
      </header>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        forcedType={forcedType}
        editingTransaction={transactionToEdit}
      />

      <div className="verification-summary glass">
        <div className="verif-info">
          <span className="verif-label">Progresso de Reconciliação</span>
          <span className="verif-stats">{reconciledCount} de {totalTransactions} verificadas</span>
        </div>
        <div className="verif-progress-bg">
          <div className="verif-progress-fill" style={{ width: `${reconciliationProgress}%` }}></div>
        </div>
      </div>

      <div className="transactions-table-container card">
        <table className="transactions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('reconciled')} style={{ width: '40px' }}>Ok</th>
              <th onClick={() => handleSort('date')}>Data</th>
              <th onClick={() => handleSort('description')}>Descrição</th>
              <th onClick={() => handleSort('category')}>Categoria</th>
              <th onClick={() => handleSort('origin')}>Origem</th>
              <th className="text-right" onClick={() => handleSort('value')}>Valor</th>
              <th style={{ width: '80px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(sortedTransactions.length > 0) ? sortedTransactions.map(t => (
              <tr key={t.id}>
                <td className="text-center">
                  <button
                    className={`reconcile-btn ${t.reconciled ? 'active' : ''}`}
                    onClick={() => updateTransaction(t.id, { reconciled: !t.reconciled })}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                </td>
                <td className="date-cell">
                  {(() => {
                    try {
                      return format(new Date(t.date), "dd/MM/yy");
                    } catch (e) {
                      return 'N/A';
                    }
                  })()}
                </td>
                <td className="desc-cell">
                  {t.description}
                  {t.isFixed && <Pin size={10} style={{ marginLeft: 4, opacity: 0.5 }} />}
                </td>
                <td>{data.categories?.find(c => c.id === t.categoryId)?.name || 'Sem Categoria'}</td>
                <td>
                  {t.accountId
                    ? data.accounts?.find(a => a.id === t.accountId)?.name
                    : data.creditCards?.find(cc => cc.id === t.creditCardId)?.name || 'N/A'}
                </td>
                <td className={`text-right value-cell ${t.type}`}>
                  {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.value)}
                </td>
                <td>
                  <div className="btn-group-table">
                    <button className="btn-icon-table edit" onClick={() => handleEdit(t)}><Edit3 size={14} /></button>
                    <button className="btn-icon-table delete" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="text-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
                  Nenhuma transação encontrada neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .transactions-page { display: flex; flex-direction: column; gap: 12px; }
        .page-header { margin-bottom: 0px; padding: 0 4px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header-titles { display: flex; flex-direction: column; gap: 4px; }
        .title-with-icon { display: flex; align-items: center; gap: 12px; }
        .title-left { display: flex; align-items: center; gap: 10px; }
        .title-divider { height: 24px; width: 1px; background-color: var(--border); margin: 0 4px; }
        .page-title { font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }
        .page-subtitle { font-size: 11px; color: var(--text-secondary); }
        
        .header-actions { display: flex; align-items: center; gap: 12px; }
        .search-bar { 
          display: flex; align-items: center; gap: 10px; padding: 0 12px;
          background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 10px; height: 36px; width: 240px; color: var(--text-secondary);
        }
        .search-bar input { background: transparent; border: none; font-size: 12px; color: var(--text-primary); width: 100%; outline: none; }
        
        .verification-summary { 
          padding: 12px 16px; border-radius: 12px; background: var(--bg-secondary);
          display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border-light);
        }
        .verif-info { display: flex; justify-content: space-between; align-items: center; }
        .verif-label { font-size: 10px; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; letter-spacing: 0.05em; }
        .verif-stats { font-size: 12px; font-weight: 700; color: var(--accent-primary); }
        .verif-progress-bg { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
        .verif-progress-fill { height: 100%; background: var(--success); transition: width 0.4s ease; }

        .transactions-table-container { overflow: hidden; border-radius: 12px; }
        .transactions-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .transactions-table th { 
          text-align: left; padding: 12px 16px; background: var(--bg-tertiary); 
          color: var(--text-secondary); font-weight: 600; font-size: 11px; 
          text-transform: uppercase; cursor: pointer; user-select: none;
        }
        .transactions-table th:hover { color: var(--text-primary); }
        .transactions-table td { padding: 10px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
        .transactions-table tr:hover { background-color: var(--bg-tertiary); }
        
        .reconcile-btn { 
          width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border);
          background: transparent; color: var(--text-secondary); opacity: 0.3;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .reconcile-btn.active { opacity: 1; color: var(--success); border-color: var(--success); background: rgba(63, 185, 80, 0.1); }
        .reconcile-btn:hover { opacity: 1; border-color: var(--accent-primary); }

        .date-cell { font-family: monospace; color: var(--text-secondary); font-size: 12px; }
        .desc-cell { font-weight: 600; color: var(--text-primary); }
        .value-cell { font-weight: 700; font-family: var(--font-display); }
        .value-cell.income { color: var(--success); }
        .value-cell.expense { color: var(--error); }
        .value-cell.transfer { color: var(--accent-primary); }

        .btn-group-table { display: flex; gap: 4px; }
        .btn-icon-table { 
          width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
          background: var(--bg-tertiary); color: var(--text-secondary); transition: all 0.2s;
        }
        .btn-icon-table:hover.edit { background: var(--accent-primary); color: white; }
        .btn-icon-table:hover.delete { background: var(--error); color: white; }
        `}} />
    </div>
  );
};

export default Transactions;
