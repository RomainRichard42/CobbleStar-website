param([Parameter(Mandatory=$true)][string]$ZipPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../api/rank-tags'))
$utf8 = [Text.UTF8Encoding]::new($false)
$ids = @('admin','modo','guide','recrue','eclaireur','aventurier','prodige','veteran','gardien','elite','mercenaire','etoile','cosmiquea','cosmiqueb','galactiquea','galactiqueb','ranger')
$codes = @('E001','E002','E003','E004','E005','E006','E007','E008','E009','E010','E011','E012','E013','E014','E015','E016','E017')
$archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipPath))
$pending = @{}
try {
    $seen = @{}
    foreach ($entry in $archive.Entries) {
        $name = $entry.FullName
        if ($seen.ContainsKey($name)) { throw "Duplicate ZIP entry: $name" }
        $seen[$name] = $true
        if ($name.EndsWith('/')) {
            if ($name -notin @('assets/','assets/minecraft/','assets/minecraft/font/','assets/minecraft/textures/','assets/minecraft/textures/ranks/')) { throw "Unexpected ZIP folder: $name" }
            continue
        }
        if ($name -notin @('pack.mcmeta','assets/minecraft/font/default.json') -and $name -notmatch '^assets/minecraft/textures/ranks/[a-z]+\.png$') { throw "Unexpected ZIP file: $name" }
        if ($entry.Length -gt 1048576) { throw "ZIP entry too large: $name" }
        $inputStream = $entry.Open()
        $buffer = [IO.MemoryStream]::new()
        try { $inputStream.CopyTo($buffer); $pending[$name] = $buffer.ToArray() } finally { $inputStream.Dispose(); $buffer.Dispose() }
    }
} finally { $archive.Dispose() }
if ($pending.Count -ne 19) { throw 'Expected 17 textures, one font and pack.mcmeta' }
$sourceFont = $utf8.GetString($pending['assets/minecraft/font/default.json']) | ConvertFrom-Json
$sourceMeta = $utf8.GetString($pending['pack.mcmeta']) | ConvertFrom-Json
if ($sourceMeta.pack.pack_format -ne 34 -or $sourceFont.providers.Count -ne 16) { throw 'Unexpected source pack format or provider count' }
$providers = @()
$rows = @()
$outputs = [ordered]@{}
for ($i=0; $i -lt $ids.Count; $i++) {
    $id=$ids[$i]; $code=$codes[$i]; $glyph=[string][char][Convert]::ToInt32($code,16)
    $sourceName="assets/minecraft/textures/ranks/$id.png"
    $bytes=$pending[$sourceName]
    if (!$bytes -or [BitConverter]::ToString($bytes[0..7]) -ne '89-50-4E-47-0D-0A-1A-0A') { throw "Missing/invalid PNG: $id" }
    $width=($bytes[16]*16777216)+($bytes[17]*65536)+($bytes[18]*256)+$bytes[19]
    $height=($bytes[20]*16777216)+($bytes[21]*65536)+($bytes[22]*256)+$bytes[23]
    if ($width -lt 1 -or $width -gt 512 -or $height -ne 22) { throw "Unexpected PNG dimensions: $id" }
    if ($id -ne 'ranger') {
        $original=@($sourceFont.providers | Where-Object { $_.file -eq "minecraft:ranks/$id.png" })
        if ($original.Count -ne 1 -or $original[0].type -ne 'bitmap' -or $original[0].chars.Count -ne 1 -or $original[0].chars[0] -ne $glyph -or $original[0].height -ne 8 -or $original[0].ascent -ne 8) { throw "Source font mapping mismatch: $id" }
    }
    $path="assets/cobblestar_planets/textures/ranks/$id.png"
    $outputs[$path]=$bytes
    $sha=[Security.Cryptography.SHA256]::Create()
    try { $hash=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    $rows += [ordered]@{id=$id;codepoint=$code;glyph=$glyph;file=$path;sha256=$hash;width=$width;height=$height}
    $providers += [ordered]@{type='bitmap';file="cobblestar_planets:ranks/$id.png";ascent=8;height=8;chars=@($glyph)}
}
$fontPath='assets/cobblestar_planets/font/ranks.json'
$outputs[$fontPath]=$utf8.GetBytes((ConvertTo-Json -InputObject @{providers=$providers} -Depth 8)+"`n")
$noticePath='licenses/RankTags-NOTICE.txt'
$outputs[$noticePath]=$utf8.GetBytes("Cobblestar Rank Pack`nCreated by LarkAvery (credit from the supplied pack.mcmeta).`nSource: PackTagComplet.zip supplied by the CobbleStar administrator.`nPNG textures preserved byte-for-byte. Resource namespace isolated to cobblestar_planets.`nOriginal glyph codes preserved; Ranger U+E017 registered according to the supplied rank hierarchy.`nNo additional licence grant is asserted by this integration.`n")
[IO.Directory]::CreateDirectory($root) | Out-Null
foreach ($path in $outputs.Keys) {
    $target=Join-Path $root $path
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    [IO.File]::WriteAllBytes($target,$outputs[$path])
}
$manifest=[ordered]@{schema=1;source='PackTagComplet.zip';sourceSha256=(Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant();creator='LarkAvery';font='cobblestar_planets:ranks';tags=$rows;files=@($outputs.Keys)}
[IO.File]::WriteAllText((Join-Path $root 'manifest.json'),(ConvertTo-Json -InputObject $manifest -Depth 10)+"`n",$utf8)
Write-Output "Imported 17 unchanged textures and 17 glyphs (including Ranger E017) into $root"
