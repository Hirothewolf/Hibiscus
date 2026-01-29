# Changelog

All notable changes to the **Hibiscus** project will be documented in this file.

## [2.0.0] - 2024-05-23

### 🚀 Major Changes
- **Architecture**: Completely removed Electron dependency. Now runs as a lightweight Node.js server with a web interface accessible via browser.
- **Parallel Generation**: New batch processing system allows generating multiple images/videos simultaneously without blocking the UI.
- **Gallery Search**: Added real-time search functionality to filter gallery items by prompt.

### ✨ New Features
- **Video Generation**: Added support for video generation using 'Veo' and 'Seedance' models.
- **Editor Improvements**:
    - **Paste Support**: Directly paste images (Ctrl+V) into the editor tab.
    - **Multi-Image Support**: Upload or paste multiple images for reference.
- **Backend Improvements**:
    - **Favorites**: Added PATCH endpoint `/api/gallery/:id` to toggle favorite status, persistent in `gallery.json`.
    - **Static Serving**: Improved static file serving with absolute paths.
- **UI/UX**:
    - **Quality Parameter**: Now context-aware, only visible when a GPT model is selected to avoid confusion.
    - **Random Seed**: Fixed `-1` seed behavior to generate a unique random seed for *every* request in a batch, ensuring variety.
    - **Resolution Multiplier**: Easier toggles for 1x, 2x, 4x upscaling.

### 🛠 Fixes & Refactoring
- **Code Cleanups**:
    - Removed legacy `main.js` and build scripts related to Electron.
    - Consolidated global variables into `window.Hibiscus` (work in progress).
    - Extracted `parseAPIError` utility for consistent error handling.
    - Fixed duplicate `updateBalanceUI` definitions.
- **Performance**:
    - Optimized model loading list.
    - Better error handling for API timeouts and rate limits.

### 📦 Installation
- Simplified installation process: just run `run.bat` (Windows) or `node server.js`.
- Removed complex build requirements.

---
*Hibiscus Team*
