import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PeriodControllerProps {
  incomeTotal?: number;
  expenseTotal?: number;
}

const PeriodController: React.FC<PeriodControllerProps> = ({ incomeTotal, expenseTotal }) => {
  const { referenceMonth, setReferenceMonth, settings } = useFinanceStore();

  const current = parseISO(`${referenceMonth}-01`);

  const handlePrev = () => {
    const next = subMonths(current, 1);
    setReferenceMonth(format(next, 'yyyy-MM'));
  };

  const handleNext = () => {
    const next = addMonths(current, 1);
    setReferenceMonth(format(next, 'yyyy-MM'));
  };

  const handleCurrent = () => {
    setReferenceMonth(format(new Date(), 'yyyy-MM'));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: settings?.currency || 'EUR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="period-controller-container glass">
      <div className="period-controller-main">
        <button className="nav-btn" onClick={handlePrev} title="Mês Anterior">
          <ChevronLeft size={20} />
        </button>

        <div className="period-display" onClick={handleCurrent} title="Ir para o mês atual">
          <h2 className="month-label">
            {format(current, "MMMM yyyy", { locale: ptBR })}
          </h2>
          {(incomeTotal !== undefined || expenseTotal !== undefined) && (
            <div className="period-summary">
              <span className="summary-item incoming">
                <TrendingUp size={12} /> +{formatCurrency(incomeTotal || 0)}
              </span>
              <span className="summary-divider">|</span>
              <span className="summary-item outgoing">
                <TrendingDown size={12} /> -{formatCurrency(expenseTotal || 0)}
              </span>
            </div>
          )}
        </div>

        <button className="nav-btn" onClick={handleNext} title="Próximo Mês">
          <ChevronRight size={20} />
        </button>
      </div>

      <style>{`
        .period-controller-container {
          margin: 0 auto 32px auto;
          padding: 16px 24px;
          border-radius: 20px;
          border: 1px solid var(--border-primary);
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(12px);
          max-width: 500px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .period-controller-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
          border-color: var(--sys-blue);
        }

        .period-controller-main {
          display: flex;
          align-items: center;
          gap: 20px;
          width: 100%;
          justify-content: space-between;
        }

        .period-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          flex: 1;
        }

        .month-label {
          font-family: var(--sys-font-display);
          font-size: 18px;
          font-weight: 800;
          color: var(--sys-text-primary);
          text-transform: capitalize;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .period-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .summary-item.incoming { color: var(--sys-green); }
        .summary-item.outgoing { color: var(--sys-red); }

        .summary-divider {
          color: var(--border-primary);
          opacity: 0.5;
        }

        .nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-primary);
          background: white;
          color: var(--sys-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-btn:hover {
          background: var(--sys-bg-blue);
          color: var(--sys-blue);
          border-color: var(--sys-blue);
          transform: scale(1.1);
        }

        .nav-btn:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .period-controller-container {
            max-width: 100%;
            margin-bottom: 24px;
          }
          .month-label { font-size: 16px; }
        }
      `}</style>
    </div>
  );
};

export default PeriodController;
