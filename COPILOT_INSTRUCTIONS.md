# Copilot / Instrutor Automático — Como abrir este projeto e o que executar

Este arquivo descreve passo a passo o que o Copilot (ou um novo desenvolvedor) deve executar ao abrir o projeto clonado em um novo computador Windows.

1) Objetivo

- Deixar o ambiente idêntico ao host original (copiar banco `aoi.db`, instalar dependências e iniciar o servidor de desenvolvimento).

2) Pré-requisitos

- Windows PowerShell
- Node.js instalado (recomendado v16+)
- Git (para clonar o projeto)
- (Opcional) SQLite CLI (`sqlite3`) se quiser criar dumps consistentes sem parar o servidor

3) Passos automáticos (recomendado)

- Após clonar o repositório e checar a branch desejada, executar o script único que automatiza os passos:

```powershell
cd .\controle-de-falhas-aoi
# Se você tem o zip do banco, passe o caminho via -RestoreZipPath
.\scripts\setup_and_run.ps1 -RestoreZipPath 'C:\caminho\para\aoi-db-backup.zip'
# ou sem restore:
.\scripts\setup_and_run.ps1
```

O script fará:
- Verificação do Node
- Instalação das dependências do backend (npm install)
- (Opcional) Restauração do banco a partir do ZIP fornecido usando `scripts/restore-db.ps1`
- Início do backend (`npm run dev`) em background

4) Passos manuais (se preferir)

- Clonar e mudar para a branch correta:
```powershell
git clone https://github.com/carloska24/controle-de-falhas-aoi.git
cd .\controle-de-falhas-aoi
git checkout feat/ui/buttons-tailwind
```

- Restaurar DB (se tiver `aoi-db-backup.zip`):
```powershell
Expand-Archive -Path 'C:\onde\vc\salvou\aoi-db-backup.zip' -DestinationPath . -Force
```

- Instalar dependências do backend e iniciar:
```powershell
cd .\backend
npm install
npm run dev
```

5) Observações para o Copilot (ou assistente automatizado)

- Verificar se existe `aoi-db-backup.zip` na raiz do projeto e, se existir, sugerir ao usuário restaurar com `scripts/restore-db.ps1` antes de iniciar o servidor.
- Recomendar parar processos Node atuais antes de sobrescrever o DB (o script `restore-db.ps1` verifica isso e aborta se detectar `node.exe` rodando).
- Se detectar problemas com caminhos longos em Windows ao clonar, sugerir clonar em um caminho curto ou usar `git config core.longpaths true`.

6) Problemas conhecidos

- Se o DB estiver sendo usado, o script de restauração abortará com código 2 e mensagem para parar o servidor.
- Em ambientes sem PowerShell (Linux/Mac), adapte os comandos para `bash` (posso gerar uma versão `restore-db.sh` se desejar).

7) Contatos / próximos passos

- Se quiser, posso:
  - Gerar equivalentes em Bash (restore-db.sh + setup_and_run.sh)
  - Publicar instruções no README principal ou na Wiki
  - Automatizar a criação do ZIP via CI (por exemplo, GitHub Actions) e disponibilizar como artefato

---

Pronto para rodar: o `scripts/setup_and_run.ps1` e `scripts/restore-db.ps1` já foram adicionados ao repositório e comitados. Use-os quando for clonar para outro PC.