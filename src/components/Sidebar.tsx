import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  Tags,
  Settings,
  ChevronDown,
  Briefcase,
  User,
  CreditCard,
  LogOut
} from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { ContextType } from '@/types/finance';
import { useNavigate, useLocation } from 'react-router-dom';
import MonthSelector from './MonthSelector';

const Sidebar: React.FC = () => {
  const { currentContext, setContext, signOut } = useFinanceStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', path: '/dashboard' },
    { icon: TrendingUp, label: 'Receitas', id: 'income', path: '/income' },
    { icon: TrendingDown, label: 'Despesas', id: 'expenses', path: '/expenses' },
    { icon: Receipt, label: 'Transações', id: 'transactions', path: '/transactions' },
    { icon: Wallet, label: 'Contas', id: 'accounts', path: '/accounts' },
    { icon: CreditCard, label: 'Cartões', id: 'cards', path: '/cards' },
    { icon: Target, label: 'Objetivos', id: 'goals', path: '/goals' },
    { icon: PieChart, label: 'Planejamento', id: 'planning', path: '/planning' },
    { icon: Tags, label: 'Categorias & Tags', id: 'categories', path: '/categories' },
  ];

  const handleContextChange = (context: ContextType) => {
    setContext(context);
  };

  return (
    <div className="sidebar">
      <div className="context-switcher">
        <div className={`context-logo ${currentContext}`}>
          {currentContext === 'personal' ? <User size={20} /> : <Briefcase size={20} />}
        </div>
        <div className="context-info">
          <span className="context-label">Contexto</span>
          <span className="context-name">
            {currentContext === 'personal' ? 'Finanças Pessoais' : 'Finanças Empresariais'}
          </span>
        </div>
        <div className="switch-dropdown">
          <button className="dropdown-trigger" title="Alternar Contexto" onClick={() => handleContextChange(currentContext === 'personal' ? 'business' : 'personal')}>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={18} color={item.id === 'income' ? 'var(--success)' : item.id === 'expenses' ? 'var(--error)' : 'currentColor'} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`nav-item settings ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
        >
          <Settings size={20} />
          <span>Configurações</span>
        </button>

        <button
          className="nav-item logout"
          style={{ color: '#ef4444' }}
          onClick={() => {
            if (confirm('Deseja realmente sair?')) {
              signOut();
            }
          }}
        >
          <LogOut size={20} />
          <span>Sair da conta</span>
        </button>

        <div className="sidebar-brand">
          <span className="brand-name">NexFinance</span>
          <span className="brand-version">v1.1.0-pro</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .sidebar {
          width: 220px;
          height: 100vh;
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: var(--space-3);
          z-index: 100;
        }

        .context-switcher {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 8px;
          background-color: var(--bg-tertiary);
          border-radius: 10px;
          margin-bottom: var(--space-4);
          border: 1px solid var(--border-light);
          position: relative;
        }

        .context-logo {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .context-logo.personal { background-color: rgba(47, 129, 247, 0.15); color: var(--personal-color); }
        .context-logo.business { background-color: rgba(242, 204, 96, 0.15); color: var(--business-color); }

        .context-info { display: flex; flex-direction: column; flex: 1; }
        .context-label { font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .context-name { font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .dropdown-trigger { background: transparent; color: var(--text-secondary); padding: 2px; border-radius: 4px; }
        .dropdown-trigger:hover { background-color: var(--border-light); color: var(--text-primary); }

        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 8px 10px;
          color: var(--text-secondary);
          background: transparent;
          border-radius: 6px;
          text-align: left;
          width: 100%;
          font-size: var(--font-size-sm);
          transition: all 0.2s;
        }

        .nav-item:hover { background-color: var(--bg-tertiary); color: var(--text-primary); }

        .nav-item.active {
          background-color: var(--bg-tertiary);
          color: var(--accent-primary);
          border: 1px solid var(--border-light);
          font-weight: 500;
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex; flex-direction: column; gap: var(--space-4);
          padding-top: var(--space-4); border-top: 1px solid var(--border-light);
        }

        .sidebar-brand { display: flex; flex-direction: column; padding: 0 var(--space-3); }
        .brand-name { font-weight: 700; font-size: var(--font-size-base); background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brand-version { font-size: 10px; color: var(--text-secondary); opacity: 0.6; }
      `}} />
    </div >
  );
};

export default Sidebar;
