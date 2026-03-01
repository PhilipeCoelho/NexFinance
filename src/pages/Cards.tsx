import React, { useState } from 'react';
import {
    CreditCard as CardIcon,
    Plus,
    Calendar,
    AlertCircle,
    MoreVertical,
    TrendingDown,
    CircleDollarSign
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';

const Cards: React.FC = () => {
    const data = useCurrentData();
    const { settings } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency }).format(value);
    };

    return (
        <div className="cards-page fade-in">
            <header className="page-header">
                <div className="header-titles">
                    <h1 className="page-title">Cartões de Crédito</h1>
                    <p className="page-subtitle">Gestão de limites, faturas e vencimentos</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary"><Plus size={16} /><span>Novo Cartão</span></button>
                </div>
            </header>

            <div className="cards-grid">
                {data.creditCards.map(card => {
                    const currentInvoice = data.invoices.find(inv => inv.creditCardId === card.id && inv.status === 'open');
                    const usagePercent = ((card.limitTotal - card.limitAvailable) / card.limitTotal) * 100;

                    return (
                        <div key={card.id} className="card credit-card-item" style={{ borderLeft: `6px solid ${card.color || '#2f81f7'}` }}>
                            <div className="card-top">
                                <div className="card-logo-box">
                                    <CardIcon size={24} />
                                </div>
                                <div className="card-info-header">
                                    <h3 className="card-name-display">{card.name}</h3>
                                    <span className="card-status-badge">{card.status === 'active' ? 'Ativo' : 'Arquivado'}</span>
                                </div>
                                <button className="btn-icon"><MoreVertical size={18} /></button>
                            </div>

                            <div className="limit-block">
                                <div className="limit-labels">
                                    <span className="limit-label-text">Limite Disponível</span>
                                    <span className="limit-value-text">{formatCurrency(card.limitAvailable)} / {formatCurrency(card.limitTotal)}</span>
                                </div>
                                <div className="progress-bar-bg">
                                    <div className="progress-bar-fill" style={{ width: `${usagePercent}%`, backgroundColor: usagePercent > 85 ? 'var(--error)' : 'var(--accent-primary)' }}></div>
                                </div>
                                <span className="usage-hint">{usagePercent.toFixed(1)}% do limite utilizado</span>
                            </div>

                            {currentInvoice && (
                                <div className="invoice-details-box glass">
                                    <div className="inv-header">
                                        <div className="inv-title">
                                            <Calendar size={14} />
                                            <span>Fatura Atual ({currentInvoice.month})</span>
                                        </div>
                                        <span className={`inv-status-pill ${currentInvoice.status}`}>{currentInvoice.status}</span>
                                    </div>
                                    <div className="inv-body">
                                        <div className="inv-value-row">
                                            <span className="inv-total-value">{formatCurrency(currentInvoice.totalValue)}</span>
                                            <span className="inv-due-date">Vence em {currentInvoice.dueDate}</span>
                                        </div>
                                        <button className="btn-pay-full">Pagar Fatura</button>
                                    </div>
                                    {usagePercent > 80 && (
                                        <div className="inv-warning">
                                            <AlertCircle size={12} />
                                            <span>Limite crítico. Considere antecipar o pagamento.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!currentInvoice && (
                                <div className="empty-invoice glass">
                                    <CircleDollarSign size={16} />
                                    <span>Não há faturas em aberto para este cartão.</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {data.creditCards.length === 0 && (
                    <div className="empty-state-large card glass">
                        <div className="empty-icon"><CardIcon size={48} /></div>
                        <h3>Nenhum cartão cadastrado</h3>
                        <p>Adicione seus cartões para controlar seus gastos e limites de crédito.</p>
                        <button className="btn btn-primary">Adicionar Meu Primeiro Cartão</button>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .cards-page { display: flex; flex-direction: column; gap: var(--space-6); }
                .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: var(--space-6); margin-top: var(--space-4); }
                
                .credit-card-item { display: flex; flex-direction: column; gap: var(--space-5); position: relative; padding: var(--space-6); transition: transform 0.2s; border: 1px solid var(--border-light); }
                .credit-card-item:hover { transform: translateY(-4px); }

                .card-top { display: flex; align-items: center; gap: var(--space-4); margin-bottom: 4px; }
                .card-logo-box { width: 44px; height: 44px; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
                .card-info-header { flex: 1; }
                .card-name-display { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .card-status-badge { font-size: 9px; text-transform: uppercase; background: rgba(63, 185, 80, 0.1); color: var(--success); padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-top: 4px; display: inline-block; }

                .limit-block { display: flex; flex-direction: column; gap: 8px; }
                .limit-labels { display: flex; justify-content: space-between; }
                .limit-label-text { font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.05em; }
                .limit-value-text { font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .progress-bar-bg { height: 10px; background: var(--bg-tertiary); border-radius: 5px; overflow: hidden; border: 1px solid var(--border-light); }
                .progress-bar-fill { height: 100%; border-radius: 5px; transition: width 0.3s ease; }
                .usage-hint { font-size: 10px; color: var(--text-secondary); align-self: flex-end; opacity: 0.7; }

                .invoice-details-box { background: rgba(255,255,255,0.03); border-radius: 12px; padding: var(--space-4); border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 12px; }
                .inv-header { display: flex; justify-content: space-between; align-items: center; }
                .inv-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
                .inv-status-pill { font-size: 9px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; background: rgba(47, 129, 247, 0.1); color: var(--accent-primary); }
                
                .inv-body { display: flex; align-items: flex-end; justify-content: space-between; }
                .inv-value-row { display: flex; flex-direction: column; gap: 2px; }
                .inv-total-value { font-size: 2rem; font-weight: 800; color: var(--error); line-height: 1; }
                .inv-due-date { font-size: 10px; color: var(--text-secondary); margin-top: 4px; }
                .btn-pay-full { padding: 6px 12px; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 10px; font-weight: 700; border: 1px solid var(--border); transition: all 0.2s; }
                .btn-pay-full:hover { background: var(--error); color: white; border-color: var(--error); }

                .inv-warning { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--error); opacity: 0.8; margin-top: 4px; }
                .empty-invoice { padding: var(--space-4); text-align: center; color: var(--text-secondary); font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.6; height: 100px; border-radius: 12px; border: 1px dashed var(--border); }

                .empty-state-large { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; text-align: center; gap: var(--space-4); }
                .empty-icon { color: var(--text-secondary); opacity: 0.2; }
            `}} />
        </div>
    );
};

export default Cards;
