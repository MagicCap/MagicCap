# This code is a part of MagicCap which is a MPL-2.0 licensed project.
# Copyright (C) Jake Gealer <jake@gealer.email> 2018.

Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class WindowHandler {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
  }
"@

$proc_id = [WindowHandler]::GetForegroundWindow()
$process = get-process | Where-Object { $_.mainwindowhandle -eq $proc_id }
Write-Host -NoNewline $process.ProcessName
