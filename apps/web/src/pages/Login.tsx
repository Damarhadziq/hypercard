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

  const renderLoginForm = (idPrefix: string) => (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white" htmlFor={`${idPrefix}-email`}>
          Email
        </label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="superadmin@hypercard.com"
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-white" htmlFor={`${idPrefix}-password`}>
          Password
        </label>
        <div className="relative">
          <Input
            id={`${idPrefix}-password`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password"
            autoComplete="current-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md p-0 text-finance-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
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
  );

  return (
    <main className="premium-dark relative min-h-screen overflow-hidden bg-[#050506] text-white">
      <section className="relative flex min-h-screen items-center justify-center px-4 sm:hidden">
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
          <CardContent>{renderLoginForm('mobile-login')}</CardContent>
        </Card>
      </section>

      <section className="hidden min-h-screen grid-cols-[minmax(270px,38%)_1fr] gap-4 py-4 pl-6 pr-4 sm:grid lg:grid-cols-[30%_1fr] lg:gap-8 lg:pl-20">
        <div className="relative flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <img
            src="/login-hypercard-bg.png"
            alt=""
            className="pointer-events-none absolute -left-24 top-[14%] h-[540px] w-auto max-w-none opacity-[0.16]"
          />

          <div className="font-brand relative z-10 pt-8 text-2xl font-semibold">Hypercard</div>

          <div className="relative z-10 mt-auto w-full max-w-[360px] pb-[18vh]">
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back, King</h1>
            <p className="mt-3 max-w-[320px] text-sm leading-6 text-finance-400">
              Track sales, manage inventory, and monitor your Pokemon card collection in one place.
            </p>

            <div className="mt-10">{renderLoginForm('desktop-login')}</div>
          </div>

          <p className="relative z-10 mt-auto pb-5 text-xs text-white/80">© 2026 dmrhdz.iq</p>
        </div>

        <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-accent/25 bg-[#090908] shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
          <img src="/login-abstract.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

          <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-2 pr-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex -space-x-3">
              {['/avatar-1.png', '/avatar-2.png', '/avatar-3.png', '/avatar-4.png'].map((avatar, index) => (
                <img
                  key={avatar}
                  src={avatar}
                  alt=""
                  className="h-10 w-10 rounded-full border border-white object-cover shadow-md"
                  style={{ transform: `translateY(${index % 2 === 0 ? 0 : 1}px)` }}
                />
              ))}
            </div>
            <span className="text-lg font-semibold text-white">100+ Customer</span>
          </div>

          <p className="absolute bottom-9 right-8 text-[24px] font-semibold text-white">
            Pokemon Trading Card
          </p>
        </div>
      </section>
    </main>
  );
}
