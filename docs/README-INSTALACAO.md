# 📦 Instalação Rápida - Controle de Falhas AOI

## 🚀 Para Novo PC (Método Rápido)

### Passo 1: Instalar Node.js
1. Baixe Node.js 18+ LTS: https://nodejs.org/
2. Instale normalmente (npm vem junto)
3. Reinicie o terminal

### Passo 2: Copiar Projeto
- Copie toda a pasta `controle-de-falhas-aoi` para o novo PC
- (via pendrive, OneDrive, Git, etc.)

### Passo 3: Executar Instalação
```batch
INSTALAR-TUDO.bat
```

O script fará tudo automaticamente:
- ✅ Verifica Node.js
- ✅ Instala dependências do backend
- ✅ Instala dependências do frontend (Next.js 16.0.1)
- ✅ Configura arquivo .env

### Passo 4: Iniciar Servidores
```batch
INICIAR-AMBOS-SERVIDORES.bat
```

Pronto! Acesse: http://localhost:3000/index

---

## 📋 Requisitos

- **Node.js:** 18 ou superior
- **npm:** Vem com Node.js
- **Windows:** 10/11
- **Espaço em disco:** ~500 MB (com node_modules)

---

## 🔍 Verificar Instalação

```powershell
# Node.js
node --version    # Deve mostrar v18.x.x+

# Backend
cd backend
npm list express  # Deve mostrar express@5.1.0

# Frontend
cd ../nextjs-frontend
npm list next     # Deve mostrar next@16.0.1
```

---

## ❓ Problemas?

Veja: `GUIA-RAPIDO-NOVO-PC.md`

---

**Versão do projeto:** Next.js 16.0.1 + Express 5.1.0  
**Última atualização:** Janeiro 2025

