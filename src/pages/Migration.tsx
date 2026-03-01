import React, { useState } from 'react';
import { useFinanceStore } from '@/hooks/use-store';
import { supabase } from '@/services/supabase';
import { LayoutDashboard, CloudUpload, CheckCircle2, AlertCircle } from 'lucide-react';

const MigrationTool: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const { personalData, businessData } = useFinanceStore();

    const exportData = () => {
        const data = {
            personal: personalData,
            business: businessData,
            version: '1.1.0-pro',
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexfinance_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage('Ficheiro de backup exportado com sucesso!');
    };

    const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);

                // Opção 1: Salvar localmente (Zustand)
                if (data.personal && data.business) {
                    // Aqui poderíamos chamar um setStore total, mas vamos apenas migrar para o Supabase diretamente
                    setMessage('Dados carregados do ficheiro. Iniciando sincronização com Supabase...');

                    // Reutilizar a lógica de migração com os dados do ficheiro
                    await performMigration(data.personal, data.business);
                }
            } catch (err) {
                setMessage('Erro ao ler o ficheiro de backup.');
            }
        };
        reader.readAsText(file);
    };

    const performMigration = async (pData: any, bData: any) => {
        setStatus('migrating');
        try {
            // 1. Migrar Contas
            const allAccounts = [
                ...pData.accounts.map((a: any) => ({ ...a, context: 'personal' })),
                ...bData.accounts.map((a: any) => ({ ...a, context: 'business' }))
            ];

            if (allAccounts.length > 0) {
                setMessage(`Migrando ${allAccounts.length} contas para o Supabase...`);
                const { error: accError } = await supabase
                    .from('accounts')
                    .upsert(allAccounts.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        institution: a.institution,
                        current_balance: a.currentBalance,
                        include_in_total: a.includeInTotal,
                        context: a.context
                    })));
                if (accError) throw accError;
            }

            // 2. Migrar Transações
            const allTransactions = [
                ...pData.transactions.map((t: any) => ({ ...t, context: 'personal' })),
                ...bData.transactions.map((t: any) => ({ ...t, context: 'business' }))
            ];

            if (allTransactions.length > 0) {
                setMessage(`Migrando ${allTransactions.length} transações...`);
                const { error: transError } = await supabase
                    .from('transactions')
                    .upsert(allTransactions.map((t: any) => ({
                        id: t.id,
                        type: t.type,
                        value: t.value,
                        date: t.date,
                        description: t.description,
                        category_id: t.categoryId,
                        account_id: t.accountId,
                        status: t.status,
                        is_fixed: t.isFixed,
                        is_recurring: t.isRecurring,
                        recurrence: t.recurrence,
                        context: t.context
                    })));
                if (transError) throw transError;
            }

            setStatus('success');
            setMessage('Dados migrados com sucesso para o Supabase!');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(`Erro na migração: ${err.message || 'Erro desconhecido'}`);
        }
    };

    const handleMigration = () => performMigration(personalData, businessData);

    return (
        <div className="migration-tool card" style={{ maxWidth: '600px', margin: '40px auto', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: '64px', height: '64px', background: 'rgba(47, 129, 247, 0.1)',
                    color: 'var(--accent-primary)', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                }}>
                    <CloudUpload size={32} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Migrar Dados para Nuvem</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                    Este utilitário irá enviar as contas e transações que estão salvas no seu computador para a sua nova base de dados no Supabase.
                </p>
            </div>

            <div className="status-box" style={{
                padding: '16px', borderRadius: '12px', background: 'var(--bg-tertiary)',
                marginBottom: '24px', minHeight: '80px', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
                {status === 'migrating' && <div className="spinner"></div>}
                {status === 'success' && <CheckCircle2 color="var(--success)" size={24} />}
                {status === 'error' && <AlertCircle color="var(--error)" size={24} />}
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{message || 'Pronto para iniciar.'}</span>
            </div>

            <div className="migration-actions" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', height: '54px', fontSize: '15px', fontWeight: 700, background: 'var(--accent-primary)', color: '#fff' }}
                    onClick={async () => {
                        const localData = localStorage.getItem('nexfinance-user-data');
                        if (!localData) {
                            setMessage('Nenhum dado encontrado no LocalStorage para publicar.');
                            return;
                        }

                        setStatus('migrating');
                        setMessage('Preparando snapshot do banco de dados para o repositório...');

                        try {
                            const res = await fetch('/api/save-db', {
                                method: 'POST',
                                body: localData
                            });

                            if (res.ok) {
                                setStatus('success');
                                setMessage('✅ Dados guardados no repositório com sucesso! Agora diga "Antigravity, podes publicar agora" para fazermos o deploy.');
                            } else {
                                throw new Error('Falha ao gravar no disco.');
                            }
                        } catch (err: any) {
                            setStatus('error');
                            setMessage('Erro ao publicar snapshot: ' + err.message);
                        }
                    }}
                    disabled={status === 'migrating'}
                >
                    {status === 'migrating' ? 'A preparar...' : 'Publicar Alterações para Nuvem (CRM Style)'}
                </button>

                <div style={{ borderTop: '1px solid var(--border-color)', margin: '12px 0', paddingTop: '24px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
                        Outras opções (Backup/Manual):
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', height: '42px', fontSize: '13px' }}
                            onClick={exportData}
                        >
                            Exportar JSON
                        </button>
                        <label className="btn btn-secondary" style={{
                            width: '100%', height: '42px', fontSize: '13px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', margin: 0
                        }}>
                            Importar JSON
                            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .spinner {
          width: 20px; height: 20px; border: 3px solid rgba(47, 129, 247, 0.2);
          border-top-color: var(--accent-primary); border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
        </div>
    );
};

export default MigrationTool;
