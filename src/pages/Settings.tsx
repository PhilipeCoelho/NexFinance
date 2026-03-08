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
  UploadCloud,
  Activity,
  Trash2
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import PageLayout from '@/components/PageLayout';
import { supabase } from '@/services/supabase';

const Settings: React.FC = () => {
  const { settings, setCurrency, setTheme, setUiDensity, hardReset, importVercelBackup, recalculateBalances, pushToCloud, pullFromCloud, user, signOut } = useFinanceStore();
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

  const handleExportBackup = () => {
    const backupData = {
      personalData: data,
      businessData: useFinanceStore.getState().businessData,
      settings: settings,
      version: 1,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexfinance_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
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

  const densities = [
    { id: 'compact', name: 'Compacto', icon: Zap },
    { id: 'default', name: 'Padrão', icon: Monitor },
    { id: 'comfortable', name: 'Confortável', icon: User },
  ];

  const summaryPanel = (
    <>
      <div className="sys-card sys-summary-item" style={{ gap: '12px' }}>
        <div className="sys-summary-info" style={{ flex: 1 }}>
          <span className="sys-summary-label">Sessão Ativa</span>
          <span className="sys-summary-value" style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'Visitante'}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="sys-btn-minimal"
          style={{ padding: '8px', color: 'var(--sys-red)' }}
        >
          Sair
        </button>
      </div>
      <div className="sys-card sys-summary-item">
        <div className="sys-summary-info">
          <span className="sys-summary-label">Registros Locais</span>
          <span className="sys-summary-value" style={{ fontSize: '18px', color: 'var(--sys-primary)' }}>
            {data.transactions.length} Transações
          </span>
        </div>
        <div className="sys-summary-icon-box" style={{ backgroundColor: 'var(--sys-bg-blue)' }}><Database size={24} color="var(--sys-blue)" /></div>
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
                      backgroundColor: settings.currency === curr.code ? 'var(--sys-bg-blue)' : 'transparent',
                      borderColor: settings.currency === curr.code ? 'var(--sys-blue)' : 'var(--sys-border)',
                      color: settings.currency === curr.code ? 'var(--sys-blue)' : 'var(--sys-text-secondary)'
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
                  backgroundColor: settings.theme === t.id ? 'var(--sys-bg-blue)' : 'transparent',
                  borderColor: settings.theme === t.id ? 'var(--sys-blue)' : 'var(--sys-border)',
                  color: settings.theme === t.id ? 'var(--sys-blue)' : 'var(--sys-text-secondary)'
                }}
              >
                <t.icon size={20} />
                <span>{t.name}</span>
                {settings.theme === t.id && <Check size={16} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} /> Densidade da Interface
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {densities.map(d => (
              <button
                key={d.id}
                onClick={() => setUiDensity(d.id as any)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', borderRadius: '12px', border: '2px solid', transition: 'all 0.2s', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  backgroundColor: settings.uiDensity === d.id ? 'var(--sys-bg-blue)' : 'transparent',
                  borderColor: settings.uiDensity === d.id ? 'var(--sys-blue)' : 'var(--sys-border)',
                  color: settings.uiDensity === d.id ? 'var(--sys-blue)' : 'var(--sys-text-secondary)',
                  position: 'relative'
                }}
              >
                <d.icon size={20} />
                <span>{d.name}</span>
                {settings.uiDensity === d.id && <Check size={14} style={{ position: 'absolute', top: 8, right: 8 }} />}
              </button>
            ))}
          </div>
          <p style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
            Escolha como a informação deve ser distribuída no ecrã. O modo compacto é ideal para gestão rápida no desktop.
          </p>
        </section>

        <section>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Segurança e Dados
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--sys-bg-gray)', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={18} color="var(--sys-text-secondary)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sys-text-primary)' }}>Alterar Palavra-passe</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              <button
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: 'var(--sys-bg-blue)', borderRadius: '12px', border: '1px solid var(--sys-blue)', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={async () => {
                  const { success, error } = await pushToCloud();
                  if (success) alert("Dados enviados para a nuvem com sucesso!");
                  else alert("Erro ao sincronizar: " + (error?.message || error));
                }}
              >
                <UploadCloud size={20} color="var(--sys-blue)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-blue)' }}>Enviar p/ Nuvem</span>
              </button>

              <button
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid var(--sys-green)', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={async () => {
                  if (confirm("Isso substituirá seus dados locais pelos que estão salvos na nuvem. Continuar?")) {
                    const { success, error } = await pullFromCloud();
                    if (success) alert("Dados da nuvem restaurados com sucesso!");
                    else alert("Erro ao baixar dados: " + (error?.message || error));
                  }
                }}
              >
                <Database size={20} color="var(--sys-green)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-green)' }}>Trazer da Nuvem</span>
              </button>
            </div>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--sys-bg-gray)', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UploadCloud size={18} color="var(--sys-text-secondary)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sys-text-primary)' }}>Importar Backup Local (Ficheiro .json)</span>
              </div>
              <ChevronRight size={16} color="var(--sys-text-secondary)" opacity={0.5} />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--sys-bg-blue)', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={handleExportBackup}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={18} color="var(--sys-blue)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sys-blue)' }}>Exportar Backup Local (Segurança)</span>
              </div>
              <ChevronRight size={16} color="var(--sys-blue)" opacity={0.5} />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--sys-bg-purple)', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => {
                recalculateBalances();
                alert("Auditoria completa: Todos os saldos de contas foram matematicamente reconstruídos!");
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={18} color="#a855f7" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#9333ea' }}>Reconstruir Saldos (Auditoria Matemática)</span>
              </div>
              <ChevronRight size={16} color="#d8b4fe" opacity={0.5} />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid var(--sys-red)', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={async () => {
                const recovered = await useFinanceStore.getState().experimental_recoverData();
                if (recovered) {
                  alert("Sucesso! Dados antigos foram encontrados e restaurados localmente.");
                } else {
                  alert("Infelizmente não encontramos rastros de dados em outros nomes de armazenamento no seu navegador atual.");
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Activity size={18} color="var(--sys-red)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sys-red)' }}>Tentar Recuperação de Emergência (Busca Local)</span>
              </div>
              <ChevronRight size={16} color="var(--sys-red)" opacity={0.5} />
            </button>

            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--sys-bg-red)', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', width: '100%', textAlign: 'left' }}
              onClick={() => {
                if (confirm("ATENÇÃO: Isso apagará TODOS os dados locais. Use apenas se os dados já estiverem seguros na nuvem. Continuar?")) {
                  hardReset();
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Trash2 size={18} color="var(--sys-red)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sys-red)' }}>Limpar Tudo (Purge Local Data)</span>
              </div>
              <ChevronRight size={16} color="var(--sys-red)" opacity={0.5} />
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Settings;
