import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Tag as TagIcon,
  CreditCard as CardIcon,
  ChevronDown,
  CheckCircle2,
  Wallet,
  Clock,
  Repeat,
  AlertCircle,
  FileText,
  Pin,
  EyeOff,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowRight
} from 'lucide-react';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';
import { useForm } from 'react-hook-form';
import { FinancialEngine } from '@/lib/FinancialEngine';

interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  value: any;
  date: string;
  paymentDate?: string;
  description: string;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  creditCardId: string;
  status: 'confirmed' | 'forecast';
  isFixed: boolean;
  isIgnored: boolean;
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly';
  installmentsCount?: number;
  notes: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  forcedType?: 'income' | 'expense' | 'transfer';
  editingTransaction?: any;
  defaultAccountId?: string;
  defaultCreditCardId?: string;
  activeMonth?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, forcedType, editingTransaction, defaultAccountId, defaultCreditCardId, activeMonth }) => {
  const data = useCurrentData();
  const { addTransaction, updateTransaction, settings, referenceMonth } = useFinanceStore();
  const effectiveMonth = activeMonth || referenceMonth;

  const [dateType, setDateType] = useState<'today' | 'yesterday' | 'other'>('today');
  const [showRecurrencePrompt, setShowRecurrencePrompt] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ payload: any, stayOpen: boolean } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<'single' | 'fixed' | 'installments'>('single');
  const [isStatusManuallyChanged, setIsStatusManuallyChanged] = useState(false);
  const [displayValue, setDisplayValue] = useState("0,00");

  const initialValues = useMemo(() => {
    try {
      if (editingTransaction && isOpen) {
        return {
          ...editingTransaction,
          date: new Date(editingTransaction.date).toISOString().split('T')[0],
          frequency: editingTransaction.recurrence?.frequency || 'monthly',
          installmentsCount: editingTransaction.recurrence?.installmentsCount || 1,
        };
      }
    } catch (err) {
      console.error("MODAL: Error parsing editing date", err);
    }

    const todayStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().split('T')[0];
    return {
      type: forcedType || 'expense',
      date: todayStr,
      status: 'confirmed',
      value: 0,
      description: '',
      accountId: defaultAccountId || data?.accounts?.[0]?.id || '',
      creditCardId: defaultCreditCardId || '',
      categoryId: '',
      isFixed: false,
      isIgnored: false,
      isRecurring: false,
      frequency: 'monthly',
      installmentsCount: 1,
      notes: '',
    };
  }, [isOpen, editingTransaction, forcedType, data?.accounts]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
    mode: 'onChange',
    defaultValues: initialValues
  });

  if (!data || !data.accounts) return null;

  const transactionType = watch('type');
  const status = watch('status');
  const watchedDate = watch('date');
  const categoryId = watch('categoryId');
  const isIgnored = watch('isIgnored');

  useEffect(() => {
    if (isOpen) {
      reset(initialValues);
      setShowDetails(false);
      setIsStatusManuallyChanged(false);
      setRecurrenceMode(editingTransaction?.isFixed ? 'fixed' : editingTransaction?.isRecurring ? 'installments' : 'single');

      if (editingTransaction) {
        const tDate = new Date(editingTransaction.date).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (tDate === today) setDateType('today');
        else if (tDate === yesterday) setDateType('yesterday');
        else setDateType('other');
      } else {
        setDateType('today');
      }

      const initialVal = editingTransaction ? Number(editingTransaction.value) : 0;
      setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(initialVal));
    }
  }, [isOpen, editingTransaction, reset, initialValues]);

  useEffect(() => {
    if (recurrenceMode === 'single') {
      setValue('isFixed', false);
      setValue('isRecurring', false);
    } else if (recurrenceMode === 'fixed') {
      setValue('isFixed', true);
      setValue('isRecurring', false);
      setValue('frequency', 'monthly');
    } else if (recurrenceMode === 'installments') {
      setValue('isFixed', false);
      setValue('isRecurring', true);
      if (!editingTransaction) {
        setValue('status', 'confirmed');
        setIsStatusManuallyChanged(true);
      }
    }
  }, [recurrenceMode, setValue, editingTransaction]);

  useEffect(() => {
    if (!isStatusManuallyChanged && watchedDate) {
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().split('T')[0];
      if (watchedDate <= today) {
        setValue('status', 'confirmed');
      } else {
        setValue('status', 'forecast');
      }
    }
  }, [watchedDate, isStatusManuallyChanged, setValue]);

  const handleDateChange = (type: 'today' | 'yesterday' | 'other') => {
    setDateType(type);
    if (type === 'today') {
      setValue('date', new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().split('T')[0]);
    } else if (type === 'yesterday') {
      const yesterday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
      yesterday.setDate(yesterday.getDate() - 1);
      setValue('date', yesterday.toISOString().split('T')[0]);
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const totalCents = parseInt(digits || "0", 10);
    const numericValue = totalCents / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);

    setDisplayValue(formatted);
    setValue('value', numericValue);
  };

  const finalizeSubmit = async (payload: any, stayOpen: boolean, forcedScope?: 'all' | 'single' | 'future') => {
    try {
      const numericValue = Number(payload.value) || 0;
      const finalPayload: any = {
        ...payload,
        value: numericValue,
        description: payload.description || '',
        notes: payload.notes || ''
      };

      if (payload.isFixed || payload.isRecurring) {
        finalPayload.recurrence = {
          type: payload.isFixed ? 'fixed' : 'installments',
          frequency: payload.frequency || 'monthly',
          installmentsCount: payload.isRecurring ? Number(payload.installmentsCount) : undefined,
          excludedDates: editingTransaction?.recurrence?.excludedDates || []
        };
      } else {
        finalPayload.recurrence = undefined;
      }

      if (editingTransaction && (editingTransaction.isFixed || editingTransaction.isRecurring) && !forcedScope) {
        setPendingSubmitData({ payload: finalPayload, stayOpen });
        setShowRecurrencePrompt(true);
        return;
      }

      const scope = forcedScope || 'all';

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, finalPayload as any, scope, effectiveMonth);
      } else {
        await addTransaction(finalPayload as any);
      }

      setShowRecurrencePrompt(false);
      setPendingSubmitData(null);

      if (stayOpen) {
        reset({
          ...initialValues,
          value: 0,
          description: '',
          notes: '',
          isFixed: false,
          isRecurring: false,
          installmentsCount: 1
        });
        setRecurrenceMode('single');
      } else {
        onClose();
      }
    } catch (err) {
      console.error("MODAL: Error saving transaction", err);
      alert("Erro ao salvar transação");
    }
  };

  if (!isOpen) return null;

  const currentTypeColor = transactionType === 'income' ? 'var(--sys-green)' : transactionType === 'expense' ? 'var(--sys-red)' : 'var(--sys-blue)';

  return createPortal(
    <div className="sys-modal-overlay" onClick={onClose}>
      <div className="sys-modal-content glass fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Header Section */}
        <header className="sys-modal-header" style={{ borderColor: currentTypeColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sys-icon-box" style={{ backgroundColor: `${currentTypeColor}15`, color: currentTypeColor }}>
              {transactionType === 'income' ? <TrendingUp size={18} /> : transactionType === 'expense' ? <TrendingDown size={18} /> : <ArrowRight size={18} />}
            </div>
            <div>
              <h2 className="sys-modal-title">{editingTransaction ? 'Editar' : 'Nova'} {transactionType === 'income' ? 'Receita' : transactionType === 'expense' ? 'Despesa' : 'Transferência'}</h2>
              {editingTransaction?.isRecurring && (
                <p className="sys-modal-subtitle">{FinancialEngine.getInstallmentText(editingTransaction, effectiveMonth)} • Recorrente</p>
              )}
            </div>
          </div>
          <button className="sys-modal-close" onClick={onClose}><X size={20} /></button>
        </header>

        {/* Recurrence Prompt (Scope Selector) */}
        {showRecurrencePrompt && (
          <div className="sys-recurrence-scope-overlay">
            <div className="sys-scope-card">
              <div className="scope-icon"><Repeat size={32} /></div>
              <h3>Alterar transação repetida</h3>
              <p>Esta {transactionType === 'expense' ? 'despesa' : 'receita'} faz parte de uma série. O que deseja alterar?</p>
              
              <div className="scope-options">
                <button type="button" className="scope-btn" onClick={() => finalizeSubmit(pendingSubmitData?.payload, false, 'single')}>
                  Apenas este mês ({effectiveMonth})
                </button>
                <button type="button" className="scope-btn primary" onClick={() => finalizeSubmit(pendingSubmitData?.payload, false, 'future')}>
                  Este e próximos meses
                </button>
                <button type="button" className="scope-btn" onClick={() => finalizeSubmit(pendingSubmitData?.payload, false, 'all')}>
                  Toda a série (passado e futuro)
                </button>
              </div>
              <button type="button" className="scope-cancel" onClick={() => setShowRecurrencePrompt(false)}>Voltar</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(data => finalizeSubmit(data, false))} className="sys-modal-form">
          
          {/* Main Input Area (Value & Description) */}
          <div className="sys-modal-hero">
            <div className="sys-value-input-group">
              <span className="currency-label" style={{ color: currentTypeColor }}>€</span>
              <input 
                type="text" 
                inputMode="decimal"
                value={displayValue}
                onChange={handleValueChange}
                className="value-input"
                style={{ color: currentTypeColor }}
                autoFocus
              />
            </div>
            <input 
              type="text" 
              {...register('description', { required: true })} 
              className="description-input" 
              placeholder="O que foi?"
            />
          </div>

          {/* Form Fields Grid */}
          <div className="sys-modal-fields">
            
            {/* Status & Context */}
            <div className="sys-field-group">
              <div className="field-item">
                <label><CheckCircle2 size={16} /> Status</label>
                <div className="sys-pill-tabs">
                  <button 
                    type="button" 
                    className={status === 'confirmed' ? 'active' : ''} 
                    onClick={() => { setValue('status', 'confirmed'); setIsStatusManuallyChanged(true); }}
                  >
                    {transactionType === 'expense' ? 'PAGO' : 'RECEBIDO'}
                  </button>
                  <button 
                    type="button" 
                    className={status === 'forecast' ? 'active' : ''} 
                    onClick={() => { setValue('status', 'forecast'); setIsStatusManuallyChanged(true); }}
                  >
                    PENDENTE
                  </button>
                </div>
              </div>

               <div className="field-item">
                <label><EyeOff size={16} /> Visibilidade</label>
                <button 
                  type="button" 
                  className={`sys-toggle-btn ${isIgnored ? 'active' : ''}`}
                  onClick={() => setValue('isIgnored', !isIgnored)}
                >
                  <div className="toggle-dot" />
                  <span>{isIgnored ? 'Ignorado' : 'Contabilizado'}</span>
                </button>
              </div>
            </div>

            {/* Date & Account */}
            <div className="sys-field-group">
              <div className="field-item">
                <label><Calendar size={16} /> Data</label>
                <div className="date-controls">
                   <div className="sys-pill-tabs mini">
                    <button type="button" className={dateType === 'today' ? 'active' : ''} onClick={() => handleDateChange('today')}>HOJE</button>
                    <button type="button" className={dateType === 'yesterday' ? 'active' : ''} onClick={() => handleDateChange('yesterday')}>ONTEM</button>
                    <button type="button" className={dateType === 'other' ? 'active' : ''} onClick={() => setDateType('other')}>OUTRA</button>
                  </div>
                  {dateType === 'other' && (
                    <input type="date" {...register('date', { required: true })} className="sys-input-date" />
                  )}
                </div>
              </div>

              <div className="field-item">
                <label><Wallet size={16} /> {transactionType === 'transfer' ? 'Conta Origem' : 'Conta'}</label>
                <select {...register('accountId', { required: true })} className="sys-select">
                  {data.accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Transfer Target */}
            <div className="sys-field-group">
              <div className="field-item">
                <label><TagIcon size={16} /> Categoria</label>
                <select {...register('categoryId', { required: true })} className="sys-select">
                  <option value="">Selecionar Categoria</option>
                  {data.categories.filter(c => c.type === transactionType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {transactionType === 'transfer' && (
                <div className="field-item">
                  <label><ArrowRight size={16} /> Conta Destino</label>
                  <select {...register('toAccountId', { required: true })} className="sys-select">
                    <option value="">Destino</option>
                    {data.accounts.map(acc => (
                      <option key={acc.id} value={acc.id} disabled={acc.id === watch('accountId')}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Extras Section */}
            <div className="sys-modal-section">
              <button 
                type="button" 
                className="section-trigger"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>{showDetails ? 'Recolher Opções' : 'Mais Opções (Parcelas, Notas, etc.)'}</span>
                <ChevronDown size={14} style={{ transform: showDetails ? 'rotate(180deg)' : '' }} />
              </button>

              {showDetails && (
                <div className="section-content fade-in">
                  <div className="field-item">
                    <label><Repeat size={16} /> Repetição</label>
                    <div className="sys-pill-tabs">
                      <button type="button" className={recurrenceMode === 'single' ? 'active' : ''} onClick={() => setRecurrenceMode('single')}>ÚNICA</button>
                      <button type="button" className={recurrenceMode === 'fixed' ? 'active' : ''} onClick={() => setRecurrenceMode('fixed')}>FIXA</button>
                      <button type="button" className={recurrenceMode === 'installments' ? 'active' : ''} onClick={() => setRecurrenceMode('installments')}>PARCELADA</button>
                    </div>
                  </div>

                  {recurrenceMode === 'installments' && (
                    <div className="sys-field-group mini mt-3">
                      <div className="field-item">
                        <label>Parcelas</label>
                        <input type="number" {...register('installmentsCount')} className="sys-input-num" min={1} />
                      </div>
                      <div className="field-item">
                        <label>Frequência</label>
                        <select {...register('frequency')} className="sys-select mini">
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="field-item mt-3">
                    <label><FileText size={16} /> Notas</label>
                    <textarea {...register('notes')} className="sys-textarea" placeholder="Alguma observação extra?" />
                  </div>
                </div>
              )}
            </div>

          </div>

          <footer className="sys-modal-footer">
            <button type="button" className="sys-btn-minimal" onClick={onClose}>Cancelar</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              {!editingTransaction && (
                <button type="button" className="sys-btn-secondary" onClick={handleSubmit(d => finalizeSubmit(d, true))}>
                  SALVAR E CONTINUAR
                </button>
              )}
              <button type="submit" className="sys-btn-primary" style={{ backgroundColor: currentTypeColor }}>
                SALVAR AGORA
              </button>
            </div>
          </footer>
        </form>

        <style>{`
          .sys-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .sys-modal-content { width: 100%; max-width: 580px; background: var(--bg-primary); border-radius: var(--sys-radius-xl); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); border: 1px solid var(--sys-border); }
          
          .sys-modal-header { padding: 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid transparent; }
          .sys-modal-title { font-family: var(--sys-font-display); font-size: 20px; font-weight: 800; margin: 0; }
          .sys-modal-subtitle { font-size: 12px; color: var(--sys-text-secondary); margin: 4px 0 0 0; }
          .sys-modal-close { background: var(--bg-tertiary); color: var(--sys-text-secondary); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
          .sys-modal-close:hover { background: var(--bg-secondary); color: var(--sys-text-primary); }

          .sys-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

          .sys-modal-form { display: flex; flex-direction: column; }
          
          .sys-modal-hero { padding: 32px; background-color: var(--bg-secondary); border-bottom: 1px solid var(--sys-border); text-align: center; }
          .sys-value-input-group { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; }
          .currency-label { font-family: var(--sys-font-display); font-size: 28px; font-weight: 800; }
          .value-input { border: none; background: transparent; font-family: var(--sys-font-display); font-size: 48px; font-weight: 900; width: 250px; text-align: left; outline: none; letter-spacing: -0.04em; }
          .description-input { width: 100%; border: none; background: transparent; text-align: center; font-size: 18px; font-weight: 600; color: var(--sys-text-primary); outline: none; }
          .description-input::placeholder { color: var(--sys-text-muted); opacity: 0.5; }

          .sys-modal-fields { padding: 32px; display: flex; flex-direction: column; gap: 24px; max-height: 450px; overflow-y: auto; }
          
          .sys-field-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .sys-field-group.mini { grid-template-columns: 100px 1fr; }
          .field-item { display: flex; flex-direction: column; gap: 8px; }
          .field-item label { font-size: 11px; font-weight: 700; color: var(--sys-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }

          .sys-pill-tabs { display: flex; background: var(--bg-tertiary); padding: 4px; border-radius: 12px; width: fit-content; }
          .sys-pill-tabs.mini { padding: 3px; border-radius: 8px; }
          .sys-pill-tabs button { padding: 8px 16px; border: none; background: transparent; font-size: 11px; font-weight: 700; color: var(--sys-text-secondary); cursor: pointer; border-radius: 8px; transition: 0.2s; }
          .sys-pill-tabs.mini button { padding: 5px 10px; font-size: 9px; }
          .sys-pill-tabs button.active { background: var(--bg-primary); color: var(--sys-blue); box-shadow: var(--shadow-sm); }

          .sys-toggle-btn { display: flex; align-items: center; gap: 10px; background: var(--bg-tertiary); border: none; padding: 8px 14px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
          .sys-toggle-btn.active { background: var(--sys-bg-red); }
          .sys-toggle-btn .toggle-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; transition: 0.2s; }
          .sys-toggle-btn.active .toggle-dot { background: var(--sys-red); box-shadow: 0 0 8px var(--sys-red); }
          .sys-toggle-btn span { font-size: 11px; font-weight: 700; color: var(--sys-text-secondary); }

          .sys-select, .sys-input-date, .sys-input-num, .sys-textarea { width: 100%; height: 42px; padding: 0 16px; background: var(--bg-primary); border: 1px solid var(--sys-border); border-radius: 12px; color: var(--sys-text-primary); font-size: 14px; font-weight: 500; transition: border-color 0.2s; outline: none; }
          .sys-select:focus, .sys-input-date:focus { border-color: var(--sys-blue); }
          .sys-select.mini { height: 36px; font-size: 12px; }
          .sys-input-num { width: 80px; }
          .sys-textarea { height: 80px; padding: 12px; resize: none; }

          .sys-modal-section { border-top: 1px dashed var(--sys-border); padding-top: 20px; }
          .section-trigger { width: 100%; display: flex; justify-content: space-between; align-items: center; background: transparent; border: none; color: var(--sys-blue); font-size: 12px; font-weight: 600; cursor: pointer; opacity: 0.8; transition: 0.2s; }
          .section-trigger:hover { opacity: 1; }
          .section-content { margin-top: 20px; }

          .sys-modal-footer { padding: 24px 32px; border-top: 1px solid var(--sys-border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); }
          
          /* Recurrence Scope Overlays */
          .sys-recurrence-scope-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.95); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 32px; }
          .sys-scope-card { text-align: center; max-width: 380px; }
          .scope-icon { margin-bottom: 20px; color: var(--sys-blue); display: flex; justify-content: center; }
          .scope-options { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
          .scope-btn { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid var(--sys-border); background: white; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; }
          .scope-btn:hover { border-color: var(--sys-blue); background: var(--sys-bg-blue); }
          .scope-btn.primary { border-color: var(--sys-blue); background: var(--sys-blue); color: white; }
          .scope-cancel { background: transparent; border: none; color: var(--sys-text-muted); font-size: 13px; font-weight: 600; cursor: pointer; }

          .mt-3 { margin-top: 12px; }
        `}</style>

      </div>
    </div>,
    document.body
  );
};

export default TransactionModal;
