import React from 'react';
import { Tags, Plus, ChevronRight, Filter, Search, MoreVertical, TrendingUp, TrendingDown, Scale } from 'lucide-react';

const Categories: React.FC = () => {
    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#fff7ed' }}>
                        <div className="icon-orange" style={{ background: '#ed8936', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Tags size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: '#ed8936' }}>Categorias</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-add-mobills" style={{ color: '#ed8936' }}>
                        <Plus size={14} /> NOVA CATEGORIA
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>
            <main className="mobills-main-content">
                <div className="work-area">
                    <div className="mobills-table-card p-12 text-center text-slate-400">
                        <Tags size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Gerencie suas categorias.</p>
                        <p className="text-xs">Agrupe suas transações por tipo.</p>
                    </div>
                </div>
                <aside className="summary-sidebar">
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Receita <ChevronRight size={10} /></span>
                            <span className="value bold text-green-500">20 Categorias</span>
                        </div>
                        <div className="icon-bg green" style={{ background: 'var(--mobills-green)' }}><TrendingUp size={20} /></div>
                    </div>
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Despesa <ChevronRight size={10} /></span>
                            <span className="value bold text-red-500">45 Categorias</span>
                        </div>
                        <div className="icon-bg red" style={{ background: 'var(--mobills-red)' }}><TrendingDown size={20} /></div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default Categories;
