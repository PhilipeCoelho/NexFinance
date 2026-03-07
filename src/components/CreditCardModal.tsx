import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    CreditCard as CardIcon,
    Landmark,
    Calendar,
    CheckCircle2,
    Palette,
    ShieldCheck,
    Smartphone
} from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { CreditCard } from '@/types/finance';

interface CreditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingCard?: CreditCard;
}

const PT_BANKS = [
    { name: 'ActivoBank', color: '#ff007a', id: 'activo' },
    { name: 'Millennium BCP', color: '#cb0044', id: 'mbcp' },
    { name: 'Santander', color: '#ec0000', id: 'santander' },
    { name: 'CGD', color: '#005ca9', id: 'cgd' },
    { name: 'Novo Banco', color: '#004a32', id: 'nb' },
    { name: 'BPI', color: '#ff6600', id: 'bpi' },
    { name: 'Revolut', color: '#000000', id: 'revolut' },
    { name: 'Wise', color: '#9fe870', id: 'wise' },
    { name: 'N26', color: '#10ac84', id: 'n26' },
    { name: 'Moey!', color: '#90ee90', id: 'moey' },
];

const CreditCardModal: React.FC<CreditCardModalProps> = ({ isOpen, onClose, editingCard }) => {
    const { addCreditCard, updateCreditCard } = useFinanceStore();
    const [formData, setFormData] = useState({
        name: '',
        institution: '',
        institutionId: '',
        limitTotal: 0,
        closingDay: 1,
        dueDay: 1,
        color: '#1e293b',
    });

    useEffect(() => {
        if (isOpen) {
            if (editingCard) {
                setFormData({
                    name: editingCard.name,
                    institution: editingCard.institution || '',
                    institutionId: editingCard.institutionId || '',
                    limitTotal: editingCard.limitTotal,
                    closingDay: editingCard.closingDay,
                    dueDay: editingCard.dueDay,
                    color: editingCard.color || '#1e293b',
                });
            } else {
                setFormData({
                    name: '',
                    institution: '',
                    institutionId: '',
                    limitTotal: 0,
                    closingDay: 1,
                    dueDay: 5,
                    color: '#1e293b',
                });
            }
        }
    }, [isOpen, editingCard]);

    const handleSelectBank = (bank: typeof PT_BANKS[0]) => {
        setFormData(prev => ({
            ...prev,
            institution: bank.name,
            institutionId: bank.id,
            color: bank.color,
            name: prev.name || `Cartão ${bank.name}`
        }));
    };

    const handleSave = () => {
        if (editingCard) {
            updateCreditCard(editingCard.id, formData);
        } else {
            addCreditCard(formData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" style={{ width: 460, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <header className="card-modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CardIcon size={20} color="var(--sys-blue)" />
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>{editingCard ? 'Editar Cartão' : 'Configurar Novo Cartão'}</span>
                    </div>
                    <button className="close-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={onClose}><X size={20} /></button>
                </header>

                <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>1. Escolha a Instituição</label>
                        <div className="bank-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                            {PT_BANKS.map(bank => (
                                <button
                                    key={bank.id}
                                    className={`bank-circle ${formData.institutionId === bank.id ? 'active' : ''}`}
                                    onClick={() => handleSelectBank(bank)}
                                    title={bank.name}
                                    style={{
                                        width: '100%', aspectRatio: '1', borderRadius: '12px',
                                        backgroundColor: bank.color, display: 'flex', alignItems: 'center',
                                        justify: 'center', color: 'white', border: formData.institutionId === bank.id ? '3px solid white' : 'none',
                                        boxShadow: formData.institutionId === bank.id ? '0 0 0 2px var(--sys-blue)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Landmark size={16} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-clean" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="input-group">
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Nome do Cartão</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder="Ex: Cartão Master Black"
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                            />
                        </div>

                        <div className="input-group">
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Limite Total</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: 12, fontWeight: 700, color: '#94a3b8' }}>€</span>
                                <input
                                    type="number"
                                    value={formData.limitTotal}
                                    onChange={e => setFormData(p => ({ ...p, limitTotal: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '12px 12px 12px 32px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: 700 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Dia de Fechamento</label>
                                <input
                                    type="number" min="1" max="31"
                                    value={formData.closingDay}
                                    onChange={e => setFormData(p => ({ ...p, closingDay: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                />
                            </div>
                            <div className="input-group">
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Dia de Vencimento</label>
                                <input
                                    type="number" min="1" max="31"
                                    value={formData.dueDay}
                                    onChange={e => setFormData(p => ({ ...p, dueDay: Number(e.target.value) }))}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        <button
                            className="sys-btn-primary"
                            style={{ width: '100%', height: '48px', marginTop: '12px', justifyContent: 'center', fontSize: '14px' }}
                            onClick={handleSave}
                        >
                            <CheckCircle2 size={18} /> {editingCard ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CARTÃO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreditCardModal;
