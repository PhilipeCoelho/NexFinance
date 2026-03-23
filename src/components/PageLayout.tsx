import React, { useState } from 'react';
import MonthSelector from './MonthSelector';
import TransactionModal from './TransactionModal';
import { Plus, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
    title: string;
    children: React.ReactNode;
    summaryPanel?: React.ReactNode;
    actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ title, children, summaryPanel, actions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navigate = useNavigate();
    const isDashboard = title === 'Visão Geral';

    return (
        <div className="sys-page-container fade-in">
            <header className="sys-header">
                <div className="sys-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {!isDashboard && (
                        <button 
                            className="sys-btn-minimal" 
                            onClick={() => navigate('/')} 
                            style={{ 
                                padding: '8px', 
                                border: '1px solid var(--border-primary)', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'white',
                                color: '#64748b',
                                transition: 'all 0.2s ease',
                                height: 'fit-content'
                            }}
                        >
                            <LayoutDashboard size={14} />
                            <span style={{ fontSize: '11px', fontWeight: 700 }}>DASHBOARD</span>
                        </button>
                    )}
                    <h1 className="sys-page-title">{title}</h1>
                    {actions}
                </div>
                <div className="sys-header-right">
                    <MonthSelector />
                    <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} strokeWidth={3} /> Nova Transação
                    </button>
                </div>
            </header>

            <main className={`sys-content-layout ${summaryPanel ? 'sys-dashboard-grid' : ''}`}>
                <div className="sys-main-area">
                    {children}
                </div>
                {summaryPanel && (
                    <aside className="sys-summary-area">
                        {summaryPanel}
                    </aside>
                )}
            </main>

            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default PageLayout;
