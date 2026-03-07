import React from 'react';
import { PieChart, Plus, TrendingDown, Scale } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const Planning: React.FC = () => {
    const summaryPanel = (
        <>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Orçamento Total</span>
                    <span className="sys-summary-value">R$ 0,00</span>
                </div>
                <div className="sys-summary-icon-box bg-green"><Scale size={24} /></div>
            </div>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Restante Livre</span>
                    <span className="sys-summary-value" style={{ color: '#3b82f6' }}>R$ 0,00</span>
                </div>
                <div className="sys-summary-icon-box" style={{ backgroundColor: '#2563eb' }}><TrendingDown size={24} color="white" /></div>
            </div>
        </>
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
