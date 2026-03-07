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
import PageLayout from '@/components/PageLayout';

const Settings: React.FC = () => {
  const { settings, setCurrency, setTheme, hardReset, importVercelBackup, recalculateBalances } = useFinanceStore();
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

  const summaryPanel = (
    <>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Utilizador</span>
          <span className="sys-summary-value" style={{ fontSize: '18px' }}>NexFinance Pro</span>
        </div>
        <div className="sys-summary-icon-box" style={{ backgroundColor: '#64748b' }}><User size={24} /></div>
      </div>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Versão do Sistema</span>
          <span className="sys-summary-value" style={{ fontSize: '18px', color: '#fbbf24' }}>v1.2.0</span>
        </div>
        <div className="sys-summary-icon-box" style={{ backgroundColor: '#fbbf24' }}><Zap size={24} /></div>
      </div>
    </>
  );

  return (
    <PageLayout title="Configurações" summaryPanel={summaryPanel}>
      <div className="sys-card" style={{ padding: '24px' }}>
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} /> Preferências Regionais
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Moeda Principal</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {currencies.map(curr => (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencyChange(curr.code)}
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: '12px', border: '2px solid', transition: 'all 0.2s', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                      backgroundColor: settings.currency === curr.code ? '#eff6ff' : 'transparent',
                      borderColor: settings.currency === curr.code ? '#3b82f6' : '#f1f5f9',
                      color: settings.currency === curr.code ? '#2563eb' : '#64748b'
                    }}
                  >
                    {curr.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={16} /> Aparência
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', border: '2px solid', transition: 'all 0.2s', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  backgroundColor: settings.theme === t.id ? '#eff6ff' : 'transparent',
                  borderColor: settings.theme === t.id ? '#3b82f6' : '#f1f5f9',
                  color: settings.theme === t.id ? '#2563eb' : '#64748b'
                }}
              >
                <t.icon size={20} />
                <span>{t.name}</span>
                {settings.theme === t.id && <Check size={16} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Segurança e Dados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={18} color="#94a3b8" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>Alterar Palavra-passe</span>
              </div>
              <ChevronRight size={16} color="#cbd5e1" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportBackup}
            />
            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f0fdfa', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UploadCloud size={18} color="#14b8a6" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0d9488' }}>Importar Backup do Vercel (Substituir Dados)</span>
              </div>
              <ChevronRight size={16} color="#5eead4" />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#faf5ff', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => {
                recalculateBalances();
                alert("Auditoria completa: Todos os saldos de contas foram matematicamente reconstruídos!");
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={18} color="#a855f7" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#9333ea' }}>Reconstruir Saldos (Auditoria Matemática)</span>
              </div>
              <ChevronRight size={16} color="#d8b4fe" />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => hardReset()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={18} color="#f87171" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>Sincronizar/Limpar Dados (Baseado na Produção)</span>
              </div>
              <ChevronRight size={16} color="#fca5a5" />
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Settings;
