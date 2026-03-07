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
import PageLayout from '@/components/PageLayout';
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

    const summaryPanel = (
        <>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Saldo em Contas</span>
                    <span className="sys-summary-value">{formatCurrency(totalAccountsBalance)}</span>
                </div>
                <div className="sys-summary-icon-box" style={{ backgroundColor: '#slate-400' }}><Wallet size={24} color="#64748b" /></div>
            </div>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Faturas Abertas</span>
                    <span className="sys-summary-value color-red">{formatCurrency(totalOpenInvoices)}</span>
                </div>
                <div className="sys-summary-icon-box bg-red"><AlertCircle size={24} /></div>
            </div>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Liquidez Real</span>
                    <span className="sys-summary-value color-green">{formatCurrency(liquidBalance)}</span>
                </div>
                <div className="sys-summary-icon-box bg-green"><TrendingUp size={24} /></div>
            </div>
        </>
    );

    return (
        <PageLayout title="Contas" summaryPanel={summaryPanel}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={16} /> NOVA CONTA
                </button>
            </div>

            {data.accounts.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {data.accounts.map(acc => {
                        const isEditing = editingId === acc.id;
                        const stats = getAccountStats(acc.id);

                        if (isEditing) {
                            return (
                                <div key={acc.id} className="sys-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--sys-primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: acc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={14} color="white" />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sys-primary)' }}>Editando {acc.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>Nome</label>
                                            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: 13 }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>Saldo Inicial</label>
                                            <input type="number" value={editForm.initialBalance} onChange={e => setEditForm(p => ({ ...p, initialBalance: Number(e.target.value) }))} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: 13 }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>Saldo Atual</label>
                                            <input type="number" value={editForm.currentBalance} onChange={e => setEditForm(p => ({ ...p, currentBalance: Number(e.target.value) }))} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: 13 }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: 6 }}>
                                            <label style={{ fontSize: 12, color: '#64748b' }}>Incluir no Total</label>
                                            <input type="checkbox" checked={editForm.includeInTotal} onChange={e => setEditForm(p => ({ ...p, includeInTotal: e.target.checked }))} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                                        <button className="sys-btn-primary" onClick={handleSaveInline} style={{ padding: '6px 12px', fontSize: 12 }}>Salvar</button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={acc.id} className="sys-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: acc.includeInTotal ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: acc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={20} color="white" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1d21' }}>{acc.name}</h3>
                                            <p style={{ fontSize: 12, color: '#64748b' }}>{acc.institution} • {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'cash' ? 'Carteira' : 'Investimento'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => updateAccount(acc.id, { includeInTotal: !acc.includeInTotal })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: acc.includeInTotal ? '#10b981' : '#cbd5e1' }} title={acc.includeInTotal ? "Ocultar do total" : "Mostrar no total"}>
                                        {acc.includeInTotal ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                                    </button>
                                </div>

                                <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1d21', letterSpacing: '-0.5px' }}>{formatCurrency(acc.currentBalance)}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Saldo Atual</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{formatCurrency(acc.predictedBalance || acc.currentBalance)}</div>
                                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Previsto</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="sys-btn-primary" style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#10b981', justifyContent: 'center' }} onClick={() => openTransaction('income', acc.id)}>
                                        <TrendingUp size={14} /> Receita
                                    </button>
                                    <button className="sys-btn-primary" style={{ flex: 1, backgroundColor: '#f1f5f9', color: 'var(--sys-red)', justifyContent: 'center' }} onClick={() => openTransaction('expense', acc.id)}>
                                        <TrendingDown size={14} /> Despesa
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <ArrowRightLeft size={12} /> {stats.transferCount} Transf.
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => startEditing(acc)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', fontWeight: 600 }}><Edit3 size={14} /> Editar</button>
                                        <button onClick={() => handleArchive(acc.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', fontWeight: 600 }}><Archive size={14} /> Arquivar</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <Wallet size={32} color="#64748b" />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1d21', marginBottom: 8 }}>Nenhuma conta criada</h2>
                    <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px auto' }}>Adicione suas contas bancárias, carteira ou investimentos para começar a controlar seu saldo.</p>
                    <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Adicionar Conta
                    </button>
                </div>
            )}

            <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                forcedType={transactionType}
                defaultAccountId={preSelectedAccountId || undefined}
            />
        </PageLayout>
    );
};

export default Accounts;
