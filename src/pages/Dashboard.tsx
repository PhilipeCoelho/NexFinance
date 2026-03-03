import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  Plus,
  Calendar,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  CreditCard as CreditCardIcon,
  PieChart,
  Target,
  BarChart3,
  Activity,
  ArrowUpRight,
  ChevronRight,
  X,
  Clock,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';
import { createPortal } from 'react-dom';

const DEFAULT_WIDGETS = [
  { id: 'proj_30', label: 'Projeção 30 dias', visible: true },
  { id: 'upcoming', label: 'Próximos vencimentos', visible: true },
  { id: 'pending', label: 'Despesas pendentes', visible: true },
  { id: 'accounts', label: 'Contas', visible: true },
  { id: 'cards', label: 'Cartões de crédito', visible: true },
  { id: 'categories', label: 'Despesas por categoria', visible: true },
  { id: 'planning', label: 'Planejamento mensal', visible: true },
  { id: 'balance', label: 'Balanço mensal', visible: true },
  { id: 'frequency', label: 'Frequência de gastos', visible: true },
  { id: 'savings', label: 'Economia mensal', visible: true },
  { id: 'goals', label: 'Objetivos', visible: true },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { settings, toggleWidget, reorderWidgets, referenceMonth, setReferenceMonth } = useFinanceStore();
  const data = useCurrentData();

  useEffect(() => {
    const todayMonth = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().slice(0, 7);
    if (referenceMonth !== todayMonth) {
      setReferenceMonth(todayMonth);
    }
  }, []);

  if (!data) return null;

  const activeWidgets = (settings.dashboardWidgets && settings.dashboardWidgets.length > 0)
    ? settings.dashboardWidgets
    : DEFAULT_WIDGETS;

  // Filter transactions for the selected month (including recurring and fixed ones)
  const isTransactionInMonth = (t: any, monthStr: string) => {
    if (!t?.date || !monthStr) return false;
    const [refYear, refMonth] = monthStr.split('-').map(Number);
    const tDate = new Date(t.date);
    if (isNaN(tDate.getTime())) return t.date.startsWith(monthStr);

    const tYear = tDate.getFullYear();
    const tMonth = tDate.getMonth() + 1;

    // Calculate difference in months (1-indexed)
    const diffMonths = (refYear - tYear) * 12 + (refMonth - tMonth) + 1;

    // If reference month is before the start date, don't show
    if (diffMonths <= 0) return t.date.startsWith(monthStr);

    // Check if this specific month was excluded (e.g., edited specifically)
    if (t.recurrence?.excludedDates?.includes(monthStr)) return false;

    // Fixed transactions repeat every month indefinitely
    if (t.isFixed) return true;

    // If it's a normal transaction and it's not the same month, don't show
    if (!t.isRecurring) return t.date.startsWith(monthStr);

    // If it's recurring, check if it's within the installment limit
    if (t.recurrence?.installmentsCount) {
      return diffMonths <= t.recurrence.installmentsCount;
    }

    // Default recurring (recurrent without end)
    return true;
  };

  const monthlyTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => isTransactionInMonth(t, referenceMonth));
  }, [data?.transactions, referenceMonth]);

  const totalAccountsBalance = useMemo(() => {
    if (!data?.accounts) return 0;
    return data.accounts
      .filter(acc => acc.includeInTotal && acc.status === 'active')
      .reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [data?.accounts]);

  const totalOpenInvoices = useMemo(() => {
    if (!data?.invoices) return 0;
    return data.invoices
      .filter((inv: any) => inv.status !== 'paid')
      .reduce((sum: number, inv: any) => sum + inv.totalValue, 0);
  }, [data?.invoices]);

  // Liquidez Real = saldo das contas ativas que foram confirmadas
  const liquidBalance = totalAccountsBalance;

  // Para transações recorrentes/fixas em meses futuros, o status é sempre 'forecast'
  const getEffectiveStatus = (t: any): string => {
    if (!t?.date) return 'forecast';
    if (!t.isRecurring && !t.isFixed) return t.status || 'forecast';
    const originalMonth = t.date.slice(0, 7);
    if (originalMonth === referenceMonth) return t.status || 'forecast';
    return 'forecast';
  };

  // Entradas e Saídas do mês (todas, confirmadas ou não)
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income' && !t.isIgnored)
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense' && !t.isIgnored)
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  // Projeção: apenas transações PENDENTES (forecast) que ainda vão impactar o saldo
  const pendingIncome = monthlyTransactions
    .filter(t => t.type === 'income' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed')
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const pendingExpense = monthlyTransactions
    .filter(t => t.type === 'expense' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed')
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: settings?.currency || 'EUR'
      }).format(value || 0);
    } catch (e) {
      return String(value || 0);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < (activeWidgets.length)) {
      reorderWidgets(index, newIndex);
    }
  };

  const widgets: Record<string, React.ReactNode> = {
    proj_30: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg warning"><Calendar size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Projeção</span>
            <h3 className="widget-label">Fluxo 30 Dias</h3>
          </div>
          <ArrowUpRight size={14} className="text-secondary" />
        </div>
        <div className="widget-body">
          <span className="widget-value warning">{formatCurrency(liquidBalance + pendingIncome - pendingExpense)}</span>
          <p className="widget-footer-text">Saldo atual + previsões pendentes do mês</p>
        </div>
      </div>
    ),
    upcoming: (() => {
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
      today.setHours(0, 0, 0, 0);

      // Busca TODAS as despesas do mês (incluindo isIgnored), pendentes ou não
      const upcomingExpenses: { description: string; date: Date; value: number; status: string; daysLeft: number }[] = [];

      data.transactions.forEach(t => {
        if (t.type !== 'expense') return;
        // NÃO filtrar por isIgnored — mesmo ocultas devem aparecer nos vencimentos

        const getAdjustedDate = (monthStr: string): Date => {
          const originalDate = new Date(t.date);
          const [yr, mo] = monthStr.split('-').map(Number);
          const day = originalDate.getDate();
          const maxDay = new Date(yr, mo, 0).getDate();
          return new Date(yr, mo - 1, Math.min(day, maxDay));
        };

        if (t.isFixed || t.isRecurring) {
          if (t.recurrence?.excludedDates?.includes(referenceMonth)) return;
          // Check if installments limit reached
          if (t.recurrence?.installmentsCount) {
            const origDate = new Date(t.date);
            const [ry, rm] = referenceMonth.split('-').map(Number);
            const diff = (ry - origDate.getFullYear()) * 12 + (rm - (origDate.getMonth() + 1)) + 1;
            if (diff > t.recurrence.installmentsCount) return;
          }
          const adjDate = getAdjustedDate(referenceMonth);
          const origMonth = t.date.slice(0, 7);
          const effStatus = origMonth === referenceMonth ? t.status : 'forecast';
          const daysLeft = Math.ceil((adjDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          upcomingExpenses.push({
            description: t.description,
            date: adjDate,
            value: t.value,
            status: effStatus,
            daysLeft,
          });
        } else if (t.date.startsWith(referenceMonth)) {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil((tDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          upcomingExpenses.push({
            description: t.description,
            date: tDate,
            value: t.value,
            status: t.status,
            daysLeft,
          });
        }
      });

      // Mostrar primeiro as mais próximas de vencer (por data)
      upcomingExpenses.sort((a, b) => a.date.getTime() - b.date.getTime());
      // Filtrar apenas as que ainda não passaram ou passaram recentemente (vencidas)
      const displayList = upcomingExpenses.slice(0, 5);

      return (
        <div className="widget-card premium-glass">
          <div className="widget-header">
            <div className="widget-icon-bg primary"><Clock size={18} /></div>
            <div className="widget-title-group">
              <span className="widget-tag">Agenda</span>
              <h3 className="widget-label">Vencimentos do Mês</h3>
            </div>
          </div>
          <div className="widget-body">
            {displayList.length > 0 ? (
              <div className="upcoming-list">
                {displayList.map((item, i) => (
                  <div key={i} className="upcoming-row">
                    <div className="upcoming-left">
                      <span className={`upcoming-dot ${item.status === 'confirmed' ? 'confirmed' : item.daysLeft < 0 ? 'overdue' : 'forecast'}`}></span>
                      <div className="upcoming-info">
                        <span className="upcoming-desc">{item.description}</span>
                        <span className="upcoming-date">
                          {format(item.date, "dd/MM")}
                          {item.status !== 'confirmed' && (
                            item.daysLeft < 0
                              ? ` · Vencida há ${Math.abs(item.daysLeft)}d`
                              : item.daysLeft === 0
                                ? ' · Hoje'
                                : ` · em ${item.daysLeft}d`
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="upcoming-val">{formatCurrency(item.value)}</span>
                  </div>
                ))}
                {upcomingExpenses.length > 5 && (
                  <span className="upcoming-more">+{upcomingExpenses.length - 5} mais</span>
                )}
              </div>
            ) : (
              <div className="empty-state-visual">
                <CheckCircle2 size={32} strokeWidth={1} />
                <span>Sem despesas neste mês</span>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    pending: (() => {
      const pendingExpenses = monthlyTransactions.filter(t => t.type === 'expense' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed');
      const pendingIncomes = monthlyTransactions.filter(t => t.type === 'income' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed');

      const pExpenseCount = pendingExpenses.length;
      const pExpenseValue = pendingExpenses.reduce((acc, t) => acc + t.value, 0);
      const pIncomeCount = pendingIncomes.length;
      const pIncomeValue = pendingIncomes.reduce((acc, t) => acc + t.value, 0);

      const hasPending = pExpenseCount > 0 || pIncomeCount > 0;

      return (
        <div className="widget-card premium-glass" onClick={() => navigate('/transactions?filter=pending')} style={{ cursor: 'pointer' }}>
          <div className="widget-header">
            <div className="widget-icon-bg error"><AlertCircle size={18} /></div>
            <div className="widget-title-group">
              <span className="widget-tag">Atenção</span>
              <h3 className="widget-label">Alertas</h3>
            </div>
          </div>
          <div className="widget-body">
            {hasPending ? (
              <div className="pending-alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {pExpenseCount > 0 && (
                  <div className="pending-alert-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: 'rgba(248, 81, 73, 0.1)', color: 'var(--error)', borderRadius: '8px' }}>
                      <ArrowDown size={14} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(pExpenseValue)}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>{pExpenseCount} {pExpenseCount === 1 ? 'despesa pendente' : 'despesas pendentes'}</span>
                    </div>
                  </div>
                )}
                {pIncomeCount > 0 && (
                  <div className="pending-alert-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', background: 'rgba(63, 185, 80, 0.1)', color: 'var(--success)', borderRadius: '8px' }}>
                      <ArrowUp size={14} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(pIncomeValue)}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>Receita pendente</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="pending-status-ok">Sistema Reconciliado</div>
            )}
          </div>
        </div>
      );
    })(),
    accounts: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg primary"><Wallet size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Saldos</span>
            <h3 className="widget-label">Minhas Contas</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="mini-accounts-grid">
            {data.accounts.slice(0, 4).map(acc => (
              <div key={acc.id} className="mini-acc-row" onClick={() => navigate('/accounts')} style={{ cursor: 'pointer' }}>
                <span className="name">{acc.name}</span>
                <span className="value">{formatCurrency(acc.currentBalance)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    cards: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg secondary"><CreditCardIcon size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Crédito</span>
            <h3 className="widget-label">Cartões</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="no-cards-msg">Nenhuma fatura fechada</div>
        </div>
      </div>
    ),
    categories: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg success"><PieChart size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Análise</span>
            <h3 className="widget-label">Categorias</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="category-bars">
            <div className="bar-row"><div className="fill" style={{ width: '60%' }}></div></div>
            <div className="bar-row"><div className="fill" style={{ width: '30%', background: 'var(--success)' }}></div></div>
          </div>
        </div>
      </div>
    ),
    planning: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg warning"><Activity size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Budget</span>
            <h3 className="widget-label">Planejamento</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="circle-progress-placeholder">
            <span className="percent">45%</span>
            <span className="label">do limite</span>
          </div>
        </div>
      </div>
    ),
    balance: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg primary"><BarChart3 size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Balanço</span>
            <h3 className="widget-label">Resultado Mensal</h3>
          </div>
        </div>
        <div className="widget-body">
          <span className={`widget-value ${monthlyIncome - monthlyExpense >= 0 ? 'success' : 'error'}`}>
            {formatCurrency(monthlyIncome - monthlyExpense)}
          </span>
          <p className="widget-footer-text">Restante para fechar o mês</p>
        </div>
      </div>
    ),
    frequency: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg secondary"><ArrowRightLeft size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Hábitos</span>
            <h3 className="widget-label">Frequência</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="frequency-display">
            <span className="num">2.4</span>
            <span className="txt">transações / dia</span>
          </div>
        </div>
      </div>
    ),
    savings: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg success"><TrendingUp size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Reserva</span>
            <h3 className="widget-label">Economia</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="savings-highlight">
            <span className="big">12.5%</span>
            <span className="sub">Economizado este mês</span>
          </div>
        </div>
      </div>
    ),
    goals: (
      <div className="widget-card premium-glass">
        <div className="widget-header">
          <div className="widget-icon-bg warning"><Target size={18} /></div>
          <div className="widget-title-group">
            <span className="widget-tag">Metas</span>
            <h3 className="widget-label">Objetivos</h3>
          </div>
        </div>
        <div className="widget-body">
          <div className="goal-item-box" onClick={() => navigate('/goals')} style={{ cursor: 'pointer' }}>
            <div className="goal-info"><span className="name">Reserva de Emergência</span> <span className="p">80%</span></div>
            <div className="goal-progress"><div className="fill" style={{ width: '80%' }}></div></div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="dashboard-premium fade-in">
      <div className="dashboard-top-bar">
        <h1 className="dash-title">Visão Geral</h1>
        <MonthSelector />
      </div>

      {/* Dynamic Header with Blur */}
      <div className="premium-header">
        <div className="premium-kpi highlight" onClick={() => navigate('/accounts')} style={{ cursor: 'pointer' }}>
          <div className="icon-box"><Wallet size={20} /></div>
          <div className="info">
            <span className="lbl">Liquidez Real</span>
            <span className="val">{formatCurrency(liquidBalance)}</span>
          </div>
        </div>

        <div className="premium-kpi income" onClick={() => navigate('/income')} style={{ cursor: 'pointer' }}>
          <div className="icon-box"><TrendingUp size={20} /></div>
          <div className="info">
            <span className="lbl">Entradas</span>
            <span className="val">{formatCurrency(monthlyIncome)}</span>
          </div>
        </div>
        <div className="premium-kpi expense" onClick={() => navigate('/expenses')} style={{ cursor: 'pointer' }}>
          <div className="icon-box"><TrendingDown size={20} /></div>
          <div className="info">
            <span className="lbl">Saídas</span>
            <span className="val">{formatCurrency(monthlyExpense)}</span>
          </div>
        </div>
        <button className="premium-add-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={24} />
        </button>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Grid Area */}
      <div className="premium-grid">
        {activeWidgets
          .filter(w => w.visible)
          .map(w => (
            <React.Fragment key={w.id}>
              {widgets[w.id]}
            </React.Fragment>
          ))
        }
      </div>

      <div className="premium-footer">
        <button className="manage-dashboard-btn" onClick={() => setIsConfigOpen(true)}>
          <SettingsIcon size={16} />
          <span>Personalizar Visualização</span>
        </button>
      </div>

      {/* Enhanced Config Modal */}
      {isConfigOpen && createPortal(
        <div className="premium-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="premium-config-panel" onClick={e => e.stopPropagation()}>
            <header className="config-header">
              <div className="header-titles">
                <h2>Organizar Dashboard</h2>
                <p>Arraste para reordenar ou desative para ocultar</p>
              </div>
              <button className="close-x" onClick={() => setIsConfigOpen(false)}><X size={20} /></button>
            </header>

            <div className="config-scroll-area">
              {activeWidgets.map((w, index) => (
                <div key={w.id} className={`config-reorder-item ${w.visible ? 'active' : 'hidden'}`}>
                  <div className="drag-handle"><GripVertical size={16} /></div>
                  <button className="visibility-toggle" onClick={() => toggleWidget(w.id)}>
                    {w.visible ? <CheckCircle2 size={18} className="text-success" /> : <div className="circle-hollow"></div>}
                  </button>
                  <span className="item-label">{w.label}</span>
                  <div className="reorder-actions">
                    <button disabled={index === 0} onClick={() => handleMove(index, 'up')}><ArrowUp size={14} /></button>
                    <button disabled={index === activeWidgets.length - 1} onClick={() => handleMove(index, 'down')}><ArrowDown size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <footer className="config-footer">
              <button className="btn btn-primary full-width" onClick={() => setIsConfigOpen(false)}>Aplicar Mudanças</button>
            </footer>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .dash-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .dashboard-premium { display: flex; flex-direction: column; gap: 24px; padding-bottom: 60px; }
        
        /* Premium Header */
        .premium-header {
            display: flex; gap: 16px; align-items: stretch;
            position: sticky; top: -20px; z-index: 100;
            background: var(--bg-primary); 
            padding: 20px 0;
            margin: -20px 0 0 0;
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-light);
            width: 100%;
        }

        .premium-kpi {
            flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 16px; padding: 16px 20px;
            background: var(--bg-secondary); border: 1px solid var(--border-light);
            border-radius: 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-kpi:hover { border-color: var(--accent-primary); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
        .premium-kpi.highlight { background: linear-gradient(135deg, rgba(47, 129, 247, 0.05) 0%, rgba(47, 129, 247, 0.02) 100%); border-color: var(--accent-primary); }
        
        .icon-box { 
            width: 44px; height: 44px; border-radius: 14px; 
            display: flex; align-items: center; justify-content: center;
            background: var(--bg-tertiary); transition: all 0.3s;
        }
        .highlight .icon-box { color: var(--accent-primary); background: rgba(47, 129, 247, 0.1); }
        .income .icon-box { color: var(--success); background: rgba(63, 185, 80, 0.1); }
        .expense .icon-box { color: var(--error); background: rgba(248, 81, 73, 0.1); }
        
        .info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 1px; }
        .val { font-size: 1.4rem; font-weight: 700; font-family: var(--font-display); color: var(--text-primary); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .empty-state-visual span { font-size: 11px; font-weight: 600; }
        
        .upcoming-list { display: flex; flex-direction: column; gap: 8px; }
        .upcoming-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
        .upcoming-row:last-child { border-bottom: none; }
        .upcoming-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
        .upcoming-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .upcoming-dot.forecast { background: var(--warning, #d29922); }
        .upcoming-dot.confirmed { background: var(--success); }
        .upcoming-dot.overdue { background: var(--error); }
        .upcoming-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .upcoming-desc { font-size: 12px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .upcoming-date { font-size: 10px; color: var(--text-secondary); font-weight: 500; }
        .upcoming-val { font-size: 12px; font-weight: 700; color: var(--error); white-space: nowrap; }
        .upcoming-more { font-size: 10px; color: var(--text-secondary); text-align: center; padding-top: 4px; font-weight: 500; }

        .pending-status-alert { display: flex; flex-direction: column; gap: 4px; }
        .pending-val { font-size: 1.5rem; font-weight: 800; color: var(--error); }
        .pending-desc { font-size: 11px; color: var(--text-secondary); font-weight: 500; }

        .pending-status-ok { padding: 10px; background: rgba(63, 185, 80, 0.1); color: var(--success); border-radius: 8px; font-size: 12px; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px dashed rgba(63, 185, 80, 0.3); }
        .premium-add-btn { 
            width: 64px; border-radius: 16px; background: var(--accent-primary); border: none; 
            color: white; display: flex; align-items: center; justify-content: center; 
            cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(47, 129, 247, 0.3);
        }
        .premium-add-btn:hover { background: #1a6edb; transform: scale(1.05); }

        /* Premium Grid */
        .premium-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        
        .premium-glass { 
            background: var(--bg-secondary); border: 1px solid var(--border-light); 
            border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
            transition: all 0.3s ease; height: 160px; position: relative; overflow: hidden;
        }
        .premium-glass::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        .premium-glass:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.06); border-color: var(--border); }

        .widget-icon-bg { 
            width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; 
            justify-content: center; margin-bottom: 2px;
        }
        .widget-icon-bg.primary { background: rgba(47, 129, 247, 0.08); color: var(--accent-primary); }
        .widget-icon-bg.success { background: rgba(63, 185, 80, 0.08); color: var(--success); }
        .widget-icon-bg.error { background: rgba(248, 81, 73, 0.08); color: var(--error); }
        .widget-icon-bg.warning { background: rgba(210, 153, 34, 0.08); color: var(--warning); }
        .widget-icon-bg.secondary { background: rgba(139, 92, 246, 0.08); color: #8b5cf6; }

        .widget-header { display: flex; gap: 12px; align-items: center; }
        .widget-title-group { flex: 1; display: flex; flex-direction: column; }
        .widget-tag { font-size: 8px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); opacity: 0.6; letter-spacing: 1px; }
        .widget-label { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        
        .widget-value { font-size: 1.6rem; font-weight: 700; font-family: var(--font-display); display: block; margin: 4px 0; letter-spacing: -0.01em; }
        .widget-value.warning { color: var(--warning); }
        .widget-value.success { color: var(--success); }
        .widget-footer-text { font-size: 10px; color: var(--text-secondary); }

        /* Widget Content States */
        .empty-state-visual { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; opacity: 0.4; }
        .empty-state-visual span { font-size: 10px; font-weight: 500; }
        
        .mini-acc-row { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; border-bottom: 1px solid var(--border-light); }
        .mini-acc-row .name { color: var(--text-secondary); font-weight: 500; }
        .mini-acc-row .value { font-weight: 700; }
        
        .category-bars { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
        .bar-row { width: 100%; height: 5px; background: var(--bg-tertiary); border-radius: 10px; overflow: hidden; }
        .bar-row .fill { height: 100%; background: var(--accent-primary); border-radius: 10px; }

        .savings-highlight .big { font-size: 2rem; font-weight: 700; color: var(--success); font-family: var(--font-display); letter-spacing: -0.02em; }
        .savings-highlight .sub { display: block; font-size: 9px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }

        .circle-progress-placeholder { 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            width: 70px; height: 70px; border: 4px solid var(--bg-tertiary); border-radius: 50%;
            border-top-color: var(--warning); margin: 0 auto;
        }
        .circle-progress-placeholder .percent { font-size: 14px; font-weight: 800; }
        .circle-progress-placeholder .label { font-size: 8px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; }

        .premium-footer { margin-top: 40px; display: flex; justify-content: center; }
        .manage-dashboard-btn { 
            background: var(--bg-secondary); border: 1px solid var(--border-light); 
            padding: 10px 24px; border-radius: 100px; font-size: 12px; font-weight: 600;
            display: flex; align-items: center; gap: 8px; color: var(--text-secondary);
            cursor: pointer; transition: all 0.2s;
        }
        .manage-dashboard-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border); }

        /* Config Modal */
        .premium-modal-overlay { 
            position: fixed; inset: 0; background: rgba(0,0,0,0.6); 
            display: flex; align-items: center; justify-content: center; z-index: 10001; 
            backdrop-filter: blur(8px);
        }
        .premium-config-panel { 
            width: 480px; background: var(--bg-primary); border: 1px solid var(--border-light);
            border-radius: 24px; display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 40px 100px rgba(0,0,0,0.3);
            max-width: 90vw;
        }
        .config-header { padding: 24px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: flex-start; }
        .config-header h2 { font-size: 1.25rem; font-weight: 700; }
        .config-header p { font-size: 12px; color: var(--text-secondary); }
        .close-x { background: transparent; color: var(--text-secondary); opacity: 0.5; padding: 4px; }
        .close-x:hover { opacity: 1; }

        .config-scroll-area { padding: 16px; display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; }
        .config-reorder-item { 
            display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 12px;
            transition: all 0.2s;
        }
        .config-reorder-item.hidden { opacity: 0.5; background: var(--bg-tertiary); }
        .drag-handle { color: var(--text-secondary); opacity: 0.3; cursor: grab; }
        .visibility-toggle { background: transparent; padding: 4px; }
        .circle-hollow { width: 18px; height: 18px; border: 2px solid var(--border); border-radius: 50%; }
        .item-label { flex: 1; font-size: 13px; font-weight: 600; }
        .reorder-actions { display: flex; gap: 4px; }
        .reorder-actions button { 
            width: 24px; height: 24px; border-radius: 6px; background: var(--bg-tertiary);
            color: var(--text-secondary); display: flex; align-items: center; justify-content: center;
        }
        .reorder-actions button:hover:not(:disabled) { background: var(--border); color: var(--text-primary); }
        .reorder-actions button:disabled { opacity: 0.2; cursor: not-allowed; }

        .config-footer { padding: 20px; border-top: 1px solid var(--border-light); }

        /* Resoluções Mobile */
        @media (max-width: 768px) {
            .premium-header {
                gap: 8px;
                padding-bottom: 16px;
                overflow-x: visible;
            }
            .premium-kpi {
                padding: 12px 6px;
                gap: 8px;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                min-width: 0;
            }
            .icon-box {
                width: 32px;
                height: 32px;
                margin: 0 auto;
            }
            .icon-box svg {
                width: 16px;
                height: 16px;
            }
            .info {
                align-items: center;
                gap: 2px;
            }
            .val {
                font-size: .95rem; /* Even smaller to ensure it doesn't break line */
            }
            .lbl {
                font-size: 8px;
                letter-spacing: 0;
            }
            .premium-add-btn {
                display: none; /* Ocultar no mobile para não conflitar com o FAB (botão flutuante central) */
            }
            .dashboard-premium {
                padding-bottom: 100px; /* Espaço extra para a navbar inferior */
            }
            .premium-grid {
                grid-template-columns: 1fr;
            }
        }
        `}} />
    </div>
  );
};

export default Dashboard;
