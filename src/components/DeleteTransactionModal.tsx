import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Calendar, FastForward, Trash, AlertTriangle, ChevronRight } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DeleteTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scope: 'all' | 'single' | 'future') => void;
    transaction: Transaction | null;
    referenceMonth: string;
}

const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    transaction,
    referenceMonth 
}) => {
    const [selectedScope, setSelectedScope] = useState<'all' | 'single' | 'future'>('single');

    if (!isOpen || !transaction) return null;

    const isRecurring = transaction.isRecurring || transaction.isFixed;
    const monthName = format(parseISO(referenceMonth + '-01'), 'MMMM', { locale: pt });

    const handleConfirm = () => {
        onConfirm(selectedScope);
        onClose();
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content glass delete-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <header className="modal-header" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="delete-icon-wrapper">
                            <Trash2 size={20} color="var(--sys-red)" />
                        </div>
                        <h2 className="sys-subtitle" style={{ margin: 0 }}>Apagar Transação</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </header>

                <div className="modal-body">
                    <p style={{ fontSize: '14px', color: 'var(--sys-text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                        Tem certeza que deseja apagar <strong>"{transaction.description}"</strong>? 
                        {isRecurring ? ' Esta é uma transação recorrente.' : ''}
                    </p>

                    {isRecurring ? (
                        <div className="delete-options">
                            <button 
                                className={`delete-option ${selectedScope === 'single' ? 'active' : ''}`}
                                onClick={() => setSelectedScope('single')}
                            >
                                <div className="option-icon blue"><Calendar size={18} /></div>
                                <div className="option-info">
                                    <span className="option-title">Apenas esta ocorrência</span>
                                    <span className="option-desc">Remove apenas em {monthName}</span>
                                </div>
                                <div className="option-check"></div>
                            </button>

                            <button 
                                className={`delete-option ${selectedScope === 'future' ? 'active' : ''}`}
                                onClick={() => setSelectedScope('future')}
                            >
                                <div className="option-icon orange"><FastForward size={18} /></div>
                                <div className="option-info">
                                    <span className="option-title">Esta e as futuras</span>
                                    <span className="option-desc">Remove de {monthName} em diante</span>
                                </div>
                                <div className="option-check"></div>
                            </button>

                            <button 
                                className={`delete-option ${selectedScope === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedScope('all')}
                            >
                                <div className="option-icon red"><Trash size={18} /></div>
                                <div className="option-info">
                                    <span className="option-title">Todas as transações</span>
                                    <span className="option-desc">Remove passadas, atuais e futuras</span>
                                </div>
                                <div className="option-check"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="simple-confirmation">
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--sys-bg-red)', borderRadius: '8px', color: 'var(--sys-red)', fontSize: '12px', fontWeight: 600 }}>
                                <AlertTriangle size={16} />
                                <span>Esta ação não pode ser desfeita.</span>
                             </div>
                        </div>
                    )}

                    <div className="modal-footer" style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                        <button className="sys-btn-secondary" onClick={onClose} style={{ flex: 1, height: '40px' }}>Cancelar</button>
                        <button 
                            className="sys-btn-destructive" 
                            onClick={handleConfirm}
                            style={{ flex: 1, height: '40px', background: selectedScope === 'all' ? 'var(--sys-red)' : selectedScope === 'future' ? '#f97316' : 'var(--sys-blue)' }}
                        >
                            Confirmar Exclusão
                        </button>
                    </div>
                </div>

                <style>{`
                    .delete-modal {
                        padding: 32px !important;
                    }
                    .delete-icon-wrapper {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                        background: var(--sys-bg-red);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .delete-options {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .delete-option {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        padding: 16px;
                        border-radius: 12px;
                        border: 1px solid var(--sys-border);
                        background: var(--bg-primary);
                        cursor: pointer;
                        transition: all 0.2s ease;
                        text-align: left;
                        width: 100%;
                        position: relative;
                    }
                    .delete-option:hover {
                        border-color: var(--sys-blue);
                        background: var(--bg-secondary);
                    }
                    .delete-option.active {
                        border-color: var(--sys-blue);
                        background: var(--sys-bg-blue);
                    }
                    .option-icon {
                        width: 40px;
                        height: 40px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    .option-icon.blue { background: #eff6ff; color: #3b82f6; }
                    .option-icon.orange { background: #fff7ed; color: #f97316; }
                    .option-icon.red { background: #fef2f2; color: #ef4444; }
                    
                    .option-info {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                    }
                    .option-title {
                        font-family: var(--sys-font-display);
                        font-size: 14px;
                        font-weight: 700;
                        color: var(--sys-text-primary);
                    }
                    .option-desc {
                        font-size: 11px;
                        color: var(--sys-text-secondary);
                    }
                    .option-check {
                        margin-left: auto;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 2px solid var(--sys-border);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .delete-option.active .option-check {
                        border-color: var(--sys-blue);
                        background: var(--sys-blue);
                    }
                    .delete-option.active .option-check::after {
                        content: '';
                        width: 8px;
                        height: 4px;
                        border-left: 2px solid white;
                        border-bottom: 2px solid white;
                        transform: rotate(-45deg);
                        margin-bottom: 2px;
                    }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default DeleteTransactionModal;
