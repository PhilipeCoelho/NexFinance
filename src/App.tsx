import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Accounts from '@/pages/Accounts';
import Cards from '@/pages/Cards';
import Settings from '@/pages/Settings';
import Migration from '@/pages/Migration';
import MonthSelector from '@/components/MonthSelector';
import { useFinanceStore } from '@/hooks/use-store';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
    const { settings } = useFinanceStore();

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme || 'light');
    }, [settings.theme]);

    return (
        <Router>
            <div className="app-container">
                <Sidebar />
                <main className="main-content">
                    <div className="scroll-area">
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/income" element={<Transactions forcedType="income" />} />
                            <Route path="/expenses" element={<Transactions forcedType="expense" />} />
                            <Route path="/accounts" element={<Accounts />} />
                            <Route path="/cards" element={<Cards />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/migration" element={<Migration />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </Router>
    );
};

export default App;
