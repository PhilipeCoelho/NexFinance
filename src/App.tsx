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
import Migration from '@/pages/Migration';
import FinancialFlow from '@/pages/FinancialFlow';
import Login from '@/pages/Login';
import MobileNav from '@/components/MobileNav';
import { useFinanceStore } from '@/hooks/use-store';
import { supabase } from '@/services/supabase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', background: '#fef2f2', color: '#b91c1c', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px' }}>Oops! Algo correu mal.</h1>
                    <pre style={{ background: '#000', color: '#0f0', padding: '20px', borderRadius: '12px', textAlign: 'left', maxWidth: '90vw', overflow: 'auto', fontSize: '12px' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button onClick={() => window.location.reload()} style={{ marginTop: '24px', padding: '12px 24px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>RECARREGAR APLICAÇÃO</button>
                    <p style={{ marginTop: '16px', fontSize: '12px', opacity: 0.7 }}>NexFinance v1.1.0-pro (Global Error Catch)</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const App: React.FC = () => {
    const { settings, isAuthenticated, authLoading, setSession } = useFinanceStore();

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme || 'light');
    }, [settings.theme]);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
            })
            .catch((error) => {
                console.error("Erro ao obter a sessão do Supabase:", error);
                setSession(null);
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
                <ErrorBoundary>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </ErrorBoundary>
            </Router>
        );
    }

    return (
        <Router>
            <ErrorBoundary>
                <div className="app-container">
                    <Sidebar />
                    <main className="main-content">
                        <div className="scroll-area">
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/financial-flow" element={<FinancialFlow />} />
                                <Route path="/transactions" element={<Transactions />} />
                                <Route path="/income" element={<Income />} />
                                <Route path="/expenses" element={<Expenses />} />
                                <Route path="/accounts" element={<Accounts />} />
                                <Route path="/cards" element={<Cards />} />
                                <Route path="/goals" element={<Goals />} />
                                <Route path="/planning" element={<Planning />} />
                                <Route path="/categories" element={<Categories />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/migration" element={<Migration />} />
                                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </div>
                    </main>
                    <MobileNav />
                </div>
            </ErrorBoundary>
        </Router>
    );
};

export default App;
