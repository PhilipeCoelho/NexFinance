import React from 'react';
import { Target, Plus, Scale } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const Goals: React.FC = () => {
    const summaryPanel = (
        <>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Total a Juntar</span>
                    <span className="sys-summary-value">R$ 0,00</span>
                </div>
                <div className="sys-summary-icon-box" style={{ backgroundColor: '#d53f8c' }}><Target size={24} /></div>
            </div>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Já Economizado</span>
                    <span className="sys-summary-value color-green">R$ 0,00</span>
                </div>
                <div className="sys-summary-icon-box bg-green"><Scale size={24} /></div>
            </div>
        </>
    );

    return (
        <PageLayout title="Objetivos" summaryPanel={summaryPanel}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="sys-btn-primary">
                    <Plus size={16} /> NOVO OBJETIVO
                </button>
            </div>

            <div className="sys-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Target size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1d21', marginBottom: 8 }}>Defina seus objetivos financeiros</h3>
                <p style={{ fontSize: 14, color: '#64748b' }}>Economize para uma viagem, carro novo ou reserva de emergência.</p>
            </div>
        </PageLayout>
    );
};

export default Goals;
