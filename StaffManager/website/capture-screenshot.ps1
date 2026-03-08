# Screenshot Capture Script for NIVTO App
# Usage: .\capture-screenshot.ps1 -OutputPath "images\dashboard.png"

param(
    [string]$OutputPath = "screenshot.png"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get the screen bounds
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds

# Create a bitmap
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height

# Create graphics object
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Capture the screen
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)

# Save the screenshot
$fullPath = Join-Path (Get-Location) $OutputPath
$bitmap.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Screenshot saved to: $fullPath" -ForegroundColor Green
