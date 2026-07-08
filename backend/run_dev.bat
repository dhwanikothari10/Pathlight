@echo off
REM Run the backend dev server, excluding venv/ from the --reload file watcher
REM so installing/upgrading packages doesn't trigger constant restarts.
uvicorn app.main:app --reload --reload-exclude "venv/*"
