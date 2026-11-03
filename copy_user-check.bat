@echo off

set YYYY=%date:~0,4%
set MM=%date:~5,2%
set DD=%date:~8,2%
set HH=%time:~0,2%
set MI=%time:~3,2%
set SS=%time:~6,2%
set HH=%HH: =0%

set TARGET_MD_NAME=user-check_%YYYY%%MM%%DD%_%HH%%MI%%SS%.md
set TARGET_FOLDER_NAME=temp\user-check


pushd "%~dp0"


if not exist "%TARGET_FOLDER_NAME%" (
	md "%TARGET_FOLDER_NAME%"
)

copy "design\v0\docs\checklists\user-check.md" "%TARGET_FOLDER_NAME%\%TARGET_MD_NAME%"

popd

pause