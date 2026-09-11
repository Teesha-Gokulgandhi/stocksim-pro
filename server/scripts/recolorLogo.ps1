Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\hp\.gemini\antigravity-ide\brain\dcdbb403-4a7f-4645-aacd-528df2ec7c68\.user_uploaded\media_1788642014278.png'
$dstPath = 'c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\brand-logo.png'
$favPath = 'c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\favicon.png'

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.A -eq 0) {
            $newBmp.SetPixel($x, $y, $c)
            continue
        }
        
        # Check if it is the white monogram (high brightness and low saturation)
        $isWhite = ($c.R -gt 215 -and $c.G -gt 215 -and $c.B -gt 215)
        if ($isWhite) {
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, 255, 255, 255))
        } else {
            # Interpolate a theme gradient from top-left (Electric Sapphire Blue #2563eb / #38bdf8) to bottom-right (Deep Royal Navy #1e3a8a)
            $t = ($x + $y) / ($bmp.Width + $bmp.Height)
            
            # Start: R: 37, G: 99, B: 235 (#2563eb) -> End: R: 20, G: 50, B: 160 (#1432a0)
            $baseR = 37 * (1 - $t) + 20 * $t
            $baseG = 99 * (1 - $t) + 50 * $t
            $baseB = 235 * (1 - $t) + 160 * $t
            
            # Modulate with original brightness
            $lum = ($c.R * 0.299 + $c.G * 0.587 + $c.B * 0.114) / 255.0
            $finalR = [Math]::Min(255, [int]($baseR * $lum * 1.45))
            $finalG = [Math]::Min(255, [int]($baseG * $lum * 1.45))
            $finalB = [Math]::Min(255, [int]($baseB * $lum * 1.45))
            
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, $finalR, $finalG, $finalB))
        }
    }
}

$bmp.Dispose()
$newBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Save($favPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Dispose()
Write-Output "Transformed brand logo and favicon successfully!"
