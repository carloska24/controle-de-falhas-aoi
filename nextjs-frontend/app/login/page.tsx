import { Metadata } from 'next';
import LoginForm from './LoginForm';
import SMDAnimation from './SMDAnimation';

export const metadata: Metadata = {
  title: 'Login - Controle de Falhas AOI',
  description: 'Acesse o sistema de controle de falhas AOI da CADService Produtos Eletrônicos',
  robots: 'noindex, nofollow',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient - precisa estar atrás dos componentes */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-20" />
      {/* Componentes SMD - entre background e formulário */}
      <SMDAnimation />
      {/* Formulário - acima de tudo */}
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
