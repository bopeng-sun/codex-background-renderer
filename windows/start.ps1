param(
    [ValidateSet('Preview', 'Wallpaper', 'Launch', 'Doctor', 'Serve')]
    [string]$Mode = 'Preview'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    $projectRoot = Split-Path -Parent $PSScriptRoot
    $nodeCandidates = @()
    if ($env:CODEX_STARTUP_NODE) { $nodeCandidates += $env:CODEX_STARTUP_NODE }
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodeCandidates += $nodeCommand.Source }
    foreach ($package in @(Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction SilentlyContinue)) {
        $nodeCandidates += (Join-Path $package.InstallLocation 'app\resources\cua_node\node.exe')
        $nodeCandidates += (Join-Path $package.InstallLocation 'app\resources\cua_node\bin\node.exe')
    }
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes\cua_node'
    if (Test-Path -LiteralPath $runtimeRoot) {
        foreach ($runtime in @(Get-ChildItem -LiteralPath $runtimeRoot -Directory | Sort-Object LastWriteTime -Descending)) {
            $nodeCandidates += (Join-Path $runtime.FullName 'bin\node.exe')
            $nodeCandidates += (Join-Path $runtime.FullName 'node.exe')
        }
    }
    $nodeExecutable = $null
    foreach ($candidate in ($nodeCandidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $version = & $candidate -p 'parseInt(process.versions.node)' 2>$null
        if ($LASTEXITCODE -eq 0 -and [int]$version -ge 22) { $nodeExecutable = $candidate; break }
    }
    if (-not $nodeExecutable) { throw 'Node.js 22+ was not found. Install Node.js or set CODEX_STARTUP_NODE to node.exe.' }
    & $nodeExecutable (Join-Path $PSScriptRoot 'launcher.mjs') ('--' + $Mode.ToLowerInvariant())
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
