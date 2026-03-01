import React, { useEffect, useState, useMemo, useRef } from 'react';
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

interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  value: any;
  date: string;
  paymentDate?: string;
  description: string;
  categoryId: string;
  accountId: string;
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
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, forcedType, editingTransaction, defaultAccountId }) => {
  const data = useCurrentData();
  const { addTransaction, updateTransaction, addCategory, settings, referenceMonth } = useFinanceStore();

  const [dateType, setDateType] = useState<'today' | 'yesterday' | 'other'>('today');

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [showRecurrencePrompt, setShowRecurrencePrompt] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ payload: any, stayOpen: boolean } | null>(null);

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

    return {
      type: forcedType || 'expense',
      date: new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().split('T')[0],
      status: 'forecast',
      value: 0,
      description: '',
      accountId: data?.accounts?.[0]?.id || '',
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
  const showRecurringOptions = watch('isRecurring');
  const accountId = watch('accountId');
  const creditCardId = watch('creditCardId');
  const status = watch('status');

  const lastOpened = useRef(false);
  const lastEditingId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && (!lastOpened.current || (editingTransaction?.id !== lastEditingId.current))) {
      reset(initialValues);

      if (editingTransaction) {
        setValue('categoryId', editingTransaction.categoryId);
        setValue('accountId', editingTransaction.accountId || '');
        setValue('creditCardId', editingTransaction.creditCardId || '');
        setValue('value', editingTransaction.value);
        setValue('description', editingTransaction.description);
        setValue('isFixed', !!editingTransaction.isFixed);
        setValue('isRecurring', !!editingTransaction.isRecurring);
        setValue('status', editingTransaction.status || 'forecast');
        setValue('frequency', editingTransaction.recurrence?.frequency || 'monthly');
        setValue('installmentsCount', editingTransaction.recurrence?.installmentsCount || 1);

        try {
          const tDate = new Date(editingTransaction.date).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (tDate === today) setDateType('today');
          else if (tDate === yesterday) setDateType('yesterday');
          else setDateType('other');
        } catch (err) {
          setDateType('today');
        }
      } else {
        setDateType('today');
        setShowRecurrencePrompt(false);
      }
    }
    lastOpened.current = isOpen;
    lastEditingId.current = editingTransaction?.id || null;
  }, [isOpen, editingTransaction, reset, initialValues, setValue]);

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

  const handleQuickAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory({
      name: newCategoryName,
      type: transactionType as 'income' | 'expense'
    });
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const currencySymbols: Record<string, string> = {
    'EUR': '€', 'BRL': 'R$', 'USD': '$', 'GBP': '£'
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: settings.currency }).format(value);
  };

  const finalizeSubmit = async (payload: any, stayOpen: boolean) => {
    try {
      const finalData = {
        ...payload,
        value: Number(payload.value)
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, finalData as any);
      } else {
        await addTransaction({
          ...finalData,
          reconciled: false,
        } as any);
      }

      if (stayOpen) {
        reset({ ...initialValues, value: 0, description: '' });
      } else {
        onClose();
        setShowRecurrencePrompt(false);
      }
    } catch (err) {
      alert("Erro ao salvar!");
    }
  };

  const handleProcessSubmit = (formData: TransactionFormData, stayOpen: boolean = false) => {
    const parseCurrencyValue = (input: string | number) => {
      if (typeof input === 'number') return input;
      let str = String(input).replace(/[^\d.,]/g, '');
      if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
      if (str.includes(',')) return parseFloat(str.replace(',', '.'));
      if (str.includes('.')) {
        const parts = str.split('.');
        if (parts.length === 2 && parts[1].length === 3) return parseFloat(str.replace(/\./g, ''));
        return parseFloat(str);
      }
      return parseFloat(str) || 0;
    };

    const numericValue = parseCurrencyValue(formData.value);
    const payload = {
      ...formData,
      value: numericValue,
      recurrence: formData.isRecurring ? {
        type: (formData.installmentsCount && Number(formData.installmentsCount) > 1) ? 'installments' : 'recurrent',
        frequency: formData.frequency || 'monthly',
        installmentsCount: Number(formData.installmentsCount) || 1
      } : (formData.isFixed ? { type: 'fixed', frequency: 'monthly' } : undefined)
    };

    if (editingTransaction && (editingTransaction.isRecurring || editingTransaction.isFixed)) {
      setPendingSubmitData({ payload, stayOpen });
      setShowRecurrencePrompt(true);
      return;
    }

    finalizeSubmit(payload, stayOpen);
  };

  const handleRecurrenceEdit = (mode: 'this' | 'future' | 'all') => {
    if (!pendingSubmitData || !editingTransaction) return;
    const { payload, stayOpen } = pendingSubmitData;
    const existingRecurrence = editingTransaction.recurrence || { type: 'recurrent' as const, frequency: 'monthly' as const };

    if (mode === 'all') {
      finalizeSubmit(payload, stayOpen);
    } else if (mode === 'this') {
      const excluded = existingRecurrence.excludedDates || [];
      if (!excluded.includes(referenceMonth)) {
        updateTransaction(editingTransaction.id, {
          recurrence: { ...existingRecurrence, excludedDates: [...excluded, referenceMonth] }
        });
      }
      // Criar o registo avulso para este mês
      const oneOff = { ...payload, isRecurring: false, isFixed: false, recurrence: undefined };
      addTransaction(oneOff as any);

      if (stayOpen) {
        reset(initialValues);
      } else {
        onClose();
      }
    }
    setShowRecurrencePrompt(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="compact-modal glass shadow-premium" onClick={e => e.stopPropagation()}>
        {showRecurrencePrompt ? (
          <div className="recurrence-prompt-container">
            <header className="prompt-header">
              <div className="prompt-icon-circle"><Repeat size={28} /></div>
              <h3>Registo Recorrente</h3>
              <p>Deseja aplicar esta alteração a todas as parcelas ou apenas ao mês atual?</p>
            </header>

            <div className="prompt-body">
              <button
                className="prompt-option-card"
                onClick={() => handleRecurrenceEdit('this')}
              >
                <div className="option-info">
                  <span className="option-title">Apenas este mês</span>
                  <span className="option-desc">Altera apenas o registo de {referenceMonth}.</span>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                className="prompt-option-card primary"
                onClick={() => handleRecurrenceEdit('all')}
              >
                <div className="option-info">
                  <span className="option-title">Todas as parcelas (Pendentes)</span>
                  <span className="option-desc">Atualiza o valor e dados para todos os meses futuros.</span>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>

            <footer className="prompt-footer">
              <button className="btn-back" onClick={() => setShowRecurrencePrompt(false)}>
                Voltar à edição
              </button>
            </footer>
          </div>
        ) : (
          <>
            <header className="compact-header">
              <div className="header-toggle-switcher">
                <button
                  type="button"
                  className={`switch-btn ${transactionType === 'expense' ? 'active-expense' : ''}`}
                  onClick={() => setValue('type', 'expense')}
                >Despesa</button>
                <button
                  type="button"
                  className={`switch-btn ${transactionType === 'income' ? 'active-income' : ''}`}
                  onClick={() => setValue('type', 'income')}
                >Receita</button>
              </div>
              <button className="close-x" onClick={onClose}><X size={18} /></button>
            </header>

            <form onSubmit={handleSubmit(data => handleProcessSubmit(data, false))} className="compact-form">
              <div className="compact-hero">
                <div className="value-input-row">
                  <span className="currency-prefix">{currencySymbols[settings.currency] || '€'}</span>
                  <input type="text" {...register('value', { required: true })} className="value-input-main" placeholder="0,00" autoFocus />
                </div>
                <input type="text" {...register('description', { required: true })} className="desc-input-main" placeholder="O que foi isso?..." />
              </div>

              <div className="compact-grid">
                <div className="compact-field">
                  <label>Status</label>
                  <button type="button" className={`status-toggle-row ${status === 'confirmed' ? 'confirmed' : ''}`} onClick={() => setValue('status', status === 'confirmed' ? 'forecast' : 'confirmed')}>
                    <div className="check-box-ui">{status === 'confirmed' && <CheckCircle2 size={14} />}</div>
                    <span className="status-label">{status === 'confirmed' ? 'Confirmado' : 'Previsto'}</span>
                  </button>
                </div>

                <div className="compact-field">
                  <label>Data</label>
                  <div className="date-selector-row">
                    <div className="date-pills">
                      <button type="button" className={dateType === 'today' ? 'active' : ''} onClick={() => handleDateChange('today')}>Hoje</button>
                      <button type="button" className={dateType === 'yesterday' ? 'active' : ''} onClick={() => handleDateChange('yesterday')}>Ontem</button>
                      <button type="button" className={dateType === 'other' ? 'active' : ''} onClick={() => setDateType('other')}>Outra</button>
                    </div>
                    <input type="date" {...register('date', { required: true })} className="input-field-compact" style={{ display: dateType === 'other' ? 'block' : 'none', marginTop: '4px' }} />
                  </div>
                </div>

                <div className="compact-field">
                  <label>Categoria</label>
                  <div className="field-with-add">
                    {isAddingCategory ? (
                      <div className="add-row">
                        <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="input-field-compact" autoFocus placeholder="Nome..." />
                        <button type="button" className="btn-ok-mini" onClick={handleQuickAddCategory}>OK</button>
                        <button type="button" className="btn-cancel-mini" onClick={() => setIsAddingCategory(false)}><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="select-row">
                        <select {...register('categoryId', { required: true })} className="select-field-compact" key={`cat-select-${editingTransaction?.id}`}>
                          <option value="">Selecionar...</option>
                          {data.categories.filter(cat => cat.type === transactionType || cat.id === watch('categoryId')).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button type="button" className="btn-plus-mini" onClick={() => setIsAddingCategory(true)}><Plus size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="compact-field">
                  <label>Conta / Cartão</label>
                  <select value={accountId || (creditCardId ? `card-${creditCardId}` : '')} onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('card-')) { setValue('creditCardId', val.replace('card-', '')); setValue('accountId', ''); }
                    else { setValue('accountId', val); setValue('creditCardId', ''); }
                  }} className="select-field-compact">
                    <optgroup label="Contas Gerais">{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.currentBalance)})</option>)}</optgroup>
                    {transactionType === 'expense' && <optgroup label="Cartões de Crédito">{data.creditCards.map(card => <option key={card.id} value={`card-${card.id}`}>{card.name}</option>)}</optgroup>}
                  </select>
                </div>

                <div className="toggles-grid-modern full-row">
                  <button type="button" className={`modern-toggle-btn ${watch('isFixed') ? 'active' : ''}`} onClick={() => { const v = !watch('isFixed'); setValue('isFixed', v); if (v) setValue('isRecurring', false); }}>
                    <Pin size={14} /> Fixo
                  </button>
                  <button type="button" className={`modern-toggle-btn ${watch('isRecurring') ? 'active' : ''}`} onClick={() => { const v = !watch('isRecurring'); setValue('isRecurring', v); if (v) setValue('isFixed', false); }}>
                    <Repeat size={14} /> Repetir
                  </button>
                  <button type="button" className={`modern-toggle-btn ${watch('isIgnored') ? 'active' : ''}`} onClick={() => setValue('isIgnored', !watch('isIgnored'))}>
                    <EyeOff size={14} /> Ocultar
                  </button>
                </div>

                {showRecurringOptions && (
                  <div className="recurrence-options-panel full-row fade-in">
                    <div className="recurrence-grid">
                      <div className="compact-field">
                        <label>Frequência</label>
                        <select {...register('frequency')} className="select-field-compact">
                          <option value="monthly">Mensal</option>
                          <option value="weekly">Semanal</option>
                          <option value="yearly">Anual</option>
                        </select>
                      </div>
                      <div className="compact-field">
                        <label>Quantidade de Vezes</label>
                        <input type="number" {...register('installmentsCount')} className="input-field-compact" min="1" placeholder="Ex: 12" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <footer className="compact-footer-modern">
                <button type="button" className="btn-text-secondary" onClick={onClose}>Cancelar</button>
                <div className="footer-actions-group">
                  {!editingTransaction && <button type="button" className="btn-outline-premium" onClick={handleSubmit(d => handleProcessSubmit(d, true))}>Salvar e continuar</button>}
                  <button type="submit" className={`btn-primary-premium ${transactionType}`}>
                    {editingTransaction ? 'Salvar Alteração' : 'Criar Registro'}
                  </button>
                </div>
              </footer>
            </form>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; }
        .compact-modal { width: 480px; background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: 24px; overflow: hidden; animation: slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .shadow-premium { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        @keyframes slideUpModal { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .compact-header { padding: 12px 20px; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); }
        .header-toggle-switcher { display: flex; background: var(--bg-tertiary); padding: 4px; border-radius: 12px; gap: 4px; }
        .switch-btn { padding: 6px 16px; border-radius: 8px; font-size: 11px; font-weight: 700; color: var(--text-secondary); background: transparent; transition: 0.2s; border: none; cursor: pointer; }
        .switch-btn.active-expense { background: var(--error); color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); }
        .switch-btn.active-income { background: var(--success); color: white; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2); }
        
        .compact-form { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        .compact-hero { display: flex; flex-direction: column; align-items: center; gap: 6px; padding-bottom: 24px; border-bottom: 1px solid var(--border-light); }
        .value-input-row { display: flex; align-items: baseline; gap: 6px; }
        .currency-prefix { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); opacity: 0.4; }
        .value-input-main { background: transparent; border: none; font-size: 3rem; font-weight: 800; text-align: center; width: 220px; outline: none; color: var(--text-primary); letter-spacing: -0.05em; font-family: var(--font-display); }
        .desc-input-main { background: transparent; border: none; font-size: 14px; text-align: center; color: var(--text-secondary); width: 100%; outline: none; font-weight: 500; }
        
        .compact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .full-row { grid-column: span 2; }
        .compact-field { display: flex; flex-direction: column; gap: 8px; }
        .compact-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em; }
        
        .status-toggle-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-secondary); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: 0.2s; text-align: left; }
        .status-toggle-row.confirmed { border-color: var(--success); background: rgba(34, 197, 94, 0.05); }
        .check-box-ui { width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .confirmed .check-box-ui { background: var(--success); border-color: var(--success); color: white; }
        .status-label { font-size: 13px; font-weight: 700; }
        
        .date-pills { display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 12px; border: 1.5px solid var(--border); }
        .date-pills button { flex: 1; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--text-secondary); border: none; background: transparent; cursor: pointer; }
        .date-pills button.active { background: var(--bg-primary); color: var(--text-primary); box-shadow: var(--shadow-sm); }
        
        .select-field-compact, .input-field-compact { padding: 10px 12px; border-radius: 12px; background: var(--bg-secondary); border: 1.5px solid var(--border); color: var(--text-primary); font-size: 13px; outline: none; width: 100%; }
        .field-with-add .select-row { display: flex; gap: 8px; }
        .btn-plus-mini { width: 38px; height: 38px; border-radius: 10px; border: 1.5px dashed var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .btn-plus-mini:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .add-row { display: flex; gap: 6px; align-items: center; }
        .btn-ok-mini { background: var(--success); color: white; border: none; border-radius: 8px; padding: 8px 12px; font-size: 11px; font-weight: 700; cursor: pointer; }
        
        .toggles-grid-modern { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .modern-toggle-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 14px; border: 1.5px solid var(--border); background: var(--bg-secondary); font-size: 12px; font-weight: 700; color: var(--text-secondary); cursor: pointer; transition: 0.2s; }
        .modern-toggle-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(47, 129, 247, 0.05); }
        
        .recurrence-options-panel { background: var(--bg-tertiary); padding: 16px; border-radius: 18px; border: 1px dashed var(--border); margin-top: -10px; }
        .recurrence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .compact-footer-modern { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .footer-actions-group { display: flex; gap: 12px; }
        .btn-text-secondary { font-size: 13px; color: var(--text-secondary); font-weight: 600; cursor: pointer; border: none; background: transparent; }
        .btn-primary-premium { padding: 12px 24px; border-radius: 14px; font-weight: 700; color: white; cursor: pointer; border: none; font-size: 14px; transition: 0.2s; }
        .btn-primary-premium.income { background: var(--success); box-shadow: 0 10px 20px -5px rgba(34, 197, 94, 0.4); }
        .btn-primary-premium.expense { background: var(--error); box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.4); }
        .btn-outline-premium { padding: 12px 18px; border-radius: 14px; border: 1.5px solid var(--border); background: white; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-outline-premium:hover { border-color: var(--accent-primary); background: var(--bg-tertiary); }
        
        /* Recurrence Prompt Styles */
        .recurrence-prompt-container { padding: 32px; display: flex; flex-direction: column; gap: 28px; }
        .prompt-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .prompt-icon-circle { width: 64px; height: 64px; background: rgba(47, 129, 247, 0.1); color: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .prompt-header h3 { font-size: 20px; font-weight: 800; color: var(--text-primary); }
        .prompt-header p { font-size: 14px; color: var(--text-secondary); line-height: 1.5; max-width: 320px; }
        .prompt-body { display: flex; flex-direction: column; gap: 12px; }
        .prompt-option-card { display: flex; align-items: center; border: 1.5px solid var(--border); background: var(--bg-secondary); border-radius: 18px; padding: 18px 24px; text-align: left; transition: 0.2s; cursor: pointer; border: none; }
        .prompt-option-card:hover { border-color: var(--accent-primary); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .prompt-option-card.primary { background: var(--accent-primary); color: white; border: none; }
        .option-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .option-title { font-size: 15px; font-weight: 700; }
        .option-desc { font-size: 12px; opacity: 0.7; font-weight: 500; }
        .prompt-footer { display: flex; justify-content: center; }
        .btn-back { font-size: 13px; font-weight: 700; color: var(--text-secondary); background: transparent; border: none; cursor: pointer; padding: 8px 16px; border-radius: 12px; }
        .btn-back:hover { background: var(--bg-tertiary); color: var(--text-primary); }
      `}} />
    </div>,
    document.body
  );
};

export default TransactionModal;
