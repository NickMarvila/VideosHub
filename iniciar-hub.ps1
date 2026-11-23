# Sobe o painel do VideosHub em http://localhost:4300 (o VoiceStudio precisa estar aberto para gerar voz)
# ffmpeg do winget (Gyan.FFmpeg), procurado no perfil de quem está rodando
$ff = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin\ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ff) { $env:Path += ";$($ff.DirectoryName)" }
Set-Location $PSScriptRoot
Start-Process "http://localhost:4300"
node apps/painel/server.mjs
