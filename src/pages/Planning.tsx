import React, { useState, useMemo } from 'react';
import {
    PieChart,
    Plus,
    Target,
    Activity,
    TrendingUp,
    TrendingDown,
    Scale,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    Search,
    Edit3,
    Trash2,
    ChevronRight,
    Star,
    Award,
    Heart
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import PageLayout from '@/components/PageLayout';
import { FinancialEngine } from '@/lib/FinancialEngine';
import BudgetModal from '@/components/BudgetModal';
import GoalModal from '@/components/GoalModal';
import FinancialIntelligence from '@/components/FinancialIntelligence';

const Planning: React.FC = () => {
    const data = useCurrentData();
    const { settings, referenceMonth, deleteBudget, deleteGoal } = useFinanceStore();

    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<any>(null);
    const [editingGoal, setEditingGoal] = useState<any>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const health = useMemo(() =>
        FinancialEngine.getFinancialHealth(data.transactions, referenceMonth),
        [data.transactions, referenceMonth]);

    const budgetsWithActuals = useMemo(() => {
        return data.budgets
            .filter(b => b.month === referenceMonth)
            .map(b => {
                const category = data.categories.find(c => c.id === b.categoryId);
                const actual = FinancialEngine.calculateCategorySpending(data.transactions, b.categoryId, referenceMonth);
                const percent = (actual / b.limit) * 100;
                return { ...b, categoryName: category?.name || 'Categoria', actual, percent };
            });
    }, [data.budgets, data.categories, data.transactions, referenceMonth]);

    const totalBudgetLimit = budgetsWithActuals.reduce((sum, b) => sum + b.limit, 0);
    const totalBudgetSpent = budgetsWithActuals.reduce((sum, b) => sum + b.actual, 0);

    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">Saúde de {referenceMonth}</div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Taxa de Poupança</span>
                <span className={`sys-summary-block-value ${health.savingRate > 0 ? 'color-green' : 'color-red'}`}>
                    {health.savingRate.toFixed(1)}%
                </span>
                <div className="sys-progress-bar-bg" style={{ height: 4, marginTop: 8 }}>
                    <div className="sys-progress-bar-fill bg-green" style={{ width: `${Math.min(100, health.savingRate)}%` }} />
                </div>
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Relação Despesa/Receita</span>
                <span className={`sys-summary-block-value ${health.expenseRatio > 100 ? 'color-red' : 'color-blue'}`}>
                    {health.expenseRatio.toFixed(1)}%
                </span>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>Sobra Estimada</span>
                <span className={`sys-summary-block-value ${health.savings >= 0 ? 'color-green' : 'color-red'}`} style={{ fontSize: '24px' }}>
                    {formatCurrency(health.savings)}
                </span>
            </div>
        </div>
    );

    const headerActions = (
        <div style={{ display: 'flex', gap: '8px' }}>
            <button className="sys-btn-secondary" onClick={() => setIsBudgetModalOpen(true)}>
                <PieChart size={18} /> DEFINIR ORÇAMENTO
            </button>
            <button className="sys-btn-primary" onClick={() => setIsGoalModalOpen(true)}>
                <Target size={18} /> CRIAR META
            </button>
        </div>
    );

    return (
        <PageLayout title="Inteligência de Planejamento" actions={headerActions} summaryPanel={summaryPanel}>

            {/* Inteligência Financeira Automática */}
            <div style={{ marginBottom: '40px' }}>
                <FinancialIntelligence />
            </div>

            {/* Saúde Financeira - Micro Cards */}
            <div className="sys-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '32px' }}>
                <div className="sys-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--sys-green)' }}>
                        <Award size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Status Geral</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sys-text-primary)' }}>
                            {health.status === 'excellent' ? 'Excelente' : health.status === 'good' ? 'Saudável' : health.status === 'warning' ? 'Atenção' : 'Critico'}
                        </div>
                    </div>
                </div>
                <div className="sys-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--sys-blue)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Economia do Mês</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sys-text-primary)' }}>{formatCurrency(health.savings)}</div>
                    </div>
                </div>
                <div className="sys-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--sys-red)' }}>
                        <Heart size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Eficiência Térmica</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--sys-text-primary)' }}>{Math.max(0, 100 - health.expenseRatio).toFixed(0)}%</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>

                {/* Orçamento por Categoria */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Orçamento por Categoria</h2>
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Controle seus gastos planejados para {referenceMonth}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>TOTAL ORÇADO</div>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>{formatCurrency(totalBudgetLimit)}</div>
                        </div>
                    </div>

                    <div className="sys-card" style={{ padding: '24px' }}>
                        {budgetsWithActuals.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {budgetsWithActuals.map(b => (
                                    <div key={b.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sys-text-primary)' }}>{b.categoryName}</span>
                                                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: '8px' }}>
                                                    {formatCurrency(b.actual)} de {formatCurrency(b.limit)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="sys-action-btn" onClick={() => { setEditingBudget(b); setIsBudgetModalOpen(true); }}><Edit3 size={14} /></button>
                                                <button className="sys-action-btn delete" onClick={() => deleteBudget(b.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="sys-progress-bar-bg" style={{ height: 10 }}>
                                            <div
                                                className={`sys-progress-bar-fill ${b.percent > 100 ? 'bg-red' : b.percent > 80 ? 'bg-yellow' : 'bg-blue'}`}
                                                style={{ width: `${Math.min(100, b.percent)}%` }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: b.percent > 100 ? 'var(--sys-red)' : '#94a3b8' }}>
                                                {b.percent > 100 ? `Excedido em ${formatCurrency(b.actual - b.limit)}` : `${(100 - b.percent).toFixed(1)}% restante`}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--sys-text-secondary)' }}>{b.percent.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <PieChart size={40} color="#e2e8f0" style={{ margin: '0 auto 16px auto' }} />
                                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Você ainda não definiu orçamentos para este mês.</p>
                                <button className="sys-btn-secondary" style={{ margin: '0 auto' }} onClick={() => setIsBudgetModalOpen(true)}>COMEÇAR AGORA</button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Metas Financeiras */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Metas & Sonhos</h2>
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Acompanhe sua evolução patrimonial</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {data.goals.length > 0 ? (
                            data.goals.map(goal => {
                                const percent = (goal.currentValue / goal.targetValue) * 100;
                                return (
                                    <div key={goal.id} className="sys-card" style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--sys-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Target size={20} />
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: 16, fontWeight: 750, margin: 0 }}>{goal.name}</h3>
                                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Até {new Date(goal.deadline).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="sys-action-btn" onClick={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }}><Edit3 size={14} /></button>
                                                <button className="sys-action-btn delete" onClick={() => deleteGoal(goal.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: 12, color: 'var(--sys-text-secondary)' }}>Progresso</span>
                                            <span style={{ fontSize: 12, fontWeight: 800 }}>{percent.toFixed(1)}%</span>
                                        </div>

                                        <div className="sys-progress-bar-bg" style={{ height: 12, borderRadius: 6 }}>
                                            <div
                                                className="sys-progress-bar-fill bg-green"
                                                style={{ width: `${Math.min(100, percent)}%`, borderRadius: 6, boxShadow: '0 0 10px var(--sys-green-light)' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>ACUMULADO</div>
                                                <div style={{ fontSize: 14, fontWeight: 800 }}>{formatCurrency(goal.currentValue)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>FALTAM</div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--sys-blue)' }}>{formatCurrency(goal.targetValue - goal.currentValue)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="sys-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <Target size={40} color="#e2e8f0" style={{ margin: '0 auto 16px auto' }} />
                                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Nenhum objetivo definido ainda.</p>
                                <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsGoalModalOpen(true)}>DEFINIR MINHA PRIMEIRA META</button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <BudgetModal
                isOpen={isBudgetModalOpen}
                onClose={() => { setIsBudgetModalOpen(false); setEditingBudget(null); }}
                editingBudget={editingBudget}
            />

            <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }}
                editingGoal={editingGoal}
            />

        </PageLayout>
    );
};

export default Planning;
