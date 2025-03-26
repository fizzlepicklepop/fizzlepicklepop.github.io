@echo off
setlocal enabledelayedexpansion

rem --- Configuration ---
set "OUTPUT_FILE=file_list.json"
set "DATA_DIR=data"
set "GAMES=halor halo1 halo2a halo3 halo4"
set "TYPES=gametypes maps"  REM Just the type directory names
rem --- End Configuration ---

pushd "%~dp0" || exit /b 1  rem Go to script's directory (halomcc), exit if fail
echo Scanning directory: %CD%\%DATA_DIR%...
echo Output file: %CD%\%OUTPUT_FILE%

if not exist "%DATA_DIR%" (
    echo ERROR: Data directory '%DATA_DIR%' not found in %CD%.
    echo Please make sure the '%DATA_DIR%' directory exists and run this script from the 'halomcc' folder.
    pause
    popd
    exit /b 1
)

rem Initialize JSON file (overwrite if exists)
echo [ > "%OUTPUT_FILE%"
set "first_entry=1"
set "entry_count=0"

rem Loop through games
for %%G in (%GAMES%) do (
    set "game_path=%DATA_DIR%\%%G"
    if exist "!game_path!" (
        echo Processing Game: %%G

        rem Loop through TYPE NAMES
        for %%T in (%TYPES%) do (
             set "type_name=%%T"

             rem Determine the target extension based on the type name
             set "target_ext=" REM Reset for each type
             if /i "!type_name!"=="gametypes" set "target_ext=.bin"
             if /i "!type_name!"=="maps" set "target_ext=.mvar"

             rem Proceed only if we defined a valid extension for this type
             if defined target_ext (
                 set "type_path=!game_path!\!type_name!"

                 if exist "!type_path!" (
                     echo   Scanning !type_path! for *!target_ext! files...

                     rem Loop through files with the target extension in the type directory
                     for %%F in ("!type_path!\*!target_ext!") do (
                         set "filename=%%~nxF"  REM Filename with extension
                         set "basename=%%~nF"   REM Filename without extension
                         set "txt_filename=!basename!.txt"
                         set "txt_path_abs=!type_path!\!txt_filename!" REM Absolute path to TXT for checking existence

                         rem Construct relative paths for JSON, using forward slashes for web compatibility
                         set "file_path_rel=data/%%G/!type_name!/!filename!"
                         set "file_path_rel=!file_path_rel:\=/!" rem Replace backslashes with forward slashes
                         set "txt_path_rel=data/%%G/!type_name!/!txt_filename!"
                         set "txt_path_rel=!txt_path_rel:\=/!" rem Replace backslashes with forward slashes

                         rem Use the relative path in the JSON output
                         set "description_path_json=!txt_path_rel!"
                         if not exist "!txt_path_abs!" (
                             echo     - Warning: Description '!txt_path_rel!' not found for '!file_path_rel!'.
                             rem Keep the path in JSON anyway, the JS can handle the 404 when fetching
                         )

                         rem Add comma before this entry if it's NOT the first one
                         if "!first_entry!"=="0" (
                             echo ,>> "%OUTPUT_FILE%"
                         ) else (
                             set "first_entry=0" REM Mark that the first entry has been written
                         )

                         rem Append JSON object for the file (split echo for readability)
                         (
                             echo   {
                             echo     "game": "%%G",
                             echo     "type": "!type_name!",
                             echo     "filename": "!filename!",
                             echo     "displayName": "!basename!",
                             echo     "filePath": "!file_path_rel!",
                             echo     "descriptionPath": "!description_path_json!"
                             echo   }
                         )>> "%OUTPUT_FILE%"

                         echo     + Found: !file_path_rel!
                         set /a entry_count+=1

                     )
                 ) else (
                     echo   Warning: Type directory '!type_path!' not found. Skipping.
                 )
             ) else (
                 echo   Internal Script Warning: No extension defined for type '!type_name!'. Skipping.
             )
        )
    ) else (
        echo Warning: Game directory '!game_path!' not found. Skipping.
    )
)

rem Close JSON array properly
echo. >> "%OUTPUT_FILE%" REM Ensure the last '}' is on its own line before adding ']'
echo ] >> "%OUTPUT_FILE%"

echo.
echo ============================================================
echo Successfully generated '%OUTPUT_FILE%' with !entry_count! entries.
echo ============================================================
echo.

popd
endlocal
pause REM Keep window open to see results/errors
exit /b 0