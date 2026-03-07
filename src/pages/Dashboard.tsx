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
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { format } from 'date-fns';
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

  useEffect(() => {
    const todayMonth = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().slice(0, 7);
    if (referenceMonth !== todayMonth) {
      setReferenceMonth(todayMonth);
    }
  }, [referenceMonth, setReferenceMonth]);

  if (!data) return null;

  const monthlyTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => FinancialEngine.isTransactionInMonth(t, referenceMonth));
  }, [data?.transactions, referenceMonth]);

  const projectedInitialBalance = useMemo(() => {
    return FinancialEngine.calculateProjectedInitialBalance(data?.transactions || [], data?.accounts || [], referenceMonth);
  }, [data?.transactions, data?.accounts, referenceMonth]);

  const getEffectiveStatus = (t: any): string => {
    return FinancialEngine.getEffectiveTransactionStatus(t, referenceMonth);
  };

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income' && !t.isIgnored)
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense' && !t.isIgnored)
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const pendingIncome = monthlyTransactions
    .filter(t => t.type === 'income' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed')
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const pendingExpense = monthlyTransactions
    .filter(t => t.type === 'expense' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed')
    .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

  const projectedEndBalance = useMemo(() => {
    return projectedInitialBalance + pendingIncome - pendingExpense;
  }, [projectedInitialBalance, pendingIncome, pendingExpense]);

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

  const upcomingExpenses = useMemo(() => {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
    today.setHours(0, 0, 0, 0);
    const upcoming: { description: string; date: Date; value: number; status: string; daysLeft: number }[] = [];

    data.transactions.forEach(t => {
      if (t.type !== 'expense') return;

      const getAdjustedDate = (monthStr: string): Date => {
        const originalDate = new Date(t.date);
        const [yr, mo] = monthStr.split('-').map(Number);
        const day = originalDate.getDate();
        const maxDay = new Date(yr, mo, 0).getDate();
        return new Date(yr, mo - 1, Math.min(day, maxDay));
      };

      if (t.isFixed || t.isRecurring) {
        if (t.recurrence?.excludedDates?.includes(referenceMonth)) return;
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
        upcoming.push({
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
        upcoming.push({
          description: t.description,
          date: tDate,
          value: t.value,
          status: t.status,
          daysLeft,
        });
      }
    });

    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming;
  }, [data.transactions, referenceMonth]);

  const displayUpcoming = upcomingExpenses.slice(0, 5);

  const pendingExpensesList = monthlyTransactions.filter(t => t.type === 'expense' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed');
  const pendingIncomesList = monthlyTransactions.filter(t => t.type === 'income' && !t.isIgnored && getEffectiveStatus(t) !== 'confirmed');

  const pExpenseCount = pendingExpensesList.length;
  const pExpenseValue = pendingExpensesList.reduce((acc, t) => acc + t.value, 0);
  const pIncomeCount = pendingIncomesList.length;
  const pIncomeValue = pendingIncomesList.reduce((acc, t) => acc + t.value, 0);
  const hasPending = pExpenseCount > 0 || pIncomeCount > 0;

  const summaryPanel = (
    <>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">{referenceMonth > new Date().toISOString().slice(0, 7) ? 'LIQUIDEZ INICIAL (PROJ.)' : 'LIQUIDEZ REAL'}</span>
          <span className="sys-summary-value" style={{ color: 'var(--sys-primary)' }}>{formatCurrency(projectedInitialBalance)}</span>
        </div>
        <div className="sys-summary-icon-box bg-primary"><Wallet size={24} /></div>
      </div>

      <div className="sys-card sys-summary-item" onClick={() => navigate('/income')} style={{ cursor: 'pointer' }}>
        <div className="sys-summary-info">
          <span className="sys-summary-label">ENTRADAS DO MÊS</span>
          <span className="sys-summary-value color-green">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="sys-summary-icon-box bg-green"><TrendingUp size={24} /></div>
      </div>

      <div className="sys-card sys-summary-item" onClick={() => navigate('/expenses')} style={{ cursor: 'pointer' }}>
        <div className="sys-summary-info">
          <span className="sys-summary-label">SAÍDAS DO MÊS</span>
          <span className="sys-summary-value color-red">{formatCurrency(monthlyExpense)}</span>
        </div>
        <div className="sys-summary-icon-box bg-red"><TrendingDown size={24} /></div>
      </div>
    </>
  );

  return (
    <PageLayout
      title="Visão Geral"
      summaryPanel={summaryPanel}
    >    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

        {/* Saldo Projetado */}
        <div className="sys-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--sys-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-warning)' }}>
                <Calendar size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)' }}>Saldo Final Projetado</h3>
            </div>
            <ArrowUpRight size={16} color="var(--sys-text-secondary)" />
          </div>
          <div>
            <span style={{ fontSize: '28px', fontWeight: 800, color: projectedEndBalance >= 0 ? 'var(--sys-green)' : 'var(--sys-red)' }}>{formatCurrency(projectedEndBalance)}</span>
            <p style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', marginTop: '4px', fontWeight: 500 }}>
              Resultado contínuo acumulado até {format(new Date(referenceMonth + '-01'), 'MMMM', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Vencimentos */}
        <div className="sys-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--sys-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-primary)' }}>
                <Clock size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)' }}>Vencimentos do Mês</h3>
            </div>
          </div>
          <div>
            {displayUpcoming.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {displayUpcoming.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: i === displayUpcoming.length - 1 ? 'none' : '1px solid var(--sys-border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: item.status === 'confirmed' ? 'var(--sys-green)' : item.daysLeft < 0 ? 'var(--sys-red)' : 'var(--sys-warning)'
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sys-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
                        <span style={{ fontSize: '11px', color: 'var(--sys-text-secondary)' }}>
                          {format(item.date, "dd/MM")}
                          {item.status !== 'confirmed' && (
                            item.daysLeft < 0 ? ` · Vencida há ${Math.abs(item.daysLeft)}d` : item.daysLeft === 0 ? ' · Hoje' : ` · em ${item.daysLeft}d`
                          )}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sys-red)', whiteSpace: 'nowrap', paddingLeft: '8px' }}>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', color: 'var(--sys-text-secondary)' }}>
                <CheckCircle2 size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Sem despesas neste mês</span>
              </div>
            )}
          </div>
        </div>

        {/* Alertas Pendentes */}
        <div className="sys-card" onClick={() => navigate('/transactions?filter=pending')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sys-red)' }}>
                <AlertCircle size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-text-primary)' }}>Alertas</h3>
            </div>
          </div>
          <div>
            {hasPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pExpenseCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--sys-red)', borderRadius: '8px' }}>
                      <ArrowDown size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-red)' }}>{formatCurrency(pExpenseValue)}</span>
                      <span style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>{pExpenseCount} {pExpenseCount === 1 ? 'despesa pendente' : 'despesas pendentes'}</span>
                    </div>
                  </div>
                )}
                {pIncomeCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--sys-green)', borderRadius: '8px' }}>
                      <ArrowUp size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sys-green)' }}>{formatCurrency(pIncomeValue)}</span>
                      <span style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', fontWeight: 500 }}>{pIncomeCount} {pIncomeCount === 1 ? 'receita pendente' : 'receitas pendentes'}</span>
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
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Flutuante Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'var(--sys-primary)',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'transform 0.2s'
        }}
      >
        <Plus size={28} />
      </button>
    </PageLayout>
  );
};

export default Dashboard;
