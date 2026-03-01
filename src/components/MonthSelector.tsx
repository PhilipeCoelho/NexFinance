import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MonthSelector: React.FC = () => {
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

  return (
    <div className="month-selector-minimal">
      <button className="nav-btn-min" onClick={handlePrev} title="Mês Anterior">
        <ChevronLeft size={16} />
      </button>

      <div className="current-month-min" onClick={handleCurrent} title="Ir para hoje">
        <span className="month-name-min">
          {format(current, "MMMM yyyy", { locale: ptBR })}
        </span>
        <Calendar size={12} className="cal-icon-min" />
      </div>

      <button className="nav-btn-min" onClick={handleNext} title="Próximo Mês">
        <ChevronRight size={16} />
      </button>

      <style dangerouslySetInnerHTML={{
        __html: `
        .month-selector-minimal {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .nav-btn-min {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--text-secondary);
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .nav-btn-min:hover {
          color: var(--accent-primary);
        }

        .current-month-min {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
          color: var(--text-primary);
          transition: color 0.2s;
        }

        .current-month-min:hover {
          color: var(--accent-primary);
        }

        .cal-icon-min {
          color: inherit;
          opacity: 0.6;
        }

        .month-name-min {
          font-size: 14px;
          font-weight: 500;
          text-transform: capitalize;
          letter-spacing: -0.01em;
        }
      `}} />
    </div>
  );
};

export default MonthSelector;
