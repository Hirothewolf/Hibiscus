# Changelog

All notable changes to Hibiscus will be documented in this file.

## [1.1.0] - 2026-01-12

### Added
- **Custom Media Directory**: Choose where to save your images and videos
- **Model Badges in Gallery**: See which model was used for each creation
- **Random Seed Generation**: Each generation is unique when seed is set to -1
- **Modular Architecture**: Code split into reusable modules:
  - `i18n.js` - Internationalization (PT/EN/ES)
  - `logger.js` - Logging system
  - `state.js` - State management
  - `backend.js` - Backend API client

### Changed
- Reduced main app.js from 3332 to 2484 lines (~25% reduction)
- Improved code organization and maintainability
- Updated Electron build scripts

### Fixed
- Images no longer repeat when using the same prompt (random seed fix)
- Better error handling in backend communication

## [1.0.0] - 2026-01-11

### Initial Release
- Image Generation with multiple models (Flux, Turbo, GPT-Image, etc.)
- Image Editing (img2img) with multi-image support
- Video Generation with Veo and Seedance models
- Smart Gallery with date organization
- Auto-Download functionality
- Multi-language support (PT/EN/ES)
- Dark and Light themes
- Electron desktop app support
- Smart retry with safety filter handling
