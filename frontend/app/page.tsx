'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para login se não estiver autenticado
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }

    let parsedUser: { role?: string };
    try {
      parsedUser = JSON.parse(user);
    } catch {
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    // Redireciona baseado no role (igual ao comportamento original)
    switch (parsedUser.role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'reparo':
        router.push('/reparo');
        break;
      case 'qualidade':
        router.push('/relatorios/qualidade');
        break;
      case 'almoxarifado':
        router.push('/almoxarifado');
        break;
      case 'lider_smt':
        router.push('/smt/conferencia');
        break;
      case 'operator':
      default:
        // Página principal do operador
        router.push('/operador');
        break;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55e] mx-auto mb-4"></div>
        <p className="text-[#94a3b8]">Carregando...</p>
      </div>
    </div>
  );
}
