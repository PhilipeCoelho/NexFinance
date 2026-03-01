import {
  Globe,
  Coins,
  Monitor,
  Lock,
  Database,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';

const Settings: React.FC = () => {
  const { settings, setCurrency, setTheme } = useFinanceStore();

  const handleCurrencyChange = (currency: string) => {
    setCurrency(currency);
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setTheme(theme);
  };

  const currencies = [
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'BRL', name: 'Real (R$)', symbol: 'R$' },
    { code: 'USD', name: 'Dólar ($)', symbol: '$' },
    { code: 'GBP', name: 'Libra (£)', symbol: '£' },
    { code: 'CHF', name: 'Franco (CHF)', symbol: 'CHF' },
  ];

  const themes = [
    { id: 'light', name: 'Modo Claro', icon: Sun },
    { id: 'dark', name: 'Modo Escuro', icon: Moon },
  ];

  return (
    <div className="settings-page fade-in">
      <header className="page-header">
        <div className="header-titles">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Personalize a sua experiência e preferências do sistema</p>
        </div>
      </header>

      <div className="settings-grid">
        <div className="settings-column">
          <section className="settings-section card">
            <h2 className="section-title"><Globe size={18} /> Preferências Regionais</h2>
            <div className="settings-group">
              <label>Moeda Principal</label>
              <div className="currency-grid">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    className={`setting-option ${settings.currency === curr.code ? 'active' : ''}`}
                    onClick={() => handleCurrencyChange(curr.code)}
                  >
                    <div className="curr-icon"><Coins size={20} /></div>
                    <div className="curr-info">
                      <span className="curr-name">{curr.name}</span>
                      <span className="curr-code">{curr.code}</span>
                    </div>
                    {settings.currency === curr.code && <Check size={16} className="check-icon" />}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-section card">
            <h2 className="section-title"><Monitor size={18} /> Aparência & Interface</h2>
            <div className="settings-group">
              <label>Tema do Sistema</label>
              <div className="theme-selection-grid">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    className={`setting-option theme-opt ${settings.theme === t.id ? 'active' : ''}`}
                    onClick={() => handleThemeChange(t.id as 'light' | 'dark')}
                  >
                    <div className="curr-icon"><t.icon size={20} /></div>
                    <div className="curr-info">
                      <span className="curr-name">{t.name}</span>
                    </div>
                    {settings.theme === t.id && <Check size={16} className="check-icon" />}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="settings-column side-col">
          <section className="settings-section card">
            <h2 className="section-title"><Lock size={18} /> Segurança</h2>
            <button className="btn btn-secondary full-width">Alterar Palavra-passe</button>
            <button className="btn btn-secondary full-width">Exportar Logs de Auditoria</button>
          </section>

          <section className="settings-section card danger-zone">
            <h2 className="section-title"><Database size={18} /> Gestão de Dados</h2>
            <p className="setting-desc">Apague todos os dados do contexto atual de forma permanente.</p>
            <button className="btn-danger-outline">Limpar Base de Dados</button>
          </section>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-6);
        }

        .settings-column {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          padding: var(--space-6);
        }

        .section-title {
          font-size: var(--font-size-lg);
          display: flex;
          align-items: center;
          gap: var(--space-3);
          color: var(--text-primary);
        }

        .settings-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .settings-group label {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--text-secondary);
        }

        .currency-grid, .theme-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--space-3);
        }
        
        .theme-opt { flex: 1; }

        .setting-option {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          text-align: left;
          color: var(--text-secondary);
          transition: all 0.2s;
          position: relative;
        }

        .setting-option:hover {
          border-color: var(--accent-primary);
        }

        .setting-option.active {
          background: rgba(47, 129, 247, 0.1);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .curr-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .active .curr-icon { color: var(--accent-primary); }

        .curr-info { display: flex; flex-direction: column; }
        .curr-name { font-size: var(--font-size-sm); font-weight: 600; }
        .curr-code { font-size: 11px; opacity: 0.6; }

        .check-icon {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          color: var(--accent-primary);
        }

        .toggle-item-inline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--border-light);
        }

        .setting-label { font-size: var(--font-size-sm); font-weight: 500; }
        .setting-desc { font-size: var(--font-size-xs); color: var(--text-secondary); }

        .toggle-switch {
          width: 40px;
          height: 20px;
          background: var(--border);
          border-radius: 20px;
          position: relative;
          cursor: pointer;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .toggle-switch.active { background: var(--success); }
        .toggle-switch.active::after { left: 22px; }

        .full-width { width: 100%; justify-content: center; margin-bottom: var(--space-3); }

        .danger-zone { border-color: rgba(248, 81, 73, 0.3); }
        .btn-danger-outline {
          background: transparent;
          border: 1px solid var(--error);
          color: var(--error);
          padding: 10px;
          border-radius: 8px;
          width: 100%;
          font-weight: 600;
          font-size: var(--font-size-sm);
        }
      `}} />
    </div>
  );
};

export default Settings;
