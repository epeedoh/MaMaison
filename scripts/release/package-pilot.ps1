param([Parameter(Mandatory=$true)][string]$OutputRoot)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $repo
try {
    if (git status --porcelain) { throw 'A clean, committed source is required.' }
    $sha = (git rev-parse HEAD).Trim()
    $release = Join-Path ([IO.Path]::GetFullPath($OutputRoot)) $sha
    if (Test-Path -LiteralPath $release) { throw 'Release already exists. Do not overwrite an identified artifact.' }
    New-Item -ItemType Directory -Path $release | Out-Null
    dotnet publish backend/MaMaison.Api/MaMaison.Api.csproj -c Release --self-contained false -p:UseAppHost=false --no-restore -o (Join-Path $release 'publish')
    if ($LASTEXITCODE) { throw 'API build failed.' }
    Push-Location frontend/MaMaison.Web
    try {
        npm run build -- --configuration production
        if ($LASTEXITCODE) { throw 'Frontend build failed.' }
        Copy-Item -LiteralPath dist/MaMaison.Web/browser -Destination $release -Recurse
    } finally { Pop-Location }
    $identity = @{projectId='mamaison';environment='pilote';commit=$sha;builtAt=(Get-Date).ToUniversalTime().ToString('o')}
    $identity | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $release 'browser/release.json') -Encoding utf8NoBOM
    Copy-Item -LiteralPath frontend/MaMaison.Web/nginx.conf -Destination $release
    foreach($name in @('Dockerfile.api','Dockerfile.web','deploy-pilot.py')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $release
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'dockerignore') -Destination (Join-Path $release '.dockerignore')
    $files = [ordered]@{}
    Get-ChildItem -LiteralPath $release -File -Recurse | Sort-Object FullName | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($release,$_.FullName).Replace('\','/')
        $files[$relative] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    @{projectId='mamaison';environment='pilote';commit=$sha;files=$files} | ConvertTo-Json -Depth 5 |
        Set-Content -LiteralPath (Join-Path $release 'manifest.json') -Encoding utf8NoBOM
    $archive = "$release.tar.gz"
    tar -czf $archive -C $release .
    if ($LASTEXITCODE) { throw 'Packaging failed.' }
    Get-FileHash -LiteralPath $archive -Algorithm SHA256 | Select-Object Path,Hash
} finally { Pop-Location }
