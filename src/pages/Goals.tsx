import React from 'react';
import { Target, Plus, ChevronRight, Filter, Search, MoreVertical, Scale } from 'lucide-react';

const Goals: React.FC = () => {
    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#fdf2f8' }}>
                        <div className="icon-pink" style={{ background: '#d53f8c', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Target size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: '#d53f8c' }}>Objetivos</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-add-mobills" style={{ color: '#d53f8c' }}>
                        <Plus size={14} /> NOVO OBJETIVO
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>
            <main className="mobills-main-content">
                <div className="work-area">
                    <div className="mobills-table-card p-12 text-center text-slate-400">
                        <Target size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Defina seus objetivos financeiros aqui.</p>
                        <p className="text-xs">Economize para uma viagem, carro novo ou reserva de emergência.</p>
                    </div>
                </div>
                <aside className="summary-sidebar">
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Total a Juntar <ChevronRight size={10} /></span>
                            <span className="value bold">R$ 0,00</span>
                        </div>
                        <div className="icon-bg" style={{ background: '#d53f8c' }}><Target size={20} /></div>
                    </div>
                    <div className="summary-card-mobills">
                        <div className="info">
                            <span className="label">Já Economizado <ChevronRight size={10} /></span>
                            <span className="value bold text-green-500">R$ 0,00</span>
                        </div>
                        <div className="icon-bg green" style={{ background: 'var(--mobills-green)' }}><Scale size={20} /></div>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default Goals;
