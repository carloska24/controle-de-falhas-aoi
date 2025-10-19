# Backup e Restauração do banco `aoi.db`

Este arquivo descreve como restaurar o banco de dados SQLite (`aoi.db`) que foi compactado em `aoi-db-backup.zip` e transferido para outro computador.

> Observação: o repositório normalmente não deve versionar arquivos de banco SQLite. O arquivo ZIP foi criado manualmente para facilitar a cópia entre máquinas.

## 1) Transferir o ZIP para o outro computador

- Copie `aoi-db-backup.zip` para o outro computador via OneDrive, pendrive, scp, etc.
- Coloque o arquivo em algum local temporário, por exemplo `C:\temp`.

## 2) Parar o servidor antes de restaurar

No computador de destino pare o servidor do backend (se estiver rodando):

- Se estiver usando `npm run dev` em um terminal, pressione `Ctrl+C` nesse terminal.

## 3) Restaurar os arquivos (PowerShell)

Abra o PowerShell dentro da pasta do repositório clonado (ex.: `C:\projetos\controle-de-falhas-aoi`) e execute:

```powershell
cd 'C:\caminho\para\controle-de-falhas-aoi'
# descompacta o conteúdo do ZIP na raiz do repositório (substitui se existir)
Expand-Archive -Path 'C:\onde\vc\salvou\aoi-db-backup.zip' -DestinationPath . -Force

# verificar os arquivos restaurados
Get-ChildItem .\backend\aoi.db* | Format-List Name,Length,LastWriteTime
```

Isso colocará os arquivos `backend\aoi.db` (e, se presentes, `backend\aoi.db-wal` e `backend\aoi.db-shm`) na pasta `backend` do projeto.

## 4) Reiniciar o servidor

Depois de sobrescrever o arquivo do banco, inicie novamente o backend:

```powershell
cd .\backend
npm install   # se ainda não instalou dependências
npm run dev
```

## 5) Dicas e notas importantes

- Sempre pare o servidor antes de substituir o arquivo `aoi.db`. Substituir com o processo de DB aberto pode corromper o arquivo ou causar erros.
- Se você prefere não parar o servidor, pode gerar uma cópia consistente localmente com `sqlite3`:

```powershell
# cria uma cópia consistente mesmo se o DB estiver ocupando WAL
cd .\backend
sqlite3 .\aoi.db "VACUUM INTO 'aoi.db.copy';"
# ou
sqlite3 .\aoi.db ".backup 'aoi.db.copy'"
# depois compacte/transfera 'aoi.db.copy'
```

- Evite commitar o arquivo `aoi.db` no repositório. Prefira manter backups externos.

## 6) Restaurando a partir de arquivos separados (se o ZIP contiver wal/shm)

Se o ZIP contiver também `aoi.db-wal` e `aoi.db-shm`, ao extrair para `backend\` estes arquivos devem acompanhar `aoi.db`. Novamente: pare o servidor antes de trocar os arquivos.

## 7) Perguntas frequentes

- "Posso simplesmente copiar `aoi.db` por rede enquanto o servidor estiver rodando?"
  - Não recomendado. Pare o servidor ou use `VACUUM INTO` / `.backup` para obter uma cópia consistente.

- "O que faço se o backend não iniciar após a restauração?"
  - Verifique permissões do arquivo (`aoi.db`) e se a versão do Node e dependências estão corretas.
  - Veja logs no terminal onde executou `npm run dev`.

---

Se quiser, posso também adicionar instruções para Linux/macOS, ou incluir um script PowerShell `restore-db.ps1` que automatize a descompactação e verificação — quer que eu gere isso também?