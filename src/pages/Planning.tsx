import React from 'react';
import { PieChart, Plus, TrendingDown, Scale } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const Planning: React.FC = () => {
    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">
                Orçamento do Mês
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Meta de Gastos</span>
                <span className="sys-summary-block-value color-blue">R$ 0,00</span>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>
                    Saldo Livre
                </span>
                <span className="sys-summary-block-value color-green" style={{ fontSize: '24px' }}>
                    R$ 0,00
                </span>
            </div>
        </div>
    );

    return (
        <PageLayout title="Planejamento" summaryPanel={summaryPanel}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="sys-btn-primary">
                    <Plus size={16} /> NOVO PLANO
                </button>
            </div>

            <div className="sys-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <PieChart size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1d21', marginBottom: 8 }}>Planeje seu orçamento mensal</h3>
                <p style={{ fontSize: 14, color: '#64748b' }}>Defina limites de gastos por categoria.</p>
            </div>
        </PageLayout>
    );
};

export default Planning;
