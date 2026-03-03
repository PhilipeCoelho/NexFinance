import React, { useState } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Receipt,
    Plus,
    Settings,
    Wallet
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TransactionModal from './TransactionModal';

const MobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
        { icon: TrendingDown, label: 'Despesas', path: '/expenses' },
        { icon: 'add', label: 'Novo', path: '#' },
        { icon: Receipt, label: 'Extrato', path: '/transactions' },
        { icon: Settings, label: 'Ajustes', path: '/settings' },
    ];

    return (
        <>
            <nav className="mobile-nav">
                {navItems.map((item, idx) => {
                    if (item.icon === 'add') {
                        return (
                            <button
                                key="add-btn"
                                className="mobile-nav-add"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Plus size={28} strokeWidth={3} />
                            </button>
                        );
                    }

                    const Icon = item.icon as any;
                    const isActive = location.pathname === item.path;

                    return (
                        <button
                            key={item.path}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <Icon size={22} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default MobileNav;
