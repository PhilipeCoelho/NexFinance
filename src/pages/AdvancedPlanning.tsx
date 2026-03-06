import React, { useState, useMemo } from 'react';
import { useCurrentData } from '@/hooks/use-store';
import { FinancialEngine } from '@/lib/FinancialEngine';
import { Transaction } from '@/types/finance';
import { ChevronRight, Database, LineChart, Plus, Trash2, TestTube } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdvancedPlanning: React.FC = () => {
    const data = useCurrentData();
    const [activeTab, setActiveTab] = useState<'ledger' | 'timeline' | 'simulator'>('ledger');

    // Simulator State
    const [simulatedTxs, setSimulatedTxs] = useState<Transaction[]>([]);
    const [simForm, setSimForm] = useState({
        type: 'expense' as 'income' | 'expense',
        description: '',
        value: '',
        date: new Date().toISOString().slice(0, 10),
    });

    // Calculate generic formats
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
    };
    const formatDate = (date: string) => {
        if (!date) return '';
        try {
            return format(new Date(date), "dd 'de' MMM", { locale: ptBR });
        } catch (e) {
            return date;
        }
    };

    // 1. Ledger Data
    const ledgerEntries = useMemo(() => {
        return FinancialEngine.generateLedger(data.transactions, data.accounts).reverse(); // Most recent first
    }, [data.transactions, data.accounts]);

    // 2. Cashflow Timeline Data
    const currentLiquid = useMemo(() => FinancialEngine.calculateRealLiquidity(data.accounts), [data.accounts]);
    const timelineEntries = useMemo(() => {
        return FinancialEngine.generateCashflowTimeline(data.transactions, currentLiquid);
    }, [data.transactions, currentLiquid]);

    // 3. Simulated Timeline Data
    const simulatedTimeline = useMemo(() => {
        return FinancialEngine.simulateScenario(data.transactions, simulatedTxs, currentLiquid, new Date().toISOString().slice(0, 7));
    }, [data.transactions, simulatedTxs, currentLiquid]);

    const handleAddSimulation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!simForm.description || !simForm.value || !simForm.date) return;

        const newTx: Transaction = {
            id: `sim-${Date.now()}`,
            type: simForm.type,
            description: simForm.description + ' (Simulação)',
            value: Number(simForm.value),
            date: simForm.date,
            status: 'forecast',
            categoryId: '',
            tags: [],
            isFixed: false,
            isIgnored: false,
            isRecurring: false,
            reconciled: false,
            createdAt: new Date().toISOString()
        };

        setSimulatedTxs([...simulatedTxs, newTx]);
        setSimForm({ ...simForm, description: '', value: '' });
    };

    const removeSimulation = (id: string) => {
        setSimulatedTxs(simulatedTxs.filter(t => t.id !== id));
    };

    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#f1f5f9' }}>
                        <div className="icon-settings" style={{ background: '#indigo-500', color: 'var(--accent-primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LineChart size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: '#64748b' }}>Estratégia Avançada</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>
            </header>

            <div className="mobills-main-content">
                <div className="work-area">
                    <div className="flex gap-4 mb-6 border-b border-slate-200 pb-4 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('ledger')}
                            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-full transition-all ${activeTab === 'ledger' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Database size={16} /> Livro Razão (Ledger)
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-full transition-all ${activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <LineChart size={16} /> Fluxo de Caixa Futuro
                        </button>
                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-full transition-all ${activeTab === 'simulator' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-purple-50'}`}
                        >
                            <TestTube size={16} /> Simulador (What If)
                        </button>
                    </div>

                    {activeTab === 'ledger' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-800">Livro Razão Imutável</h3>
                                <p className="text-sm text-slate-500 mt-1">Histórico progressivo de cada alteração de saldo matematicamente confirmada.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
                                            <th className="p-4 font-bold">Data</th>
                                            <th className="p-4 font-bold">Operação</th>
                                            <th className="p-4 font-bold">Impacto</th>
                                            <th className="p-4 font-bold">Saldo Após</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerEntries.map((entry, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="p-4 whitespace-nowrap text-sm font-medium text-slate-600">{formatDate(entry.date)}</td>
                                                <td className="p-4 text-sm text-slate-600">{entry.description}</td>
                                                <td className={`p-4 text-sm font-bold whitespace-nowrap ${entry.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {entry.value >= 0 ? '+' : ''}{formatCurrency(entry.value)}
                                                </td>
                                                <td className="p-4 text-sm font-bold text-slate-800 whitespace-nowrap">
                                                    {formatCurrency(entry.balanceAfter)}
                                                </td>
                                            </tr>
                                        ))}
                                        {ledgerEntries.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum registro confirmado encontrado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 bg-blue-50/50">
                                <h3 className="text-base font-bold text-blue-900">Timeline de Provisão Monetária</h3>
                                <p className="text-sm text-blue-700/70 mt-1">Evolução do seu saldo baseada na liquidez atual e nas previsões futuras.</p>
                                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 border border-blue-100 rounded-xl">
                                    <span className="text-xs uppercase font-bold text-slate-400">Ponto de Partida Real:</span>
                                    <span className="text-base font-black text-slate-800">{formatCurrency(currentLiquid)}</span>
                                </div>
                            </div>
                            <div className="p-6 relative">
                                <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-100 rounded-full"></div>
                                <div className="flex flex-col gap-6">
                                    {timelineEntries.map((entry, idx) => (
                                        <div key={idx} className="relative flex items-center gap-6 pl-12 group">
                                            <div className={`absolute left-0 w-3 h-3 rounded-full border-2 border-white ring-4 ${entry.type === 'income' ? 'bg-green-500 ring-green-50' : 'bg-red-500 ring-red-50'} z-10 transition-transform group-hover:scale-125`}></div>
                                            <div className="flex-1 bg-white border border-slate-100 p-4 rounded-xl flex items-center justify-between hover:shadow-md transition-shadow">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{formatDate(entry.date)}</div>
                                                    <div className="text-sm font-bold text-slate-700">{entry.description}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-black ${entry.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {entry.type === 'income' ? '+' : ''}{formatCurrency(entry.value)}
                                                    </div>
                                                    <div className="text-xs font-medium text-slate-400 mt-1">Saldo Previsto: <span className="text-slate-700 font-bold">{formatCurrency(entry.balanceAfter)}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {timelineEntries.length === 0 && (
                                        <div className="text-center text-slate-400 py-10">Nenhuma previsão futura registrada.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'simulator' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 sticky top-6">
                                    <h3 className="text-sm font-bold text-purple-900 mb-4 flex items-center gap-2">
                                        <Plus size={16} /> Adicionar Variável Simulada
                                    </h3>
                                    <form onSubmit={handleAddSimulation} className="flex flex-col gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Ação / Decisão</label>
                                            <input required type="text" value={simForm.description} onChange={e => setSimForm({ ...simForm, description: e.target.value })} placeholder="Ex: Financiamento Carro" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button type="button" onClick={() => setSimForm({ ...simForm, type: 'income' })} className={`p-3 font-bold text-sm rounded-xl border transition-all ${simForm.type === 'income' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>Receita</button>
                                            <button type="button" onClick={() => setSimForm({ ...simForm, type: 'expense' })} className={`p-3 font-bold text-sm rounded-xl border transition-all ${simForm.type === 'expense' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>Despesa</button>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Valor Estimado</label>
                                            <input required type="number" step="0.01" value={simForm.value} onChange={e => setSimForm({ ...simForm, value: e.target.value })} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800 font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Data Impacto</label>
                                            <input required type="date" value={simForm.date} onChange={e => setSimForm({ ...simForm, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-800" />
                                        </div>
                                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm p-4 rounded-xl transition-all shadow-lg shadow-purple-500/20 mt-2">
                                            Inserir na Simulação
                                        </button>
                                    </form>

                                    {simulatedTxs.length > 0 && (
                                        <div className="mt-8">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Variáveis Ativas no Teste</h4>
                                            <div className="flex flex-col gap-2">
                                                {simulatedTxs.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
                                                        <div>
                                                            <div className="text-xs font-bold text-purple-900">{t.description}</div>
                                                            <div className={`text-xs font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}</div>
                                                        </div>
                                                        <button onClick={() => removeSimulation(t.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
                                    <div className="p-5 border-b border-slate-100 bg-slate-50">
                                        <h3 className="text-base font-bold text-slate-800">Timeline Hipotética (Cenário E Se...)</h3>
                                        <p className="text-sm text-slate-500 mt-1">Nenhum dado real será alterado no banco de dados. Teste à vontade.</p>
                                    </div>
                                    <div className="p-6 relative">
                                        <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-100 rounded-full"></div>
                                        <div className="flex flex-col gap-6">
                                            {simulatedTimeline.map((entry, idx) => {
                                                const isSimulation = entry.transactionId.startsWith('sim-');
                                                return (
                                                    <div key={idx} className={`relative flex items-center gap-6 pl-12 group ${isSimulation ? 'opacity-100' : 'opacity-60'}`}>
                                                        <div className={`absolute left-0 w-3 h-3 rounded-full border-2 border-white ring-4 ${entry.type === 'income' ? 'bg-green-500 ring-green-50' : 'bg-red-500 ring-red-50'} ${isSimulation ? '!bg-purple-500 !ring-purple-100' : ''} z-10 transition-transform group-hover:scale-125`}></div>
                                                        <div className={`flex-1 bg-white border ${isSimulation ? 'border-purple-200 shabow-sm shadow-purple-500/10' : 'border-slate-100'} p-4 rounded-xl flex items-center justify-between transition-shadow`}>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                                    {formatDate(entry.date)} {isSimulation && <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Simulação</span>}
                                                                </div>
                                                                <div className={`text-sm font-bold ${isSimulation ? 'text-purple-900' : 'text-slate-700'}`}>{entry.description}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`text-sm font-black ${entry.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {entry.type === 'income' ? '+' : ''}{formatCurrency(entry.value)}
                                                                </div>
                                                                <div className="text-xs font-medium text-slate-400 mt-1">Saldo Predito: <span className="text-slate-700 font-bold">{formatCurrency(entry.balanceAfter)}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {simulatedTimeline.length === 0 && (
                                                <div className="text-center text-slate-400 py-10">Adicione uma variável à simulação ou espere próximos previstos.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedPlanning;
