$clipboard = Get-Clipboard -Raw
$process = [Diagnostics.Process]::Start("snippingtool.exe", "/clip")
$process.WaitForExit()
$clipboard_after = Get-Clipboard -Format Image
Set-Clipboard $clipboard
$joined_args = $args -join " "
$clipboard_after.Save($joined_args, "PNG")
