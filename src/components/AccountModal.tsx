import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Landmark,
    Wallet,
    PiggyBank,
    Plus,
    ChevronRight,
    ChevronLeft,
    Check,
    Smartphone,
    CreditCard,
    Eye,
    EyeOff,
    Building2,
    CheckCircle2
} from 'lucide-react';
import { useFinanceStore } from '@/hooks/use-store';
import { Account } from '@/types/finance';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingAccount?: Account;
}

const PT_BANKS = [
    { name: 'ActivoBank', color: '#ff007a', icon: Landmark, id: 'activo' },
    { name: 'Millennium BCP', color: '#cb0044', icon: Landmark, id: 'mbcp' },
    { name: 'Santander', color: '#ec0000', icon: Landmark, id: 'santander' },
    { name: 'CGD', color: '#005ca9', icon: Landmark, id: 'cgd' },
    { name: 'Novo Banco', color: '#004a32', icon: Landmark, id: 'nb' },
    { name: 'BPI', color: '#ff6600', icon: Landmark, id: 'bpi' },
    { name: 'Revolut', color: '#000000', icon: Smartphone, id: 'revolut' },
    { name: 'Wise', color: '#9fe870', icon: Landmark, id: 'wise' },
    { name: 'N26', color: '#10ac84', icon: Smartphone, id: 'n26' },
    { name: 'Moey!', color: '#90ee90', icon: Smartphone, id: 'moey' },
];

const ACCOUNT_TYPES = [
    { id: 'checking', label: 'Conta Bancária', icon: Landmark, desc: 'Corrente ou ordenado' },
    { id: 'cash', label: 'Carteira / Dinheiro', icon: Wallet, desc: 'Dinheiro em espécie' },
    { id: 'savings', label: 'Poupança', icon: PiggyBank, desc: 'Fundo de emergência ou reserva' },
    { id: 'investment', label: 'Investimento', icon: Plus, desc: 'Corretoras ou ações' },
];

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, editingAccount }) => {
    const [step, setStep] = useState(1);
    const { addAccount, updateAccount } = useFinanceStore();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        institution: '',
        institutionId: '',
        type: 'checking' as Account['type'],
        initialBalance: 0,
        currentBalance: 0,
        color: '#2f81f7',
        includeInTotal: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingAccount) {
                setFormData({
                    name: editingAccount.name,
                    institution: editingAccount.institution,
                    institutionId: editingAccount.institutionId || '',
                    type: editingAccount.type,
                    initialBalance: editingAccount.initialBalance,
                    currentBalance: editingAccount.currentBalance,
                    color: editingAccount.color,
                    includeInTotal: editingAccount.includeInTotal,
                });
                setStep(3); // Go straight to details when editing
            } else {
                setStep(1);
                setFormData({
                    name: '',
                    institution: '',
                    institutionId: '',
                    type: 'checking',
                    initialBalance: 0,
                    currentBalance: 0,
                    color: '#2f81f7',
                    includeInTotal: true,
                });
            }
        }
    }, [isOpen, editingAccount]);

    const handleSelectType = (typeId: string) => {
        setFormData(prev => ({ ...prev, type: typeId as any }));
        setStep(typeId === 'checking' ? 2 : 3);
    };

    const handleSelectBank = (bank: typeof PT_BANKS[0]) => {
        setFormData(prev => ({
            ...prev,
            institution: bank.name,
            institutionId: bank.id,
            color: bank.color,
            name: prev.name || bank.name
        }));
        setStep(3);
    };

    const handleSave = () => {
        if (editingAccount) {
            updateAccount(editingAccount.id, {
                ...formData
            });
        } else {
            addAccount({
                ...formData,
                status: 'active',
                currency: 'EUR',
            } as any);
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass step-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="step-indicator">{editingAccount ? 'Editar Conta' : `Passo ${step} de 4`}</div>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </header>

                <div className="step-body">
                    {step === 1 && (
                        <div className="step-container">
                            <h2 className="step-title">Que tipo de conta você quer adicionar?</h2>
                            <div className="type-grid">
                                {ACCOUNT_TYPES.map(type => (
                                    <button key={type.id} className="type-card" onClick={() => handleSelectType(type.id)}>
                                        <div className="type-icon"><type.icon size={24} /></div>
                                        <div className="type-info">
                                            <span className="type-label">{type.label}</span>
                                            <span className="type-desc">{type.desc}</span>
                                        </div>
                                        <ChevronRight size={16} className="arrow" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-container">
                            <button className="back-btn" onClick={() => setStep(1)}><ChevronLeft size={16} /> Voltar</button>
                            <h2 className="step-title">Qual é a instituição?</h2>
                            <div className="bank-grid">
                                {PT_BANKS.map(bank => (
                                    <button key={bank.id} className="bank-card" onClick={() => handleSelectBank(bank)}>
                                        <div className="bank-logo-sm" style={{ backgroundColor: bank.color }}>
                                            <Landmark size={18} color="white" />
                                        </div>
                                        <span className="bank-name">{bank.name}</span>
                                    </button>
                                ))}
                                <button className="bank-card other" onClick={() => {
                                    setFormData(prev => ({ ...prev, institution: 'Outro', color: '#2f81f7' }));
                                    setStep(3);
                                }}>
                                    <span>Outro banco</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-container">
                            {!editingAccount && (
                                <button className="back-btn" onClick={() => setStep(formData.type === 'checking' ? 2 : 1)}>
                                    <ChevronLeft size={16} /> Voltar
                                </button>
                            )}
                            <h2 className="step-title">{editingAccount ? 'Ajustar detalhes' : 'Detalhes da conta'}</h2>
                            <div className="form-clean">
                                <div className="input-group">
                                    <label>Nome da conta</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Ex: Conta Principal"
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{editingAccount ? 'Saldo Atual' : 'Saldo inicial'}</label>
                                    <div className="balance-input-wrapper">
                                        <span className="currency">€</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingAccount ? formData.currentBalance : formData.initialBalance}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                if (editingAccount) {
                                                    setFormData(p => ({ ...p, currentBalance: val }));
                                                } else {
                                                    setFormData(p => ({ ...p, initialBalance: val, currentBalance: val }));
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="toggle-group">
                                    <div className="toggle-text">
                                        <span className="toggle-label">Mostrar no Dashboard?</span>
                                        <span className="toggle-hint">Incluir esta conta no cálculo da liquidez principal</span>
                                    </div>
                                    <button
                                        className={`toggle-btn ${formData.includeInTotal ? 'active' : ''}`}
                                        onClick={() => setFormData(p => ({ ...p, includeInTotal: !p.includeInTotal }))}
                                    >
                                        <div className="toggle-thumb"></div>
                                    </button>
                                </div>
                                <button className="btn btn-primary full-width" onClick={() => setStep(4)}>{editingAccount ? 'Validar Alterações' : 'Próximo Passo'}</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="step-container">
                            <button className="back-btn" onClick={() => setStep(3)}><ChevronLeft size={16} /> Voltar</button>
                            <h2 className="step-title">{editingAccount ? 'Confirme as alterações' : 'Confirme os dados'}</h2>

                            <div className="preview-card glass" style={{ borderLeft: `6px solid ${formData.color}` }}>
                                <div className="preview-header">
                                    <div className="preview-logo" style={{ backgroundColor: formData.color }}>
                                        <Building2 size={20} color="white" />
                                    </div>
                                    <div className="preview-info">
                                        <span className="preview-name">{formData.name || 'Nova Conta'}</span>
                                        <span className="preview-inst">{formData.institution || 'Instituição'}</span>
                                    </div>
                                </div>
                                <div className="preview-balance">
                                    <span className="label">Saldo {editingAccount ? 'Ajustado' : 'Inicial'}</span>
                                    <span className="value">€ {(editingAccount ? formData.currentBalance : formData.initialBalance).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="preview-meta">
                                    <div className="meta-item">
                                        {formData.includeInTotal ? <Eye size={14} /> : <EyeOff size={14} />}
                                        <span>{formData.includeInTotal ? 'Visível no Dashboard' : 'Oculta do Dashboard'}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-primary full-width create-btn" onClick={handleSave}>
                                <CheckCircle2 size={18} />
                                <span>{editingAccount ? 'Salvar Alterações' : 'Criar Conta agora'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AccountModal;
