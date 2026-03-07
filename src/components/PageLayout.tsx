import React, { useState } from 'react';
import MonthSelector from './MonthSelector';
import TransactionModal from './TransactionModal';
import { Plus } from 'lucide-react';

interface PageLayoutProps {
    title: string;
    children: React.ReactNode;
    summaryPanel?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ title, children, summaryPanel }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="sys-page-container fade-in">
            <header className="sys-header">
                <div className="sys-header-left">
                    <h1 className="sys-page-title">{title}</h1>
                    <MonthSelector />
                </div>
                <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} strokeWidth={3} /> Nova Transação
                </button>
            </header>

            <div className={summaryPanel ? "sys-content-grid" : "sys-content-single"}>
                <div className="sys-main-content">
                    {children}
                </div>
                {summaryPanel && (
                    <div className="sys-summary-sidebar">
                        {summaryPanel}
                    </div>
                )}
            </div>

            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default PageLayout;
