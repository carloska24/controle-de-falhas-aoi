Instalação do serviço Windows (NSSM) para 'aoi-backend'

Objetivo: registrar o backend como serviço Windows que inicia com o sistema e reinicia automaticamente em caso de crash.

Pré-requisitos:
- `nssm.exe` já presente em `C:\nssm\win64` (já verificado).
- PowerShell em modo Administrador para instalar o serviço.
- `node.exe` instalado (geralmente em `C:\Program Files\nodejs\node.exe`).

Passos (executar como Administrador):

1) Abra PowerShell como Administrador
2) Rode o script de instalação que já está no repositório:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\install-nssm.ps1" install
   ```
3) Verifique o status do serviço:
   ```powershell
   Get-Service -Name aoi-backend
   ```
4) Logs do serviço (em caso de SILENCE_LOGS=true, procure por console.info/console.error):
   ```powershell
   Get-Content "C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend\nssm-stdout.log" -Tail 200
   Get-Content "C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend\nssm-stderr.log" -Tail 200
   ```

Remoção do serviço (executar como Administrador):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\install-nssm.ps1" uninstall
```

Opção alternativa (pm2):
- Se preferir pm2, execute (como Admin recomendado):
  ```powershell
  npm install -g pm2
  cd backend
  pm2 start ecosystem.config.js --env development
  pm2 save
  ```

Se quiser, eu mesmo executo (A) instalação com NSSM (precisa que você abra um PowerShell como Administrador) ou (B) instalo e configuro pm2 agora (não precisa de Admin para pm2 install -g? na maioria dos casos precisa). Diga qual opção prefere e eu procedo.
