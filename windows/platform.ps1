param(
    [ValidateSet('Discover', 'Inspect', 'Listener', 'Activate', 'Proxy')]
    [string]$Action,
    [string]$Executable,
    [int]$Port,
    [string]$AppId
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Write-Json($value) { ConvertTo-Json -InputObject $value -Depth 6 -Compress }
try {
    if ($Action -eq 'Discover') {
        $candidates = @()
        if ($env:CODEX_STARTUP_EXE) {
            $candidates += @{ executable = $env:CODEX_STARTUP_EXE; appId = '' }
        } else {
            foreach ($package in @(Get-AppxPackage -Name 'OpenAI.Codex')) {
                $manifest = Get-AppxPackageManifest -Package $package.PackageFullName
                foreach ($application in @($manifest.Package.Applications.Application)) {
                    if ($application.Executable) {
                        $candidates += @{
                            executable = (Join-Path $package.InstallLocation ([string]$application.Executable))
                            appId = $package.PackageFamilyName + '!' + $application.Id
                        }
                    }
                }
            }
            foreach ($relativePath in @('Programs\Codex\Codex.exe', 'OpenAI\Codex\Codex.exe', 'Programs\ChatGPT\ChatGPT.exe')) {
                $candidatePath = Join-Path $env:LOCALAPPDATA $relativePath
                if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
                    $candidates += @{ executable = $candidatePath; appId = '' }
                }
            }
        }
        Write-Json @($candidates)
    } elseif ($Action -eq 'Inspect') {
        $resolvedExecutable = (Resolve-Path -LiteralPath $Executable).ProviderPath
        $signature = Get-AuthenticodeSignature -LiteralPath $resolvedExecutable
        $running = @(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($resolvedExecutable)) -ErrorAction SilentlyContinue |
            Where-Object { $_.Path -and [string]::Equals($_.Path, $resolvedExecutable, [StringComparison]::OrdinalIgnoreCase) } |
            Select-Object -ExpandProperty Id)
        Write-Json @{
            executable = $resolvedExecutable
            signatureStatus = [string]$signature.Status
            signer = [string]$signature.SignerCertificate.Subject
            running = $running
        }
    } elseif ($Action -eq 'Listener') {
        $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        $currentUserSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        $listeners = @()
        foreach ($connection in $connections) {
            $processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $connection.OwningProcess)
            $owner = Invoke-CimMethod -InputObject $processInfo -MethodName GetOwnerSid
            $listeners += @{
                address = $connection.LocalAddress
                pid = $connection.OwningProcess
                executable = $processInfo.ExecutablePath
                sameUser = ($owner.ReturnValue -eq 0 -and $owner.Sid -eq $currentUserSid)
            }
        }
        Write-Json @($listeners)
    } elseif ($Action -eq 'Proxy') {
        $settings = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
        Write-Json @{ enabled = ($settings.ProxyEnable -eq 1); server = [string]$settings.ProxyServer }
    } elseif ($Action -eq 'Activate') {
        if ($AppId) {
            Start-Process -FilePath explorer.exe -ArgumentList ('shell:AppsFolder\' + $AppId) -WindowStyle Hidden
        } else {
            Start-Process -FilePath $Executable -WorkingDirectory (Split-Path -Parent $Executable) -WindowStyle Hidden
        }
        Write-Json @{ activated = $true }
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
