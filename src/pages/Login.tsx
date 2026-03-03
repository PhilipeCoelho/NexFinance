import React, { useState } from 'react';
import { useFinanceStore } from '@/hooks/use-store';
import {
  TrendingUp,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

const Login: React.FC = () => {
  const { signIn, signUp } = useFinanceStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        setSuccess(true);
        // Supabase auto-signs in or sends verification
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Verifique os seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
      <style>{`
        .login-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-header {
          padding: 40px 40px 20px;
          text-align: center;
        }
        .logo-box {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
        }
        .login-body {
          padding: 0 40px 40px;
        }
        .input-group {
          margin-bottom: 20px;
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          transition: 0.3s;
        }
        .login-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          font-size: 15px;
          transition: all 0.3s;
          background: #fcfdfe;
        }
        .login-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          outline: none;
          background: white;
        }
        .login-input:focus + .input-icon {
          color: #3b82f6;
        }
        .btn-login {
          width: 100%;
          padding: 14px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 14px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        .btn-login:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.15);
        }
        .btn-login:active {
          transform: translateY(0);
        }
        .btn-login:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
        .toggle-mode {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          color: #64748b;
        }
        .toggle-link {
          color: #2563eb;
          font-weight: 700;
          cursor: pointer;
          margin-left: 5px;
        }
        .toggle-link:hover {
          text-decoration: underline;
        }
        .error-msg {
          background: #fef2f2;
          color: #b91c1c;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 4px solid #ef4444;
        }
        .success-msg {
          background: #f0fdf4;
          color: #15803d;
          padding: 30px 20px;
          border-radius: 20px;
          text-align: center;
          border: 1px solid #bbf7d0;
          animation: zoomIn 0.4s ease-out;
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .success-msg h3 {
          font-weight: 800;
          color: #166534;
          margin-top: 10px;
        }
        .success-msg p {
          color: #15803d;
          font-size: 14px;
          line-height: 1.6;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 30px;
        }
        .feature-item {
          padding: 10px;
          border-radius: 12px;
          background: #f1f5f9;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-box">
            <TrendingUp size={30} color="white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1e293b] mb-1">NexFinance</h1>
          <p className="text-[#64748b] text-sm">Controle financeiro inteligente</p>
        </div>

        <div className="login-body">
          {success ? (
            <div className="success-msg animate-fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl mb-2">Verifique o seu e-mail</h3>
              <p className="mb-8">
                Enviámos um link de confirmação para <strong>{email}</strong>. <br />
                Por favor, valide o seu e-mail para ativar o seu acesso ao NexFinance.
              </p>
              <button
                className="btn-login"
                onClick={() => { setIsSignUp(false); setSuccess(false); }}
              >
                VOLTAR PARA O LOGIN
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="feature-grid">
                <div className="feature-item"><Zap size={14} className="text-blue-500" /> Rápido</div>
                <div className="feature-item"><ShieldCheck size={14} className="text-blue-500" /> Seguro</div>
              </div>

              {error && (
                <div className="error-msg">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="input-group">
                <input
                  type="email"
                  className="login-input"
                  placeholder="Seu e-mail"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail size={18} className="input-icon" />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  className="login-input"
                  placeholder="Sua senha"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={18} className="input-icon" />
              </div>

              <button className="btn-login" disabled={loading}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isSignUp ? 'CRIAR CONTA' : 'ENTRAR'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="toggle-mode">
                {isSignUp ? (
                  <>Já tem uma conta? <span className="toggle-link" onClick={() => setIsSignUp(false)}>Entrar</span></>
                ) : (
                  <>Ainda não tem conta? <span className="toggle-link" onClick={() => setIsSignUp(true)}>Criar agora</span></>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
