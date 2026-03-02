import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Scale,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  Paperclip,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null);

  const data = useCurrentData();
  const { settings, updateTransaction, deleteTransaction, referenceMonth } = useFinanceStore();

  const handleEdit = (t: any) => {
    setTransactionToEdit(t);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta transação?')) {
      deleteTransaction(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const formatCurrency = (value: number) => {
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

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase());
      const matchesMonth = isTransactionInMonth(t, referenceMonth);
      return matchesSearch && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data, searchTerm, referenceMonth]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  if (!data) return null;

  return (
    <div className="expenses-page-mobills fade-in">
      <header className="mobills-page-header">
        <div className="header-left">
          <div className="breadcrumb-pill">
            <div className="icon-blue" style={{ background: 'var(--accent-primary)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={14} />
            </div>
            <span className="breadcrumb-text" style={{ color: 'var(--accent-primary)' }}>Transações</span>
            <ChevronRight size={14} opacity={0.3} />
          </div>
        </div>

        <div className="header-right">
          <button className="btn-add-mobills" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> NOVA TRANSAÇÃO
          </button>
          <button className="icon-action-btn"><Search size={18} /></button>
          <button className="icon-action-btn"><Filter size={18} /></button>
          <button className="icon-action-btn"><MoreVertical size={18} /></button>
        </div>
      </header>

      <main className="mobills-main-content">
        <div className="work-area">
          <div className="month-navigator">
            <button className="nav-arrow"><ChevronLeft size={20} /></button>
            <div className="month-display" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
              {format(new Date(referenceMonth + '-01'), "MMMM yyyy", { locale: ptBR })}
            </div>
            <button className="nav-arrow"><ChevronRight size={20} /></button>
          </div>

          <div className="mobills-table-card">
            <table className="mobills-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Situação</th>
                  <th style={{ width: '120px' }}>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Conta</th>
                  <th className="text-right">Valor</th>
                  <th style={{ width: '150px' }} className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="mobills-row">
                    <td>
                      {t.status === 'confirmed' ? (
                        <div className="status-icon success"><Check size={14} /></div>
                      ) : (
                        <div className="status-icon pending"><AlertCircle size={14} /></div>
                      )}
                    </td>
                    <td className="date-cell">{format(new Date(t.date), "dd/MM/yyyy")}</td>
                    <td className="desc-cell">{t.description}</td>
                    <td>
                      <div className="cat-cell">
                        <div className="cat-bullet" style={{ background: t.type === 'income' ? 'var(--mobills-green)' : 'var(--mobills-red)' }}></div>
                        {data.categories.find(c => c.id === t.categoryId)?.name || 'Outros'}
                      </div>
                    </td>
                    <td className="account-cell">{data.accounts?.find(a => a.id === t.accountId)?.name || 'Carteira'}</td>
                    <td className={`value-cell text-right ${t.type === 'income' ? 'green' : ''}`}>
                      {t.type === 'expense' ? '-' : ''}{formatCurrency(t.value)}
                    </td>
                    <td className="actions-cell text-right">
                      <div className="actions-group">
                        {t.status !== 'confirmed' && (
                          <button onClick={() => updateTransaction(t.id, { status: 'confirmed' })} title="Confirmar"><Check size={16} /></button>
                        )}
                        <button onClick={() => handleEdit(t)} title="Editar"><Edit3 size={16} /></button>
                        <button title="Anexar"><Paperclip size={16} /></button>
                        <button onClick={() => handleDelete(t.id)} title="Excluir"><Trash2 size={16} /></button>
                        <button><MoreVertical size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTransactions.length === 0 && (
              <div className="empty-state-mobills">
                Nenhuma transação para este mês.
              </div>
            )}

            <footer className="table-pagination">
              <span>Linhas por página: 50</span>
              <span>1-{filteredTransactions.length} de {filteredTransactions.length}</span>
            </footer>
          </div>
        </div>

        <aside className="summary-sidebar">
          <div className="summary-card-mobills">
            <div className="info">
              <span className="label">Receitas <ChevronRight size={10} /></span>
              <span className="value green" style={{ color: 'var(--mobills-green)' }}>{formatCurrency(stats.income)}</span>
            </div>
            <div className="icon-bg green" style={{ background: 'var(--mobills-green)' }}><ArrowUp size={20} /></div>
          </div>

          <div className="summary-card-mobills">
            <div className="info">
              <span className="label">Despesas <ChevronRight size={10} /></span>
              <span className="value" style={{ color: 'var(--mobills-red)' }}>{formatCurrency(stats.expenses)}</span>
            </div>
            <div className="icon-bg red"><ArrowDown size={20} /></div>
          </div>

          <div className="summary-card-mobills">
            <div className="info">
              <span className="label">Balanço <ChevronRight size={10} /></span>
              <span className="value">{formatCurrency(stats.balance)}</span>
            </div>
            <div className="icon-bg" style={{ background: '#718096' }}><Scale size={20} /></div>
          </div>
        </aside>
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingTransaction={transactionToEdit}
      />
    </div>
  );
};

export default Transactions;
