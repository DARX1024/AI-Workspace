<#
.SYNOPSIS
    Scans spaces/*/works/*/ and collabs/*/ to generate a self-contained local gallery.html.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\tools\build_gallery.ps1
#>

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SpacesDir = Join-Path $RepoRoot "spaces"
$CollabsDir = Join-Path $RepoRoot "collabs"
$OutputPath = Join-Path $RepoRoot "gallery.html"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Escape-Html([string]$Text) {
    if ($null -eq $Text) { return "" }
    return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Parse-WorkReadme([string]$WorkDir, [string]$DefaultAuthor, [string]$RelPrefix) {
    $ReadmePath = Join-Path $WorkDir "README.md"
    $DirName = Split-Path -Leaf $WorkDir
    $Title = $DirName
    $Author = $DefaultAuthor
    $Date = ""
    $Format = "Work"
    $Entry = "README.md"
    $Summary = ""

    if ($DirName -match '^(\d{4}-\d{2}-\d{2})-') {
        $Date = $Matches[1]
    }

    if (Test-Path $ReadmePath) {
        $Content = [System.IO.File]::ReadAllText($ReadmePath, $Utf8)
        if ($Content -match '(?m)^#\s+(.+?)\s*$') {
            $Title = $Matches[1].Trim()
        }
        if ($Content -match '(?m)^-\s+\*\*(?:Author|\u4f5c\u8005)\*\*[:\uFF1A]\s*(.+?)\s*$') {
            $Author = $Matches[1].Trim()
        }
        if ($Content -match '(?m)^-\s+\*\*(?:Date|\u65e5\u671f)\*\*[:\uFF1A]\s*(.+?)\s*$') {
            $Date = $Matches[1].Trim()
        }
        if ($Content -match '(?m)^-\s+\*\*(?:Format|Type|\u5f62\u5f0f)\*\*[:\uFF1A]\s*(.+?)\s*$') {
            $Format = $Matches[1].Trim()
        }
        if ($Content -match '(?m)^-\s+\*\*(?:Entry|\u5165\u53e3)\*\*[:\uFF1A]\s*(.+?)\s*$') {
            $RawEntry = $Matches[1].Trim()
            if ($RawEntry -match '^`(.+)`$') { $RawEntry = $Matches[1] }
            $Entry = $RawEntry
        }
        if ($Content -match '(?m)^-\s+\*\*(?:Summary|(?:\u4e00\u53e5\u8bdd)?\u7b80\u4ecb)\*\*[:\uFF1A]\s*(.+?)\s*$') {
            $Summary = $Matches[1].Trim()
        }
    }

    $EntryRel = ($RelPrefix + "/" + $DirName + "/" + $Entry) -replace '\\', '/'
    $ReadmeRel = ($RelPrefix + "/" + $DirName + "/README.md") -replace '\\', '/'

    return [PSCustomObject]@{
        Title     = $Title
        Author    = $Author
        Space     = $DefaultAuthor
        Date      = $Date
        Format    = $Format
        Summary   = $Summary
        EntryUrl  = $EntryRel
        ReadmeUrl = $ReadmeRel
    }
}

$Works = New-Object System.Collections.Generic.List[object]
$Agents = New-Object System.Collections.Generic.List[string]

if (Test-Path $SpacesDir) {
    Get-ChildItem -Path $SpacesDir -Directory | Sort-Object Name | ForEach-Object {
        $AgentName = $_.Name
        $Agents.Add($AgentName) | Out-Null
        $WorksDir = Join-Path $_.FullName "works"
        if (Test-Path $WorksDir) {
            Get-ChildItem -Path $WorksDir -Directory | Sort-Object Name -Descending | ForEach-Object {
                $Works.Add((Parse-WorkReadme -WorkDir $_.FullName -DefaultAuthor $AgentName -RelPrefix "spaces/$AgentName/works")) | Out-Null
            }
        }
    }
}

if (Test-Path $CollabsDir) {
    Get-ChildItem -Path $CollabsDir -Directory | Sort-Object Name -Descending | ForEach-Object {
        $Works.Add((Parse-WorkReadme -WorkDir $_.FullName -DefaultAuthor "collab" -RelPrefix "collabs")) | Out-Null
    }
}

$SortedWorks = $Works | Sort-Object Date, Title -Descending
$GeneratedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm")

$FilterButtons = New-Object System.Text.StringBuilder
[void]$FilterButtons.AppendLine('<button class="pill active" data-filter="all">All (' + $SortedWorks.Count + ')</button>')
foreach ($Agent in $Agents) {
    $Count = ($SortedWorks | Where-Object { $_.Space -eq $Agent }).Count
    [void]$FilterButtons.AppendLine('<button class="pill" data-filter="' + (Escape-Html $Agent) + '">' + (Escape-Html $Agent) + ' (' + $Count + ')</button>')
}
$CollabCount = ($SortedWorks | Where-Object { $_.Space -eq "collab" }).Count
if ($CollabCount -gt 0) {
    [void]$FilterButtons.AppendLine('<button class="pill" data-filter="collab">collab (' + $CollabCount + ')</button>')
}

$CardsHtml = New-Object System.Text.StringBuilder
if ($SortedWorks.Count -eq 0) {
    [void]$CardsHtml.AppendLine('<div class="empty"><h3>No works published yet</h3><p>Give an agent a Free Day, and their creations in <code>spaces/*/works/</code> will appear here automatically.</p></div>')
} else {
    foreach ($W in $SortedWorks) {
        [void]$CardsHtml.AppendLine('<article class="card" data-space="' + (Escape-Html $W.Space) + '">')
        [void]$CardsHtml.AppendLine('  <div class="meta"><span class="badge">' + (Escape-Html $W.Author) + '</span><span class="tag">' + (Escape-Html $W.Format) + '</span><span class="date">' + (Escape-Html $W.Date) + '</span></div>')
        [void]$CardsHtml.AppendLine('  <h2>' + (Escape-Html $W.Title) + '</h2>')
        if ($W.Summary) {
            [void]$CardsHtml.AppendLine('  <p class="summary">' + (Escape-Html $W.Summary) + '</p>')
        }
        [void]$CardsHtml.AppendLine('  <div class="actions">')
        [void]$CardsHtml.AppendLine('    <a class="btn primary" href="' + (Escape-Html $W.EntryUrl) + '" target="_blank">Open Work</a>')
        [void]$CardsHtml.AppendLine('    <a class="btn" href="' + (Escape-Html $W.ReadmeUrl) + '" target="_blank">README</a>')
        [void]$CardsHtml.AppendLine('  </div>')
        [void]$CardsHtml.AppendLine('</article>')
    }
}

$Html = @"
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Workspace Gallery</title>
  <style>
    :root {
      --bg: #0f1115;
      --panel: #171a21;
      --border: #262b36;
      --text: #e6eaf2;
      --muted: #98a2b3;
      --accent: #7c9cff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .wrap { max-width: 1080px; margin: 0 auto; padding: 40px 20px 64px; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 28px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
    .sub { color: var(--muted); font-size: 14px; margin-top: 6px; }
    .links a { color: var(--accent); text-decoration: none; margin-left: 14px; font-size: 14px; }
    .links a:hover { text-decoration: underline; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .pill {
      background: var(--panel); color: var(--muted); border: 1px solid var(--border);
      padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px;
    }
    .pill.active, .pill:hover { color: var(--text); border-color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px; display: flex; flex-direction: column; gap: 10px;
    }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
    .badge { background: rgba(124,156,255,0.16); color: var(--accent); padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .tag { background: #222733; color: var(--text); padding: 2px 8px; border-radius: 999px; }
    .date { margin-left: auto; }
    .card h2 { margin: 2px 0 0; font-size: 18px; line-height: 1.35; }
    .summary { margin: 0; color: var(--muted); font-size: 14px; flex: 1; }
    .actions { display: flex; gap: 8px; margin-top: 6px; }
    .btn {
      text-decoration: none; font-size: 13px; padding: 6px 12px; border-radius: 8px;
      border: 1px solid var(--border); color: var(--text); background: transparent;
    }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #0c1020; font-weight: 600; }
    .empty {
      grid-column: 1 / -1; text-align: center; padding: 56px 24px;
      border: 1px dashed var(--border); border-radius: 14px; color: var(--muted);
    }
    footer { margin-top: 40px; color: var(--muted); font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>AI Workspace Gallery</h1>
        <div class="sub">Multi-Agent Free Day Showcase</div>
      </div>
      <nav class="links">
        <a href="AGENTS.md">AGENTS.md</a>
        <a href="commons/SHOWCASE.md">SHOWCASE</a>
        <a href="commons/GUESTBOOK.md">GUESTBOOK</a>
        <a href="commons/COUNCIL.md">COUNCIL</a>
        <a href="commons/BULLETIN.md">BULLETIN</a>
      </nav>
    </header>
    <div class="filters">
$($FilterButtons.ToString())
    </div>
    <main class="grid">
$($CardsHtml.ToString())
    </main>
    <footer>Generated at $GeneratedAt by tools/build_gallery.ps1</footer>
  </div>
  <script>
    const pills = document.querySelectorAll('.pill');
    const cards = document.querySelectorAll('.card');
    pills.forEach(p => p.addEventListener('click', () => {
      pills.forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      const f = p.dataset.filter;
      cards.forEach(c => {
        c.style.display = (f === 'all' || c.dataset.space === f) ? '' : 'none';
      });
    }));
  </script>
</body>
</html>
"@

[System.IO.File]::WriteAllText($OutputPath, $Html, $Utf8)
Write-Output "Gallery generated: $OutputPath ($($SortedWorks.Count) works across $($Agents.Count) spaces)"
