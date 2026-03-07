import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Settings as SettingsIcon,
  X,
  Check,
  Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import { FinancialEngine } from '@/lib/FinancialEngine';
import PageLayout from '@/components/PageLayout';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const { settings, referenceMonth, setReferenceMonth, toggleWidget } = useFinanceStore();
  const data = useCurrentData();

  // Ensure we start with current month
  useEffect(() => {
    const today = new Date();
    const todayMonth = format(today, 'yyyy-MM');
    if (!referenceMonth) {
      setReferenceMonth(todayMonth);
    }
  }, [referenceMonth, setReferenceMonth]);

  if (!data) return null;

  // --- COMPUTATIONS ---

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: settings?.currency || 'EUR'
    }).format(value || 0);
  };

  const currentLiquidity = useMemo(() => {
    return data.accounts?.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0) || 0;
  }, [data.accounts]);

  const monthlyTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
  }, [data?.transactions, referenceMonth]);

  const { incomeTotal, incomeIgnored } = useMemo(() => {
    const incomes = monthlyTransactions.filter(t => t.type === 'income');
    const total = incomes.filter(t => !t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const ignored = incomes.filter(t => t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    return { incomeTotal: total, incomeIgnored: ignored };
  }, [monthlyTransactions]);

  const { expenseTotal, expenseIgnored } = useMemo(() => {
    const expenses = monthlyTransactions.filter(t => t.type === 'expense');
    const total = expenses.filter(t => !t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const ignored = expenses.filter(t => t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    return { expenseTotal: total, expenseIgnored: ignored };
  }, [monthlyTransactions]);

  const projectedInitialBalance = useMemo(() => {
    return FinancialEngine.calculateProjectedInitialBalance(data?.transactions || [], data?.accounts || [], referenceMonth);
  }, [data?.transactions, data?.accounts, referenceMonth]);

  const projectedEndBalance = useMemo(() => {
    return projectedInitialBalance + incomeTotal - expenseTotal;
  }, [projectedInitialBalance, incomeTotal, expenseTotal]);

  const displayUpcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return monthlyTransactions
      .filter(t => {
        if (t.type !== 'expense' || t.isIgnored) return false;
        const status = FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth);
        if (status === 'confirmed') return false;
        return true;
      })
      .map(t => {
        const [yr, mo] = referenceMonth.split('-').map(Number);
        const tDateParsed = parseISO(t.date);
        const effDate = new Date(yr, mo - 1, tDateParsed.getDate());
        const diff = Math.ceil((effDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, effDate, daysLeft: diff };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [monthlyTransactions, referenceMonth]);

  const pendingExpenses = useMemo(() => {
    const p = monthlyTransactions.filter(t => t.type === 'expense' && !t.isIgnored && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) !== 'confirmed');
    return { count: p.length, value: p.reduce((sum, t) => sum + (Number(t.value) || 0), 0) };
  }, [monthlyTransactions, referenceMonth]);

  const pendingIncomes = useMemo(() => {
    const p = monthlyTransactions.filter(t => t.type === 'income' && !t.isIgnored && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) !== 'confirmed');
    return { count: p.length, value: p.reduce((sum, t) => sum + (Number(t.value) || 0), 0) };
  }, [monthlyTransactions, referenceMonth]);

  // --- UI COMPONENTS ---

  const WidgetWrapper = ({ id, label, children, isFullWidth = false }: any) => {
    const widget = settings.dashboardWidgets?.find(w => w.id === id);
    const isVisible = widget?.visible !== false;

    if (!isVisible && !isCustomizing) return null;

    return (
      <div
        className={`sys-widget-container ${!isVisible ? 'widget-hidden' : ''} ${isCustomizing ? 'wiggle' : ''}`}
        style={{
          position: 'relative',
          opacity: isVisible ? 1 : 0.4,
          gridColumn: isFullWidth ? '1 / -1' : 'span 1',
          filter: isVisible ? 'none' : 'grayscale(1)'
        }}
      >
        {isCustomizing && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleWidget(id); }}
            style={{
              position: 'absolute', top: -10, right: -10, zIndex: 10,
              width: 24, height: 24, borderRadius: '50%', backgroundColor: isVisible ? '#f85149' : '#3fb950',
              color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            {isVisible ? <X size={14} /> : <Check size={14} />}
          </button>
        )}
        {isVisible ? children : (
          <div className="sys-card" style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', backgroundColor: '#f1f5f9' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{label} Oculto</span>
          </div>
        )}
      </div>
    );
  };

  // Header Actions
  const dashboardActions = (
    <button
      onClick={() => setIsCustomizing(!isCustomizing)}
      className={`sys-btn-minimal ${isCustomizing ? 'active' : ''}`}
      style={{
        padding: '8px', borderRadius: '8px', border: 'none',
        backgroundColor: isCustomizing ? 'var(--sys-blue)' : 'transparent',
        color: isCustomizing ? 'white' : '#64748b', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}
    >
      <SettingsIcon size={18} />
      {isCustomizing && <span style={{ fontSize: '13px', fontWeight: 600 }}>Pronto</span>}
    </button>
  );

  const summaryPanel = (
    <div className="sys-summary-widget">
      <div className="sys-summary-widget-header">
        Balanço do Mês
      </div>
      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Entradas</span>
        <span className="sys-summary-block-value color-green">{formatCurrency(incomeTotal)}</span>
      </div>
      <div className="sys-summary-block">
        <span className="sys-summary-block-title">Saídas</span>
        <span className="sys-summary-block-value color-red">{formatCurrency(expenseTotal)}</span>
      </div>
      <div className="sys-summary-block" style={{ borderBottom: 'none' }}>
        <span className="sys-summary-block-title">Resultado Líquido</span>
        <span className={`sys-summary-block-value ${incomeTotal - expenseTotal >= 0 ? 'color-green' : 'color-red'}`}>
          {formatCurrency(incomeTotal - expenseTotal)}
        </span>
      </div>

      <div className="sys-summary-widget-header" style={{ marginTop: '16px' }}>
        Alertas Rápidos
      </div>
      {(pendingExpenses.count > 0 || pendingIncomes.count > 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingExpenses.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px' }}>
              <ArrowDown size={14} className="color-red" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(pendingExpenses.value)}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{pendingExpenses.count} despesas abertas</span>
              </div>
            </div>
          )}
          {pendingIncomes.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px' }}>
              <ArrowUp size={14} className="color-green" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(pendingIncomes.value)}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{pendingIncomes.count} receitas abertas</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '12px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', fontSize: '12px', color: 'var(--sys-green)', fontWeight: 600 }}>
          Tudo em dia!
        </div>
      )}
    </div>
  );

  return (
    <PageLayout title="Visão Geral" actions={dashboardActions} summaryPanel={summaryPanel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* 1. KPIs ALWAYS VISIBLE - Using new sys-grid */}
        <div className="sys-grid">
          <div className="sys-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Liquidez Atual</span>
              <div className="sys-summary-icon-box bg-blue" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <Wallet size={16} />
              </div>
            </div>
            <div className="sys-financial-value">{formatCurrency(currentLiquidity)}</div>
            <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>Saldo total em contas</div>
          </div>
          <div className="sys-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Entradas</span>
              <div className="sys-summary-icon-box bg-green" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="sys-financial-value color-green">{formatCurrency(incomeTotal)}</div>
            <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>
              Recebido em {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
            </div>
          </div>
          <div className="sys-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Saídas</span>
              <div className="sys-summary-icon-box bg-red" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <TrendingDown size={16} />
              </div>
            </div>
            <div className="sys-financial-value color-red">{formatCurrency(expenseTotal)}</div>
            <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>
              Gasto em {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
            </div>
          </div>
          <div className="sys-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Fim do Mês</span>
              <div className="sys-summary-icon-box bg-yellow" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <Calendar size={16} />
              </div>
            </div>
            <div className={`sys-financial-value ${projectedEndBalance >= 0 ? 'color-green' : 'color-red'}`}>{formatCurrency(projectedEndBalance)}</div>
            <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>
              Projeção final
            </div>
          </div>
        </div>

        {/* 2. ZONA DE INSIGHTS & ATIVIDADE (WIDGETS CUSTOMIZÁVEIS) */}
        <div>
          <h2 className="sys-subtitle" style={{ margin: '0 0 16px 0' }}>Insights Financeiros</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Widget: Alertas/Pendentes */}
            <WidgetWrapper id="pending" label="Alertas e Pendências">
              <div className="sys-card" onClick={() => navigate('/transactions?filter=pending')} style={{ cursor: 'pointer', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-red)' }}>
                      <AlertCircle size={18} />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>Faturas em Aberto</h3>
                  </div>
                </div>
                <div>
                  {(pendingExpenses.count > 0 || pendingIncomes.count > 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pendingExpenses.count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--sys-red)', borderRadius: '10px' }}>
                            <ArrowDown size={16} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--sys-red)' }}>{formatCurrency(pendingExpenses.value)}</span>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{pendingExpenses.count} pagamentos pendentes</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'var(--sys-green)', fontWeight: 600, fontSize: '14px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px' }}>
                      Financeiro em Dia
                    </div>
                  )}
                </div>
              </div>
            </WidgetWrapper>

            {/* Widget: Vencimentos */}
            <WidgetWrapper id="upcoming" label="Próximos Vencimentos">
              <div className="sys-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--sys-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-primary)' }}>
                      <Clock size={18} />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>Vencendo em Breve</h3>
                  </div>
                </div>
                <div>
                  {displayUpcoming.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {displayUpcoming.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: i === displayUpcoming.length - 1 ? 'none' : '1px solid var(--sys-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                            <div style={{
                              width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                              backgroundColor: item.daysLeft < 0 ? 'var(--sys-red)' : 'var(--sys-warning)'
                            }} />
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
                              <span style={{ fontSize: '11px', color: 'var(--sys-text-secondary)' }}>{format(item.effDate, "dd/MM")} {item.daysLeft < 0 ? ` · Vencido` : item.daysLeft === 0 ? ' · Hoje' : ` · em ${item.daysLeft}d`}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--sys-red)', whiteSpace: 'nowrap' }}>{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', color: '#94a3b8' }}>
                      <CheckCircle2 size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Nenhum débito pendente</span>
                    </div>
                  )}
                </div>
              </div>
            </WidgetWrapper>
          </div>
        </div>

        {isCustomizing && (
          <div className="sys-card" style={{ backgroundColor: '#f8fafc', borderStyle: 'dashed', textAlign: 'center', padding: '32px' }}>
            <Layout size={32} color="#94a3b8" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Customização do Dashboard</h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '8px auto 24px' }}>
              Ative ou desative os widgets que deseja visualizar no seu painel de controle.
            </p>
            <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsCustomizing(false)}>
              Ocultar Edição
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes wiggle {
            0% { transform: rotate(0.4deg); }
            50% { transform: rotate(-0.4deg); }
            100% { transform: rotate(0.4deg); }
        }
        .wiggle {
            animation: wiggle 0.5s ease-in-out infinite;
        }
        .widget-hidden {
            order: 999;
        }
    `}</style>
    </PageLayout>
  );
};

export default Dashboard;
