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
  const { addTransaction, updateTransaction, addCategory, settings, referenceMonth } = useFinanceStore();
  const effectiveMonth = activeMonth || referenceMonth;

  const [dateType, setDateType] = useState<'today' | 'yesterday' | 'other'>('today');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
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
      status: 'confirmed', // Hoje por padrão é considerado pago/confirmado
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
  const accountId = watch('accountId');
  const categoryId = watch('categoryId');

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

      // Format initial display value
      const initialVal = editingTransaction ? Number(editingTransaction.value) : 0;
      setDisplayValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(initialVal));
    }
  }, [isOpen, editingTransaction, reset, initialValues]);

  // Sync recurrence mode with form
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
      // Se for parcelada, a 1ª parcela (hoje/data da compra) deve ser marcada como PAGA por padrão (regra de negócio)
      if (!editingTransaction) {
        setValue('status', 'confirmed');
        setIsStatusManuallyChanged(true); // Marca como manual para não ser sobrescrito pelo watcher de data
      }
    }
  }, [recurrenceMode, setValue, editingTransaction]);

  // Automação de Status baseada na Data
  const watchedDate = watch('date');
  useEffect(() => {
    // Apenas automatiza se não foi alterado manualmente pelo usuário neste "open" do modal
    if (!isStatusManuallyChanged && watchedDate) {
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })).toISOString().split('T')[0];
      if (watchedDate <= today) {
        setValue('status', 'confirmed');
      } else {
        setValue('status', 'forecast');
      }
    }
  }, [watchedDate, isStatusManuallyChanged, setValue]);

  const isIgnored = watch('isIgnored');

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

  const currencyPrefix = settings.currency === 'BRL' ? 'R$' : settings.currency === 'EUR' ? '€' : '$';

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Get digits only
    const digits = e.target.value.replace(/\D/g, "");

    // 2. Parse as integer (total cents)
    const totalCents = parseInt(digits || "0", 10);
    const numericValue = totalCents / 100;

    // 3. Format as pt-BR currency (0,00)
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);

    // 4. Update both form state and display state
    setDisplayValue(formatted);
    setValue('value', numericValue);
  };

  const finalizeSubmit = async (payload: any, stayOpen: boolean, forcedScope?: 'all' | 'single' | 'future') => {
    try {
      const numericValue = Number(payload.value) || 0;

      // Structure the data as expected by the Transaction interface
      const finalPayload: any = {
        ...payload,
        value: numericValue,
        description: payload.description || '',
        notes: payload.notes || ''
      };

      // Wrap recurrence data if applicable
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

      // Check if we need to ask for recurrence scope
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
        // Reset while preserving some context
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

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="mobills-modal shadow-premium" onClick={e => e.stopPropagation()}>
        <header className="mobills-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="modal-title">{editingTransaction ? 'Editar' : 'Nova'} {transactionType === 'expense' ? 'Despesa' : 'Receita'}</span>
            {editingTransaction?.isRecurring && editingTransaction?.recurrence?.installmentsCount && (
              <span style={{ fontSize: '10px', color: 'var(--sys-blue)', backgroundColor: 'var(--sys-bg-blue)', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                {FinancialEngine.getInstallmentText(editingTransaction, effectiveMonth)}
              </span>
            )}
          </div>
          <button className="close-x" onClick={onClose}><X size={18} /></button>
        </header>

        {showRecurrencePrompt && (
          <div className="recurrence-prompt-overlay animate-fade-in">
            <div className="recurrence-prompt-card">
              <div className="prompt-icon"><Repeat size={32} className="text-blue-500" /></div>
              <h3>Alterar transação repetida</h3>
              <p>Esta {transactionType === 'expense' ? 'despesa' : 'receita'} se repete. O que você deseja alterar?</p>

              <div className="prompt-options">
                <button
                  type="button"
                  className="prompt-opt-btn"
                  onClick={() => finalizeSubmit(pendingSubmitData?.payload, pendingSubmitData?.stayOpen || false, 'single')}
                >
                  <div className="opt-title">Apenas este mês</div>
                  <div className="opt-desc">Cria uma exceção apenas para {effectiveMonth}</div>
                </button>

                <button
                  type="button"
                  className="prompt-opt-btn primary"
                  onClick={() => finalizeSubmit(pendingSubmitData?.payload, pendingSubmitData?.stayOpen || false, 'future')}
                >
                  <div className="opt-title">Todas as pendentes</div>
                  <div className="opt-desc">Altera deste mês em diante (O que passou, passou)</div>
                </button>

                <button
                  type="button"
                  className="prompt-opt-btn"
                  onClick={() => finalizeSubmit(pendingSubmitData?.payload, pendingSubmitData?.stayOpen || false, 'all')}
                >
                  <div className="opt-title">Toda a série (Pendente + Passado)</div>
                  <div className="opt-desc">Altera todos os registros, incluindo os meses anteriores</div>
                </button>
              </div>

              <button type="button" className="prompt-cancel" onClick={() => setShowRecurrencePrompt(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(data => finalizeSubmit(data, false))} className="mobills-form">

          {/* Nova camada de seleção de tipo para transações novas */}
          {!editingTransaction && (
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setValue('type', 'expense')}
                style={{
                  flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                  fontSize: '13px', fontWeight: 700,
                  color: transactionType === 'expense' ? 'var(--sys-red)' : '#94a3b8',
                  borderBottom: transactionType === 'expense' ? '3px solid var(--sys-red)' : 'none',
                  cursor: 'pointer'
                }}
              >DESPESA</button>
              <button
                type="button"
                onClick={() => setValue('type', 'income')}
                style={{
                  flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                  fontSize: '13px', fontWeight: 700,
                  color: transactionType === 'income' ? 'var(--sys-green)' : '#94a3b8',
                  borderBottom: transactionType === 'income' ? '3px solid var(--sys-green)' : 'none',
                  cursor: 'pointer'
                }}
              >RECEITA</button>
              <button
                type="button"
                onClick={() => setValue('type', 'transfer')}
                style={{
                  flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                  fontSize: '13px', fontWeight: 700,
                  color: transactionType === 'transfer' ? 'var(--sys-blue)' : '#94a3b8',
                  borderBottom: transactionType === 'transfer' ? '3px solid var(--sys-blue)' : 'none',
                  cursor: 'pointer'
                }}
              >TRANSFERÊNCIA</button>
            </div>
          )}

          {/* Main Value Area */}
          <div className="mobills-hero" style={{ padding: '24px 20px' }}>
            <div className="value-container">
              <span className={`currency ${transactionType}`}>{currencyPrefix}</span>
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleValueChange}
                className={`value-input ${transactionType}`}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          <div className="mobills-fields-scroll">
            {/* Status Toggle (Paid/Pending) */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><CheckCircle2 size={18} opacity={0.5} /></div>
              <div className="field-content">
                <span className="field-label">{status === 'confirmed' ? (transactionType === 'expense' ? 'Paga' : 'Recebida') : (transactionType === 'expense' ? 'Não foi paga' : 'Não foi recebida')}</span>
                <button
                  type="button"
                  className={`mobills-toggle ${status === 'confirmed' ? 'active' : ''}`}
                  onClick={() => {
                    setValue('status', status === 'confirmed' ? 'forecast' : 'confirmed');
                    setIsStatusManuallyChanged(true);
                  }}
                >
                  <div className="toggle-dot"></div>
                </button>
              </div>
            </div>

            {/* Date Selection */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><Calendar size={18} opacity={0.5} /></div>
              <div className="field-content vertical">
                <div className="date-pills-mobills">
                  <button type="button" className={dateType === 'today' ? 'active' : ''} onClick={() => handleDateChange('today')}>Hoje</button>
                  <button type="button" className={dateType === 'yesterday' ? 'active' : ''} onClick={() => handleDateChange('yesterday')}>Ontem</button>
                  <button type="button" className={dateType === 'other' ? 'active' : ''} onClick={() => setDateType('other')}>Outros...</button>
                </div>
                {dateType === 'other' && (
                  <input type="date" {...register('date', { required: true })} className="mobills-input-minimal mt-2" />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><FileText size={18} opacity={0.5} /></div>
              <div className="field-content">
                <input type="text" {...register('description', { required: true })} className="mobills-input-minimal" placeholder="Descrição" />
              </div>
            </div>

            {/* Category */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><TagIcon size={18} opacity={0.5} /></div>
              <div className="field-content">
                <select {...register('categoryId', { required: true })} className="mobills-select-minimal">
                  <option value="">Selecione uma categoria</option>
                  {data.categories.filter(c => c.type === transactionType).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account (Origin) */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><Wallet size={18} opacity={0.5} /></div>
              <div className="field-content">
                <span className="field-label" style={{ fontSize: '11px', marginRight: '8px' }}>{transactionType === 'transfer' ? 'ORIGEM' : ''}</span>
                <select {...register('accountId', { required: true })} className="mobills-select-minimal">
                  {data.accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Account (Transfer only) */}
            {transactionType === 'transfer' && (
              <div className="mobills-field-row">
                <div className="field-icon-box"><ArrowRight size={18} opacity={0.5} /></div>
                <div className="field-content">
                  <span className="field-label" style={{ fontSize: '11px', marginRight: '8px' }}>DESTINO</span>
                  <select {...register('toAccountId', { required: transactionType === 'transfer' })} className="mobills-select-minimal">
                    <option value="">Selecione o destino</option>
                    {data.accounts.map(acc => (
                      <option key={acc.id} value={acc.id} disabled={acc.id === watch('accountId')}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Ignore Transaction (Moved outside details) */}
            <div className="mobills-field-row">
              <div className="field-icon-box"><EyeOff size={18} opacity={0.5} /></div>
              <div className="field-content">
                <div className="flex flex-col">
                  <span className="field-label">Ignorar transação</span>
                  <span className="text-[10px] text-gray-400">Não contabilizar nos gráficos</span>
                </div>
                <button
                  type="button"
                  className={`mobills-toggle ${isIgnored ? 'active' : ''}`}
                  onClick={() => setValue('isIgnored', !isIgnored)}
                >
                  <div className="toggle-dot"></div>
                </button>
              </div>
            </div>

            {/* Extras Toggle */}
            <div className="mobills-extras">
              <button
                type="button"
                className={`extra-btn ${showDetails ? 'active' : ''}`}
                onClick={() => setShowDetails(!showDetails)}
              >
                <Info size={14} /> Mais detalhes <ChevronDown size={14} style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
              </button>
            </div>

            {/* Details Section */}
            {showDetails && (
              <div className="mobills-details-expanded">
                {/* Recurrence Mode Selector */}
                <div className="mobills-field-row">
                  <div className="field-icon-box"><Repeat size={18} opacity={0.5} /></div>
                  <div className="field-content vertical">
                    <span className="field-label-small mb-2">Repetir esta {transactionType === 'expense' ? 'despesa' : 'receita'}?</span>
                    <div className="recurrence-pills">
                      <button
                        type="button"
                        className={recurrenceMode === 'fixed' ? 'active' : ''}
                        onClick={() => setRecurrenceMode(recurrenceMode === 'fixed' ? 'single' : 'fixed')}
                      >
                        Fixa
                      </button>
                      <button
                        type="button"
                        className={recurrenceMode === 'installments' ? 'active' : ''}
                        onClick={() => setRecurrenceMode(recurrenceMode === 'installments' ? 'single' : 'installments')}
                      >
                        Parcelada
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conditional Installments Fields */}
                {recurrenceMode === 'installments' && (
                  <div className="installments-group animate-fade-in">
                    <div className="mobills-field-row">
                      <div className="field-icon-box" style={{ opacity: 0 }}><Info size={18} /></div>
                      <div className="field-content gap-4">
                        <div className="flex-1">
                          <span className="field-label-small">Quantidade</span>
                          <input
                            type="number"
                            {...register('installmentsCount', { min: 1 })}
                            className="mobills-input-minimal bordered"
                            placeholder="Ex: 12"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="field-label-small">Frequência</span>
                          <select {...register('frequency')} className="mobills-select-minimal bordered">
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mobills-field-row">
                  <div className="field-icon-box"><FileText size={18} opacity={0.5} /></div>
                  <div className="field-content">
                    <textarea
                      {...register('notes')}
                      className="mobills-input-minimal no-resize"
                      placeholder="Observações..."
                      rows={2}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="mobills-footer">
            {!editingTransaction && (
              <button type="button" className="btn-text-only" onClick={handleSubmit(d => finalizeSubmit(d, true))}>
                SALVAR E CRIAR NOVA
              </button>
            )}
            <button type="submit" className={`btn-mobills-save ${transactionType}`}>
              SALVAR
            </button>
          </footer>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .mobills-modal { 
          width: 450px; 
          max-width: 95vw;
          max-height: 90vh; /* Prevent going off-screen */
          background: white; 
          border-radius: 24px; 
          overflow: hidden; 
          display: flex; 
          flex-direction: column; 
          animation: mobillsSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid #eee;
        }
        @keyframes mobillsSlideIn {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .mobills-modal-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
        .modal-title { font-weight: 700; color: #333; font-size: 16px; }
        .close-x { color: #999; cursor: pointer; background: transparent; }

        .mobills-form { 
          display: flex; 
          flex-direction: column; 
          flex: 1; 
          min-height: 0; /* Critical for inner scrolling */
        }
        .mobills-hero { padding: 32px 20px; text-align: center; }
        .value-container { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .currency { font-size: 24px; font-weight: 700; }
        .currency.expense { color: var(--mobills-red); }
        .currency.income { color: var(--mobills-green); }
        .value-input { 
          border: none; outline: none; background: transparent; 
          font-size: 32px; font-weight: 800; width: 200px; text-align: left;
          font-family: var(--font-display);
        }
        .value-input.expense { color: var(--mobills-red); }
        .value-input.income { color: var(--mobills-green); }

        .mobills-fields-scroll { 
          padding: 0 24px 24px 24px; 
          display: flex; 
          flex-direction: column; 
          gap: 4px;
          overflow-y: auto; /* Enable scrolling for fields */
          flex: 1;
        }
        .mobills-field-row { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          padding: 14px 0;
          border-bottom: 1px solid #f8f8f8;
        }
        .field-icon-box { width: 24px; display: flex; justify-content: center; color: #555; }
        .field-content { flex: 1; display: flex; align-items: center; justify-content: space-between; }
        .field-content.vertical { flex-direction: column; align-items: flex-start; }
        .field-label { font-size: 14px; color: #666; font-weight: 500; }

        .mobills-toggle { 
          width: 40px; height: 20px; background: #ddd; border-radius: 10px; 
          position: relative; transition: 0.3s; cursor: pointer; border: none;
        }
        .mobills-toggle.active { background: var(--mobills-green); }
        .toggle-dot { 
          width: 16px; height: 16px; background: white; border-radius: 50%; 
          position: absolute; top: 2px; left: 2px; transition: 0.3s;
        }
        .active .toggle-dot { left: 22px; }

        .date-pills-mobills { display: flex; gap: 8px; }
        .date-pills-mobills button { 
          padding: 4px 12px; border-radius: 20px; border: 1px solid #ddd; 
          font-size: 11px; font-weight: 600; color: #777; background: white; cursor: pointer;
        }
        .date-pills-mobills button.active { background: var(--mobills-red); color: white; border-color: var(--mobills-red); }

        .mobills-input-minimal, .mobills-select-minimal { 
          width: 100%; border: none; outline: none; background: transparent; 
          font-size: 14px; color: #333; padding: 4px 0;
        }
        .mobills-select-minimal { cursor: pointer; }

        .mobills-extras { padding-top: 12px; display: flex; justify-content: flex-end; }
        .extra-btn { 
          display: flex; align-items: center; gap: 4px; border: none; background: transparent;
          color: #333; font-weight: 700; font-size: 12px; cursor: pointer;
          opacity: 0.6; transition: 0.3s;
        }
        .extra-btn:hover, .extra-btn.active { opacity: 1; color: var(--mobills-red); }

        .mobills-details-expanded { 
          background: #fff; /* Solid white instead of gray */
          border: 1px solid #f0f0f0;
          border-radius: 16px; 
          margin-top: 12px; 
          padding: 4px 12px;
          animation: slideDownIn 0.3s ease-out;
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .field-label-small { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
        
        .recurrence-pills { display: flex; gap: 6px; }
        .recurrence-pills button { 
          flex: 1; padding: 6px; border-radius: 8px; border: 1px solid #ddd;
          font-size: 11px; font-weight: 600; background: white; color: #666; cursor: pointer;
        }
        .recurrence-pills button.active { 
          background: var(--mobills-red); color: white; border-color: var(--mobills-red);
          box-shadow: 0 2px 8px rgba(255, 77, 77, 0.2);
        }

        .mobills-input-minimal.bordered, .mobills-select-minimal.bordered {
          border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; margin-top: 4px; background: white;
        }
        .no-resize { resize: none; }
        .gap-4 { gap: 16px; }
        .flex-1 { flex: 1; }
        .mb-2 { margin-bottom: 8px; }

        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .text-\[10px\] { font-size: 10px; }
        .text-gray-400 { color: #9ca3af; }

        .mobills-footer { 
          padding: 20px 24px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          background: white; /* Solid white */
          border-top: 1px solid #f0f0f0;
        }
        .btn-text-only { font-size: 12px; font-weight: 700; color: var(--mobills-red); background: transparent; border: none; cursor: pointer; }
        .btn-mobills-save { 
          padding: 10px 32px; border-radius: 24px; color: white; border: none; 
          font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 77, 77, 0.3);
        }
        .btn-mobills-save.expense { background: var(--mobills-red); }
        .btn-mobills-save.income { background: var(--mobills-green); box-shadow: 0 4px 12px rgba(63, 185, 80, 0.3); }

        .modal-overlay { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); 
          display: flex; align-items: center; justify-content: center; z-index: 100000;
        }
        
        .recurrence-prompt-overlay {
          position: absolute; inset: 0; background: rgba(255,255,255,0.95);
          display: flex; align-items: center; justify-content: center; z-index: 10;
          padding: 24px; border-radius: 20px;
        }
        .recurrence-prompt-card { text-align: center; max-width: 320px; }
        .prompt-icon { margin-bottom: 16px; display: flex; justify-content: center; color: var(--mobills-red); }
        .recurrence-prompt-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #333; }
        .recurrence-prompt-card p { font-size: 14px; color: #666; margin-bottom: 24px; line-height: 1.4; }
        
        .prompt-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .prompt-opt-btn { 
          padding: 12px; border-radius: 12px; border: 1px solid #ddd; background: white;
          text-align: left; cursor: pointer; transition: 0.2s;
        }
        .prompt-opt-btn:hover { border-color: var(--mobills-red); background: #fff5f5; }
        .prompt-opt-btn.primary { border-color: var(--mobills-red); }
        .opt-title { font-weight: 700; font-size: 14px; color: #333; }
        .opt-desc { font-size: 11px; color: #888; margin-top: 2px; }
        
        .prompt-cancel { background: transparent; border: none; font-size: 13px; font-weight: 600; color: #999; cursor: pointer; }

        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}} />
    </div>,
    document.body
  );
};

export default TransactionModal;
