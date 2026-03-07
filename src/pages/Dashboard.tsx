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
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionModal from '@/components/TransactionModal';
import MonthSelector from '@/components/MonthSelector';
import { FinancialEngine } from '@/lib/FinancialEngine';
import PageLayout from '@/components/PageLayout';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { settings, referenceMonth, setReferenceMonth } = useFinanceStore();
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

  // 1. Current Liquidity (Balance of all accounts today)
  const currentLiquidity = useMemo(() => {
    return data.accounts?.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0) || 0;
  }, [data.accounts]);

  // 2. Monthly Metrics
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

  // 3. Projected Balance
  // We use the FinancialEngine to calculate what the balance WILL BE at the end of the month
  const projectedInitialBalance = useMemo(() => {
    return FinancialEngine.calculateProjectedInitialBalance(data?.transactions || [], data?.accounts || [], referenceMonth);
  }, [data?.transactions, data?.accounts, referenceMonth]);

  const projectedEndBalance = useMemo(() => {
    // Simple formula for the month view: Projected Initial + Internal Month Movement
    const pendingIncome = monthlyTransactions
      .filter(t => t.type === 'income' && !t.isIgnored && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) !== 'confirmed')
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const pendingExpense = monthlyTransactions
      .filter(t => t.type === 'expense' && !t.isIgnored && FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth) !== 'confirmed')
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

    // This is a bit simplified; let's use the engine's perspective if possible or stay consistent
    // End Balance = Initial Liquidity + Total Income - Total Expense
    return projectedInitialBalance + incomeTotal - expenseTotal;
  }, [projectedInitialBalance, incomeTotal, expenseTotal]);


  // 4. Insights & Alerts
  const alerts = useMemo(() => {
    const today = startOfDay(new Date());
    const results = [];

    // Upcoming expenses (next 7 days)
    const upcoming = monthlyTransactions.filter(t => {
      if (t.type !== 'expense' || t.isIgnored) return false;
      const status = FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth);
      if (status === 'confirmed') return false;

      const [yr, mo] = referenceMonth.split('-').map(Number);
      const tDate = new Date(t.date);
      const effDate = new Date(yr, mo - 1, tDate.getDate());
      return isAfter(effDate, today) && isBefore(effDate, addDays(today, 7));
    });

    if (upcoming.length > 0) {
      results.push({
        type: 'warning',
        title: 'Despesas Próximas',
        message: `${upcoming.length} despesas vencem nos próximos 7 dias.`,
        icon: <Clock size={16} />
      });
    }

    // Negative balance warning (simplified)
    if (projectedEndBalance < 0) {
      results.push({
        type: 'danger',
        title: 'Saldo Negativo Projetado',
        message: 'Atenção! Suas previsões indicam saldo negativo ao final do mês.',
        icon: <AlertCircle size={16} />
      });
    }

    return results;
  }, [monthlyTransactions, referenceMonth, projectedEndBalance]);


  // 5. Timeline Data
  const timelineData = useMemo(() => {
    // We start from projectedInitialBalance and apply transactions one by one
    const sorted = [...monthlyTransactions].sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = projectedInitialBalance;
    return sorted.map(t => {
      const val = Number(t.value) || 0;
      if (!t.isIgnored) {
        if (t.type === 'income') runningBalance += val;
        else if (t.type === 'expense') runningBalance -= val;
      }
      return {
        ...t,
        runningBalance
      };
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

  return (
    <PageLayout
      title="Visão Geral"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* LAYER 2: KPIs */}
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
            subtitle={`Total recebido em ${format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}`}
            colorClass="bg-green"
            icon={TrendingUp}
          />
          <KPICard
            title="Saídas do Mês"
            value={expenseTotal}
            subtitle={`Total gasto em ${format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}`}
            colorClass="bg-red"
            icon={TrendingDown}
          />
          <KPICard
            title="Saldo Projetado"
            value={projectedEndBalance}
            subtitle="Expectativa para o fim do período"
            colorClass="bg-yellow"
            icon={Calendar}
          />
        </div>

        {/* LAYER 3: Insights & Alertas */}
        {alerts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {alerts.map((alert, i) => (
              <div key={i} className="sys-card" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderLeft: `4px solid ${alert.type === 'warning' ? 'var(--sys-yellow)' : 'var(--sys-red)'}`,
                backgroundColor: alert.type === 'warning' ? '#fffbeb' : '#fef2f2'
              }}>
                <div style={{
                  color: alert.type === 'warning' ? 'var(--sys-yellow)' : 'var(--sys-red)',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {alert.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1a1d21' }}>{alert.title}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LAYER 4: Atividade Financeira (Timeline) */}
        <div className="sys-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1d21', margin: 0 }}>Evolução do Fluxo de Caixa</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Janeiro · Dezembro</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sys-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>DATA</th>
                  <th>DESCRIÇÃO</th>
                  <th style={{ textAlign: 'right' }}>VALOR</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>SALDO ACUM.</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {timelineData.length > 0 ? timelineData.map((t, i) => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                      {format(parseISO(t.date), 'dd MMM', { locale: ptBR })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          backgroundColor: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)'
                        }} />
                        <span style={{ fontWeight: 600 }}>{t.description}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? 'var(--sys-green)' : 'var(--sys-red)' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value).replace('-', '')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: t.runningBalance >= 0 ? '#1e293b' : 'var(--sys-red)' }}>
                      {formatCurrency(t.runningBalance)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Nenhuma transação prevista para este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Action Center Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'var(--sys-blue)',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(47, 129, 247, 0.3)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={24} strokeWidth={3} />
      </button>
    </PageLayout>
  );
};

export default Dashboard;
