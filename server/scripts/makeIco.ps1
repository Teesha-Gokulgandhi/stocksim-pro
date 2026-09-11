Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\brand-logo.png"
$icoPath = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\favicon.ico"
$png32Path = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\favicon-32x32.png"
$png16Path = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\favicon-16x16.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 32x32
$thumb32 = New-Object System.Drawing.Bitmap(32, 32)
$g32 = [System.Drawing.Graphics]::FromImage($thumb32)
$g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g32.DrawImage($bmp, 0, 0, 32, 32)
$g32.Dispose()
$thumb32.Save($png32Path, [System.Drawing.Imaging.ImageFormat]::Png)

# 16x16
$thumb16 = New-Object System.Drawing.Bitmap(16, 16)
$g16 = [System.Drawing.Graphics]::FromImage($thumb16)
$g16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g16.DrawImage($bmp, 0, 0, 16, 16)
$g16.Dispose()
$thumb16.Save($png16Path, [System.Drawing.Imaging.ImageFormat]::Png)

# Windows .ico
$hIcon = $thumb32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$thumb32.Dispose()
$thumb16.Dispose()
$bmp.Dispose()

Write-Output "Successfully generated favicon.ico, favicon-32x32.png, favicon-16x16.png"
