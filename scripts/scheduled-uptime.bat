@echo off
REM ============================================================
REM CalcProMaster - Scheduled Uptime Check (Windows Task Scheduler)
REM ------------------------------------------------------------
REM Runs the production uptime check and logs the result so you
REM can see failures later. Exit code is non-zero on failure so
REM Task Scheduler can also alert you (Start a program condition).
REM
REM Setup (one time, from the project folder):
REM   schtasks /Create /SC DAILY /TN "CalcProMaster Uptime" /TR "%~f0" /ST 12:30
REM   (replace 12:30 with your preferred time; "%~f0" = this file)
REM
REM Log: scripts/uptime-check.log (append)
REM ============================================================
setlocal
set "SCRIPT_DIR=%~dp0"
set "LOG=%SCRIPT_DIR%uptime-check.log"
echo [%date% %time%] ===== CalcProMaster uptime check start =====>> "%LOG%"
REM Optional alert webhook (ntfy/Slack) - paste your real URL here or
REM set it as a system environment variable so it is not committed.
if "%ALERT_WEBHOOK_URL%"=="" (
  echo [%date% %time%] INFO: ALERT_WEBHOOK_URL not set - email/GitHub alerts only>> "%LOG%"
)
node "%SCRIPT_DIR%uptime-check.cjs" >> "%LOG%" 2>&1
set "EXIT=%ERRORLEVEL%"
echo [%date% %time%] exit code: %EXIT%>> "%LOG%"
echo [%date% %time%] ===== end =====>> "%LOG%"
echo Last uptime result (exit %EXIT%): see "%LOG%"
exit /b %EXIT%
