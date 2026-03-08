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
import { format, parseISO, startOfDay, subMonths, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { FinancialEngine } from '@/lib/FinancialEngine';
import PageLayout from '@/components/PageLayout';
import FinancialIntelligence from '@/components/FinancialIntelligence';
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

// --- HELPER COMPONENT ---
const WidgetWrapper = ({ id, label, children, isFullWidth = false, settings, isCustomizing, toggleWidget }: any) => {
  const widget = settings.dashboardWidgets?.find((w: any) => w.id === id);
  const isVisible = widget?.visible !== false;

  if (!isVisible && !isCustomizing) return null;

  return (
    <div
      className={`sys-widget-container shadow-sm ${!isVisible ? 'widget-hidden' : ''} ${isCustomizing ? 'wiggle' : ''}`}
      style={{
        position: 'relative',
        opacity: isVisible ? 1 : 0.4,
        gridColumn: isFullWidth ? '1 / -1' : 'span 1',
        filter: isVisible ? 'none' : 'grayscale(1)',
        transition: 'all 0.3s ease',
        cursor: isCustomizing ? 'move' : 'default'
      }}
    >
      {isCustomizing && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleWidget(id); }}
          style={{
            position: 'absolute', top: -10, right: -10, zIndex: 10,
            width: 24, height: 24, borderRadius: '50%',
            backgroundColor: isVisible ? '#f85149' : '#3fb950',
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const { settings, referenceMonth, setReferenceMonth, toggleWidget, reorderWidgets } = useFinanceStore();
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

  // --- REORDERING HELPERS ---
  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const widgets = settings.dashboardWidgets || [];
    const index = widgets.findIndex(w => w.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < widgets.length) {
      reorderWidgets(index, newIndex);
    }
  };

  // --- COMPUTATIONS ---
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: settings?.currency || 'EUR'
    }).format(value || 0);
  };

  const contextualLiquidity = useMemo(() => {
    const todayMonth = FinancialEngine.getLisbonDate('month');
    if (referenceMonth === todayMonth) {
      return data.accounts?.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0) || 0;
    }
    return FinancialEngine.calculateProjectedInitialBalance(data?.transactions || [], data?.accounts || [], referenceMonth);
  }, [data?.transactions, data?.accounts, referenceMonth]);

  const monthlyTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
  }, [data?.transactions, referenceMonth]);

  const monthlyIncomeTotal = useMemo(() => {
    return monthlyTransactions.filter(t => t.type === 'income' && !t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  }, [monthlyTransactions]);

  const expenseTotal = useMemo(() => {
    return monthlyTransactions.filter(t => t.type === 'expense' && !t.isIgnored).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  }, [monthlyTransactions]);

  const netBalance = useMemo(() => monthlyIncomeTotal - expenseTotal, [monthlyIncomeTotal, expenseTotal]);
  const projectedEndBalance = useMemo(() => contextualLiquidity + netBalance, [contextualLiquidity, netBalance]);

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
        { label: 'Entradas', data: incomes, backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 4 },
        { label: 'Saídas', data: expenses, backgroundColor: 'rgba(239, 68, 68, 0.6)', borderRadius: 4 }
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
    return {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
        borderWidth: 0,
      }]
    };
  }, [monthlyTransactions, data.categories]);

  // --- RENDERING HELPERS ---
  const isSummaryVisible = settings.dashboardWidgets?.find(w => w.id === 'summary_balance')?.visible !== false;

  const summaryPanel = (
    <div className={`sys-summary-container ${!isSummaryVisible ? 'widget-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="sys-summary-widget-header">Balanço do Mês</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Entradas</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sys-green)' }}>{formatCurrency(monthlyIncomeTotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Saídas</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sys-red)' }}>{formatCurrency(expenseTotal)}</div>
        </div>
        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-primary)', marginTop: '8px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Resultado Líquido</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: netBalance >= 0 ? 'var(--sys-green)' : 'var(--sys-red)' }}>
            {formatCurrency(netBalance)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <div className="sys-summary-widget-header" style={{ marginBottom: '16px' }}>Alertas Rápidos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hasNegativeProjection && (
            <div className="sys-card" style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--sys-red)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <AlertCircle size={14} color="var(--sys-red)" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sys-red)' }}>Risco de Saldo</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Projeção negativa detectada</div>
              </div>
            </div>
          )}
          {pendingExpenses.count > 0 && (
            <div className="sys-card" style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--sys-red)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <ArrowDown size={14} color="var(--sys-red)" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{formatCurrency(pendingExpenses.value)}</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>{pendingExpenses.count} despesas abertas</div>
              </div>
            </div>
          )}
          {(!hasNegativeProjection && pendingExpenses.count === 0) && (
            <div className="sys-card" style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--sys-green)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={14} color="var(--sys-green)" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sys-green)' }}>Tudo em dia!</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Nenhum alerta crítico</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const dashboardActions = (
    <button
      onClick={() => setIsCustomizing(!isCustomizing)}
      className={`sys-btn-minimal ${isCustomizing ? 'active' : ''}`}
      style={{
        padding: '8px 12px', borderRadius: '8px', border: 'none',
        backgroundColor: isCustomizing ? 'var(--sys-blue)' : 'rgba(148, 163, 184, 0.1)',
        color: isCustomizing ? 'white' : '#64748b', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}
    >
      <SettingsIcon size={16} />
      <span style={{ fontSize: '12px', fontWeight: 600 }}>{isCustomizing ? 'Concluir' : 'Personalizar'}</span>
    </button>
  );

  return (
    <PageLayout
      title="Visão Geral"
      summaryPanel={summaryPanel}
      actions={dashboardActions}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* CUSTOMIZATION PANEL */}
        {isCustomizing && (
          <div className="sys-card glass" style={{ border: '2px dashed var(--sys-blue)', padding: '20px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Layout size={20} color="var(--sys-blue)" />
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Painel de Customização</h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              Ative, desative ou mude a ordem dos blocos abaixo. O dashboard será atualizado imediatamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(settings.dashboardWidgets || []).map((w, idx) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px',
                  border: '1px solid var(--border-primary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => moveWidget(w.id, 'up')} disabled={idx === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, opacity: idx === 0 ? 0.2 : 0.6 }}><ArrowUp size={12} /></button>
                      <button onClick={() => moveWidget(w.id, 'down')} disabled={idx === (settings.dashboardWidgets?.length || 0) - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, opacity: idx === (settings.dashboardWidgets?.length || 0) - 1 ? 0.2 : 0.6 }}><ArrowDown size={12} /></button>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: w.visible ? 'var(--sys-text-primary)' : '#94a3b8' }}>{w.label}</span>
                  </div>
                  <button
                    onClick={() => toggleWidget(w.id)}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', border: 'none', fontSize: '10px', fontWeight: 800,
                      backgroundColor: w.visible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: w.visible ? 'var(--sys-green)' : 'var(--sys-red)', cursor: 'pointer'
                    }}
                  >
                    {w.visible ? 'ATIVADO' : 'OCULTO'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INDICATORS (Fixed at top) */}
        <div className="sys-grid-4-cols">
          <div className="sys-card kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="kpi-label">LIQUIDEZ ATUAL</div>
              <div className="kpi-icon-container blue"><Wallet size={16} /></div>
            </div>
            <div className="kpi-value">{formatCurrency(contextualLiquidity)}</div>
            <div className="kpi-footer">Saldo total em contas</div>
          </div>
          <div className="sys-card kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="kpi-label">ENTRADAS DO MÊS</div>
              <div className="kpi-icon-container green"><ArrowUp size={16} /></div>
            </div>
            <div className="kpi-value" style={{ color: 'var(--sys-green)' }}>{formatCurrency(monthlyIncomeTotal)}</div>
            <div className="kpi-footer">Recebido até o momento</div>
          </div>
          <div className="sys-card kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="kpi-label">SAÍDAS DO MÊS</div>
              <div className="kpi-icon-container red"><ArrowDown size={16} /></div>
            </div>
            <div className="kpi-value" style={{ color: 'var(--sys-red)' }}>{formatCurrency(expenseTotal)}</div>
            <div className="kpi-footer">Gastos totais no mês</div>
          </div>
          <div className="sys-card kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div className="kpi-label">SALDO PROJETADO</div>
              <div className="kpi-icon-container warning"><Calendar size={16} /></div>
            </div>
            <div className="kpi-value" style={{ color: projectedEndBalance >= 0 ? 'var(--sys-text-primary)' : 'var(--sys-red)' }}>{formatCurrency(projectedEndBalance)}</div>
            <div className="kpi-footer">Expectativa para fim do mês</div>
          </div>
        </div>

        {/* DYNAMIC WIDGETS RENDERING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(settings.dashboardWidgets || []).map(widget => {
            if (!widget.visible && !isCustomizing) return null;

            switch (widget.id) {
              case 'chart_flow':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card" style={{ height: '320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <BarChart3 size={16} color="var(--sys-primary)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Fluxo Financeiro do Mês</h3>
                      </div>
                      <div style={{ height: '240px', width: '100%' }}>
                        <Bar
                          data={monthlyFlowChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } }
                          }}
                        />
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              case 'chart_categories':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card" style={{ height: '320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <PieChartIcon size={16} color="var(--sys-primary)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Distribuição por Categoria</h3>
                      </div>
                      <div style={{ height: '240px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '200px' }}>
                          <Doughnut data={categoriesChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }} />
                        </div>
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              case 'intelligence':
              case 'recurring':
              case 'predictions':
                if (widget.id === 'intelligence') {
                  return (
                    <FinancialIntelligence
                      key="intelligence_block"
                      showIntelligence={settings.dashboardWidgets?.find(w => w.id === 'intelligence')?.visible !== false}
                      showRecurring={settings.dashboardWidgets?.find(w => w.id === 'recurring')?.visible !== false}
                      showPredictions={settings.dashboardWidgets?.find(w => w.id === 'predictions')?.visible !== false}
                      isCustomizing={isCustomizing}
                      onToggle={toggleWidget}
                    />
                  );
                }
                return null;
              case 'proj_30':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} isFullWidth settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card" style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0' }}>Projeção de 30 Dias</h3>
                      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {[7, 14, 21, 30].map(days => (
                          <div key={days} style={{ flexShrink: 0, width: '120px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>EM {days} DIAS</div>
                            <div style={{ fontSize: '14px', fontWeight: 800 }}>{formatCurrency(contextualLiquidity + (netBalance / 30) * days)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              case 'upcoming':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Clock size={16} color="var(--sys-warning)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Próximos Vencimentos</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {displayUpcoming.map((item, i) => {
                          const installmentText = FinancialEngine.getInstallmentText(item, referenceMonth);
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#475569' }}>{item.description}</span>
                                {installmentText && (
                                  <span style={{ fontSize: '9px', color: 'var(--sys-blue)', fontWeight: 700 }}>Parcela {installmentText}</span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--sys-red)' }}>{formatCurrency(item.value)}</span>
                            </div>
                          );
                        })}
                        {displayUpcoming.length === 0 && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sem débitos próximos</span>}
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              case 'goals':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Target size={16} color="var(--sys-green)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Metas Ativas</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600 }}>
                            <span>Reserva de Emergência</span>
                            <span>65%</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '65%', backgroundColor: 'var(--sys-green)' }} />
                          </div>
                        </div>
                        <button className="sys-btn-minimal" style={{ fontSize: '10px', padding: 0 }} onClick={() => navigate('/goals')}>Ver detalhes</button>
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              case 'orcamento':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Activity size={16} color="var(--sys-blue)" />
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
                );
              case 'alertas':
                return (
                  <WidgetWrapper key={widget.id} id={widget.id} label={widget.label} settings={settings} isCustomizing={isCustomizing} toggleWidget={toggleWidget}>
                    <div className="sys-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Bell size={16} color="var(--sys-blue)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Alertas do Sistema</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', gap: '8px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--sys-blue)', marginTop: '6px' }} />
                          <span>Pagar fatura do cartão principal</span>
                        </div>
                      </div>
                    </div>
                  </WidgetWrapper>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>

      <style>{`
        .kpi-card { padding: var(--v-card-padding); min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
        .kpi-label { font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
        .kpi-value { font-size: var(--v-kpi-val-s); font-weight: 900; letter-spacing: -0.02em; margin: 4px 0; }
        .kpi-footer { font-size: 11px; color: #94a3b8; }
        .kpi-icon-container { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .kpi-icon-container.blue { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .kpi-icon-container.green { background-color: rgba(16, 185, 129, 0.1); color: #10b981; }
        .kpi-icon-container.red { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .kpi-icon-container.warning { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; }

        .sys-grid-4-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--v-section-gap); }
        @media (max-width: 1200px) { .sys-grid-4-cols { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .sys-grid-4-cols { grid-template-columns: 1fr; } }

        @keyframes wiggle {
            0% { transform: rotate(0.4deg); }
            50% { transform: rotate(-0.4deg); }
            100% { transform: rotate(0.4deg); }
        }
        .wiggle { animation: wiggle 0.5s ease-in-out infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </PageLayout>
  );
};

export default Dashboard;
