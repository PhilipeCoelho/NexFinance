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
    Wallet,
    Info,
    Check
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

import PeriodController from '@/components/PeriodController';

const FinancialFlow: React.FC = () => {
    const data = useCurrentData();
    const { settings, referenceMonth } = useFinanceStore();
    const [viewMode, setViewMode] = React.useState<'month' | 'full'>('month');

    // Calculate totals for PeriodController
    const { incomeTotal, expenseTotal } = useMemo(() => {
        if (!data) return { incomeTotal: 0, expenseTotal: 0 };
        const monthEvents = data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
        const inTotal = monthEvents.filter(t => t.type === 'income' && !t.isIgnored).reduce((s, t) => s + (Number(t.value) || 0), 0);
        const exTotal = monthEvents.filter(t => t.type === 'expense' && !t.isIgnored).reduce((s, t) => s + (Number(t.value) || 0), 0);
        return { incomeTotal: inTotal, expenseTotal: exTotal };
    }, [data, referenceMonth]);

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
        <PageLayout title="Fluxo Financeiro Contínuo" hideMonthSelector={true}>
            <div className="flow-container">
                {/* PERIOD CONTROLLER */}
                <PeriodController 
                    incomeTotal={incomeTotal} 
                    expenseTotal={expenseTotal} 
                />

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

                {/* New Analysis Section: Chart and Map */}
                <div className="flow-grid-analysis">
                    {/* Evolution Chart */}
                    <div className="sys-card chart-card">
                        <div className="chart-header">
                            <TrendingUp size={20} color="var(--sys-blue)" />
                            <h3 className="chart-title">Evolução do Saldo Projetado</h3>
                        </div>
                        <div className="chart-body">
                            <Line
                                data={{
                                    labels: flowData.events.map(e => {
                                        const d = safeParse(e.date);
                                        return viewMode === 'full' ? format(d, 'MMM/yy', { locale: ptBR }) : format(d, 'dd/MM');
                                    }),
                                    datasets: [{
                                        label: 'Saldo',
                                        data: flowData.events.map(e => e.resultingBalance),
                                        borderColor: '#3b82f6',
                                        backgroundColor: (context: any) => {
                                            const chart = context.chart;
                                            const { ctx, chartArea } = chart;
                                            if (!chartArea) return undefined;
                                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                                            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
                                            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                                            return gradient;
                                        },
                                        fill: true,
                                        tension: 0.4,
                                        pointRadius: viewMode === 'full' ? 0 : 2,
                                        pointHoverRadius: 6,
                                        borderWidth: 3
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            padding: 12,
                                            titleFont: { size: 14, weight: 'bold' },
                                            bodyFont: { size: 13 },
                                            callbacks: {
                                                label: (context: any) => `Saldo: ${formatCurrency(context.parsed.y)}`
                                            }
                                        }
                                    },
                                    interaction: {
                                        intersect: false,
                                        mode: 'index',
                                    },
                                    scales: {
                                        y: {
                                            grid: { color: 'rgba(255,255,255,0.05)', drawTicks: false },
                                            border: { display: false },
                                            ticks: {
                                                font: { size: 11 },
                                                callback: (value: any) => formatCurrency(value)
                                            }
                                        },
                                        x: {
                                            grid: { display: false },
                                            border: { display: false },
                                            ticks: {
                                                font: { size: 10 },
                                                maxRotation: 0,
                                                autoSkip: true,
                                                maxTicksLimit: viewMode === 'full' ? 12 : 10
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Finance Map Summary (Always Month-Focused) */}
                    <div className="sys-card map-card">
                        <div className="chart-header">
                            <Calendar size={20} color="var(--sys-blue)" />
                            <h3 className="chart-title">Mapa Financeiro do Mês</h3>
                        </div>
                        <div className="map-body">
                            {(() => {
                                const currentMonthEvents = data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
                                const inTotal = currentMonthEvents.filter(t => t.type === 'income' && !t.isIgnored).reduce((s, t) => s + Number(t.value), 0);
                                const exTotal = currentMonthEvents.filter(t => t.type === 'expense' && !t.isIgnored).reduce((s, t) => s + Number(t.value), 0);
                                const initial = FinancialEngine.calculateProjectedInitialBalance(data.transactions, data.accounts, referenceMonth);
                                const finalResult = initial + inTotal - exTotal;

                                return (
                                    <>
                                        <div className="map-item">
                                            <span className="map-label">Liquidez Inicial</span>
                                            <span className="map-value">{formatCurrency(initial)}</span>
                                        </div>
                                        <div className="map-item">
                                            <span className="map-label">Entradas Previstas</span>
                                            <span className="map-value color-green">+{formatCurrency(inTotal)}</span>
                                        </div>
                                        <div className="map-item">
                                            <span className="map-label">Saídas Previstas</span>
                                            <span className="map-value color-red">-{formatCurrency(exTotal)}</span>
                                        </div>
                                        <div className="map-divider"></div>
                                        <div className="map-item highlight">
                                            <span className="map-label">Resultado Final</span>
                                            <span className={`map-value ${finalResult >= 0 ? 'color-green' : 'color-red'}`}>
                                                {formatCurrency(finalResult)}
                                            </span>
                                        </div>
                                        <div className="map-info-box">
                                            <Info size={14} />
                                            <span>Mostrando dados baseados em "{monthLabel}"</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="timeline-section">
                    <div className="section-header">
                        <Activity size={20} color="var(--sys-blue)" />
                        <h2 className="section-title">Timeline Financeira</h2>
                    </div>

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
                                                        {isPast && <div className="status-badge-ok"><Check size={10} /></div>}
                                                    </div>
                                                    <span className="timeline-category">
                                                        {(data?.categories || []).find(c => c.id === event.category)?.name || 'Outros'}
                                                    </span>
                                                </div>
                                                <div className="timeline-values">
                                                    <span className={`timeline-amount ${isIncome ? 'color-green' : 'color-red'}`}>
                                                        {isIncome ? '+' : '-'}{formatCurrency(event.value)}
                                                    </span>
                                                    <div className={`timeline-balance ${isNegative ? 'is-warning' : ''}`}>
                                                        <span className="balance-label">Saldo:</span>
                                                        <span className="balance-value">{formatCurrency(event.resultingBalance)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isNegative && (
                                                <div className="timeline-alert">
                                                    <AlertTriangle size={14} />
                                                    <span>Risco de saldo negativo nesta data</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .flow-container { display: flex; flex-direction: column; gap: 2.5rem; padding-bottom: 4rem; }
                .flow-grid-analysis { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px; }
                
                @media (max-width: 1024px) {
                    .flow-grid-analysis { grid-template-columns: 1fr; }
                }

                .chart-card { padding: 24px; min-height: 380px; display: flex; flex-direction: column; }
                .chart-header { display: flex; alignItems: center; gap: 10px; margin-bottom: 24px; }
                .chart-title { fontSize: 16px; font-weight: 800; margin: 0; color: var(--sys-text-primary); }
                .chart-body { flex: 1; height: 280px; }

                .map-card { padding: 24px; display: flex; flex-direction: column; }
                .map-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
                
                .flow-mode-toggle {
                    display: flex; padding: 5px; gap: 5px; background: var(--bg-secondary);
                    border-radius: 14px; align-self: flex-start; border: 1px solid var(--sys-border);
                }

                .toggle-btn {
                    padding: 8px 18px; border: none; border-radius: 10px; font-size: 0.85rem;
                    font-weight: 700; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    background: transparent; color: var(--text-secondary);
                }

                .toggle-btn.active {
                    background: var(--sys-card-bg); color: var(--sys-blue);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid var(--sys-border);
                }

                .flow-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }

                .flow-status-card {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 1.75rem; border-radius: 20px; border: 1px solid var(--sys-border);
                    background: var(--sys-card-bg); transition: transform 0.3s;
                }
                .flow-status-card:hover { transform: translateY(-4px); }

                .flow-status-info { display: flex; flex-direction: column; gap: 0.5rem; }
                .flow-status-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .flow-status-value { font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }

                .flow-status-icon {
                    width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
                }

                .flow-status-icon.current { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
                .flow-status-icon.risk { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
                .flow-status-icon.healthy { background: rgba(16, 185, 129, 0.12); color: #10b981; }

                .risk .flow-status-value { color: #ef4444; }
                .healthy .flow-status-value { color: #10b981; }

                .map-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
                .map-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
                .map-value { font-family: var(--sys-font-display); font-size: 15px; font-weight: 800; }
                .map-divider { height: 1px; background: var(--sys-border); margin: 8px 0; }

                .map-item.highlight {
                    padding: 14px 16px; background: var(--bg-secondary); border-radius: 12px; margin-top: auto;
                    border: 1px solid var(--sys-border);
                }
                .map-item.highlight .map-label { color: var(--text-primary); font-weight: 700; font-size: 14px; }
                .map-item.highlight .map-value { font-size: 1.25rem; }

                .map-info-box {
                    display: flex; align-items: center; gap: 8px; padding: 10px;
                    border-radius: 8px; background: rgba(59,130,246,0.05); color: #3b82f6;
                    font-size: 11px; font-weight: 600; margin-top: 12px;
                }

                .timeline-section { margin-top: 1rem; }
                .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 2rem; }
                .section-title { font-size: 1.5rem; font-weight: 900; margin: 0; color: var(--text-primary); letter-spacing: -0.02em; }

                .timeline-wrapper { position: relative; padding-left: 90px; display: flex; flex-direction: column; gap: 1.5rem; }
                .timeline-line { position: absolute; left: 115px; top: 0; bottom: 0; width: 2px; background: var(--sys-border); opacity: 0.5; }

                .timeline-item { position: relative; display: flex; align-items: flex-start; gap: 40px; }
                .timeline-date {
                    position: absolute; left: -90px; width: 70px; display: flex; flex-direction: column; align-items: flex-end; padding-top: 12px;
                }
                .date-day { font-size: 1.5rem; font-weight: 900; color: var(--text-primary); line-height: 1; }
                .date-month { font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); }

                .timeline-marker { position: relative; z-index: 1; background: var(--sys-bg); padding: 6px; margin-top: 12px; margin-left: -5px; }

                .timeline-content {
                    flex: 1; padding: 1.5rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: var(--sys-card-bg); border: 1px solid var(--sys-border); border-radius: 18px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }

                .timeline-item.is-past { opacity: 0.65; }
                .timeline-item.is-past .timeline-content { background: var(--bg-tertiary); box-shadow: none; }

                .timeline-content:hover { transform: translateX(8px); border-color: var(--sys-blue); }

                .timeline-main { display: flex; justify-content: space-between; align-items: center; }
                .timeline-title { font-size: 1.05rem; font-weight: 800; margin-bottom: 4px; color: var(--text-primary); }
                .timeline-category { font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }

                .timeline-values { text-align: right; display: flex; flex-direction: column; gap: 8px; }
                .timeline-amount { display: block; font-size: 1.25rem; font-weight: 850; }
                
                .timeline-balance {
                    display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
                    background: var(--bg-secondary); border-radius: 30px; font-size: 0.7rem; border: 1px solid var(--sys-border);
                }
                .timeline-balance.is-warning { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }
                .timeline-balance.is-warning .balance-value { color: #ef4444; }

                .balance-label { color: var(--text-secondary); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; }
                .balance-value { font-weight: 800; color: var(--text-primary); }

                .status-badge-ok {
                    display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;
                    background: var(--sys-green); color: white; border-radius: 50%;
                }

                .timeline-alert {
                    margin-top: 14px; padding: 8px 12px; background: rgba(239, 68, 68, 0.06);
                    border-radius: 8px; display: flex; align-items: center; gap: 10px;
                    color: #ef4444; font-size: 0.75rem; font-weight: 700; border: 1px dashed rgba(239,68,68,0.2);
                }

                .empty-flow { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 0; color: var(--text-secondary); text-align: center; }
                .empty-flow p { font-size: 1rem; font-weight: 600; margin-top: 1rem; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }

                @media (max-width: 768px) {
                    .timeline-wrapper { padding-left: 20px; }
                    .timeline-line { left: 45px; }
                    .timeline-date { position: relative; left: 0; width: auto; flex-direction: row; gap: 10px; align-items: center; margin-bottom: 12px; }
                    .timeline-item { flex-direction: column; gap: 5px; }
                    .timeline-marker { display: none; }
                    .timeline-main { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .timeline-values { text-align: left; width: 100%; align-items: flex-start; }
                    .timeline-content { border-radius: 20px; }
                }

                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .animate-pulse { animation: pulse 2.5s infinite ease-in-out; }
            `}} />
        </PageLayout>
    );
};

export default FinancialFlow;
