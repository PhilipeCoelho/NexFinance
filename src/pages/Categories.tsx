import React from 'react';
import { Tags, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import PageLayout from '@/components/PageLayout';

const Categories: React.FC = () => {
    const summaryPanel = (
        <>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Receita</span>
                    <span className="sys-summary-value color-green">20 Categorias</span>
                </div>
                <div className="sys-summary-icon-box bg-green"><TrendingUp size={24} /></div>
            </div>
            <div className="sys-card sys-summary-item">
                <div className="sys-summary-info">
                    <span className="sys-summary-label">Despesa</span>
                    <span className="sys-summary-value color-red">45 Categorias</span>
                </div>
                <div className="sys-summary-icon-box bg-red"><TrendingDown size={24} /></div>
            </div>
        </>
    );

    return (
        <PageLayout title="Categorias" summaryPanel={summaryPanel}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button className="sys-btn-primary">
                    <Plus size={16} /> NOVA CATEGORIA
                </button>
            </div>

            <div className="sys-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Tags size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1d21', marginBottom: 8 }}>Gerencie suas categorias</h3>
                <p style={{ fontSize: 14, color: '#64748b' }}>Agrupe suas transações por tipo.</p>
            </div>
        </PageLayout>
    );
};

export default Categories;
