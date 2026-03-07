import React, { useState, useMemo } from 'react';
import {
    Search,
    Plus,
    CreditCard as CardIcon,
    Edit3,
    Trash2,
    Scale,
    MoreVertical,
    Filter,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Calendar,
    Check,
    CheckCircle2
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import PageLayout from '@/components/PageLayout';

const Cards: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const data = useCurrentData();
    const { updateCreditCard, deleteCreditCard } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const filteredCards = useMemo(() => {
        if (!data?.creditCards) return [];
        return data.creditCards.filter(card => {
            const name = (card.name || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase());
        });
    }, [data, searchTerm]);

    const stats = useMemo(() => {
        const totalLimit = filteredCards.reduce((acc, curr) => acc + curr.limitTotal, 0);
        const available = filteredCards.reduce((acc, curr) => acc + curr.limitAvailable, 0);
        const used = totalLimit - available;
        return { totalLimit, available, used };
    }, [filteredCards]);

    if (!data) return null;

    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">
                Consolidado de Crédito
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Limite Utilizado</span>
                <span className="sys-summary-block-value color-red">{formatCurrency(stats.used)}</span>
                <div className="sys-progress-bar-bg">
                    <div className="sys-progress-bar-fill bg-red" style={{ width: `${(stats.used / stats.totalLimit) * 100}%` }} />
                </div>
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Limite Disponível</span>
                <span className="sys-summary-block-value color-green">{formatCurrency(stats.available)}</span>
                <div className="sys-progress-bar-bg">
                    <div className="sys-progress-bar-fill bg-green" style={{ width: `${(stats.available / stats.totalLimit) * 100}%` }} />
                </div>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>
                    Limite Total
                </span>
                <span className="sys-summary-block-value" style={{ fontSize: '24px', color: 'var(--sys-primary)' }}>
                    {formatCurrency(stats.totalLimit)}
                </span>
            </div>
        </div>
    );

    return (
        <PageLayout title="Cartões" summaryPanel={summaryPanel}>
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
                            <th style={{ width: '50px' }}>Status</th>
                            <th>Cartão</th>
                            <th>Vencimento / Fechamento</th>
                            <th style={{ textAlign: 'right' }}>Limite Disponível</th>
                            <th style={{ textAlign: 'right' }}>Fatura Aberta</th>
                            <th style={{ textAlign: 'right', width: '120px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCards.map(card => {
                            const currentInvoice = data.invoices?.find(inv => inv.creditCardId === card.id && inv.status === 'open');
                            const invoiceValue = currentInvoice ? currentInvoice.totalValue : 0;
                            const percentUsed = (card.limitTotal - card.limitAvailable) / card.limitTotal * 100;

                            return (
                                <tr key={card.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {card.status === 'active' ? (
                                                <CheckCircle2 size={18} className="color-green" />
                                            ) : (
                                                <CheckCircle2 size={18} color="#cbd5e1" />
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: card.color }}></div>
                                            <span style={{ fontWeight: 600, color: '#1a1d21' }}>{card.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>Vence: {card.dueDay}</span>
                                            <span style={{ fontSize: '11px' }}>Fecha: {card.closingDay}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className="sys-table-val" style={{ color: '#1a1d21' }}>{formatCurrency(card.limitAvailable)}</span>
                                            <div style={{ width: '80px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: percentUsed + '%', backgroundColor: percentUsed > 80 ? 'var(--sys-red)' : '#8b5cf6' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="sys-table-val color-red">
                                            {formatCurrency(invoiceValue)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} title="Pagar Fatura"><Calendar size={16} color="#94a3b8" /></button>
                                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Edit3 size={16} color="#94a3b8" /></button>
                                            <button onClick={() => deleteCreditCard(card.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} color="#94a3b8" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredCards.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Nenhum cartão encontrado.
                    </div>
                )}
            </div>
        </PageLayout>
    );
};

export default Cards;
