$backend = "C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend"
Set-Location $backend

Write-Output "Working dir: $pwd"

# 1) checa health
Try {
    $h = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3
    $h | ConvertTo-Json -Depth 2 | Out-File health.json
    Write-Output "HEALTH_OK"
} Catch {
    Write-Output "HEALTH_ERR: $($_.Exception.Message)"
    $h = $null
}

# 2) se não respondeu, inicia o backend em background
if (-not $h) {
    Write-Output "Starting backend with npm run dev..."
    Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $backend -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Try {
        $h = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5
        $h | ConvertTo-Json -Depth 2 | Out-File health.json
        Write-Output "HEALTH_OK_AFTER_START"
    } Catch {
        Write-Output "HEALTH_ERR_AFTER_START: $($_.Exception.Message)"
    }
}

# 3) tenta login com DevAdmin (credenciais padrão em dev) usando WebRequestSession para manter cookies
Try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $body = @{ username = 'DevAdmin'; password = '123456' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method Post -ContentType 'application/json' -Body $body -WebSession $session -TimeoutSec 8
    $login | ConvertTo-Json -Depth 2 | Out-File login.json
    Write-Output "LOGIN_OK"
} Catch {
    Write-Output "LOGIN_ERR: $($_.Exception.Message)"
}

# 4) se obteve sessão/cookie, chama endpoint para exportar sqlite (admin-only)
if (Test-Path login.json) {
    # O WebRequestSession mantém cookies automaticamente; apenas reutilizamos a mesma sessão
    $out = Join-Path $backend ("aoi-download-" + (Get-Date -Format yyyyMMddHHmmss) + ".db")
    Try {
        Invoke-RestMethod -Uri http://localhost:3001/api/admin/export-sqlite -WebSession $session -OutFile $out -TimeoutSec 120
        Write-Output ("EXPORT_DONE: " + $out)
    } Catch {
        Write-Output "EXPORT_ERR: $($_.Exception.Message)"
    }
} else {
    Write-Output "NO_LOGIN_JSON"
}

# 5) fallback: executar npm run export:sqlite localmente
Try {
    Write-Output "Running fallback export script..."
    npm --prefix $backend run export:sqlite
} Catch {
    Write-Output "EXPORT_SCRIPT_ERR"
}
