import React, { useState } from 'react';
import { useFinanceStore } from '@/hooks/use-store';
import { supabase } from '@/services/supabase';
import {
    Cloud, CloudDownload, CloudUpload, CheckCircle2, AlertCircle,
    Database, Download, Upload, RefreshCw, Info, FileJson
} from 'lucide-react';

const Migration: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [cloudInfo, setCloudInfo] = useState<any>(null);
    const { personalData, businessData, settings, currentContext, referenceMonth, viewMonth, session, pullFromCloud, pushToCloud } = useFinanceStore();

    const setMsg = (msg: string, s: 'idle' | 'loading' | 'success' | 'error' = 'idle') => {
        setMessage(msg);
        setStatus(s);
    };

    // ── 1. PULL FORÇADO DA NUVEM ─────────────────────────────────────────────
    const forcePullFromCloud = async () => {
        setMsg('A buscar dados da nuvem...', 'loading');
        try {
            const sess = session || (await supabase.auth.getSession()).data.session;
            if (!sess?.user) return setMsg('Não autenticado.', 'error');

            const { data, error } = await supabase
                .from('user_sync')
                .select('state, updated_at')
                .eq('user_id', sess.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST205' || error.message?.includes('user_sync')) {
                    return setMsg('❌ A tabela user_sync não existe no Supabase. Execute o SQL indicado abaixo para a criar.', 'error');
                }
                throw error;
            }

            if (!data?.state) {
                return setMsg('⚠️ Sem dados na nuvem para este utilizador.', 'error');
            }

            setCloudInfo({
                updatedAt: data.updated_at,
                personalTransactions: data.state?.personalData?.transactions?.length || 0,
                personalAccounts: data.state?.personalData?.accounts?.length || 0,
                businessTransactions: data.state?.businessData?.transactions?.length || 0,
            });

            // Aplicar estado da nuvem
            useFinanceStore.setState({
                ...data.state,
                session: sess,
                user: sess.user,
                isAuthenticated: true,
                isHydrated: true,
                authLoading: false,
            });

            setMsg(`✅ Dados restaurados! ${data.state?.personalData?.transactions?.length || 0} transações recuperadas da nuvem.`, 'success');
        } catch (err: any) {
            setMsg(`Erro: ${err.message}`, 'error');
        }
    };

    // ── 2. PUSH FORÇADO PARA A NUVEM ─────────────────────────────────────────
    const forcePushToCloud = async () => {
        setMsg('A enviar dados para a nuvem...', 'loading');
        try {
            // Obter sessão actual
            const { data: { session: freshSess }, error: sessErr } = await supabase.auth.getSession();
            const sess = freshSess || session;

            if (sessErr) return setMsg(`Erro de sessão: ${sessErr.message}`, 'error');
            if (!sess?.user) return setMsg('❌ Não autenticado. Faça login primeiro.', 'error');

            // Injectar token JWT no cliente Supabase para garantir que a RLS funciona
            await supabase.auth.setSession({
                access_token: sess.access_token,
                refresh_token: sess.refresh_token
            });

            const state = useFinanceStore.getState();
            const personalTx = state.personalData.transactions.length;
            const businessTx = state.businessData.transactions.length;

            setMsg(`A guardar ${personalTx + businessTx} transações na nuvem...`, 'loading');

            const payload = {
                currentContext: state.currentContext,
                personalData: state.personalData,
                businessData: state.businessData,
                settings: state.settings,
                referenceMonth: state.referenceMonth,
                viewMonth: state.viewMonth,
                lastUpdatedAt: new Date().toISOString(),
            };

            // Timeout de 20 segundos para evitar hang infinito
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: operação demorou mais de 20s. Verifique a sua ligação.')), 20000)
            );

            const upsertPromise = supabase.from('user_sync').upsert({
                user_id: sess.user.id,
                state: payload,
                updated_at: new Date().toISOString(),
            });

            const { error } = await Promise.race([upsertPromise, timeoutPromise]) as any;

            if (error) {
                // Diagnóstico detalhado do erro
                const detail = `Código: ${error.code || 'N/A'} | ${error.message || error.hint || JSON.stringify(error)}`;
                throw new Error(detail);
            }

            setMsg(`✅ ${personalTx + businessTx} transações guardadas na nuvem! (${personalTx} pessoais + ${businessTx} empresa)`, 'success');
        } catch (err: any) {
            setMsg(`❌ Erro: ${err.message}`, 'error');
            console.error('PUSH ERROR:', err);
        }
    };

    // ── 3. IMPORTAR JSON (colar dados de produção) ───────────────────────────
    const importFromJson = async () => {
        if (!jsonInput.trim()) return setMsg('Por favor cole o JSON antes de importar.', 'error');
        setMsg('A processar JSON...', 'loading');
        try {
            const parsed = JSON.parse(jsonInput);

            // Compatível com o formato nexfinance-storage (estado do Zustand)
            const state = parsed.state || parsed;

            if (!state.personalData && !state.personal) {
                return setMsg('❌ JSON inválido — não encontrei dados do NexFinance.', 'error');
            }

            // Suporte ao formato antigo { personal: ..., business: ... }
            const personalData = state.personalData || state.personal;
            const businessData = state.businessData || state.business || state.personalData;

            useFinanceStore.setState({
                personalData,
                businessData,
                settings: state.settings ? { ...useFinanceStore.getState().settings, ...state.settings } : useFinanceStore.getState().settings,
                isHydrated: true,
            });

            const transCount = (personalData?.transactions?.length || 0) + (businessData?.transactions?.length || 0);
            setMsg(`✅ ${transCount} transações importadas! Agora clique em "Enviar para Nuvem" para guardar.`, 'success');
        } catch (err: any) {
            setMsg(`Erro ao ler JSON: ${err.message}`, 'error');
        }
    };

    // ── 4. EXPORTAR JSON ─────────────────────────────────────────────────────
    const exportToJson = () => {
        const state = useFinanceStore.getState();
        const data = {
            personalData: state.personalData,
            businessData: state.businessData,
            settings: state.settings,
            lastUpdatedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexfinance_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMsg('✅ Backup exportado com sucesso!', 'success');
    };

    // ── 5. IMPORTAR FICHEIRO JSON ────────────────────────────────────────────
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setJsonInput(e.target?.result as string || '');
        reader.readAsText(file);
    };

    const currentTransactions = personalData.transactions.length + businessData.transactions.length;

    return (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px', fontFamily: 'var(--sys-font-main)' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Database size={24} color="var(--sys-blue)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--sys-text-primary)' }}>Sincronização de Dados</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--sys-text-secondary)' }}>Gerir backup e restauro dos dados do NexFinance</p>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {message && (
                <div style={{
                    padding: '14px 18px', borderRadius: 12, marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: status === 'success' ? 'rgba(16,185,129,0.08)' : status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
                    border: `1px solid ${status === 'success' ? 'rgba(16,185,129,0.2)' : status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}`,
                }}>
                    {status === 'loading' && <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} color="var(--sys-blue)" />}
                    {status === 'success' && <CheckCircle2 size={18} color="var(--sys-green)" />}
                    {status === 'error' && <AlertCircle size={18} color="var(--sys-red)" />}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sys-text-primary)' }}>{message}</span>
                </div>
            )}

            {/* Estado Atual */}
            <div className="sys-card" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sys-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Estado Actual</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Transações Empresa', value: personalData.transactions.length },
                        { label: 'Contas Empresa', value: personalData.accounts.length },
                        { label: 'Transações Pessoais', value: businessData.transactions.length },
                    ].map(item => (
                        <div key={item.label} style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                            <div style={{ fontSize: 10, color: 'var(--sys-text-secondary)', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: item.value > 0 ? 'var(--sys-blue)' : 'var(--sys-text-secondary)' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECÇÃO 1: Cloud Sync */}
            <div className="sys-card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Cloud size={18} color="var(--sys-blue)" />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Sincronização com a Nuvem</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--sys-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                    Os dados são guardados automaticamente na nuvem (Supabase). Use estes botões se precisar forçar uma sincronização manual.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                        className="sys-btn-secondary"
                        style={{ height: 44, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={forcePullFromCloud}
                        disabled={status === 'loading'}
                    >
                        <CloudDownload size={16} />
                        Restaurar da Nuvem
                    </button>
                    <button
                        className="sys-btn-primary"
                        style={{ height: 44, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={forcePushToCloud}
                        disabled={status === 'loading'}
                    >
                        <CloudUpload size={16} />
                        Enviar para Nuvem
                    </button>
                </div>
            </div>

            {/* SECÇÃO 2: Importar/Exportar JSON */}
            <div className="sys-card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <FileJson size={18} color="var(--sys-green)" />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Backup / Restauro por Ficheiro</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--sys-text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                    Exporte os dados actuais ou importe dados de um backup anterior (ficheiro JSON).
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <button
                        className="sys-btn-secondary"
                        style={{ height: 44, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={exportToJson}
                    >
                        <Download size={16} />
                        Exportar JSON
                    </button>
                    <label className="sys-btn-secondary" style={{ height: 44, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                        <Upload size={16} />
                        Importar Ficheiro
                        <input type="file" accept=".json" onChange={handleFileImport} style={{ display: 'none' }} />
                    </label>
                </div>

                {/* Colar JSON manualmente */}
                <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--sys-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                        Ou cole o JSON diretamente:
                    </label>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='Cole aqui o conteúdo do nexfinance_backup_*.json ou do localStorage de produção...'
                        style={{
                            width: '100%', minHeight: 120, padding: '12px', borderRadius: 10,
                            border: '1px solid var(--sys-border)', background: 'var(--bg-tertiary)',
                            fontSize: 12, fontFamily: 'monospace', color: 'var(--sys-text-primary)',
                            resize: 'vertical', boxSizing: 'border-box', outline: 'none'
                        }}
                    />
                    <button
                        className="sys-btn-primary"
                        style={{ marginTop: 10, height: 40, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
                        onClick={importFromJson}
                        disabled={!jsonInput.trim() || status === 'loading'}
                    >
                        <Upload size={16} />
                        Importar e Aplicar JSON
                    </button>
                </div>
            </div>

            {/* SECÇÃO 3: SQL para criar user_sync */}
            <div className="sys-card" style={{ border: '1px dashed var(--sys-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={16} color="var(--sys-yellow)" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Configuração do Supabase (1x apenas)</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--sys-text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                    Se ver o erro "tabela user_sync não encontrada", precisa executar o SQL abaixo no painel do Supabase:
                    <a href="https://supabase.com/dashboard/project/gakhvpekdizihywagyql/sql/new" target="_blank" rel="noreferrer" style={{ color: 'var(--sys-blue)', marginLeft: 4 }}>
                        Abrir SQL Editor →
                    </a>
                </p>
                <pre style={{
                    background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 10,
                    fontSize: 11, fontFamily: 'monospace', overflowX: 'auto',
                    color: 'var(--sys-text-primary)', margin: 0, lineHeight: 1.6
                }}>
                    {`CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync data"
  ON public.user_sync FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_sync TO authenticated;`}
                </pre>
                <button
                    className="sys-btn-secondary"
                    style={{ marginTop: 12, height: 36, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sync data" ON public.user_sync FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON public.user_sync TO authenticated;`);
                        setMsg('SQL copiado para o clipboard!', 'success');
                    }}
                >
                    Copiar SQL
                </button>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Migration;
