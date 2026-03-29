import React, { useState } from 'react';
import { Shield, RotateCcw, Database, AlertTriangle, CheckCircle2, Search, Repeat, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';

interface FoundItem {
    key: string;
    items: number;
}

const SupremeRecovery: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'scanning' | 'recovered' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
    const { experimental_recoverData } = useFinanceStore();

    const scanLocalStorage = () => {
        setStatus('scanning');
        setMessage('A verificar chaves de armazenamento históricas...');
        
        const oldKeys = ['finance-storage', 'nexfinance-data', 'zustand-finance', 'nexfinance-v1', 'nexfinance-storage'];
        const found: {key: string, items: number}[] = [];
        
        oldKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    const state = parsed.state || parsed;
                    const count = (
                        (state.personalData?.transactions?.length || 0) +
                        (state.personalData?.invoices?.length || 0) +
                        (state.businessData?.transactions?.length || 0)
                    );
                    if (count > 0) {
                        found.push({ key, items: count });
                    }
                } catch (e) {}
            }
        });
        
        setFoundItems(found);
        if (found.length === 0) {
            setMessage('Não foram encontrados fragmentos de dados em chaves locais antigas.');
            setStatus('error');
        } else {
            setMessage(`Encontrados ${found.length} possíveis pontos de restauro.`);
            setStatus('recovered');
        }
    };

    const recoverFromKey = async (key: string) => {
        setStatus('scanning');
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                const state = parsed.state || parsed;
                useFinanceStore.setState({
                    ...state,
                    isHydrated: true,
                    lastUpdatedAt: new Date().toISOString()
                });
                setMessage(`✅ Dados da chave "${key}" restaurados com sucesso!`);
                setStatus('recovered');
            } catch (e) {
                setMessage('Erro ao processar os dados desta chave.');
                setStatus('error');
            }
        }
    };

    const loadDatabaseJson = async () => {
        setStatus('scanning');
        try {
            const resp = await fetch('/src/data/database.json');
            const data = await resp.json();
            const state = data.state || data;
            
            useFinanceStore.setState({
                ...state,
                isHydrated: true,
                lastUpdatedAt: new Date().toISOString()
            });
            
            setMessage('✅ Dados do servidor (database.json) restaurados com sucesso!');
            setStatus('recovered');
        } catch (e) {
            setMessage('Não foi possível aceder ao ficheiro database.json no servidor.');
            setStatus('error');
        }
    };

    const handleSwap = () => {
        if (confirm('Tem a certeza que deseja inverter os dados entre Pessoal e Empresarial?')) {
            useFinanceStore.getState().swapContextData();
            setMessage('✅ Contextos invertidos com sucesso!');
            setStatus('recovered');
        }
    };

    const handleForceReload = () => {
        window.location.reload();
    };

    return (
        <div className="sys-card" style={{ border: '2px solid var(--sys-blue)', background: 'rgba(59, 130, 246, 0.05)', marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sys-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Shield size={22} />
                </div>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Ferramenta de Recuperação Suprema</h2>
                    <p style={{ fontSize: '12px', color: 'var(--sys-text-secondary)', margin: 0 }}>Procure por dados perdidos no armazenamento local ou backups do servidor.</p>
                </div>
            </div>

            {message && (
                <div style={{ padding: '12px', borderRadius: '10px', background: status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: status === 'error' ? 'var(--sys-red)' : 'var(--sys-green)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {status === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <button className="sys-btn-primary" onClick={scanLocalStorage} style={{ height: '44px' }}>
                    <Search size={18} /> PROCURAR NO BROWSER
                </button>
                <button className="sys-btn-secondary" onClick={loadDatabaseJson} style={{ height: '44px' }}>
                    <Database size={18} /> RESTAURAR DO SERVIDOR
                </button>
                <button className="sys-btn-minimal" onClick={handleSwap} style={{ height: '44px', border: '1px solid var(--sys-border)', background: 'white' }}>
                    <Repeat size={18} /> INVERTER CONTEXTOS
                </button>
                <button className="sys-btn-minimal" onClick={handleForceReload} style={{ height: '44px', border: '1px solid var(--sys-border)', background: 'white' }}>
                    <RefreshCw size={18} /> FORÇAR RECARREGAMENTO
                </button>
            </div>

            {foundItems.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 750, marginBottom: '12px' }}>Fragmentos Encontrados:</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {foundItems.map((f: FoundItem) => (
                            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid var(--sys-border)' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{f.key}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>~{f.items} registos encontrados</div>
                                </div>
                                <button className="sys-btn-minimal" onClick={() => recoverFromKey(f.key)} style={{ color: 'var(--sys-blue)', fontWeight: 750 }}>
                                    <RotateCcw size={14} /> RESTAURAR
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Atenção:</strong> Restaurar dados irá substituir o estado atual da aplicação. Recomenda-se exportar um backup JSON antes de proceder.
                </p>
            </div>
        </div>
    );
};

export default SupremeRecovery;
