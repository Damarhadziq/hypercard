import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@pokemon-finance/ui';
import { Eye, EyeOff } from 'lucide-react';
import type { AdminUser } from '../store/useStore';
import { useSignIn } from '../hooks/useApiQueries';

export type Session = Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>;

interface LoginProps {
  onLogin: (session: Session) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    try {
      const session = await signIn.mutateAsync({ email: normalizedEmail, password });
      setError('');
      onLogin(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Email atau password tidak sesuai.';
      setError(message === 'Failed to fetch'
        ? 'Server API tidak bisa dijangkau. Pastikan backend dan database sedang berjalan.'
        : message);
    }
  };

  return (
    <main className="premium-dark relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050506] px-4 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      <Card className="animate-soft-in w-full max-w-sm border-accent/25 bg-[#0c0c0f] shadow-xl shadow-black/40">
        <CardHeader className="space-y-3 pb-4 text-center">
          <div className="mx-auto flex h-24 w-28 items-center justify-center">
            <img src="/hypercard-logo.png" alt="Hypercard" className="h-full w-full object-contain" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Hypercard Admin</CardTitle>
            <p className="mt-1 text-sm text-finance-500">Masuk dengan akun yang terdaftar</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="login-email">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@hypercard.local"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md p-0 text-finance-400 transition-colors hover:text-finance-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <EyeOff className="block h-[18px] w-[18px]" strokeWidth={2.2} />
                  ) : (
                    <Eye className="block h-[18px] w-[18px]" strokeWidth={2.2} />
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm font-medium text-primary">{error}</p>}

            <Button type="submit" className="w-full" disabled={signIn.isPending}>
              {signIn.isPending ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
