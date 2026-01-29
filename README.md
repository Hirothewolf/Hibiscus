<h1 align="center">🌺 Hibiscus</h1>

<p align="center">
  <strong>AI-powered creative studio for image and video generation</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.2.0-ff69b4?style=for-the-badge" alt="Version 1.2.0"/>
  <a href="https://hibiscus-yp9g.onrender.com/">
    <img src="https://img.shields.io/badge/🌺%20Try%20Live%20Demo-hibiscus--yp9g.onrender.com-ff69b4?style=for-the-badge" alt="Live Demo"/>
  </a>
</p>

<p align="center">
  <a href="https://pollinations.ai/">
    <img src="https://img.shields.io/badge/Powered%20by-🐝%20Pollinations.ai-fbbf24?style=for-the-badge" alt="Powered by Pollinations.ai"/>
  </a>
  <img src="https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"/>
</p>

<p align="center">
  <img src="Hibiscus1.png" alt="Hibiscus - Image Generation" width="100%"/>
</p>

<p align="center">
  <img src="Hibiscus2.png" alt="Hibiscus - Gallery" width="100%"/>
</p>

<p align="center">
  <img src="Hibiscus3.png" alt="Hibiscus - Video Generation" width="100%"/>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Image Generation** | Create stunning images with Flux, Turbo, GPT-Image, and more |
| ✏️ **Image Editing** | Transform existing images with AI-powered img2img |
| 🎬 **Video Generation** | Generate videos with Veo, Seedance models |
| 📁 **Smart Gallery** | Automatic organization by date with model badges |
| 💾 **Auto-Download** | Save creations automatically to organized folders |
| 📂 **Custom Media Dir** | Choose where to save your creations |
| 🔄 **Smart Retry** | Exponential backoff + safety filter persistence |
| 🌍 **Multi-Language** | Portuguese, English, and Spanish |
| 🎭 **Themes** | Dark and Light mode support |
| 📦 **Modular Code** | Clean architecture with separated modules |

---

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the App:**

   **Windows:**
   ```cmd
   run.bat
   ```

   **Linux / macOS:**
   ```bash
   ./run.sh
   ```

The app will open at `http://localhost:3333`

---

## 🎮 How to Use

1. **Choose Language** - Select PT/EN/ES on first run
2. **Generate Image** - Enter prompt → Select model & settings → Generate
3. **Edit Image** - Upload image(s) → Describe changes → Apply
4. **Generate Video** - Enter prompt → Choose duration → Generate
5. **Gallery** - View, download, edit, or delete creations
6. **Settings** - Configure API key, auto-download, theme

---

## 🔑 API Key

For higher rate limits and premium models, get your API key at:

<p align="center">
  <a href="https://enter.pollinations.ai">
    <img src="https://img.shields.io/badge/Get%20API%20Key-enter.pollinations.ai-ec4899?style=for-the-badge" alt="Get API Key"/>
  </a>
</p>

---

## 📁 Project Structure

```
Hibiscus/
├── app/
│   ├── index.html      # Main UI
│   ├── styles.css      # Styling (Imports) 
│   ├── app.js          # Frontend logic
│   ├── server.js       # Backend server
│   ├── css/            # Modular CSS
│   │   ├── core/       # Variables, reset, animations
│   │   ├── layout/     # Layout scaffolding
│   │   ├── components/ # UI components
│   │   └── modules/    # Feature-specific styles
│   ├── modules/        # JavaScript Modules
│   │   ├── core/       # Core utilities
│   │   ├── gallery/    # Gallery logic
│   │   ├── generators/ # Image/Video generation logic
│   │   ├── ui/         # UI management
│   │   ├── i18n.js     # Internationalization
│   │   ├── logger.js   # Logging system
│   │   ├── state.js    # State management
│   │   └── backend.js  # Backend API client
│   └── gallery/        # Saved Media Storage
│       ├── images/     # By date (DD-MM-YYYY)
│       └── videos/     # By date (DD-MM-YYYY)
├── run.bat / run.sh    # Quick start scripts
└── package.json        # Dependencies
```

---

## 🛠️ Requirements

- **Node.js** v16 or higher
- **Internet connection** for API access

---

## 🔗 Links

<p align="center">
  <a href="https://pollinations.ai/">
    <img src="https://img.shields.io/badge/🐝%20Pollinations.ai-Platform-fbbf24?style=flat-square" alt="Pollinations"/>
  </a>
  <a href="https://gen.pollinations.ai/">
    <img src="https://img.shields.io/badge/📚%20API-Documentation-339933?style=flat-square" alt="API Docs"/>
  </a>
  <a href="https://github.com/pollinations/pollinations">
    <img src="https://img.shields.io/badge/GitHub-Pollinations-181717?style=flat-square&logo=github" alt="GitHub"/>
  </a>
</p>

---

## 📋 Changelog

### v1.2.0 (January 2026)
- 🔢 **Resolution Multiplier** - 1x, 2x, 4x toggle for high-res output on image & img2img
- 📐 **Extended Aspect Ratios** - 10 presets: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- 🛡️ **Improved Safety Retry** - More robust error handling, fewer false cancellations
- 🎨 **UI Consistency** - Unified button styling across the app

### v1.1.0 (January 2026)
- ✨ **Modular Architecture** - Code split into reusable modules (i18n, logger, state, backend)
- 🎲 **Random Seed Fix** - Each generation now produces unique results
- 🏷️ **Model Badges** - Gallery shows which model was used for each creation
- 📂 **Custom Media Directory** - Choose where to save your files

### v1.0.0
- 🎨 Initial release with image/video generation
- 🌍 Multi-language support (PT/EN/ES)
- 📁 Smart gallery with date organization
- 💾 Auto-download feature

---

## 📝 License

MIT License - Feel free to use, modify, and distribute.

---

<p align="center">
  Made with 🤍 by <a href="https://github.com/Hirothewolf">Hirothewolf</a>
  <br/>
  Powered by <a href="https://pollinations.ai/">🐝 Pollinations.ai</a>
</p>
