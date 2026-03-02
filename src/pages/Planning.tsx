import React from 'react';
import { PieChart, Plus, ChevronRight, Filter, Search, MoreVertical, TrendingDown, Scale } from 'lucide-react';

const Planning: React.FC = () => {
    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#f0fdf4' }}>
                        <div className="icon-green" style={{ background: '#38a169', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PieChart size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: '#38a169' }}>Planejamento</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-add-mobills" style={{ color: '#38a169' }}>
                        <Plus size={14} /> NOVO PLANO
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>
            <main className="mobills-main-content">
                <div className="work-area">
                    <div className="mobills-table-card p-12 text-center text-slate-400">
                        <PieChart size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Planeje seu orçamento mensal.</p>
                        <p className="text-xs">Defina limites de gastos por categoria.</p>
                    </div>
                </div>
                <aside className="summary-sidebar">
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Orçamento Total <ChevronRight size={10} /></span>
                            <span className="value bold">R$ 0,00</span>
                        </div>
                        <div className="icon-bg" style={{ background: '#38a169' }}><Scale size={20} /></div>
                    </div>
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Restante Livre <ChevronRight size={10} /></span>
                            <span className="value bold text-blue-500">R$ 0,00</span>
                        </div>
                        <div className="icon-bg" style={{ background: 'var(--accent-primary)' }}><TrendingDown size={20} /></div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default Planning;
