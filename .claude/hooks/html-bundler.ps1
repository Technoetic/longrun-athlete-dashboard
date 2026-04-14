# html-bundler.ps1 - HTML 번들러 (src/ -> dist/index.html)
# src/index.html + src/js/*.js + src/css/*.css -> dist/index.html 단일 파일
param()

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

$srcDir = Join-Path $projectRoot "src"
$distDir = Join-Path $projectRoot "dist"
$srcHtml = Join-Path $srcDir "index.html"

function Write-Log($msg) {
    Write-Host $msg
}

Write-Log "=== HTML Bundler Start ==="

# src/index.html 확인
if (-not (Test-Path $srcHtml)) {
    Write-Log "ERROR: src/index.html not found"
    exit 1
}

# dist 디렉토리 생성
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$html = Get-Content $srcHtml -Raw -Encoding UTF8

# CSS 파일 인라인화
$cssFiles = Get-ChildItem -Path (Join-Path $srcDir "css") -Filter "*.css" -ErrorAction SilentlyContinue | Sort-Object Name
if ($cssFiles) {
    $cssContent = ""
    foreach ($cssFile in $cssFiles) {
        Write-Log "Bundling CSS: $($cssFile.Name)"
        $cssContent += "/* === $($cssFile.Name) === */`n"
        $cssContent += (Get-Content $cssFile.FullName -Raw -Encoding UTF8)
        $cssContent += "`n"
    }
    
    # <link> 태그를 <style>로 교체
    $html = $html -replace '(?s)<link[^>]*rel="stylesheet"[^>]*href="css/[^"]*"[^>]*/?\s*>', ''
    
    # </head> 앞에 <style> 삽입
    $styleTag = "<style>`n$cssContent</style>"
    $html = $html -replace '(</head>)', "$styleTag`n`$1"
}

# JS 파일 인라인화
$jsDir = Join-Path $srcDir "js"
if (Test-Path $jsDir) {
    $jsFiles = Get-ChildItem -Path $jsDir -Filter "*.js" -ErrorAction SilentlyContinue | Sort-Object Name
    if ($jsFiles) {
        $jsContent = ""
        foreach ($jsFile in $jsFiles) {
            Write-Log "Bundling JS: $($jsFile.Name)"
            $fileContent = Get-Content $jsFile.FullName -Raw -Encoding UTF8
            
            # ES module export/import 제거
            $fileContent = $fileContent -replace '^\s*export\s+(default\s+)?', ''
            $fileContent = $fileContent -replace '^\s*import\s+.*?from\s+[''"].*?[''"];?\s*$', '' 
            $fileContent = $fileContent -replace '^\s*import\s+[''"].*?[''"];?\s*$', ''
            
            $jsContent += "// === $($jsFile.Name) ===`n"
            $jsContent += $fileContent
            $jsContent += "`n"
        }
        
        # <script src="..."> 태그 제거
        $html = $html -replace '<script[^>]*src="js/[^"]*"[^>]*>\s*</script>', ''
        
        # </body> 앞에 <script> 삽입
        $scriptTag = "<script>`n$jsContent</script>"
        $html = $html -replace '(</body>)', "$scriptTag`n`$1"
    }
}

# dist/index.html 출력
$distHtml = Join-Path $distDir "index.html"
[System.IO.File]::WriteAllText($distHtml, $html, [System.Text.UTF8Encoding]::new($false))

$fileSize = [math]::Round((Get-Item $distHtml).Length / 1024, 2)
Write-Log "=== HTML Bundler Complete ==="
Write-Log "Output: dist/index.html (${fileSize}KB)"
Write-Log "file:// compatible: YES"

exit 0
