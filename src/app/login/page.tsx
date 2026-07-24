'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Senha incorreta. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f7f8fa', fontFamily: 'Nunito, sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        boxShadow: '0 4px 32px rgba(0,184,173,0.1)', border: '1.5px solid #e2eaea',
        width: '100%', maxWidth: 380, textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, background: '#00B8AD', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 28, fontWeight: 900, color: '#fff',
          boxShadow: '0 4px 16px rgba(0,184,173,0.3)'
        }}>L</div>

        <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0d1f1f', marginBottom: 6 }}>
          Layers Education
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#6b8787', fontWeight: 600, marginBottom: 32 }}>
          Report Comercial · Acesso Restrito
        </p>

        <form onSubmit={handleSubmit}>
          <input
            id="password-input"
            type="password"
            placeholder="Digite a senha de acesso"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 10,
              border: `1.5px solid ${error ? '#F07070' : '#e2eaea'}`,
              fontSize: '0.95rem', fontFamily: 'Nunito, sans-serif',
              fontWeight: 600, outline: 'none', marginBottom: 12,
              color: '#0d1f1f', background: '#f7f8fa'
            }}
          />

          {error && (
            <p style={{ color: '#F07070', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '13px', background: '#00B8AD',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif', opacity: loading || !password ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(0,184,173,0.25)', transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Entrando...' : 'Acessar Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
