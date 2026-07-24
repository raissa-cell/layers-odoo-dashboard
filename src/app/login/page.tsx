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
      background: '#F4F6F8', fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px',
        boxShadow: '0 4px 16px rgba(0, 166, 156, 0.08)', border: '1.5px solid #e2eaea',
        width: '100%', maxWidth: 380, textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#00a69c" />
            <path d="M14 12V28H28V24H18.5V12H14Z" fill="white" />
          </svg>
        </div>

        <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#434e5b', marginBottom: 6 }}>
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
              border: `1.5px solid ${error ? '#ed6b4f' : '#e2eaea'}`,
              fontSize: '0.95rem', fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontWeight: 600, outline: 'none', marginBottom: 12,
              color: '#434e5b', background: '#F4F6F8'
            }}
          />

          {error && (
            <p style={{ color: '#ed6b4f', fontSize: '0.78rem', fontWeight: 700, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button
            id="login-btn"
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '13px', background: '#00a69c',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif", opacity: loading || !password ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(0, 166, 156, 0.25)', transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Entrando...' : 'Acessar Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
