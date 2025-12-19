/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para permitir comunicação com backend Express
  // Em desenvolvimento, usa rewrite. Em produção/intranet, usa variável de ambiente
  async rewrites() {
    // Só funciona em desenvolvimento (next dev)
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ];
    }
    // Em produção, não usa rewrite (usa variável de ambiente NEXT_PUBLIC_API_URL)
    return [];
  },
};

module.exports = nextConfig;
