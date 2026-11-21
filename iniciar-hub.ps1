# Sobe o painel do VideosHub em http://localhost:4300 (o VoiceStudio precisa estar aberto para gerar voz)
$env:Path += ";C:\Users\nickm\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.1-full_build\bin"
Set-Location $PSScriptRoot
Start-Process "http://localhost:4300"
node apps/painel/server.mjs
