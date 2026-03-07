import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    CreditCard as CardIcon,
    Edit3,
    Trash2,
    Calendar,
    CheckCircle2,
    AlertCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    MoreVertical,
    TrendingDown,
    Activity,
    CreditCard
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import PageLayout from '@/components/PageLayout';
import TransactionModal from '@/components/TransactionModal';
import CreditCardModal from '@/components/CreditCardModal';
import { CreditCard as ICreditCard } from '@/types/finance';

const Cards: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<ICreditCard | null>(null);

    const data = useCurrentData();
    const { settings, deleteCreditCard } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const filteredCards = useMemo(() => {
        if (!data?.creditCards) return [];
        return data.creditCards.filter(card => {
            const name = (card.name || '').toLowerCase();
            const institution = (card.institution || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase()) || institution.includes(searchTerm.toLowerCase());
        });
    }, [data, searchTerm]);

    const stats = useMemo(() => {
        const totalLimit = filteredCards.reduce((acc, curr) => acc + curr.limitTotal, 0);
        const available = filteredCards.reduce((acc, curr) => acc + curr.limitAvailable, 0);
        const used = totalLimit - available;
        return { totalLimit, available, used };
    }, [filteredCards]);

    const openRegisterExpense = (cardId: string) => {
        setSelectedCardId(cardId);
        setIsTransactionModalOpen(true);
    };

    const handleEditCard = (card: ICreditCard) => {
        setEditingCard(card);
        setIsCardModalOpen(true);
    };

    const handleDeleteCard = (id: string) => {
        if (confirm('Deseja excluir este cartão? Todas as faturas e transações associadas serão mantidas, mas o cartão deixará de aparecer.')) {
            deleteCreditCard(id);
        }
    };

    if (!data) return null;

    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">Consolidado de Crédito</div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Limite em Uso</span>
                <span className="sys-summary-block-value color-red">{formatCurrency(stats.used)}</span>
                <div className="sys-progress-bar-bg">
                    <div className="sys-progress-bar-fill bg-red" style={{ width: `${(stats.used / stats.totalLimit) * 100 || 0}%` }} />
                </div>
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Limite Disponível</span>
                <span className="sys-summary-block-value color-green">{formatCurrency(stats.available)}</span>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>Poder de Compra Total</span>
                <span className="sys-summary-block-value" style={{ fontSize: '24px', color: 'var(--sys-primary)' }}>
                    {formatCurrency(stats.totalLimit)}
                </span>
            </div>
        </div>
    );

    const headerActions = (
        <button className="sys-btn-primary" onClick={() => setIsCardModalOpen(true)}>
            <Plus size={18} /> NOVO CARTÃO
        </button>
    );

    return (
        <PageLayout title="Gestão de Cartões" actions={headerActions} summaryPanel={summaryPanel}>
            <div className="sys-filters-row" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ padding: '6px 14px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--sys-blue)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CardIcon size={14} /> GERENCIANDO {filteredCards.length} CARTÕES
                    </div>
                </div>
                <div className="sys-search-input-wrapper">
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 12 }} />
                    <input
                        type="text"
                        className="sys-search-input"
                        placeholder="Buscar por nome ou banco..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredCards.length > 0 ? (
                <div className="sys-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
                    {filteredCards.map(card => {
                        const currentInvoice = data.invoices?.find(inv => inv.creditCardId === card.id && inv.status === 'open');
                        const invoiceValue = currentInvoice ? currentInvoice.totalValue : 0;
                        const usedLimit = card.limitTotal - card.limitAvailable;
                        const percentUsed = (usedLimit / card.limitTotal) * 100;

                        return (
                            <div key={card.id} className="sys-fin-card" style={{ padding: 0 }}>
                                <div className="sys-credit-card-visual" style={{ backgroundColor: card.color || '#1e293b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>{card.institution || 'Banco'}</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{card.name}</div>
                                        </div>
                                        <CardIcon size={24} opacity={0.6} />
                                    </div>

                                    <div style={{ zIndex: 1 }}>
                                        <div className="sys-card-chip"></div>
                                        <div className="sys-card-number-hidden">
                                            <span>••••</span> <span>••••</span> <span>••••</span> <span>{card.id.slice(-4).toUpperCase()}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Limite Total</div>
                                            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(card.limitTotal)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Vencimento</div>
                                            <div style={{ fontSize: 15, fontWeight: 700 }}>Dia {card.dueDay}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div>
                                            <div className="sys-card-balance-label">Fatura Atual</div>
                                            <div className="sys-financial-value color-red" style={{ margin: 0, fontSize: '24px' }}>{formatCurrency(invoiceValue)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="sys-card-balance-label">Limite Disponível</div>
                                            <div className="sys-financial-value color-green" style={{ margin: 0, fontSize: '20px' }}>{formatCurrency(card.limitAvailable)}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                                            <span>USO DO LIMITE</span>
                                            <span>{percentUsed.toFixed(1)}%</span>
                                        </div>
                                        <div className="sys-progress-bar-bg" style={{ height: 6 }}>
                                            <div className="sys-progress-bar-fill" style={{ width: `${percentUsed}%`, backgroundColor: percentUsed > 90 ? 'var(--sys-red)' : percentUsed > 70 ? 'var(--sys-yellow)' : 'var(--sys-blue)' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="sys-btn-primary" style={{ flex: 1, height: '40px', justifyContent: 'center' }} onClick={() => openRegisterExpense(card.id)}>
                                            <Plus size={16} /> REGISTRAR COMPRA
                                        </button>
                                        <button className="sys-action-btn" onClick={() => handleEditCard(card)} title="Editar"><Edit3 size={18} /></button>
                                        <button className="sys-action-btn delete" onClick={() => handleDeleteCard(card.id)} title="Excluir"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="sys-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#94a3b8' }}>
                        <Plus size={40} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--sys-text-primary)' }}>Centralize seus Cartões</h2>
                    <p style={{ color: 'var(--sys-text-secondary)', marginBottom: 32 }}>Capture cada centavo gasto no crédito e nunca mais se surpreenda com o fechamento da fatura.</p>
                    <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsCardModalOpen(true)}>
                        <Plus size={18} /> Adicionar Meu Primeiro Cartão
                    </button>
                </div>
            )}

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                forcedType="expense"
                defaultCreditCardId={selectedCardId || undefined}
            />

            <CreditCardModal
                isOpen={isCardModalOpen || !!editingCard}
                onClose={() => { setIsCardModalOpen(false); setEditingCard(null); }}
                editingCard={editingCard || undefined}
            />
        </PageLayout>
    );
};

export default Cards;
