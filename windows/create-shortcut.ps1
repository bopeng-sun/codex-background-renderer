param([string]$Destination)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    $projectRoot = Split-Path -Parent $PSScriptRoot
    if (-not $Destination) { $Destination = Join-Path $projectRoot 'Codex - Custom Background.lnk' }
    $launcherFiles = @(Get-ChildItem -LiteralPath $projectRoot -Filter '*Codex-Win11.cmd' -File)
    if ($launcherFiles.Count -ne 1) { throw 'Could not identify the Windows Codex launcher.' }
    $commandInterpreter = Join-Path $env:SystemRoot 'System32\cmd.exe'
    $shortcutArguments = '/d /s /c ""' + $launcherFiles[0].FullName + '""'
    $shell = New-Object -ComObject WScript.Shell
    if (Test-Path -LiteralPath $Destination) {
        $existingShortcut = $shell.CreateShortcut($Destination)
        if ($existingShortcut.TargetPath -ne $commandInterpreter -or $existingShortcut.Arguments -ne $shortcutArguments) {
            throw 'A different shortcut already exists at the destination. Choose another path.'
        }
    }
    $shortcut = $shell.CreateShortcut($Destination)
    $shortcut.TargetPath = $commandInterpreter
    $shortcut.Arguments = $shortcutArguments
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = 'Open installed Codex with the experimental custom background launcher'
    $shortcut.WindowStyle = 1
    $candidates = & (Join-Path $PSScriptRoot 'platform.ps1') -Action Discover | ConvertFrom-Json
    foreach ($candidate in $candidates) {
        if (-not $candidate.executable) { continue }
        $iconPath = Join-Path (Split-Path -Parent $candidate.executable) 'resources\icon-chatgpt.ico'
        if (Test-Path -LiteralPath $iconPath -PathType Leaf) {
            $shortcut.IconLocation = $iconPath + ',0'
            break
        }
    }
    $shortcut.Save()
    $verifiedShortcut = $shell.CreateShortcut($Destination)
    if ($verifiedShortcut.TargetPath -ne $commandInterpreter -or $verifiedShortcut.Arguments -ne $shortcutArguments) {
        throw 'Shortcut verification failed.'
    }
    Write-Output ('Created: ' + $Destination)
    Write-Output 'This starts the installed Codex via the experimental launcher, not the official shortcut.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
