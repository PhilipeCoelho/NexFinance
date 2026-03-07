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
    MoreHorizontal,
    PiggyBank,
    Briefcase,
    CreditCard
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import AccountModal from '@/components/AccountModal';
import TransactionModal from '@/components/TransactionModal';
import PageLayout from '@/components/PageLayout';
import { Account } from '@/types/finance';

const Accounts: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Transaction Modal State
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [preSelectedAccountId, setPreSelectedAccountId] = useState<string | null>(null);

    const data = useCurrentData();
    const { settings, updateAccount, deleteAccount } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const totalAccountsBalance = data.accounts
        .filter(acc => acc.includeInTotal && acc.status === 'active')
        .reduce((sum, acc) => sum + acc.currentBalance, 0);

    const totalOpenInvoices = data.invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + inv.totalValue, 0);

    const liquidBalance = totalAccountsBalance - totalOpenInvoices;

    const handleArchive = (id: string) => {
        if (confirm('Deseja arquivar esta conta? O histórico de transações será mantido, mas a conta não aparecerá para novas seleções.')) {
            deleteAccount(id);
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

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'savings': return <PiggyBank size={20} />;
            case 'investiment': return <Briefcase size={20} />;
            case 'cash': return <Wallet size={20} />;
            default: return <Building2 size={20} />;
        }
    };

    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">Patrimônio Líquido</div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Saldo Consolidado</span>
                <span className="sys-summary-block-value color-blue">{formatCurrency(totalAccountsBalance)}</span>
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Contas a Pagar (Faturas)</span>
                <span className="sys-summary-block-value color-red">{formatCurrency(totalOpenInvoices)}</span>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>Liquidez Disponível</span>
                <span className={`sys-summary-block-value ${liquidBalance >= 0 ? 'color-green' : 'color-red'}`} style={{ fontSize: '24px' }}>
                    {formatCurrency(liquidBalance)}
                </span>
            </div>
        </div>
    );

    const headerActions = (
        <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> NOVA CONTA
        </button>
    );

    return (
        <PageLayout title="Gestão de Contas" actions={headerActions} summaryPanel={summaryPanel}>
            {data.accounts.length > 0 ? (
                <div className="sys-grid">
                    {data.accounts.map(acc => {
                        const stats = getAccountStats(acc.id);
                        return (
                            <div key={acc.id} className={`sys-fin-card ${!acc.includeInTotal ? 'opacity-60' : ''}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: acc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: `0 4px 12px ${acc.color}40` }}>
                                            {getAccountIcon(acc.type)}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>{acc.name}</h3>
                                                {!acc.includeInTotal && <EyeOff size={12} color="#94a3b8" />}
                                            </div>
                                            <span className="sys-card-institution">{acc.institution || 'Instituição Financeira'}</span>
                                        </div>
                                    </div>
                                    <div className="sys-badge sys-badge-blue" style={{ textTransform: 'uppercase' }}>
                                        {acc.type === 'checking' ? 'Corrente' : acc.type === 'savings' ? 'Poupança' : acc.type === 'cash' ? 'Carteira' : 'Investimento'}
                                    </div>
                                </div>

                                <div style={{ margin: '8px 0' }}>
                                    <div className="sys-card-balance-label">Saldo em Conta</div>
                                    <div className="sys-financial-value" style={{ margin: 0 }}>{formatCurrency(acc.currentBalance)}</div>
                                    {acc.predictedBalance && acc.predictedBalance !== acc.currentBalance && (
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                            Previsto: <span style={{ fontWeight: 600 }}>{formatCurrency(acc.predictedBalance)}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="sys-btn-secondary"
                                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', color: 'var(--sys-green)' }}
                                        onClick={() => openTransaction('income', acc.id)}
                                    >
                                        <TrendingUp size={14} /> Receita
                                    </button>
                                    <button
                                        className="sys-btn-secondary"
                                        style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', color: 'var(--sys-red)' }}
                                        onClick={() => openTransaction('expense', acc.id)}
                                    >
                                        <TrendingDown size={14} /> Despesa
                                    </button>
                                </div>

                                <div className="sys-card-actions-row">
                                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> {stats.incomeCount}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={12} /> {stats.expenseCount}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                        <button className="sys-action-btn" onClick={() => setEditingAccount(acc)} title="Editar"><Edit3 size={16} /></button>
                                        <button className="sys-action-btn" onClick={() => updateAccount(acc.id, { includeInTotal: !acc.includeInTotal })} title={acc.includeInTotal ? "Ocultar do total" : "Mostrar no total"}>
                                            {acc.includeInTotal ? <CheckCircle2 size={16} color="var(--sys-green)" /> : <Eye size={16} />}
                                        </button>
                                        <button className="sys-action-btn delete" onClick={() => handleArchive(acc.id)} title="Arquivar"><Archive size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="sys-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#94a3b8' }}>
                        <Wallet size={40} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--sys-text-primary)', marginBottom: 12 }}>Prepare seu ecossistema</h2>
                    <p style={{ fontSize: 16, color: 'var(--sys-text-secondary)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px auto' }}>Adicione suas contas bancárias, carteiras e investimentos para ter uma visão completa do seu patrimônio.</p>
                    <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Adicionar Minha Primeira Conta
                    </button>
                </div>
            )}

            <AccountModal
                isOpen={isModalOpen || !!editingAccount}
                onClose={() => { setIsModalOpen(false); setEditingAccount(null); }}
                editingAccount={editingAccount || undefined}
            />

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
