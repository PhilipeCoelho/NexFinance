import React, { useState } from 'react';
import {
    Wallet,
    Plus,
    TrendingUp,
    TrendingDown,
    ArrowRightLeft,
    AlertCircle,
    Edit3,
    Trash2,
    Eye,
    EyeOff,
    Building2,
    CheckCircle2,
    Archive,
    Save,
    X,
    MoreHorizontal
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import AccountModal from '@/components/AccountModal';
import TransactionModal from '@/components/TransactionModal';
import { Account } from '@/types/finance';

const Accounts: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Account>>({});

    // Transaction Modal State
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | null>(null);

    const data = useCurrentData();
    const { settings, updateAccount, deleteAccount } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency }).format(value);
    };

    const totalAccountsBalance = data.accounts
        .filter(acc => acc.includeInTotal && acc.status === 'active')
        .reduce((sum, acc) => sum + acc.currentBalance, 0);

    const totalOpenInvoices = data.invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.totalValue, 0);

    const liquidBalance = totalAccountsBalance - totalOpenInvoices;

    const startEditing = (acc: Account) => {
        setEditingId(acc.id);
        setEditForm(acc);
    };

    const handleSaveInline = () => {
        if (editingId) {
            updateAccount(editingId, editForm);
            setEditingId(null);
        }
    };

    const handleArchive = (id: string) => {
        if (confirm('Deseja arquivar esta conta? O histórico de transações será mantido, mas a conta não aparecerá para novas seleções.')) {
            deleteAccount(id); // Store logic handles archiving if history exists
        }
    };

    const getAccountStats = (accountId: string) => {
        const accTransactions = data.transactions.filter(t => t.accountId === accountId || t.toAccountId === accountId);
        return {
            incomeCount: accTransactions.filter(t => t.type === 'income').length,
            expenseCount: accTransactions.filter(t => t.type === 'expense').length,
            transferCount: accTransactions.filter(t => t.type === 'transfer').length,
        };
    };

    const openTransaction = (type: 'income' | 'expense', accountId: string) => {
        setTransactionType(type);
        setPreSelectedAccountId(accountId);
        setIsTransactionModalOpen(true);
    };

    return (
        <div className="accounts-page fade-in">
            {data.accounts.length > 0 ? (
                <>
                    <header className="page-header desktop-header">
                        <div className="header-titles">
                            <h1 className="page-title">Minhas Contas</h1>
                            <div className="header-badge">
                                <Building2 size={12} />
                                <span>{data.accounts.length} Instituições</span>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                                <Plus size={14} /><span>Adicionar nova conta</span>
                            </button>
                        </div>
                    </header>

                    <div className="accounts-dashboard-header card premium-glass">
                        <div className="dash-kpi">
                            <span className="dash-label">Saldo em Contas</span>
                            <span className="dash-value">{formatCurrency(totalAccountsBalance)}</span>
                        </div>
                        <div className="dash-divider"></div>
                        <div className="dash-kpi">
                            <span className="dash-label">Faturas Abertas</span>
                            <span className="dash-value text-error">{formatCurrency(totalOpenInvoices)}</span>
                        </div>
                        <div className="dash-divider"></div>
                        <div className="dash-kpi highlight">
                            <span className="dash-label">Liquidez Real</span>
                            <span className="dash-value text-accent">{formatCurrency(liquidBalance)}</span>
                        </div>
                    </div>

                    <div className="accounts-grid">
                        {data.accounts.map(acc => {
                            const isEditing = editingId === acc.id;
                            const stats = getAccountStats(acc.id);

                            if (isEditing) {
                                return (
                                    <div key={acc.id} className="account-card card editing expanded shadow-lg">
                                        <div className="edit-form-inline">
                                            <header className="edit-header">
                                                <div className="bank-logo-box-mini" style={{ backgroundColor: acc.color }}>
                                                    <Building2 size={16} color="white" />
                                                </div>
                                                <span className="edit-title">Editando {acc.name}</span>
                                            </header>

                                            <div className="edit-inputs-grid">
                                                <div className="edit-field">
                                                    <label>Nome da Conta</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.name}
                                                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="edit-field">
                                                    <label>Saldo Inicial</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.initialBalance}
                                                        onChange={e => setEditForm(p => ({ ...p, initialBalance: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div className="edit-field">
                                                    <label>Saldo Atual</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.currentBalance}
                                                        onChange={e => setEditForm(p => ({ ...p, currentBalance: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div className="edit-field">
                                                    <label>Tipo</label>
                                                    <select
                                                        value={editForm.type}
                                                        onChange={e => setEditForm(p => ({ ...p, type: e.target.value as any }))}
                                                    >
                                                        <option value="checking">Corrente</option>
                                                        <option value="savings">Poupança</option>
                                                        <option value="cash">Carteira</option>
                                                        <option value="investment">Investimento</option>
                                                    </select>
                                                </div>
                                                <div className="edit-field toggle-inline">
                                                    <label>Dashboard</label>
                                                    <button
                                                        className={`toggle-btn-sm ${editForm.includeInTotal ? 'active' : ''}`}
                                                        onClick={() => setEditForm(p => ({ ...p, includeInTotal: !p.includeInTotal }))}
                                                    >
                                                        <div className="thumb"></div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="edit-actions-footer">
                                                <button className="btn-text" onClick={() => setEditingId(null)}><X size={14} /> Cancelar</button>
                                                <button className="btn btn-primary btn-dense" onClick={handleSaveInline}><Save size={14} /> Salvar Alt.</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={acc.id} className={`account-card card ${!acc.includeInTotal ? 'inactive-visibility' : ''} ${acc.status === 'archived' ? 'archived-card' : ''}`}>
                                    <div className="card-top">
                                        <div className="bank-logo-round" style={{ backgroundColor: acc.color }}>
                                            <Building2 size={22} color="white" />
                                        </div>
                                        <div className="bank-meta">
                                            <h3 className="acc-name-label">{acc.name}</h3>
                                            <span className="acc-institution-label">{acc.institution} • {acc.type}</span>
                                        </div>
                                        <div className="visibility-badge">
                                            {acc.includeInTotal ? <CheckCircle2 size={12} className="text-success" /> : <EyeOff size={12} color="var(--text-secondary)" />}
                                        </div>
                                    </div>

                                    <div className="card-balance-section">
                                        <div className="main-balance">
                                            <span className="balance-val">{formatCurrency(acc.currentBalance)}</span>
                                            <span className="balance-label">Saldo Atual</span>
                                        </div>
                                        <div className="predicted-balance">
                                            <span className="predicted-val">{formatCurrency(acc.predictedBalance || acc.currentBalance)}</span>
                                            <span className="predicted-label">Previsto</span>
                                        </div>
                                    </div>

                                    <div className="card-quick-actions">
                                        <button className="btn-quick-add income" onClick={() => openTransaction('income', acc.id)}>
                                            <TrendingUp size={14} /> <span>Receita</span>
                                        </button>
                                        <button className="btn-quick-add expense" onClick={() => openTransaction('expense', acc.id)}>
                                            <TrendingDown size={14} /> <span>Despesa</span>
                                        </button>
                                    </div>

                                    <div className="card-metrics-row">
                                        <div className="metric" title="Transferências">
                                            <ArrowRightLeft size={12} /> <span>{stats.transferCount} Transf.</span>
                                        </div>
                                    </div>

                                    <div className="card-actions-footer">
                                        <button className="action-btn" title="Editar" onClick={() => startEditing(acc)}>
                                            <Edit3 size={14} /> <span>Editar</span>
                                        </button>
                                        <button className="action-btn" title="Transferir">
                                            <ArrowRightLeft size={14} /> <span>Transferir</span>
                                        </button>
                                        <button className="action-btn" title="Ocultar/Arquivar" onClick={() => handleArchive(acc.id)}>
                                            <Archive size={14} /> <span>Arquivar</span>
                                        </button>
                                        <button
                                            className="action-btn-icon"
                                            onClick={() => updateAccount(acc.id, { includeInTotal: !acc.includeInTotal })}
                                            title={acc.includeInTotal ? "Ocultar do total" : "Mostrar no total"}
                                        >
                                            {acc.includeInTotal ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="empty-state-welcome fade-in">
                    <div className="welcome-content">
                        <header className="welcome-header">
                            <h1 className="welcome-title">Contas</h1>
                            <p className="welcome-subtitle">Gerencie onde o seu dinheiro realmente está</p>
                        </header>

                        <div className="welcome-cta-box glass shadow-2xl">
                            <div className="icon-pulse">
                                <Wallet size={48} className="text-accent-primary" />
                            </div>
                            <h3>Pronto para organizar seu saldo?</h3>
                            <button className="btn btn-primary btn-lg" onClick={() => setIsModalOpen(true)}>
                                <Plus size={18} /> <span>Adicionar conta</span>
                            </button>
                            <div className="welcome-hints">
                                <p>Crie contas bancárias, carteiras, poupança ou contas manuais.</p>
                                <p className="small">Nada é sincronizado sem sua permissão.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                forcedType={transactionType}
                defaultAccountId={preSelectedAccountId || undefined}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .accounts-page { padding-bottom: 2rem; }
                
                /* Dashboard Header */
                .accounts-dashboard-header { 
                    display: flex; align-items: center; gap: 0; padding: 24px; 
                    background: var(--bg-secondary); border-radius: 20px;
                    margin-bottom: 24px; border: 1px solid var(--border-light);
                }
                .dash-kpi { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0 24px; }
                .dash-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em; }
                .dash-value { font-size: 1.8rem; font-weight: 700; font-family: var(--font-display); color: var(--text-primary); letter-spacing: -0.01em; }
                .dash-divider { width: 1px; height: 40px; background: var(--border-light); }
                .dash-kpi.highlight .dash-value { color: var(--accent-primary); font-weight: 800; }

                /* Header Actions */
                .page-header { margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
                .header-titles { display: flex; flex-direction: column; gap: 4px; }
                .page-title { font-size: 1.5rem; font-weight: 700; font-family: var(--font-display); }
                .header-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(0,0,0,0.03); border-radius: 20px; font-size: 10px; font-weight: 700; color: var(--accent-primary); border: 1px solid var(--border-light); width: fit-content; }

                /* Grid & Cards */
                .accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
                
                .account-card { 
                    display: flex; flex-direction: column; gap: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid var(--border-light); border-radius: 24px; padding: 24px; background: var(--bg-secondary);
                }
                .account-card:hover { border-color: var(--accent-primary); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
                
                .card-top { display: flex; align-items: center; gap: 12px; }
                .bank-logo-round { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .acc-name-label { font-size: 1.1rem; font-weight: 700; font-family: var(--font-display); }
                .acc-institution-label { font-size: 10px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }

                .card-balance-section { display: flex; align-items: flex-end; justify-content: space-between; margin: 8px 0; border-top: 1px solid var(--border-light); padding-top: 16px; }
                .balance-val { font-size: 1.8rem; font-weight: 700; font-family: var(--font-display); letter-spacing: -0.01em; }
                .balance-label { font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; }
                
                .predicted-balance { text-align: right; opacity: 0.7; }
                .predicted-val { font-size: 0.9rem; font-weight: 700; font-family: var(--font-display); }
                .predicted-label { font-size: 8px; font-weight: 600; text-transform: uppercase; }

                .card-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 0; border-top: 1px solid var(--border-light); }
                .btn-quick-add { 
                    display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; 
                    border-radius: 12px; font-size: 11px; font-weight: 700; transition: all 0.2s;
                    border: 1px solid var(--border-light); background: var(--bg-primary); cursor: pointer;
                }
                .btn-quick-add.income:hover { background: var(--success); color: white; border-color: var(--success); }
                .btn-quick-add.expense:hover { background: var(--error); color: white; border-color: var(--error); }

                .card-metrics-row { display: flex; padding-top: 8px; border-top: 1px solid var(--border-light); }
                .metric { font-size: 10px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }

                .card-actions-footer { 
                    margin-top: auto; display: flex; align-items: center; justify-content: space-between; 
                    padding-top: 16px; border-top: 1px solid var(--border-light);
                }
                .action-btn { font-size: 11px; font-weight: 700; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; background: transparent; }
                .action-btn:hover { color: var(--text-primary); }

                .text-error { color: var(--error); }
                .text-accent { color: var(--accent-primary); }
                .action-btn-icon { background: transparent; color: var(--text-secondary); padding: 4px; border-radius: 4px; }
                .action-btn-icon:hover { background: var(--border-light); color: var(--text-primary); }

                /* Inline Editing */
                .account-card.editing.expanded { min-height: 260px; border-color: var(--accent-primary); background: var(--bg-tertiary); }
                .edit-form-inline { display: flex; flex-direction: column; gap: 16px; height: 100%; }
                .edit-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .bank-logo-box-mini { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                .edit-title { font-size: 12px; font-weight: 700; color: var(--accent-primary); }

                .edit-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .edit-field { display: flex; flex-direction: column; gap: 4px; }
                .edit-field label { font-size: 9px; text-transform: uppercase; color: var(--text-secondary); }
                .edit-field input, .edit-field select { padding: 6px 10px; font-size: 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); }
                
                .toggle-inline { flex-direction: row; align-items: center; justify-content: space-between; grid-column: span 2; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; }
                .toggle-btn-sm { width: 32px; height: 16px; background: var(--border); border-radius: 8px; position: relative; }
                .toggle-btn-sm.active { background: var(--success); }
                .toggle-btn-sm .thumb { width: 12px; height: 12px; background: white; border-radius: 50%; position: absolute; left: 2px; top: 2px; transition: left 0.2s; }
                .toggle-btn-sm.active .thumb { left: 18px; }

                .edit-actions-footer { margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; }
                .btn-text { background: transparent; font-size: 11px; color: var(--text-secondary); }
                .btn-dense { padding: 6px 12px; font-size: 11px; }

                .text-error { color: var(--error); }
                .text-accent { color: var(--accent-primary); }
            `}} />
        </div>
    );
};

export default Accounts;
