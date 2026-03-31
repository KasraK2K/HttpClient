Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Color([string]$hex, [int]$alpha = 255) {
  $base = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $base.R, $base.G, $base.B)
}

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'desktop\build\icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$sizes = 16, 32, 48, 64, 128, 256, 512, 1024
foreach ($size in $sizes) {
  $scale = $size / 128.0
  $output = Join-Path $iconDir ("{0}x{0}.png" -f $size)

  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $badgePath = New-RoundedRectPath (12 * $scale) (12 * $scale) (104 * $scale) (104 * $scale) (30 * $scale)
  $leftPath = New-RoundedRectPath (31 * $scale) (19 * $scale) (18 * $scale) (81 * $scale) (9 * $scale)
  $rightPath = New-RoundedRectPath (79 * $scale) (19 * $scale) (18 * $scale) (81 * $scale) (9 * $scale)
  $bridgePath = New-RoundedRectPath (45 * $scale) (57 * $scale) (38 * $scale) (14 * $scale) (7 * $scale)

  $badgeBrush = [System.Drawing.SolidBrush]::new((New-Color '#12375D'))
  $badgeGlowBrush = [System.Drawing.SolidBrush]::new((New-Color '#1D4A78' 95))
  $leftBrush = [System.Drawing.SolidBrush]::new((New-Color '#74E8FF'))
  $rightBrush = [System.Drawing.SolidBrush]::new((New-Color '#49DA9A'))
  $bridgeBrush = [System.Drawing.SolidBrush]::new((New-Color '#70E9D6'))
  $nodeBlueBrush = [System.Drawing.SolidBrush]::new((New-Color '#7DE8FF'))
  $nodeGreenBrush = [System.Drawing.SolidBrush]::new((New-Color '#48DC96'))
  $nodeTealBrush = [System.Drawing.SolidBrush]::new((New-Color '#7DEBD7'))
  $borderPen = [System.Drawing.Pen]::new((New-Color '#214A7A'), [Math]::Max(2.4, 4 * $scale))
  $shinePen = [System.Drawing.Pen]::new((New-Color '#BDEFFF' 180), [Math]::Max(2.2, 4 * $scale))
  $connectorBluePen = [System.Drawing.Pen]::new((New-Color '#A4F1FF'), [Math]::Max(2.8, 6 * $scale))
  $connectorGreenPen = [System.Drawing.Pen]::new((New-Color '#63F0D1'), [Math]::Max(2.8, 6 * $scale))
  $nodePen = [System.Drawing.Pen]::new((New-Color '#071322'), [Math]::Max(2.4, 4 * $scale))
  $innerAccentPen = [System.Drawing.Pen]::new((New-Color '#FFFFFF' 30), [Math]::Max(1, 1.5 * $scale))

  $shinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectorBluePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectorBluePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectorGreenPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectorGreenPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $innerAccentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $innerAccentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $graphics.FillPath($badgeBrush, $badgePath)
  $graphics.FillEllipse($badgeGlowBrush, 18 * $scale, 16 * $scale, 54 * $scale, 40 * $scale)
  $graphics.DrawPath($borderPen, $badgePath)
  $graphics.FillPath($leftBrush, $leftPath)
  $graphics.FillPath($rightBrush, $rightPath)
  $graphics.FillPath($bridgeBrush, $bridgePath)
  $graphics.DrawPath($innerAccentPen, $leftPath)
  $graphics.DrawPath($innerAccentPen, $rightPath)
  $graphics.DrawPath($innerAccentPen, $bridgePath)
  $graphics.DrawArc($shinePen, 26 * $scale, 18 * $scale, 36 * $scale, 18 * $scale, 200, 130)
  $graphics.DrawLine($connectorBluePen, 33 * $scale, 33 * $scale, 44 * $scale, 33 * $scale)
  $graphics.DrawLine($connectorGreenPen, 86 * $scale, 95 * $scale, 98 * $scale, 95 * $scale)
  $graphics.DrawLine($connectorGreenPen, 88 * $scale, 33 * $scale, 97 * $scale, 33 * $scale)
  $graphics.FillEllipse($nodeBlueBrush, 18 * $scale, 25 * $scale, 16 * $scale, 16 * $scale)
  $graphics.FillEllipse($nodeGreenBrush, 93 * $scale, 86 * $scale, 18 * $scale, 18 * $scale)
  $graphics.FillEllipse($nodeTealBrush, 95 * $scale, 26 * $scale, 14 * $scale, 14 * $scale)
  $graphics.DrawEllipse($nodePen, 18 * $scale, 25 * $scale, 16 * $scale, 16 * $scale)
  $graphics.DrawEllipse($nodePen, 93 * $scale, 86 * $scale, 18 * $scale, 18 * $scale)
  $graphics.DrawEllipse($nodePen, 95 * $scale, 26 * $scale, 14 * $scale, 14 * $scale)

  $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

  $innerAccentPen.Dispose(); $nodePen.Dispose(); $connectorGreenPen.Dispose(); $connectorBluePen.Dispose(); $shinePen.Dispose(); $borderPen.Dispose()
  $nodeTealBrush.Dispose(); $nodeGreenBrush.Dispose(); $nodeBlueBrush.Dispose(); $bridgeBrush.Dispose(); $rightBrush.Dispose(); $leftBrush.Dispose(); $badgeGlowBrush.Dispose(); $badgeBrush.Dispose()
  $bridgePath.Dispose(); $rightPath.Dispose(); $leftPath.Dispose(); $badgePath.Dispose()
  $graphics.Dispose(); $bitmap.Dispose()
}

