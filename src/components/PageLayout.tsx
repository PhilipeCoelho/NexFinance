import React, { useState } from 'react';
import MonthSelector from './MonthSelector';
import TransactionModal from './TransactionModal';
import { Plus } from 'lucide-react';

interface PageLayoutProps {
    title: string;
    children: React.ReactNode;
    summaryPanel?: React.ReactNode;
    actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ title, children, summaryPanel, actions }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="sys-page-container fade-in">
            <header className="sys-header">
                <div className="sys-header-left">
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
