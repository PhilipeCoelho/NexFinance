import React, { useMemo } from 'react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { FinancialEngine } from '@/lib/FinancialEngine';
import PageLayout from '@/components/PageLayout';
import {
    Activity,
    ArrowUpCircle,
    ArrowDownCircle,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Calendar,
    Wallet
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinancialFlow: React.FC = () => {
    const data = useCurrentData();
    const { settings, referenceMonth } = useFinanceStore();
    const [viewMode, setViewMode] = React.useState<'month' | 'full'>('month');

    // Helper robusto para evitar o RangeError em datas malformadas
    const safeParse = (dateStr: string) => {
        if (!dateStr) return new Date();
        const d = parseISO(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const flowData = useMemo(() => {
        if (!data) return { events: [], riskDate: null, currentBalance: 0, startBalance: 0, endBalance: 0 };

        if (viewMode === 'month') {
            // Focar apenas no mês selecionado
            const monthResult = FinancialEngine.getMonthFlow(data.transactions, data.accounts, referenceMonth);

            // Detectar risco global (mesmo se estivermos no modo mês)
            const globalResult = FinancialEngine.generateFinancialFlow(data.transactions, data.accounts, 24);
            const currentBalance = FinancialEngine.calculateRealLiquidity(data.accounts);

            return {
                events: monthResult.events,
                riskDate: globalResult.riskDate,
                currentBalance,
                startBalance: monthResult.startBalance,
                endBalance: monthResult.endBalance
            };
        } else {
            // Mostrar fluxo contínuo de 24 meses
            const fullResult = FinancialEngine.generateFinancialFlow(data.transactions, data.accounts, 24);
            const currentBalance = FinancialEngine.calculateRealLiquidity(data.accounts);
            return { ...fullResult, currentBalance, startBalance: currentBalance, endBalance: fullResult.events[fullResult.events.length - 1]?.resultingBalance || currentBalance };
        }
    }, [data, referenceMonth, viewMode]);

    const formatCurrency = (value: number) => {
        const val = Number(value) || 0;
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: settings.currency || 'EUR'
        }).format(val);
    };

    if (!data) return null;

    const monthLabel = format(parseISO(referenceMonth + '-01'), 'MMMM yyyy', { locale: ptBR });

    return (
        <PageLayout title="Fluxo Financeiro Contínuo">
            <div className="flow-container">
                {/* Mode Selector Toggle */}
                <div className="flow-mode-toggle sys-card">
                    <button
                        className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
                        onClick={() => setViewMode('month')}
                    >
                        Fluxo de {monthLabel}
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'full' ? 'active' : ''}`}
                        onClick={() => setViewMode('full')}
                    >
                        Projeção (2 Anos)
                    </button>
                </div>

                {/* Header Summary Cards */}
                <div className="flow-summary-grid">
                    <div className="sys-card flow-status-card current">
                        <div className="flow-status-info">
                            <span className="flow-status-label">
                                {viewMode === 'month' ? `Expectativa Final ${monthLabel.split(' ')[0]}` : 'Liquidez Atual'}
                            </span>
                            <span className="flow-status-value">
                                {formatCurrency(viewMode === 'month' ? flowData.endBalance : flowData.currentBalance)}
                            </span>
                        </div>
                        <div className="flow-status-icon current">
                            <Wallet size={24} />
                        </div>
                    </div>

                    {flowData.riskDate ? (
                        <div className="sys-card flow-status-card risk animate-pulse">
                            <div className="flow-status-info">
                                <span className="flow-status-label">Alerta de Risco</span>
                                <span className="flow-status-value">
                                    {flowData.riskDate.startsWith(referenceMonth)
                                        ? "Saldo negativo previsto para ESTE MÊS!"
                                        : `Saldo negativo em ${format(safeParse(flowData.riskDate), 'dd/MM/yyyy')}`}
                                </span>
                            </div>
                            <div className="flow-status-icon risk">
                                <AlertTriangle size={24} />
                            </div>
                        </div>
                    ) : (
                        <div className="sys-card flow-status-card healthy">
                            <div className="flow-status-info">
                                <span className="flow-status-label">Saúde Financeira</span>
                                <span className="flow-status-value">Sem previsão de saldo negativo p/ 2 anos</span>
                            </div>
                            <div className="flow-status-icon healthy">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="timeline-wrapper">
                    <div className="timeline-line"></div>

                    {flowData.events.length === 0 ? (
                        <div className="empty-flow">
                            <Activity size={48} opacity={0.2} />
                            <p>Nenhuma transação prevista para o período selecionado.</p>
                        </div>
                    ) : (
                        flowData.events.map((event: any, index: number) => {
                            const isNegative = event.resultingBalance < 0;
                            const isIncome = event.type === 'income';
                            const isPast = event.status === 'confirmed';

                            return (
                                <div key={event.id} className={`timeline-item ${isNegative ? 'is-risk' : ''} ${isPast ? 'is-past' : ''} fade-in`} style={{ animationDelay: `${index * 0.05}s` }}>
                                    <div className="timeline-date">
                                        <span className="date-day">{(event.date || '').split('-')[2] || '01'}</span>
                                        <span className="date-month">{format(safeParse(event.date), 'MMM', { locale: ptBR }).toUpperCase()}</span>
                                    </div>

                                    <div className="timeline-marker">
                                        {isIncome ? <ArrowUpCircle size={20} className="color-green" /> : <ArrowDownCircle size={20} className="color-red" />}
                                    </div>

                                    <div className="timeline-content sys-card">
                                        <div className="timeline-main">
                                            <div className="timeline-info">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="timeline-title">{event.description}</h4>
                                                    {isPast && <span className="status-badge-mini">OK</span>}
                                                </div>
                                                <span className="timeline-category">
                                                    {(data?.categories || []).find(c => c.id === event.category)?.name || 'Outros'}
                                                </span>
                                            </div>
                                            <div className="timeline-values">
                                                <span className={`timeline-amount ${isIncome ? 'color-green' : 'color-red'}`}>
                                                    {isIncome ? '+' : '-'}{formatCurrency(event.value)}
                                                </span>
                                                <div className={`timeline-balance ${isNegative ? 'bg-red-soft color-red' : ''}`}>
                                                    <span className="balance-label">Saldo projetado:</span>
                                                    <span className="balance-value">{formatCurrency(event.resultingBalance)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {isNegative && (
                                            <div className="timeline-alert">
                                                <AlertTriangle size={14} />
                                                <span>Atenção: Seu saldo ficará negativo nesta data.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .flow-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding-bottom: 4rem;
                }

                .flow-mode-toggle {
                    display: flex;
                    padding: 6px;
                    gap: 6px;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    align-self: flex-start;
                }

                .toggle-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: transparent;
                    color: var(--text-secondary);
                }

                .toggle-btn.active {
                    background: white;
                    color: var(--sys-blue);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }

                .flow-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .flow-status-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-radius: 16px;
                    border: 1px solid var(--border-light);
                }

                .flow-status-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .flow-status-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .flow-status-value {
                    font-size: 1.75rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }

                .flow-status-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .flow-status-icon.current { background: #eff6ff; color: #3b82f6; }
                .flow-status-icon.risk { background: #fef2f2; color: #ef4444; }
                .flow-status-icon.healthy { background: #f0fdf4; color: #10b981; }

                .risk .flow-status-value { color: #ef4444; }
                .healthy .flow-status-value { color: #10b981; }

                /* Past transactions style */
                .is-past {
                    opacity: 0.7;
                }
                .is-past .timeline-content {
                    background: #f8fafc;
                }
                .status-badge-mini {
                    font-size: 9px;
                    font-weight: 800;
                    background: #e2e8f0;
                    color: #64748b;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                /* Timeline Styles */
                .timeline-wrapper {
                    position: relative;
                    padding-left: 80px;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .timeline-line {
                    position: absolute;
                    left: 100px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--border-light);
                    z-index: 0;
                }

                .timeline-item {
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    gap: 40px;
                }

                .timeline-date {
                    position: absolute;
                    left: -80px;
                    width: 60px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    padding-top: 8px;
                }

                .date-day { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }
                .date-month { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }

                .timeline-marker {
                    position: relative;
                    z-index: 1;
                    background: var(--bg-primary);
                    padding: 4px;
                    margin-top: 8px;
                    margin-left: -5px;
                }

                .timeline-content {
                    flex: 1;
                    padding: 1.25rem;
                    transition: transform 0.2s;
                }

                .timeline-content:hover {
                    transform: translateX(5px);
                }

                .timeline-main {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .timeline-title { font-size: 1rem; font-weight: 700; margin-bottom: 2px; color: var(--text-primary); }
                .timeline-category { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

                .timeline-values { text-align: right; }
                .timeline-amount { display: block; font-size: 1.125rem; font-weight: 800; margin-bottom: 4px; }
                
                .timeline-balance {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 10px;
                    background: var(--bg-tertiary);
                    border-radius: 8px;
                    font-size: 0.75rem;
                }

                .balance-label { color: var(--text-secondary); font-weight: 500; }
                .balance-value { font-weight: 700; color: var(--text-primary); }

                .bg-red-soft { background: #fef2f2 !important; }

                .timeline-alert {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px dashed #fecaca;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #ef4444;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .empty-flow {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: var(--text-secondary);
                    text-align: center;
                }

                @media (max-width: 640px) {
                    .flow-mode-toggle { align-self: stretch; }
                    .toggle-btn { flex: 1; font-size: 0.75rem; padding: 10px 8px; }
                    .timeline-wrapper { padding-left: 20px; }
                    .timeline-line { left: 40px; }
                    .timeline-date { position: static; width: auto; flex-direction: row; gap: 8px; align-items: baseline; margin-bottom: 10px; }
                    .timeline-item { flex-direction: column; gap: 10px; }
                    .timeline-marker { display: none; }
                    .timeline-main { flex-direction: column; align-items: flex-start; gap: 10px; }
                    .timeline-values { text-align: left; width: 100%; }
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .animate-pulse {
                    animation: pulse 2s infinite;
                }
            `}} />
        </PageLayout>
    );
};

export default FinancialFlow;
