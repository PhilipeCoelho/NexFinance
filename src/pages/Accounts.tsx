import React, { useState, useMemo } from 'react';
import {
    Plus,
    Building2,
    TrendingUp,
    TrendingDown,
    Edit3,
    Trash2,
    ChevronRight,
    Wallet,
    Eye,
    EyeOff,
    MoreVertical,
    Search,
    Filter,
    ArrowRightLeft,
    CheckCircle2
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import AccountModal from '@/components/AccountModal';
import { Account } from '@/types/finance';

const Accounts: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const data = useCurrentData();
    const { updateAccount, deleteAccount } = useFinanceStore();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const filteredAccounts = useMemo(() => {
        if (!data?.accounts) return [];
        return data.accounts.filter(acc => {
            const name = (acc.name || '').toLowerCase();
            const institution = (acc.institution || '').toLowerCase();
            return name.includes(searchTerm.toLowerCase()) || institution.includes(searchTerm.toLowerCase());
        });
    }, [data, searchTerm]);

    const stats = useMemo(() => {
        const total = data.accounts.reduce((acc, curr) => acc + curr.currentBalance, 0);
        const included = data.accounts.filter(a => a.includeInTotal).reduce((acc, curr) => acc + curr.currentBalance, 0);
        const invoiceTotal = data.invoices?.filter(i => i.status === 'open').reduce((acc, i) => acc + i.totalValue, 0) || 0;
        return { total, included, liquidity: included - invoiceTotal, invoiceTotal };
    }, [data]);

    const handleDelete = (id: string) => {
        if (confirm('Deseja excluir esta conta?')) {
            deleteAccount(id);
        }
    };

    if (!data) return null;

    return (
        <div className="expenses-page-mobills fade-in">
            <header className="mobills-page-header">
                <div className="header-left">
                    <div className="breadcrumb-pill" style={{ background: '#f0f9ff' }}>
                        <div className="icon-blue" style={{ background: 'var(--accent-primary)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={14} />
                        </div>
                        <span className="breadcrumb-text" style={{ color: 'var(--accent-primary)' }}>Minhas Contas</span>
                        <ChevronRight size={14} opacity={0.3} />
                    </div>
                </div>

                <div className="header-right">
                    <button className="btn-add-mobills" onClick={() => setIsModalOpen(true)} style={{ color: 'var(--accent-primary)' }}>
                        <Plus size={14} /> NOVA CONTA
                    </button>
                    <button className="icon-action-btn"><Search size={18} /></button>
                    <button className="icon-action-btn"><Filter size={18} /></button>
                    <button className="icon-action-btn"><MoreVertical size={18} /></button>
                </div>
            </header>

            <main className="mobills-main-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* KPI Cards section like before but with Mobills style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="mobills-table-card p-6 flex flex-col gap-1 border-b-4" style={{ borderColor: 'var(--accent-primary)' }}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo em Contas</span>
                        <span className="text-2xl font-black text-slate-800">{formatCurrency(stats.total)}</span>
                    </div>
                    <div className="mobills-table-card p-6 flex flex-col gap-1 border-b-4" style={{ borderColor: 'var(--mobills-red)' }}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturas em Aberto</span>
                        <span className="text-2xl font-black text-red-500">{formatCurrency(stats.invoiceTotal)}</span>
                    </div>
                    <div className="mobills-table-card p-6 flex flex-col gap-1 border-b-4" style={{ borderColor: 'var(--mobills-green)' }}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquidez Real</span>
                        <span className="text-2xl font-black text-green-600">{formatCurrency(stats.liquidity)}</span>
                    </div>
                </div>

                {/* Card Grid for Accounts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAccounts.map(acc => (
                        <div key={acc.id} className="mobills-table-card group hover:shadow-xl transition-all duration-300 relative flex flex-col" style={{ minHeight: '220px' }}>
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div style={{ background: acc.color, width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{acc.name}</h4>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{acc.institution || 'Carteira'}</span>
                                        </div>
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-600"><MoreVertical size={16} /></button>
                                </div>

                                <div className="mt-6">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Saldo Atual</span>
                                    <span className={`text-xl font-black ${acc.currentBalance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                                        {formatCurrency(acc.currentBalance)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                                <div className="flex gap-2">
                                    <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Ver Histórico"><Search size={14} /></button>
                                    <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Transferir"><ArrowRightLeft size={14} /></button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => updateAccount(acc.id, { includeInTotal: !acc.includeInTotal })} className={`p-2 rounded-lg transition-all ${acc.includeInTotal ? 'text-green-500 hover:bg-green-50' : 'text-slate-300 hover:bg-slate-100'}`} title={acc.includeInTotal ? "Visível no Total" : "Oculto no Total"}>
                                        {acc.includeInTotal ? <CheckCircle2 size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button onClick={() => handleDelete(acc.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* New Account Button as a card */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mobills-table-card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-6 group hover:border-blue-300 hover:bg-blue-50/30 transition-all text-slate-400 hover:text-blue-500"
                        style={{ minHeight: '220px', background: 'transparent' }}
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                            <Plus size={24} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider">Adicionar Conta</span>
                    </button>
                </div>
            </main>

            <AccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default Accounts;
