Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\brand-logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Size: $($bmp.Width) x $($bmp.Height)"
$corner = $bmp.GetPixel(2, 2)
Write-Output "Pixel at (2,2): A=$($corner.A), R=$($corner.R), G=$($corner.G), B=$($corner.B)"
$center = $bmp.GetPixel($bmp.Width / 2, $bmp.Height / 2)
Write-Output "Pixel at center: A=$($center.A), R=$($center.R), G=$($center.G), B=$($center.B)"
$bmp.Dispose()
