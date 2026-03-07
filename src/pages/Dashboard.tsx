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

  return (
    <PageLayout title="Visão Geral" actions={dashboardActions}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* 1. KPIs ALWAYS VISIBLE */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          <div className="sys-card" style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Liquidez Atual</span>
              <div className="sys-summary-icon-box bg-blue" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <Wallet size={16} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1a1d21' }}>{formatCurrency(currentLiquidity)}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Saldo total em contas</div>
          </div>
          <div className="sys-card" style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Entradas</span>
              <div className="sys-summary-icon-box bg-green" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sys-green)' }}>{formatCurrency(incomeTotal)}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Recebido em {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
              {incomeIgnored > 0 && ` · (+${formatCurrency(incomeIgnored)} ignorados)`}
            </div>
          </div>
          <div className="sys-card" style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Saídas</span>
              <div className="sys-summary-icon-box bg-red" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                <TrendingDown size={16} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sys-red)' }}>{formatCurrency(expenseTotal)}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
              Gasto em {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
              {expenseIgnored > 0 && ` · (+${formatCurrency(expenseIgnored)} ignorados)`}
            </div>
          </div>
        </div>

        {/* 2. DYNAMIC WIDGETS AREA - GRID STYLE (CARDS DE ANTIGAMENTE) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

          {/* Widget: Saldo Projetado */}
          <WidgetWrapper id="proj_30" label="Saldo Final Projetado">
            <div className="sys-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--sys-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-warning)' }}>
                    <Calendar size={18} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>Saldo Final Projetado</h3>
                </div>
                <ArrowUpRight size={16} color="#94a3b8" />
              </div>
              <div>
                <span style={{ fontSize: '28px', fontWeight: 800, color: projectedEndBalance >= 0 ? 'var(--sys-green)' : 'var(--sys-red)' }}>{formatCurrency(projectedEndBalance)}</span>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                  Expetativa para final de {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
                </p>
              </div>
            </div>
          </WidgetWrapper>

          {/* Widget: Vencimentos */}
          <WidgetWrapper id="upcoming" label="Vencimentos do Mês">
            <div className="sys-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--sys-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-primary)' }}>
                    <Clock size={18} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>Vencimentos do Mês</h3>
                </div>
              </div>
              <div>
                {displayUpcoming.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {displayUpcoming.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: i === displayUpcoming.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                          <div style={{
                            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                            backgroundColor: item.daysLeft < 0 ? 'var(--sys-red)' : 'var(--sys-warning)'
                          }} />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1d21', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{format(item.effDate, "dd/MM")} {item.daysLeft < 0 ? ` · Vencido há ${Math.abs(item.daysLeft)}d` : item.daysLeft === 0 ? ' · Hoje' : ` · em ${item.daysLeft}d`}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-red)', whiteSpace: 'nowrap' }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', color: '#94a3b8' }}>
                    <CheckCircle2 size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Tudo pago no mês</span>
                  </div>
                )}
              </div>
            </div>
          </WidgetWrapper>

          {/* Widget: Alertas/Pendentes */}
          <WidgetWrapper id="pending" label="Alertas e Pendências">
            <div className="sys-card" onClick={() => navigate('/transactions?filter=pending')} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-red)' }}>
                    <AlertCircle size={18} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)', margin: 0 }}>Alertas</h3>
                </div>
              </div>
              <div>
                {(pendingExpenses.count > 0 || pendingIncomes.count > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pendingExpenses.count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--sys-red)', borderRadius: '8px' }}>
                          <ArrowDown size={16} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-red)' }}>{formatCurrency(pendingExpenses.value)}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{pendingExpenses.count} despesas pendentes</span>
                        </div>
                      </div>
                    )}
                    {pendingIncomes.count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--sys-green)', borderRadius: '8px' }}>
                          <ArrowUp size={16} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-green)' }}>{formatCurrency(pendingIncomes.value)}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{pendingIncomes.count} receitas pendentes</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'var(--sys-green)', fontWeight: 600, fontSize: '14px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                    Sistema Reconciliado
                  </div>
                )}
              </div>
            </div>
          </WidgetWrapper>

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

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Float Button para Mobile/Quick Actions */}
      {!isCustomizing && (
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            position: 'fixed', bottom: '32px', right: '32px', width: '56px', height: '56px', borderRadius: '16px',
            backgroundColor: 'var(--sys-blue)', color: 'white', border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 8px 20px rgba(47, 129, 247, 0.3)', cursor: 'pointer', zIndex: 100
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      )}

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
