param([string]$RepositoryName = 'auralis')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (!(Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Install GitHub CLI first: winget install --id GitHub.cli' }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows first.' }
if ($RepositoryName -notmatch '^[A-Za-z0-9_.-]+$') { throw 'RepositoryName must be a simple repository name.' }
Push-Location $root
try {
    gh auth status
    if ($LASTEXITCODE -ne 0) { gh auth login; if ($LASTEXITCODE -ne 0) { throw 'GitHub authentication failed.' } }
    $login = gh api user --jq .login
    if ($LASTEXITCODE -ne 0 -or $login -ne 'energusss') { throw 'Authenticate GitHub CLI as energusss before publishing.' }
    if (!(Test-Path '.git')) {
        $bundle = Join-Path $root 'auralis-history.bundle'
        if (!(Test-Path $bundle)) { throw 'No .git or auralis-history.bundle found. Restore the supplied history bundle before publishing.' }
        git init -b main
        if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
        git bundle verify $bundle
        if ($LASTEXITCODE -ne 0) { throw 'History bundle failed verification.' }
        git fetch $bundle 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*' --update-head-ok
        if ($LASTEXITCODE -ne 0) { throw 'History restoration failed.' }
        # Restore the Git index only; never overwrite extracted/user-edited files.
        git reset --mixed main
        if ($LASTEXITCODE -ne 0) { throw 'Could not restore main index.' }
    }
    $changes = git status --porcelain --untracked-files=no
    if ($changes) { throw 'Tracked files differ from the history bundle. Review and commit your changes before publishing.' }
    $remotes = git remote
    if ($remotes -contains 'origin') { throw 'An origin already exists. Inspect it and push manually; this script does not replace existing remotes.' }
    gh repo create "energusss/$RepositoryName" --private --source . --remote origin --push
    if ($LASTEXITCODE -ne 0) { throw 'Private repository creation or initial push failed. Existing repositories are never overwritten.' }
    git push origin --all
    if ($LASTEXITCODE -ne 0) { throw 'Branch push failed.' }
    git push origin --tags
    if ($LASTEXITCODE -ne 0) { throw 'Tag push failed.' }
    gh repo view --json url --jq .url
} finally { Pop-Location }
