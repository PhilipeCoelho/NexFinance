import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PieChart, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingBudget?: any;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, editingBudget }) => {
    const data = useCurrentData();
    const { addBudget, updateBudget, referenceMonth } = useFinanceStore();

    const [formData, setFormData] = useState({
        categoryId: '',
        limit: 0,
        month: referenceMonth,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingBudget) {
                setFormData({
                    categoryId: editingBudget.categoryId,
                    limit: editingBudget.limit,
                    month: editingBudget.month,
                });
            } else {
                setFormData({
                    categoryId: data.categories.find(c => c.type === 'expense')?.id || '',
                    limit: 0,
                    month: referenceMonth,
                });
            }
        }
    }, [isOpen, editingBudget, data.categories, referenceMonth]);

    const handleSave = () => {
        if (!formData.categoryId || formData.limit <= 0) {
            alert('Escolha uma categoria e defina um limite válido.');
            return;
        }

        if (editingBudget) {
            updateBudget(editingBudget.id, formData);
        } else {
            // Check if already exists for this category/month
            const existing = data.budgets.find(b => b.categoryId === formData.categoryId && b.month === formData.month);
            if (existing) {
                updateBudget(existing.id, { limit: formData.limit });
            } else {
                addBudget(formData);
            }
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className="modal-content glass" style={{ width: 400, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <header style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PieChart size={20} color="var(--sys-blue)" />
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento Mensal'}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </header>

                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Categoria de Despesa</label>
                            <select
                                value={formData.categoryId}
                                onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: 'var(--bg-secondary)' }}
                            >
                                <option value="" disabled>Selecione uma categoria...</option>
                                {data.categories.filter(c => c.type === 'expense').map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Limite de Gasto (€)</label>
                            <input
                                type="number"
                                value={formData.limit}
                                onChange={e => setFormData(p => ({ ...p, limit: Number(e.target.value) }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 700 }}
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>

                        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <AlertCircle size={18} color="var(--sys-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                O orçamento é mensal e será aplicado apenas ao mês de <strong>{formData.month}</strong>. Você pode definir limites diferentes para meses específicos.
                            </p>
                        </div>

                        <button
                            className="sys-btn-primary"
                            style={{ width: '100%', height: '48px', justifyContent: 'center', marginTop: '8px' }}
                            onClick={handleSave}
                        >
                            <CheckCircle2 size={18} /> {editingBudget ? 'SALVAR ALTERAÇÕES' : 'DEFINIR ORÇAMENTO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BudgetModal;
