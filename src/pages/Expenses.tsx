import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    TrendingDown,
    CheckCircle2,
    AlertCircle,
    Edit3,
    Trash2,
    ArrowUp,
    ArrowDown,
    Scale,
    MoreVertical,
    Filter,
    ChevronLeft,
    ChevronRight,
    Check,
    Paperclip
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';

const Expenses: React.FC = () => {
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
        if (confirm('Deseja excluir esta despesa?')) {
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

    const filteredExpenses = useMemo(() => {
        if (!data?.transactions) return [];
        return data.transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const desc = (t.description || '').toLowerCase();
            const matchesSearch = desc.includes(searchTerm.toLowerCase());
            const matchesMonth = isTransactionInMonth(t, referenceMonth);
            return matchesSearch && matchesMonth;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data, searchTerm, referenceMonth]);

    const stats = useMemo(() => {
        const pending = filteredExpenses.filter(t => t.status !== 'confirmed').reduce((acc, t) => acc + t.value, 0);
        const paid = filteredExpenses.filter(t => t.status === 'confirmed').reduce((acc, t) => acc + t.value, 0);
        return { pending, paid, total: pending + paid };
    }, [filteredExpenses]);

    if (!data) return null;

    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill">
                        <div className="icon-red"><TrendingDown size={14} /></div>
                        <span className="breadcrumb-text">Despesas</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>

                <div className="header-right">
                    <button className="btn-add-mobills" onClick={() => setIsModalOpen(true)}>
                        <Plus size={14} /> NOVA DESPESA
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>

            <main className="mobills-main-content">
                <div className="work-area">
                    {/* Month Navigation */}
                    <div className="month-navigator">
                        <button className="nav-arrow"><ChevronLeft size={20} /></button>
                        <div className="month-display">
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
                                {filteredExpenses.map(t => (
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
                                                <div className="cat-bullet" style={{ background: 'var(--mobills-red)' }}></div>
                                                {data.categories.find(c => c.id === t.categoryId)?.name || 'Outros'}
                                            </div>
                                        </td>
                                        <td className="account-cell">{data.accounts.find(a => a.id === t.accountId)?.name || 'Carteira'}</td>
                                        <td className="value-cell text-right">{formatCurrency(t.value)}</td>
                                        <td className="actions-cell text-right">
                                            <div className="actions-group">
                                                {t.status !== 'confirmed' && (
                                                    <button onClick={() => updateTransaction(t.id, { status: 'confirmed' })} title="Pagar"><Check size={16} /></button>
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

                        {filteredExpenses.length === 0 && (
                            <div className="empty-state-mobills">
                                Nenhuma despesa para este mês.
                            </div>
                        )}

                        <footer className="table-pagination">
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
                        <div className="icon-bg red"><ArrowUp size={20} /></div>
                    </div>

                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Despesas pagas <ChevronRight size={10} /></span>
                            <span className="value">{formatCurrency(stats.paid)}</span>
                        </div>
                        <div className="icon-bg red-dark"><ArrowDown size={20} /></div>
                    </div>

                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Total <ChevronRight size={10} /></span>
                            <span className="value">{formatCurrency(stats.total)}</span>
                        </div>
                        <div className="icon-bg scale"><Scale size={20} /></div>
                    </div>
                </aside>
            </main>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                forcedType="expense"
                editingTransaction={transactionToEdit}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
        .expenses-page-mobills { display: flex; flex-direction: column; gap: 20px; min-height: 100vh; background: #f8fafc; }
        
        .mobills-page-header { 
          padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
          background: white; border-bottom: 1px solid #edf2f7;
        }
        .breadcrumb-pill { 
          display: flex; align-items: center; gap: 8px; background: #fef2f2; 
          padding: 6px 16px; border-radius: 20px; cursor: pointer;
        }
        .icon-red { background: var(--mobills-red); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .breadcrumb-text { font-weight: 700; color: var(--mobills-red); font-size: 13px; }

        .header-right { display: flex; align-items: center; gap: 12px; }
        .btn-add-mobills { 
          background: white; border: 1px solid #edf2f7; padding: 8px 16px; 
          border-radius: 20px; font-weight: 700; font-size: 11px; color: var(--mobills-red);
          display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .icon-action-btn { background: white; border: 1px solid #edf2f7; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #718096; cursor: pointer; }

        .mobills-main-content { display: grid; grid-template-columns: 1fr 300px; gap: 24px; padding: 0 24px 40px 24px; }
        
        .month-navigator { 
          display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px;
        }
        .month-display { 
          background: white; border: 1px solid var(--mobills-red); color: var(--mobills-red);
          padding: 6px 32px; border-radius: 20px; font-weight: 700; text-transform: capitalize; font-size: 14px;
        }
        .nav-arrow { color: var(--mobills-red); background: transparent; border: none; cursor: pointer; }

        .mobills-table-card { background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); overflow: hidden; }
        .mobills-table { width: 100%; border-collapse: collapse; }
        .mobills-table th { 
          padding: 16px 20px; text-align: left; background: #fcfcfc; border-bottom: 1px solid #f1f1f1;
          font-size: 11px; font-weight: 700; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .mobills-row { transition: 0.2s; }
        .mobills-row:hover { background: #f9fafb; }
        .mobills-row td { padding: 14px 20px; border-bottom: 1px solid #f1f1f1; vertical-align: middle; }

        .status-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; }
        .status-icon.pending { background: #ff4d4d; }
        .status-icon.success { background: #3fb950; }

        .date-cell { font-size: 12px; color: #4a5568; }
        .desc-cell { font-weight: 600; font-size: 13px; color: #2d3748; }
        .cat-cell { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4a5568; font-weight: 500; }
        .cat-bullet { width: 8px; height: 8px; border-radius: 50%; }
        .account-cell { font-size: 13px; color: #718096; }
        .value-cell { font-weight: 700; color: #ff4d4d; font-size: 14px; font-family: var(--font-display); }

        .actions-group { display: flex; gap: 8px; justify-content: flex-end; color: #a0aec0; }
        .actions-group button { background: transparent; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px; transition: 0.2s; }
        .actions-group button:hover { color: #2d3748; background: #edf2f7; }

        .text-right { text-align: right; }
        .table-pagination { padding: 12px 20px; display: flex; justify-content: flex-end; gap: 24px; font-size: 11px; color: #a0aec0; font-weight: 600; }

        .summary-sidebar { display: flex; flex-direction: column; gap: 16px; }
        .summary-card-mobills { 
          background: white; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #f1f1f1;
        }
        .summary-card-mobills .info { display: flex; flex-direction: column; gap: 4px; }
        .summary-card-mobills .label { font-size: 11px; font-weight: 600; color: #a0aec0; display: flex; align-items: center; gap: 4px; }
        .summary-card-mobills .value { font-size: 16px; font-weight: 800; color: #2d3748; font-family: var(--font-display); }
        
        .icon-bg { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; }
        .icon-bg.red { background: #ff4d4d; }
        .icon-bg.red-dark { background: #e53e3e; }
        .icon-bg.scale { background: #ee5a5a; }

        .empty-state-mobills { padding: 40px; text-align: center; color: #a0aec0; font-size: 13px; font-weight: 500; }
        `}} />
        </div>
    );
};

export default Expenses;
