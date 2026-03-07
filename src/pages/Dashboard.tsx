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
  MoreHorizontal,
  Settings as SettingsIcon,
  X,
  Layout,
  GripVertical,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays, subDays } from 'date-fns';
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

  const incomeTotal = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'income' && !t.isIgnored)
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  }, [monthlyTransactions]);

  const expenseTotal = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'expense' && !t.isIgnored)
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  }, [monthlyTransactions]);

  const projectedInitialBalance = useMemo(() => {
    return FinancialEngine.calculateProjectedInitialBalance(data?.transactions || [], data?.accounts || [], referenceMonth);
  }, [data?.transactions, data?.accounts, referenceMonth]);

  const projectedEndBalance = useMemo(() => {
    return projectedInitialBalance + incomeTotal - expenseTotal;
  }, [projectedInitialBalance, incomeTotal, expenseTotal]);


  // --- WIDGET DATA HELPERS ---

  const displayUpcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return monthlyTransactions
      .filter(t => {
        if (t.type !== 'expense' || t.isIgnored) return false;
        const st = FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth);
        if (st === 'confirmed') return false;
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

  const timelineData = useMemo(() => {
    const sorted = [...monthlyTransactions].sort((a, b) => a.date.localeCompare(b.date));
    let runningBalance = projectedInitialBalance;
    return sorted.map(t => {
      const val = Number(t.value) || 0;
      if (!t.isIgnored) {
        if (t.type === 'income') runningBalance += val;
        else if (t.type === 'expense') runningBalance -= val;
      }
      return { ...t, runningBalance };
    });
  }, [monthlyTransactions, projectedInitialBalance]);

  // --- UI COMPONENTS ---

  const KPICard = ({ title, value, subtitle, colorClass, icon: Icon }: any) => (
    <div className="sys-card" style={{ flex: 1, minWidth: '240px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <div className={`sys-summary-icon-box ${colorClass}`} style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
          <Icon size={16} />
        </div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: '#1a1d21', marginBottom: '4px' }}>
        <span className={colorClass === 'bg-green' ? 'color-green' : colorClass === 'bg-red' ? 'color-red' : ''}>
          {formatCurrency(value)}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{subtitle}</div>
    </div>
  );

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

        {/* 1. KPIs ALWAYS VISIBLE (Non-removable foundational metrics) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          <KPICard
            title="Liquidez Atual"
            value={currentLiquidity}
            subtitle="Saldo total em todas as contas"
            colorClass="bg-blue"
            icon={Wallet}
          />
          <KPICard
            title="Entradas do Mês"
            value={incomeTotal}
            subtitle={`Recebido em ${format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}`}
            colorClass="bg-green"
            icon={TrendingUp}
          />
          <KPICard
            title="Saídas do Mês"
            value={expenseTotal}
            subtitle={`Gasto em ${format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}`}
            colorClass="bg-red"
            icon={TrendingDown}
          />
        </div>

        {/* 2. DYNAMIC WIDGETS AREA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

          {/* Widget: Saldo Projetado Detail */}
          <WidgetWrapper id="proj_30" label="Projeção Mensal">
            <div className="sys-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--sys-bg)', borderRadius: '8px', color: 'var(--sys-yellow)' }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Saldo Final Projetado</h3>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: projectedEndBalance >= 0 ? 'var(--sys-green)' : 'var(--sys-red)' }}>
                {formatCurrency(projectedEndBalance)}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Resultado acumulado em {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
              </p>
            </div>
          </WidgetWrapper>

          {/* Widget: Upcoming Expenses */}
          <WidgetWrapper id="upcoming" label="Vencimentos">
            <div className="sys-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', backgroundColor: 'var(--sys-bg)', borderRadius: '8px', color: 'var(--sys-primary)' }}>
                  <Clock size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Vencimentos</h3>
              </div>
              {displayUpcoming.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {displayUpcoming.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: i === displayUpcoming.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.description}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{format(item.effDate, 'dd/MM')} {item.daysLeft === 0 ? '· Hoje' : item.daysLeft < 0 ? `· Vencido há ${Math.abs(item.daysLeft)}d` : `· em ${item.daysLeft}d`}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-red)' }}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>Tudo em dia!</div>
              )}
            </div>
          </WidgetWrapper>

          {/* Widget: Pending Alerts */}
          <WidgetWrapper id="pending" label="Alertas e Alvos">
            <div className="sys-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', backgroundColor: 'rgba(248, 81, 73, 0.1)', borderRadius: '8px', color: 'var(--sys-red)' }}>
                  <AlertCircle size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Alertas Críticos</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {projectedEndBalance < 0 ? (
                  <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '3px solid var(--sys-red)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sys-red)' }}>Previsão de Saldo Negativo</span>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>Revise suas despesas para evitar o cheque especial.</p>
                  </div>
                ) : (
                  <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid var(--sys-green)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sys-green)' }}>Metas Saudáveis</span>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>Você está dentro do planejamento para {format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}.</p>
                  </div>
                )}
              </div>
            </div>
          </WidgetWrapper>

          {/* Widget: Activity Timeline (The one they liked less but is useful) */}
          <WidgetWrapper id="timeline" label="Fluxo de Caixa" isFullWidth={true}>
            <div className="sys-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1d21', margin: 0 }}>Evolução do Fluxo de Caixa</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>PROJEÇÃO DIÁRIA</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>DATA</th>
                      <th>DESCRIÇÃO</th>
                      <th style={{ textAlign: 'right' }}>VALOR</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>SALDO ACUM.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineData.slice(0, 10).map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{format(parseISO(t.date), 'dd/MM')}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{t.description}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)', fontSize: '13px' }}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value).replace('-', '')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: t.runningBalance >= 0 ? '#1e293b' : 'var(--sys-red)', fontSize: '13px' }}>
                          {formatCurrency(t.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {timelineData.length > 10 && (
                  <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => navigate('/transactions')} style={{ fontSize: '12px', color: 'var(--sys-blue)', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer' }}>VER TODAS AS TRANSAÇÕES</button>
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
              Use o botão de fechar/visto em cada card acima para ocultar ou exibir informações conforme sua preferência.
            </p>
            <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsCustomizing(false)}>
              Salvar Alterações
            </button>
          </div>
        )}

      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Action Center Button */}
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
                    0% { transform: rotate(0.5deg); }
                    50% { transform: rotate(-0.5deg); }
                    100% { transform: rotate(0.5deg); }
                }
                .wiggle {
                    animation: wiggle 0.3s ease-in-out infinite;
                }
                .widget-hidden {
                    order: 999;
                }
            `}</style>
    </PageLayout>
  );
};

export default Dashboard;
