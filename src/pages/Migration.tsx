import React, { useState } from 'react';
import { useFinanceStore } from '@/hooks/use-store';
import { supabase } from '@/services/supabase';
import { LayoutDashboard, CloudUpload, CheckCircle2, AlertCircle } from 'lucide-react';

const MigrationTool: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const { personalData, businessData } = useFinanceStore();

    const handleMigration = async () => {
        setStatus('migrating');
        setMessage('Iniciando migração dos dados locais para o Supabase...');

        try {
            // 1. Migrar Contas
            const allAccounts = [
                ...personalData.accounts.map(a => ({ ...a, context: 'personal' })),
                ...businessData.accounts.map(a => ({ ...a, context: 'business' }))
            ];

            if (allAccounts.length > 0) {
                setMessage(`Migrando ${allAccounts.length} contas...`);
                const { error: accError } = await supabase
                    .from('accounts')
                    .upsert(allAccounts.map(a => ({
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
                ...personalData.transactions.map(t => ({ ...t, context: 'personal' })),
                ...businessData.transactions.map(t => ({ ...t, context: 'business' }))
            ];

            if (allTransactions.length > 0) {
                setMessage(`Migrando ${allTransactions.length} transações...`);
                const { error: transError } = await supabase
                    .from('transactions')
                    .upsert(allTransactions.map(t => ({
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
            setMessage('Migração concluída com sucesso! Os seus dados agora estão no Supabase.');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(`Erro na migração: ${err.message || 'Erro desconhecido'}`);
        }
    };

    return (
        <div className="migration-tool card" style={{ maxWidth: '600px', margin: '40px auto', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: '64px', height: '64px', background: 'rgba(47, 129, 247, 0.1)',
                    color: 'var(--accent-primary)', borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justify: 'center', margin: '0 auto 16px'
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

            <button
                className="btn btn-primary"
                style={{ width: '100%', height: '48px' }}
                onClick={handleMigration}
                disabled={status === 'migrating' || status === 'success'}
            >
                {status === 'migrating' ? 'A migrar...' : 'Iniciar Migração Agora'}
            </button>

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
