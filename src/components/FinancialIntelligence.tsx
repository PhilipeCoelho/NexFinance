import React, { useMemo } from 'react';
import {
    AlertCircle,
    TrendingUp,
    Star,
    Target,
    Clock,
    ChevronRight,
    Sparkles,
    ShieldAlert,
    Activity,
    Calendar,
    X,
    Check
} from 'lucide-react';
import { useCurrentData, useFinanceStore } from '@/hooks/use-store';
import { FinancialEngine } from '@/lib/FinancialEngine';

interface InsightCardProps {
    insight: {
        type: 'critical' | 'warning' | 'success' | 'info';
        title: string;
        message: string;
        icon: string;
    };
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'AlertCircle': return <AlertCircle size={20} />;
            case 'TrendingUp': return <TrendingUp size={20} />;
            case 'Star': return <Star size={20} />;
            case 'Target': return <Target size={20} />;
            case 'Clock': return <Clock size={20} />;
            default: return <Sparkles size={20} />;
        }
    };

    const styles = {
        critical: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--sys-red)', border: 'var(--sys-red)' },
        warning: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--sys-warning)', border: 'var(--sys-warning)' },
        success: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--sys-green)', border: 'var(--sys-green)' },
        info: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--sys-blue)', border: 'var(--sys-blue)' },
    };

    const currentStyle = styles[insight.type];

    return (
        <div className="sys-card" style={{
            padding: '16px',
            borderLeft: `4px solid ${currentStyle.color}`,
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: currentStyle.bg,
                color: currentStyle.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                {getIcon(insight.icon)}
            </div>
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: 'var(--sys-text-primary)' }}>{insight.title}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{insight.message}</p>
            </div>
        </div>
    );
};

interface FinancialIntelligenceProps {
    showIntelligence?: boolean;
    showRecurring?: boolean;
    showPredictions?: boolean;
    isCustomizing?: boolean;
    onToggle?: (id: string) => void;
}

const FinancialIntelligence: React.FC<FinancialIntelligenceProps> = ({
    showIntelligence = true,
    showRecurring = true,
    showPredictions = true,
    isCustomizing = false,
    onToggle
}) => {
    const data = useCurrentData();
    const { referenceMonth, settings, toggleWidget } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: settings.currency || 'EUR'
        }).format(value);
    };

    const insights = useMemo(() =>
        FinancialEngine.generateInsights(data.transactions, data.accounts, referenceMonth),
        [data, referenceMonth]);

    const recurringExpenses = useMemo(() =>
        FinancialEngine.identifyRecurringExpenses(data.transactions).slice(0, 3),
        [data.transactions]);

    const flow = useMemo(() =>
        FinancialEngine.generateFinancialFlow(data.transactions, data.accounts, 1),
        [data]);

    const predictions = useMemo(() => {
        const events = flow.events;
        const findBalance = (days: number) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            const targetStr = targetDate.toISOString().split('T')[0];

            const lastEventBefore = [...events]
                .sort((a, b) => b.date.localeCompare(a.date))
                .find(e => e.date <= targetStr);

            return lastEventBefore ? lastEventBefore.resultingBalance : events[events.length - 1]?.resultingBalance || 0;
        };

        return [
            { label: 'Em 7 dias', value: findBalance(7) },
            { label: 'Em 15 dias', value: findBalance(15) },
            { label: 'Em 30 dias', value: findBalance(30) }
        ];
    }, [flow]);

    const SectionWrapper = ({ id, label, isVisible, children, isFullWidth = false }: any) => {
        if (!isVisible && !isCustomizing) return null;

        return (
            <div
                className={`sys-widget-container shadow-sm ${!isVisible ? 'widget-hidden' : ''} ${isCustomizing ? 'wiggle' : ''}`}
                style={{
                    position: 'relative',
                    opacity: isVisible ? 1 : 0.4,
                    gridColumn: isFullWidth ? '1 / -1' : 'span 1',
                    filter: isVisible ? 'none' : 'grayscale(1)',
                    transition: 'all 0.3s ease'
                }}
            >
                {isCustomizing && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle ? onToggle(id) : toggleWidget(id); }}
                        style={{
                            position: 'absolute', top: -10, right: -10, zIndex: 10,
                            width: 24, height: 24, borderRadius: '50%', backgroundColor: isVisible ? '#f85149' : '#3fb950',
                            color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isVisible ? <X size={14} /> : <Check size={14} />}
                    </button>
                )}
                {isVisible ? children : (
                    <div className="sys-card glass" style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', backgroundColor: 'var(--bg-tertiary)', opacity: 0.6 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>WIDGET "{label.toUpperCase()}" OCULTO</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Painel de Insights e Alertas */}
            <SectionWrapper id="intelligence" label="Inteligência" isVisible={showIntelligence} isFullWidth>
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Sparkles size={18} color="var(--sys-blue)" />
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Inteligência NexFinance</h3>
                    </div>

                    <div className="sys-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                        {insights.length > 0 ? (
                            insights.map((insight, i) => (
                                <InsightCard key={i} insight={insight} />
                            ))
                        ) : (
                            <div className="sys-card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                <ShieldAlert size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>Nenhum alerta ou insight relevante no momento. Suas finanças parecem sob controle!</p>
                            </div>
                        )}
                    </div>
                </section>
            </SectionWrapper>

            <div className="sys-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                {/* 2. Despesas Recorrentes de Alto Impacto */}
                <SectionWrapper id="recurring" label="Compromissos Recorrentes" isVisible={showRecurring}>
                    <section style={{ height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Activity size={16} color="var(--sys-primary)" />
                            <h3 style={{ fontSize: '13px', fontWeight: 750, margin: 0 }}>Compromissos Recorrentes</h3>
                        </div>
                        <div className="sys-card" style={{ padding: '16px', height: '100%' }}>
                            {recurringExpenses.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {recurringExpenses.map((exp, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-text-secondary)' }}>
                                                    <Clock size={14} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{exp.description}</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Último em {exp.lastDate}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sys-red)' }}>
                                                {formatCurrency(exp.value)}
                                            </div>
                                        </div>
                                    ))}
                                    <button className="sys-btn-minimal" style={{ fontSize: '11px', padding: 0, marginTop: '4px' }}>
                                        GERENCIAR ASSINATURAS <ChevronRight size={14} />
                                    </button>
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Nenhuma despesa recorrente identificada.</p>
                            )}
                        </div>
                    </section>
                </SectionWrapper>

                {/* 3. Previsão de Saldo Evolutivo */}
                <SectionWrapper id="predictions" label="Previsão Futura" isVisible={showPredictions}>
                    <section style={{ height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Calendar size={16} color="var(--sys-primary)" />
                            <h3 style={{ fontSize: '13px', fontWeight: 750, margin: 0 }}>Previsão de Saldo Futuro</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {predictions.map((pred, i) => (
                                <div key={i} className="sys-card" style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>{pred.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: pred.value >= 0 ? 'var(--sys-green)' : 'var(--sys-red)' }}>
                                        {formatCurrency(pred.value)}
                                    </div>
                                    <div style={{ marginTop: '6px', height: '3px', backgroundColor: pred.value >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '2px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: '100%',
                                            backgroundColor: pred.value >= 0 ? 'var(--sys-green)' : 'var(--sys-red)',
                                            borderRadius: '2px',
                                            opacity: 0.6
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.05)', fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                            <AlertCircle size={14} color="var(--sys-blue)" style={{ flexShrink: 0 }} />
                            <span>Projeção estimada baseada em dados históricos e transações fixas.</span>
                        </div>
                    </section>
                </SectionWrapper>
            </div>
        </div>
    );
};

export default FinancialIntelligence;
