import React, { useState } from 'react';
import {
    Target,
    Plus,
    Edit3,
    Trash2,
    Calendar,
    ArrowUpCircle,
    CheckCircle2,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import PageLayout from '@/components/PageLayout';
import GoalModal from '@/components/GoalModal';

const Goals: React.FC = () => {
    const data = useCurrentData();
    const { settings, deleteGoal } = useFinanceStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency || 'EUR' }).format(value);
    };

    const totalTarget = data.goals.reduce((sum, g) => sum + g.targetValue, 0);
    const totalAccumulated = data.goals.reduce((sum, g) => sum + g.currentValue, 0);
    const averageProgress = data.goals.length > 0 ? (totalAccumulated / totalTarget) * 100 : 0;

    const summaryPanel = (
        <div className="sys-summary-widget">
            <div className="sys-summary-widget-header">Patrimônio em Construção</div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Expectativa Total</span>
                <span className="sys-summary-block-value color-blue">{formatCurrency(totalTarget)}</span>
            </div>
            <div className="sys-summary-block">
                <span className="sys-summary-block-title">Progresso Médio</span>
                <span className="sys-summary-block-value color-green">{averageProgress.toFixed(1)}%</span>
            </div>
            <div className="sys-summary-block" style={{ borderBottom: 'none', paddingTop: '8px' }}>
                <span className="sys-summary-block-title" style={{ fontSize: '13px' }}>Já Conquistado</span>
                <span className="sys-summary-block-value" style={{ fontSize: '24px', color: 'var(--sys-green)' }}>
                    {formatCurrency(totalAccumulated)}
                </span>
            </div>
        </div>
    );

    const handleEdit = (goal: any) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const headerActions = (
        <button className="sys-btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> NOVO OBJETIVO
        </button>
    );

    return (
        <PageLayout title="Gestão de Metas" actions={headerActions} summaryPanel={summaryPanel}>
            {data.goals.length > 0 ? (
                <div className="sys-grid">
                    {data.goals.map(goal => {
                        const percent = (goal.currentValue / goal.targetValue) * 100;
                        const isCompleted = percent >= 100;

                        return (
                            <div key={goal.id} className={`sys-fin-card ${isCompleted ? 'border-green-glow' : ''}`}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12,
                                            backgroundColor: isCompleted ? 'rgba(52, 211, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isCompleted ? 'var(--sys-green)' : 'var(--sys-blue)'
                                        }}>
                                            {isCompleted ? <ShieldCheck size={24} /> : <Target size={24} />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 750, color: 'var(--sys-text-primary)', margin: 0 }}>{goal.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11 }}>
                                                <Calendar size={12} />
                                                Prazo: {new Date(goal.deadline).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`sys-badge ${isCompleted ? 'sys-badge-green' : 'sys-badge-blue'}`} style={{ textTransform: 'uppercase' }}>
                                        {isCompleted ? 'Concluída' : 'Em andamento'}
                                    </div>
                                </div>

                                <div style={{ margin: '24px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span className="sys-card-balance-label">Progresso Atual</span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: isCompleted ? 'var(--sys-green)' : 'var(--sys-text-primary)' }}>
                                            {percent.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="sys-progress-bar-bg" style={{ height: 12 }}>
                                        <div
                                            className={`sys-progress-bar-fill ${isCompleted ? 'bg-green' : 'bg-blue'}`}
                                            style={{ width: `${Math.min(100, percent)}%` }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Acumulado</div>
                                        <div style={{ fontSize: 15, fontWeight: 800 }}>{formatCurrency(goal.currentValue)}</div>
                                    </div>
                                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Faltam</div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: isCompleted ? 'var(--sys-green)' : 'var(--sys-blue)' }}>
                                            {isCompleted ? 'Concluído!' : formatCurrency(goal.targetValue - goal.currentValue)}
                                        </div>
                                    </div>
                                </div>

                                <div className="sys-card-actions-row" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                                        <button className="sys-action-btn" onClick={() => handleEdit(goal)}><Edit3 size={16} /></button>
                                        <button className="sys-action-btn delete" onClick={() => deleteGoal(goal.id)}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="sys-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#94a3b8' }}>
                        <Target size={40} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--sys-text-primary)' }}>Transforme desejos em realidade</h2>
                    <p style={{ fontSize: 16, color: 'var(--sys-text-secondary)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px auto' }}>Crie metas claras para sua reserva de emergência, viagens ou grandes aquisições e acompanhe cada passo da conquista.</p>
                    <button className="sys-btn-primary" style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Criar Meu Primeiro Objetivo
                    </button>
                </div>
            )}

            <GoalModal
                isOpen={isModalOpen || !!editingGoal}
                onClose={() => { setIsModalOpen(false); setEditingGoal(null); }}
                editingGoal={editingGoal}
            />
        </PageLayout>
    );
};

export default Goals;
