$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packageRoot = Join-Path $projectRoot '.build\windows-package\codex-background-renderer'
$outputRoot = Join-Path $projectRoot '.build\dist'
New-Item -ItemType Directory -Path $packageRoot,$outputRoot -Force | Out-Null
$rootFiles = @('index.html','style.css','animation.js','image-settings.js','README.md','README-Win11.md','NOTICE.md')
foreach ($name in $rootFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination (Join-Path $packageRoot $name) -Force }
$commandFiles = @(Get-ChildItem -LiteralPath $projectRoot -Filter '*-Win11.cmd' -File)
$commandFiles | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $packageRoot $_.Name) -Force }
$folderFiles = @{
 'assets' = @('avatar.jpg','avatar-motion.gif','artwork.jpg','contours.js','theme.js','public-assets.json')
 'extension' = @('renderer.mjs','payload.mjs','cdp.mjs','wallpaper.css','preview.html')
 'windows' = @('start.ps1','platform.ps1','launcher.mjs','create-shortcut.ps1','proxy.mjs')
 'tools' = @('extension-preview.mjs')
 'docs' = @('references.md','README-upstream.md')
}
foreach ($folder in $folderFiles.Keys) {
 $destination = Join-Path $packageRoot $folder
 New-Item -ItemType Directory -Path $destination -Force | Out-Null
 foreach ($name in $folderFiles[$folder]) { Copy-Item -LiteralPath (Join-Path $projectRoot "$folder\$name") -Destination (Join-Path $destination $name) -Force }
}
$output = Join-Path $outputRoot 'codex-background-renderer-win11.zip'
Add-Type -AssemblyName System.IO.Compression,System.IO.Compression.FileSystem
$archiveStream = [System.IO.File]::Open($output,[System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($archiveStream,[System.IO.Compression.ZipArchiveMode]::Create,$false)
try {
 foreach ($name in @($rootFiles) + @($commandFiles.Name)) {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $packageRoot $name),"codex-background-renderer/$name") | Out-Null
 }
 foreach ($folder in $folderFiles.Keys) {
  foreach ($name in $folderFiles[$folder]) {
   [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $packageRoot "$folder\$name"),"codex-background-renderer/$folder/$name") | Out-Null
  }
 }
} finally { $archive.Dispose(); $archiveStream.Dispose() }
Write-Output $output
