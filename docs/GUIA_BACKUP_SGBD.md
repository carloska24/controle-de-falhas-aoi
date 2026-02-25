# Guia de Práticas de Gestão e Backup do PostgreSQL

Por migrarmos de um arquivo singelo (`aoi.db` do SQLite) para um Banco de Dados Profissional (PostgreSQL), os Backups não consistem mais em "copiar um arquivo" da pasta. Requer uma operação lógica para gerar Dumps blindados.

Este guia é para você e sua TI dormirem tranquilos, garantindo 0% chance de perder rastreabilidade das produções SMT caso as máquinas servidoras colapsem.

## 1. A Regra 3-2-1 dos Backups Básicos

Para mitigar o pesadelo de Ransomware (Vírus de Criptografia), adotem na empresa:

- **3 Cópias** dos Dados: 1 Original (O DB em si) + 2 Backups diários.
- **2 Mídias Diferentes**: Salve o dump na máquina local, mas faça que o outro seja em HD Externo, na Nuvem (Drive) ou em outra unidade mapeada (Network Folder).
- **1 Off-site**: Ideal que 1 delas esteja protegida fora da corporação fisicamente.

## 2. Abordagem de Backup Manual

Se você precisar extrair uma versão imediatamente antes de aplicar um upgrade ou script perigoso, basta usar o executável de linha de comando (`pg_dump`) já embutido ao instalar o postgres.

Abra um prompt de comando (No caminho do PostgreSQL ou ponha ele no PATH do Windows)

```bash
pg_dump -U postgres -F t aoi_db > "C:\Meus_Backups\backup_aoi.tar"
```

_(`-F t`) sinaliza um formato Tar customizado limpo. E caso você prefira o bom e velho SQL em raw-text que você consegue abrir num bloco de notas:_

```bash
pg_dump -U postgres aoi_db > "C:\Meus_Backups\backup_aoi.sql"
```

## 3. Script Simplificado de Automático (BASH/Powershell) Diário

Não confie no humano para lembrar de fazer backup. Ele vai se distrair. Crie uma **Tarefa Agendada (Task Scheduler)** no Windows rodando um script PowerShell simples (`.ps1`) para gerar os dumps nomeados com datas (Evitando reescrever os arquivos diários).

Sugestão robusta de Script (`fazer_backup_diario.ps1`):

```powershell
$DataDeHoje = Get-Date -Format "yyyy-MM-dd_HH-mm"
$DiretorioDestino = "D:\Backups_Sistemas\AOI\"  # Ou caminho de Rede //Servidor-FS/Backups/
$NomeDoFile = "AOI_DB_$DataDeHoje.backup"
$CaminhoCompleto = Join-Path -Path $DiretorioDestino -ChildPath $NomeDoFile

# O PgPass evita a digitação de senha na automação
$env:PGPASSWORD="SuaSenha_postgres123"

Write-Host "Iniciando Dump das OMs do AOI Database..."
# Se não estiver no path global do sistema, escreva o caminho inteiro pro pg_dump.exe
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -F c -b -v -f $CaminhoCompleto aoi_db

Write-Host "Realizado com Sucesso!"
```

Configure ele no `Agendador de Tarefas` (Taskschd.msc) do Windows para rodar todo dia à meia noite como Administrador, na mesma máquina física, apontando esse `.backup` para uma nuvem rodando Google Drive.

## 4. Retenção Local

Uma das questões é lotar o HD com anos de Backups diários.
Opcionalmente, pode criar um segundo passo nas tarefas agendadas limitando histórico a "Limpar backups de extensão `.backup` que tenham mais de `90 dias` de idade modificada", sendo os vitais de arquivo infinito enviados anualmente para a Nuvem de compliance.

## 5. Como Restauro Meu Banco Morto?

Caso um dia terrível chegue, para pegar um de seus scripts passados (.backup customizado no passo da automação e desempacotar as OMs devolta na tela do PostgreSQL vazio):

1. Destrua e recrie um Banco "aoi_db" novo através de uma interface ou terminal.
2. Rode o comando de Restore (Mude o caminho para sua data):
   ```bash
   pg_restore -U postgres -d aoi_db -v "D:\Backups_Sistemas\AOI\AOI_DB_2026-05-18_01-00.backup"
   ```
3. Suas interfaces Node e Next se comunicarão instantaneamente e estarão no lugar exato do dia 18 sem travar.
