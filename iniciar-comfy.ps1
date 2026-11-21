# Sobe o ComfyUI local em http://127.0.0.1:8188
# Código e modelos ficam em E:\ComfyUI (disco USB). O ambiente Python fica no SSD (C:), porque no USB fica muito lento.
Set-Location E:\ComfyUI
& C:\Users\nickm\.venvs\comfyui\Scripts\python.exe main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch
