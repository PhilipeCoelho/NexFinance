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
    Check
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';

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

    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#f5f3ff' }}>
                        <div className="icon-purple" style={{ background: '#8b5cf6', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CardIcon size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: '#8b5cf6' }}>Cartões</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>

                <div className="header-right">
                    <button className="btn-add-mobills" style={{ color: '#8b5cf6' }}>
                        <Plus size={14} /> NOVO CARTÃO
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>

            <main className="mobills-main-content">
                <div className="work-area">
                    <div className="mobills-table-card">
                        <table className="mobills-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Status</th>
                                    <th>Cartão</th>
                                    <th>Fechamento / Vencimento</th>
                                    <th className="text-right">Limite Disponível</th>
                                    <th className="text-right">Fatura</th>
                                    <th style={{ width: '150px' }} className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCards.map(card => {
                                    const currentInvoice = data.invoices?.find(inv => inv.creditCardId === card.id && inv.status === 'open');
                                    const usagePercent = ((card.limitTotal - card.limitAvailable) / card.limitTotal) * 100;

                                    return (
                                        <tr key={card.id} className="mobills-row">
                                            <td>
                                                <div className="status-icon success" style={{ background: card.status === 'active' ? 'var(--mobills-green)' : '#cbd5e0' }}>
                                                    <Check size={14} />
                                                </div>
                                            </td>
                                            <td className="desc-cell">
                                                <div className="flex items-center gap-3">
                                                    <div className="card-color-strip" style={{ background: card.color, width: '4px', height: '32px', borderRadius: '2px' }}></div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{card.name}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col text-xs font-semibold text-slate-600">
                                                    <span>Fecha dia: {card.closingDay}</span>
                                                    <span>Vence dia: {card.dueDay}</span>
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-slate-700">{formatCurrency(card.limitAvailable)}</span>
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${100 - usagePercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="value-cell text-right" style={{ color: 'var(--mobills-red)' }}>
                                                {currentInvoice ? formatCurrency(currentInvoice.totalValue) : formatCurrency(0)}
                                            </td>
                                            <td className="actions-cell text-right">
                                                <div className="actions-group">
                                                    <button title="Pagar Fatura"><Calendar size={16} /></button>
                                                    <button title="Editar"><Edit3 size={16} /></button>
                                                    <button onClick={() => deleteCreditCard(card.id)} title="Excluir"><Trash2 size={16} /></button>
                                                    <button><MoreVertical size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredCards.length === 0 && (
                            <div className="empty-state-mobills">
                                Nenhum cartão cadastrado.
                            </div>
                        )}

                        <footer className="table-pagination">
                            <span>1-{filteredCards.length} de {filteredCards.length}</span>
                        </footer>
                    </div>
                </div>

                <aside className="summary-sidebar">
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Limite Total <ChevronRight size={10} /></span>
                            <span className="value bold">{formatCurrency(stats.totalLimit)}</span>
                        </div>
                        <div className="icon-bg" style={{ background: '#8b5cf6' }}><Scale size={20} /></div>
                    </div>

                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Limite Utilizado <ChevronRight size={10} /></span>
                            <span className="value" style={{ color: 'var(--mobills-red)' }}>{formatCurrency(stats.used)}</span>
                        </div>
                        <div className="icon-bg red" style={{ background: 'var(--mobills-red)' }}><ArrowUp size={20} /></div>
                    </div>

                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Limite Disponível <ChevronRight size={10} /></span>
                            <span className="value green" style={{ color: 'var(--mobills-green)' }}>{formatCurrency(stats.available)}</span>
                        </div>
                        <div className="icon-bg green" style={{ background: 'var(--mobills-green)' }}><ArrowDown size={20} /></div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default Cards;
