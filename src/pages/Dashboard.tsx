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
  Layout,
  Target,
  Bell,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays, subMonths, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import { FinancialEngine } from '@/lib/FinancialEngine';
import PageLayout from '@/components/PageLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// ChartJS registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

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

  // Comparison with previous month for "Insights"
  const previousMonthExpenseTotal = useMemo(() => {
    if (!data?.transactions) return 0;
    const [yr, mo] = referenceMonth.split('-').map(Number);
    const prevDate = subMonths(new Date(yr, mo - 1, 1), 1);
    const prevMonthStr = format(prevDate, 'yyyy-MM');
    const prevT = data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, prevMonthStr));
    return prevT.filter(t => t.type === 'expense' && !t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  }, [data?.transactions, referenceMonth]);

  const expenseVariation = useMemo(() => {
    if (previousMonthExpenseTotal === 0) return 0;
    return ((expenseTotal - previousMonthExpenseTotal) / previousMonthExpenseTotal) * 100;
  }, [expenseTotal, previousMonthExpenseTotal]);

  const hasNegativeProjection = useMemo(() => {
    const flow = FinancialEngine.getMonthFlow(data.transactions, data.accounts, referenceMonth);
    return flow.events.some((e: any) => e.resultingBalance < 0);
  }, [data, referenceMonth]);

  // --- CHART DATA ---

  const monthlyFlowChartData = useMemo(() => {
    const [yr, mo] = referenceMonth.split('-').map(Number);
    const start = startOfMonth(new Date(yr, mo - 1, 1));
    const end = endOfMonth(start);
    const daysInMonth = eachDayOfInterval({ start, end });

    const labels = daysInMonth.map(day => format(day, 'dd'));
    const incomes = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return monthlyTransactions
        .filter(t => t.type === 'income' && !t.isIgnored && FinancialEngine.getAdjustedDate(t.date, referenceMonth) === dayStr)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    });
    const expenses = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return monthlyTransactions
        .filter(t => t.type === 'expense' && !t.isIgnored && FinancialEngine.getAdjustedDate(t.date, referenceMonth) === dayStr)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Entradas',
          data: incomes,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderRadius: 4,
        },
        {
          label: 'Saídas',
          data: expenses,
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderRadius: 4,
        }
      ]
    };
  }, [monthlyTransactions, referenceMonth]);

  const categoriesChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.type === 'expense' && !t.isIgnored)
      .forEach(t => {
        const catName = data.categories.find(c => c.id === t.categoryId)?.name || 'Outros';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(t.value) || 0);
      });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
        ],
        borderWidth: 0,
      }]
    };
  }, [monthlyTransactions, data.categories]);

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
      {(pendingExpenses.count > 0 || hasNegativeProjection) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hasNegativeProjection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px' }}>
              <AlertCircle size={14} className="color-red" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-red)' }}>Risco de Saldo</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Projeção negativa detectada</span>
              </div>
            </div>
          )}
          {pendingExpenses.count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px' }}>
              <ArrowDown size={14} className="color-red" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(pendingExpenses.value)}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{pendingExpenses.count} despesas abertas</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

        {/* 1. INDICADORES PRINCIPAIS */}
        <section>
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
                <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Entradas do Mês</span>
                <div className="sys-summary-icon-box bg-green" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="sys-financial-value color-green">{formatCurrency(incomeTotal)}</div>
              <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>Recebido até o momento</div>
            </div>
            <div className="sys-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Saídas do Mês</span>
                <div className="sys-summary-icon-box bg-red" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                  <TrendingDown size={16} />
                </div>
              </div>
              <div className="sys-financial-value color-red">{formatCurrency(expenseTotal)}</div>
              <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>Gastos totais no mês</div>
            </div>
            <div className="sys-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="sys-subtitle" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--sys-text-secondary)' }}>Saldo Projetado</span>
                <div className="sys-summary-icon-box bg-yellow" style={{ width: '32px', height: '32px', borderRadius: '8px' }}>
                  <Calendar size={16} />
                </div>
              </div>
              <div className={`sys-financial-value ${projectedEndBalance >= 0 ? 'color-green' : 'color-red'}`}>{formatCurrency(projectedEndBalance)}</div>
              <div style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>Expectativa para fim do mês</div>
            </div>
          </div>
        </section>

        {/* 2. GRÁFICOS FINANCEIROS */}
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'reapeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }} className="sys-grid-2-cols">
            <div className="sys-card" style={{ height: '350px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <BarChart3 size={18} color="var(--sys-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Fluxo Financeiro do Mês</h3>
              </div>
              <div style={{ height: '260px', width: '100%' }}>
                <Bar
                  data={monthlyFlowChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, border: { display: false } },
                      x: { grid: { display: false }, border: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
            <div className="sys-card" style={{ height: '350px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <PieChartIcon size={18} color="var(--sys-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Distribuição por Categoria</h3>
              </div>
              <div style={{ height: '260px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '220px' }}>
                  <Doughnut
                    data={categoriesChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 15, font: { size: 10 } } }
                      },
                      cutout: '70%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. INSIGHTS FINANCEIROS E ALERTAS */}
        <section>
          <h2 className="sys-subtitle" style={{ margin: '0 0 16px 0' }}>Insights e Alertas Inteligentes</h2>
          <div className="sys-grid">
            {/* Insight 1: Variação de Gastos */}
            <div className="sys-card" style={{ borderLeft: `4px solid ${expenseVariation > 0 ? 'var(--sys-red)' : 'var(--sys-green)'}` }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: expenseVariation > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: expenseVariation > 0 ? 'var(--sys-red)' : 'var(--sys-green)' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Variação de Gastos</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: expenseVariation > 0 ? 'var(--sys-red)' : 'var(--sys-green)' }}>
                      {expenseVariation > 0 ? '+' : ''}{expenseVariation.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>em relação ao mês anterior</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Insight 2: Alerta de Risco de Saldo */}
            <div className="sys-card" style={{ borderLeft: `4px solid ${hasNegativeProjection ? 'var(--sys-red)' : 'var(--sys-blue)'}` }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: hasNegativeProjection ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasNegativeProjection ? 'var(--sys-red)' : 'var(--sys-blue)' }}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Projeção de Saldo</h4>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                    {hasNegativeProjection ? "Atenção: Risco de saldo negativo" : "Fluxo de caixa saudável"}
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 3: Próximo Vencimento Crítico */}
            {displayUpcoming.length > 0 && (
              <div className="sys-card" style={{ borderLeft: '4px solid var(--sys-warning)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-warning)' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Vencimento Próximo</h4>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                      {displayUpcoming[0].description} ({formatCurrency(displayUpcoming[0].value)})
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. MÓDULOS CONFIGURÁVEIS */}
        <section>
          <h2 className="sys-subtitle" style={{ margin: '0 0 16px 0' }}>Módulos Configuráveis</h2>
          <div className="sys-grid">
            <WidgetWrapper id="fluxo_30_dias" label="Fluxo 30 Dias">
              <div className="sys-card" onClick={() => navigate('/financial-flow')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Activity size={18} color="var(--sys-blue)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Fluxo de 30 Dias</h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800 }}>{formatCurrency(projectedEndBalance)}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Saldo previsto em 30 dias</span>
                  </div>
                  <ArrowUpRight size={20} color="#94a3b8" />
                </div>
              </div>
            </WidgetWrapper>

            <WidgetWrapper id="upcoming" label="Próximos Vencimentos">
              <div className="sys-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Clock size={18} color="var(--sys-warning)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Próximos Vencimentos</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayUpcoming.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{item.description}</span>
                      <span style={{ fontWeight: 700, color: 'var(--sys-red)' }}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  {displayUpcoming.length === 0 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sem débitos próximos</span>}
                </div>
              </div>
            </WidgetWrapper>

            <WidgetWrapper id="metas" label="Metas Financeiras">
              <div className="sys-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Target size={18} color="var(--sys-green)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Metas Ativas</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                      <span>Reserva de Emergência</span>
                      <span>65%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '65%', backgroundColor: 'var(--sys-green)' }} />
                    </div>
                  </div>
                  <button className="sys-btn-minimal" style={{ fontSize: '11px', padding: 0, justifyContent: 'flex-start' }} onClick={() => navigate('/goals')}>Ver todas as metas</button>
                </div>
              </div>
            </WidgetWrapper>

            <WidgetWrapper id="orcamento" label="Orçamento por Categoria">
              <div className="sys-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <PieChartIcon size={18} color="var(--sys-blue)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Maiores Gastos</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(
                    monthlyTransactions
                      .filter(t => t.type === 'expense' && !t.isIgnored)
                      .reduce((acc: any, t) => {
                        const name = data.categories.find(c => c.id === t.categoryId)?.name || 'Outros';
                        acc[name] = (acc[name] || 0) + Number(t.value);
                        return acc;
                      }, {})
                  )
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .slice(0, 3)
                    .map(([name, value]: any, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>{name}</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </WidgetWrapper>

            <WidgetWrapper id="alertas" label="Alertas Financeiros">
              <div className="sys-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Bell size={18} color="var(--sys-blue)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Alertas do Sistema</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--sys-blue)', marginTop: '6px' }} />
                    <span>Lembrete: Conciliar faturas de cartões</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--sys-blue)', marginTop: '6px' }} />
                    <span>Revisar limites por categoria</span>
                  </div>
                </div>
              </div>
            </WidgetWrapper>
          </div>
        </section>

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
        .sys-grid-2-cols {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }
        @media (max-width: 1024px) {
            .sys-grid-2-cols {
                grid-template-columns: 1fr;
            }
        }
    `}</style>
    </PageLayout>
  );
};

export default Dashboard;
