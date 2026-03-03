import React, { useRef } from 'react';
import {
  Globe,
  Coins,
  Monitor,
  Lock,
  Database,
  Check,
  Sun,
  Moon,
  ChevronRight,
  Settings as SettingsIcon,
  Shield,
  User,
  Zap,
  UploadCloud
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';

const Settings: React.FC = () => {
  const { settings, setCurrency, setTheme, hardReset, importVercelBackup } = useFinanceStore();
  const data = useCurrentData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importVercelBackup(data);
      } catch (error) {
        console.error(error);
        alert('Erro ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

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
  ];

  const themes = [
    { id: 'light', name: 'Modo Claro', icon: Sun },
    { id: 'dark', name: 'Modo Escuro', icon: Moon },
  ];

  return (
    <div className="expenses-page-mobills fade-in">
      <header className="mobills-page-header">
        <div className="header-left">
          <div className="breadcrumb-pill" style={{ background: '#f1f5f9' }}>
            <div className="icon-settings" style={{ background: '#64748b', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SettingsIcon size={14} />
            </div>
            <span className="breadcrumb-text" style={{ color: '#64748b' }}>Configurações</span>
            <ChevronRight size={14} opacity={0.3} />
          </div>
        </div>
      </header>

      <main className="mobills-main-content">
        <div className="work-area">
          <div className="mobills-table-card" style={{ padding: '24px' }}>
            <section className="mb-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2">
                <Globe size={16} /> Preferências Regionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500">Moeda Principal</label>
                  <div className="flex gap-2">
                    {currencies.map(curr => (
                      <button
                        key={curr.code}
                        onClick={() => handleCurrencyChange(curr.code)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold text-sm ${settings.currency === curr.code ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-500'}`}
                      >
                        {curr.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2">
                <Monitor size={16} /> Aparência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id as any)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all font-bold text-sm ${settings.theme === t.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-500'}`}
                  >
                    <t.icon size={20} />
                    <span>{t.name}</span>
                    {settings.theme === t.id && <Check size={16} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 flex items-center gap-2">
                <Shield size={16} /> Segurança e Dados
              </h3>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-600">Alterar Palavra-passe</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json"
                  onChange={handleImportBackup}
                />
                <button
                  className="flex items-center justify-between p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-all w-full text-left"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center gap-3">
                    <UploadCloud size={18} className="text-teal-500" />
                    <span className="text-sm font-bold text-teal-600">Importar Backup do Vercel (Substituir Dados)</span>
                  </div>
                  <ChevronRight size={16} className="text-teal-300" />
                </button>

                <button
                  className="flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all w-full text-left"
                  onClick={() => hardReset()}
                >
                  <div className="flex items-center gap-3">
                    <Database size={18} className="text-red-400" />
                    <span className="text-sm font-bold text-red-600">Sincronizar/Limpar Dados (Baseado na Produção)</span>
                  </div>
                  <ChevronRight size={16} className="text-red-300" />
                </button>
              </div>
            </section>
          </div>
        </div>

        <aside className="summary-sidebar">
          <div className="summary-card-mobills">
            <div className="info">
              <span className="label">Utilizador <ChevronRight size={10} /></span>
              <span className="value">NexFinance Pro</span>
            </div>
            <div className="icon-bg" style={{ background: '#64748b' }}><User size={20} /></div>
          </div>

          <div className="summary-card-mobills">
            <div className="info">
              <span className="label">Versão do Sistema <ChevronRight size={10} /></span>
              <span className="value">v1.2.0</span>
            </div>
            <div className="icon-bg" style={{ background: '#fbbf24' }}><Zap size={20} /></div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Settings;
