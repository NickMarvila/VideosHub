# Sobe o ComfyUI local em http://127.0.0.1:8188
# Código e modelos: E:\ComfyUI (disco USB) se estiver conectado; senão, ComfyUI na pasta do usuário (C:).
# O ambiente Python fica sempre no SSD (C:), porque no USB fica muito lento.
$comfy = if ($env:COMFYUI_DIR) { $env:COMFYUI_DIR } elseif (Test-Path E:\ComfyUI\main.py) { 'E:\ComfyUI' } else { "$env:USERPROFILE\ComfyUI" }
Set-Location $comfy
& $env:USERPROFILE\.venvs\comfyui\Scripts\python.exe main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch
