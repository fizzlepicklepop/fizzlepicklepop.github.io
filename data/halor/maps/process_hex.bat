@echo off
setlocal

echo Processing .bin and .mvar files in the current folder...
for %%F in (*.bin *.mvar) do (
    rem Skip the batch file itself if it accidentally matches.
    if /I "%%~nxF"=="%~nx0" (
        echo Skipping self file: %%~nxF
    ) else (
        call :ProcessFile "%%~fF" "%%~dpnF.txt"
    )
)
echo Done.
pause
exit /b

:ProcessFile
rem Expects two parameters:
rem   %~1 - full path to input file
rem   %~2 - full path to output file (with .txt extension)
set "infile=%~1"
set "outfile=%~2"

echo.
echo Processing file: %infile%
echo Saving output as: %outfile%

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (!(Test-Path '%infile%')) { Write-Host 'Input file not found'; exit 1 }; $bytes = [System.IO.File]::ReadAllBytes('%infile%'); $start = 0xA0; $end = 0x300; if ($bytes.Length -lt $start) { Write-Host 'File is too small'; exit 1 }; $max = [Math]::Min($bytes.Length, $end); $endIndex = $max - 1; $sub = $bytes[$start..$endIndex]; $filtered = $sub | Where-Object { $_ -ne 0 }; $decoded = [System.Text.Encoding]::ASCII.GetString($filtered); $pos = $decoded.IndexOf('mvarp('); if ($pos -ge 0) { $decoded = $decoded.Substring(0, $pos) }; $decoded | Out-File -FilePath '%outfile%' -Encoding ascii;"
goto :eof
