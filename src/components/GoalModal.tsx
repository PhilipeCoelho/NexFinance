import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Save, Calendar, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingGoal?: any;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, editingGoal }) => {
    const { addGoal, updateGoal } = useFinanceStore();

    const [formData, setFormData] = useState({
        name: '',
        targetValue: 0,
        currentValue: 0,
        deadline: new Date().toISOString().split('T')[0],
        type: 'savings' as const,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingGoal) {
                setFormData({
                    name: editingGoal.name,
                    targetValue: editingGoal.targetValue,
                    currentValue: editingGoal.currentValue,
                    deadline: editingGoal.deadline.split('T')[0],
                    type: editingGoal.type,
                });
            } else {
                setFormData({
                    name: '',
                    targetValue: 0,
                    currentValue: 0,
                    deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    type: 'savings',
                });
            }
        }
    }, [isOpen, editingGoal]);

    const handleSave = () => {
        if (!formData.name || formData.targetValue <= 0) {
            alert('Preencha o nome da meta e o valor alvo.');
            return;
        }

        if (editingGoal) {
            updateGoal(editingGoal.id, formData);
        } else {
            addGoal(formData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className="modal-content glass" style={{ width: 440, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <header style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Target size={20} color="var(--sys-blue)" />
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>{editingGoal ? 'Editar Meta' : 'Criar Novo Objetivo'}</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                </header>

                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Título do Objetivo</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                placeholder="Ex: Reserva de Emergência"
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Valor Alvo (€)</label>
                                <input
                                    type="number"
                                    value={formData.targetValue}
                                    onChange={e => setFormData(p => ({ ...p, targetValue: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: 700 }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Já Tenho (€)</label>
                                <input
                                    type="number"
                                    value={formData.currentValue}
                                    onChange={e => setFormData(p => ({ ...p, currentValue: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Data Limite</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <button
                                className="sys-btn-primary"
                                style={{ width: '100%', height: '48px', justifyContent: 'center' }}
                                onClick={handleSave}
                            >
                                <CheckCircle2 size={18} /> {editingGoal ? 'SALVAR ALTERAÇÕES' : 'CONQUISTAR ESTA META'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GoalModal;
