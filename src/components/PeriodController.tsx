import React from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PeriodControllerProps {
  incomeTotal?: number;
  expenseTotal?: number;
}

const PeriodController: React.FC<PeriodControllerProps> = ({ incomeTotal, expenseTotal }) => {
  const { referenceMonth, setReferenceMonth } = useFinanceStore();

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

  const hasData = incomeTotal !== undefined && expenseTotal !== undefined;
  const isPositive = hasData && (incomeTotal || 0) >= (expenseTotal || 0);
  const diff = hasData ? (incomeTotal || 0) - (expenseTotal || 0) : 0;

  return (
    <div className="period-controller-container glass">
      <div className="period-controller-main">
        <button className="nav-btn" onClick={handlePrev} title="Mês Anterior">
          <ChevronLeft size={22} />
        </button>

        <div className="period-display" onClick={handleCurrent} title="Ir para o mês atual">
          <h2 className="month-label">
            {format(current, "MMMM yyyy", { locale: ptBR })}
          </h2>
          
          {hasData && (
            <div className={`period-status ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Fluxo Positivo</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  <span>Atenção ao Saldo</span>
                </>
              )}
            </div>
          )}
        </div>

        <button className="nav-btn" onClick={handleNext} title="Próximo Mês">
          <ChevronRight size={22} />
        </button>
      </div>

      <style>{`
        .period-controller-container {
          margin: 0 auto 32px auto;
          padding: 12px 24px;
          border-radius: 20px;
          border: 1px solid var(--border-primary);
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(12px);
          max-width: 420px;
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
          gap: 24px;
          width: 100%;
          justify-content: space-between;
        }

        .period-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: pointer;
          flex: 1;
        }

        .month-label {
          font-family: var(--sys-font-display);
          font-size: 20px;
          font-weight: 900;
          color: var(--sys-text-primary);
          text-transform: capitalize;
          margin: 0;
          letter-spacing: -0.03em;
          transition: color 0.2s ease;
        }

        .period-display:hover .month-label {
          color: var(--sys-blue);
        }

        .period-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }

        .period-status.positive { color: var(--sys-green); }
        .period-status.negative { color: var(--sys-red); }

        .nav-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--border-primary);
          background: white;
          color: var(--sys-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-btn:hover {
          background: var(--sys-bg-blue);
          color: var(--sys-blue);
          border-color: var(--sys-blue);
          transform: scale(1.05);
        }

        .nav-btn:active {
          transform: scale(0.95);
        }

        @media (max-width: 768px) {
          .period-controller-container {
            max-width: 100%;
            margin-bottom: 24px;
            padding: 10px 16px;
          }
          .month-label { font-size: 18px; }
          .nav-btn { width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
};

export default PeriodController;
