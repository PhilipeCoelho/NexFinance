import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Expenses from '@/pages/Expenses';
import Income from '@/pages/Income';
import Accounts from '@/pages/Accounts';
import Cards from '@/pages/Cards';
import Goals from '@/pages/Goals';
import Planning from '@/pages/Planning';
import Categories from '@/pages/Categories';
import Settings from '@/pages/Settings';
import AdvancedPlanning from '@/pages/AdvancedPlanning';
import Migration from '@/pages/Migration';
import Login from '@/pages/Login';
import MobileNav from '@/components/MobileNav';
import { useFinanceStore } from '@/hooks/use-store';
import { supabase } from '@/services/supabase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
    const { settings, isAuthenticated, authLoading, setSession } = useFinanceStore();

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme || 'light');
    }, [settings.theme]);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">NexFinance está a carregar...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        );
    }

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
                            <Route path="/income" element={<Income />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/accounts" element={<Accounts />} />
                            <Route path="/cards" element={<Cards />} />
                            <Route path="/goals" element={<Goals />} />
                            <Route path="/planning" element={<Planning />} />
                            <Route path="/advanced" element={<AdvancedPlanning />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/migration" element={<Migration />} />
                            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </div>
                </main>
                <MobileNav />
            </div>
        </Router>
    );
};

export default App;
