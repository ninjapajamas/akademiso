---
description: Restart Backend Server
---

1. Stop existing backend servers
2. Start fresh backend server
// turbo-all
3. Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
4. Start-Process -FilePath "python" -ArgumentList "manage.py", "runserver" -WorkingDirectory "d:\projek\akademiso\backend" -WindowStyle Minimized
