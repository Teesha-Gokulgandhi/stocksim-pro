Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\hp\Desktop\stocksim-pro-v1\stocksim-pro\client\public\brand-logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$width = $bmp.Width
$height = $bmp.Height

# Create an ARGB 32-bit bitmap
$newBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Flood fill from the 4 corners to find all connected background pixels
$visited = New-Object 'bool[,]' $width, $height
$queue = New-Object System.Collections.Queue

# Helper to check if pixel is "white-ish / light background"
function IsBg($c) {
    # If it's near white/light grey (not deep blue)
    # The blue icon has high blue or high color saturation
    if ($c.R -gt 215 -and $c.G -gt 215 -and $c.B -gt 215) {
        return $true
    }
    # Also near-white with slight tint
    if ($c.R -gt 200 -and $c.G -gt 200 -and $c.B -gt 200 -and [Math]::Abs($c.R - $c.B) -lt 30 -and [Math]::Abs($c.G - $c.B) -lt 30) {
        return $true
    }
    return $false
}

# Seed from corners and edges
for ($x = 0; $x -lt $width; $x++) {
    $queue.Enqueue([System.Drawing.Point]::new($x, 0))
    $queue.Enqueue([System.Drawing.Point]::new($x, $height - 1))
}
for ($y = 0; $y -lt $height; $y++) {
    $queue.Enqueue([System.Drawing.Point]::new(0, $y))
    $queue.Enqueue([System.Drawing.Point]::new($width - 1, $y))
}

while ($queue.Count -gt 0) {
    $pt = $queue.Dequeue()
    $px = $pt.X
    $py = $pt.Y

    if ($px -lt 0 -or $px -ge $width -or $py -lt 0 -or $py -ge $height) { continue }
    if ($visited[$px, $py]) { continue }
    $visited[$px, $py] = $true

    $c = $bmp.GetPixel($px, $py)
    if (IsBg $c) {
        # Check 4 neighbors
        $queue.Enqueue([System.Drawing.Point]::new($px + 1, $py))
        $queue.Enqueue([System.Drawing.Point]::new($px - 1, $py))
        $queue.Enqueue([System.Drawing.Point]::new($px, $py + 1))
        $queue.Enqueue([System.Drawing.Point]::new($px, $py - 1))
    }
}

# Now construct the transparent image
for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        if ($visited[$x, $y]) {
            # Background -> Fully transparent
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Keep the icon pixel
            $c = $bmp.GetPixel($x, $y)
            $newBmp.SetPixel($x, $y, $c)
        }
    }
}

$bmp.Dispose()
$newBmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Dispose()

Write-Output "Successfully made brand-logo.png background transparent!"
