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
  MoreVertical,
  Activity,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { ContextType } from '@/types/finance';
import { useNavigate, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import MonthSelector from './MonthSelector';

const Sidebar: React.FC = () => {
  const { currentContext, setContext, signOut, settings, setTheme } = useFinanceStore();
  const [isPinned, setIsPinned] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', path: '/dashboard' },
    { icon: Activity, label: 'Fluxo Caixa', id: 'financial-flow', path: '/financial-flow' },
    { icon: Receipt, label: 'Transações', id: 'transactions', path: '/transactions' },
    { icon: TrendingUp, label: 'Receitas', id: 'income', path: '/income' },
    { icon: TrendingDown, label: 'Despesas', id: 'expenses', path: '/expenses' },
    { icon: Wallet, label: 'Contas', id: 'accounts', path: '/accounts' },
    { icon: CreditCard, label: 'Cartões', id: 'cards', path: '/cards' },
    { icon: PieChart, label: 'Planejamento', id: 'planning', path: '/planning' },
    { icon: Target, label: 'Objetivos', id: 'goals', path: '/goals' },
    { icon: Tags, label: 'Categorias', id: 'categories', path: '/categories' },
    { icon: Settings, label: 'Configurações', id: 'settings', path: '/settings' },
  ];

  const handleContextChange = (context: ContextType) => {
    setContext(context);
  };

  const [sidebarState, setSidebarState] = React.useState<'mini' | 'pinned' | 'hidden'>('pinned');

  return (
    <>
      {/* Floating Toggle for Hidden State */}
      {sidebarState === 'hidden' && (
        <button
          className="sidebar-floating-toggle"
          onClick={() => setSidebarState('pinned')}
          title="Mostrar Menu"
        >
          <Menu size={20} />
        </button>
      )}

      <div className={`sidebar ${sidebarState}`}>
        <div className="sidebar-toggle-btn">
          <button
            onClick={() => setSidebarState(sidebarState === 'pinned' ? 'mini' : sidebarState === 'mini' ? 'hidden' : 'pinned')}
            title={sidebarState === 'pinned' ? "Recolher" : sidebarState === 'mini' ? "Ocultar" : "Mostrar"}
          >
            {sidebarState === 'pinned' ? <PanelLeftClose size={18} /> : sidebarState === 'mini' ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
          </button>
        </div>

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
            className="nav-item theme-toggle"
            onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}
          >
            {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{settings.theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
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
          width: 50px;
          height: 100vh;
          background-color: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 10px;
          z-index: 100;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          position: sticky;
          top: 0;
          flex-shrink: 0;
        }

        /* Hover behavior: Show icons only */
        .sidebar:hover {
          width: 60px;
        }

        /* Pinned behavior: Show everything */
        .sidebar.pinned {
          width: 240px;
        }

        .sidebar-toggle-btn {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .sidebar-toggle-btn button {
          background: transparent;
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 8px;
          transition: 0.2s;
        }

        .sidebar-toggle-btn button:hover {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
        }

        .sidebar.pinned .sidebar-toggle-btn {
          justify-content: flex-end;
          padding-right: 5px;
        }

        .context-switcher {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 6px;
          background-color: var(--bg-tertiary);
          border-radius: 10px;
          margin-bottom: var(--space-4);
          border: 1px solid var(--border-light);
          min-width: 180px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .sidebar:hover .context-switcher,
        .sidebar.pinned .context-switcher {
          opacity: 1;
        }

        .sidebar:not(.pinned):not(:hover) .context-switcher {
           display: none;
        }

        .context-logo {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .context-info { 
          display: flex; 
          flex-direction: column; 
          flex: 1; 
          overflow: hidden;
          transition: opacity 0.2s;
        }

        .sidebar:not(.pinned) .context-info,
        .sidebar:not(.pinned) .switch-dropdown {
          display: none;
        }

        .context-label { font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .context-name { font-size: 11px; font-weight: 600; white-space: nowrap; }

        .dropdown-trigger { background: transparent; color: var(--text-secondary); padding: 2px; border-radius: 4px; }
        
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 4px; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 10px;
          color: var(--text-secondary);
          background: transparent;
          border-radius: 10px;
          width: 100%;
          min-width: 200px;
          transition: all 0.2s;
          position: relative;
        }

        .nav-item svg {
          min-width: 20px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .sidebar:hover .nav-item svg,
        .sidebar.pinned .nav-item svg {
          opacity: 1;
        }

        .nav-item span {
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .sidebar.pinned .nav-item span {
          opacity: 1;
        }

        .nav-item:hover { background-color: var(--bg-tertiary); color: var(--text-primary); }
        .nav-item.active {
          background-color: var(--bg-tertiary);
          color: var(--accent-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .sidebar-footer {
          margin-top: auto;
          display: flex; flex-direction: column; gap: 4px;
          padding-top: 15px; border-top: 1px solid var(--border-light);
        }

        .sidebar-brand { 
          display: flex; 
          flex-direction: column; 
          padding: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .sidebar.pinned .sidebar-brand {
          opacity: 1;
        }

        .brand-name { font-weight: 800; font-size: 16px; color: var(--accent-primary); }
        .brand-version { font-size: 10px; color: var(--text-secondary); }

        @media (max-width: 768px) {
          .sidebar { display: none !important; }
        }

        .sidebar.hidden {
          width: 0 !important;
          padding: 0 !important;
          border: none !important;
          transform: translateX(-100%);
        }

        .sidebar-floating-toggle {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 150;
          background: var(--accent-primary);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(47, 129, 247, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
      </div >
    </>
  );
};

export default Sidebar;
