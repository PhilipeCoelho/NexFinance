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
    { id: 'other', label: 'Outra conta manual', icon: Plus, desc: 'Investimentos ou diversos' },
];

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const { addAccount } = useFinanceStore();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        institution: '',
        institutionId: '',
        type: 'checking' as Account['type'],
        initialBalance: 0,
        color: '#2f81f7',
        includeInTotal: true,
    });

    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setFormData({
                name: '',
                institution: '',
                institutionId: '',
                type: 'checking',
                initialBalance: 0,
                color: '#2f81f7',
                includeInTotal: true,
            });
        }
    }, [isOpen]);

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

    const handleCreate = () => {
        addAccount({
            ...formData,
            status: 'active',
            currency: 'EUR',
        } as any);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass step-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="step-indicator">Passo {step} de 4</div>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </header>

                <div className="step-body">
                    {/* ... (step content remains the same) ... */}
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
                            <button className="back-btn" onClick={() => setStep(formData.type === 'checking' ? 2 : 1)}>
                                <ChevronLeft size={16} /> Voltar
                            </button>
                            <h2 className="step-title">Detalhes da conta</h2>
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
                                    <label>Saldo inicial</label>
                                    <div className="balance-input-wrapper">
                                        <span className="currency">€</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.initialBalance}
                                            onChange={e => setFormData(p => ({ ...p, initialBalance: Number(e.target.value) }))}
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
                                <button className="btn btn-primary full-width" onClick={() => setStep(4)}>Próximo Passo</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="step-container">
                            <button className="back-btn" onClick={() => setStep(3)}><ChevronLeft size={16} /> Voltar</button>
                            <h2 className="step-title">Confirme os dados</h2>

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
                                    <span className="label">Saldo Inicial</span>
                                    <span className="value">€ {formData.initialBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="preview-meta">
                                    <div className="meta-item">
                                        {formData.includeInTotal ? <Eye size={14} /> : <EyeOff size={14} />}
                                        <span>{formData.includeInTotal ? 'Visível no Dashboard' : 'Oculta do Dashboard'}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-primary full-width create-btn" onClick={handleCreate}>
                                <CheckCircle2 size={18} />
                                <span>Criar Conta agora</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }
                .modal-content {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                .step-modal { width: 440px; padding: 0; overflow: hidden; }
                .modal-header { padding: 12px 16px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
                .step-indicator { font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.05em; }
                
                .step-body { padding: 16px 20px; }
                .step-container { display: flex; flex-direction: column; gap: 14px; animation: stepFade 0.2s ease-out; }
                @keyframes stepFade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

                .step-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; line-height: 1.2; }
                .back-btn { background: transparent; color: var(--text-secondary); font-size: 10px; display: flex; align-items: center; gap: 4px; padding: 0; margin-bottom: -6px; width: fit-content; }
                .back-btn:hover { color: var(--text-primary); }

                .type-grid { display: flex; flex-direction: column; gap: 8px; }
                .type-card { 
                    display: flex; align-items: center; gap: 12px; padding: 10px; 
                    background: var(--bg-tertiary); border: 1px solid var(--border); 
                    border-radius: 10px; text-align: left; transition: all 0.2s;
                    cursor: pointer;
                    width: 100%;
                }
                .type-card:hover { border-color: var(--accent-primary); background: var(--border-light); }
                .type-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
                .type-info { flex: 1; display: flex; flex-direction: column; }
                .type-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
                .type-desc { font-size: 10px; color: var(--text-secondary); }
                .arrow { opacity: 0.3; }

                .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .bank-card { 
                    display: flex; align-items: center; gap: 8px; padding: 8px 10px; 
                    background: var(--bg-tertiary); border: 1px solid var(--border); 
                    border-radius: 8px; transition: all 0.2s;
                    cursor: pointer;
                }
                .bank-card:hover { border-color: var(--accent-primary); }
                .bank-logo-sm { width: 24px; height: 24px; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
                .bank-name { font-size: 11px; font-weight: 500; }
                .bank-card.other { justify-content: center; color: var(--text-secondary); font-size: 10px; }

                .form-clean { display: flex; flex-direction: column; gap: 12px; }
                .input-group { display: flex; flex-direction: column; gap: 4px; }
                .input-group label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: var(--text-secondary); }
                .input-group input { padding: 8px 12px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 13px; }
                
                .balance-input-wrapper { position: relative; display: flex; align-items: center; }
                .currency { position: absolute; left: 12px; font-weight: 700; color: var(--text-secondary); }
                .balance-input-wrapper input { padding-left: 32px; width: 100%; font-size: 1.25rem; font-weight: 700; height: 40px; }

                .toggle-group { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--border-light); }
                .toggle-text { display: flex; flex-direction: column; }
                .toggle-label { font-size: 11px; font-weight: 600; }
                .toggle-hint { font-size: 9px; color: var(--text-secondary); }
                
                .toggle-btn { width: 36px; height: 18px; background: var(--bg-tertiary); border-radius: 9px; position: relative; transition: all 0.3s; padding: 0; }
                .toggle-btn.active { background: var(--success); }
                .toggle-thumb { width: 14px; height: 14px; background: white; border-radius: 7px; position: absolute; left: 2px; top: 2px; transition: all 0.3s; }
                .toggle-btn.active .toggle-thumb { left: calc(100% - 16px); }

                .full-width { width: 100%; padding: 8px; font-size: 12px; font-weight: 700; margin-top: 6px; height: 36px; border-radius: 6px; }
                
                .preview-card { padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.02); }
                .preview-header { display: flex; align-items: center; gap: 12px; }
                .preview-logo { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
                .preview-info { display: flex; flex-direction: column; }
                .preview-name { font-size: 1rem; font-weight: 700; }
                .preview-inst { font-size: 9px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; }
                .preview-balance { display: flex; flex-direction: column; }
                .preview-balance .label { font-size: 9px; color: var(--text-secondary); }
                .preview-balance .value { font-size: 1.25rem; font-weight: 800; }
                .preview-meta { display: flex; align-items: center; gap: 10px; font-size: 10px; color: var(--text-secondary); }
                .meta-item { display: flex; align-items: center; gap: 4px; }

                .create-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--success); height: 40px; margin-top: 12px; }
                .create-btn:hover { background: #35a044; }
            `}} />
        </div>,
        document.body
    );
};

export default AccountModal;
