@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Drag and drop a file onto this script.
    pause
    exit /b
)

REM Set ANSI code page for proper display
chcp 1252 > nul

echo File Contents:
type "%~1"

pause