<h1 align="center">🌺 Hibiscus</h1>

<p align="center">
  <strong>AI-powered creative studio for image and video generation</strong>
</p>

<p align="center">
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
  <img src="Hibiscus1.png" alt="Hibiscus Screenshot" width="100%"/>
</p>

<p align="center">
  <img src="Hibiscus2.png" alt="Hibiscus Screenshot 2" width="100%"/>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Image Generation** | Create stunning images with Flux, Turbo, GPT-Image, and more |
| ✏️ **Image Editing** | Transform existing images with AI-powered img2img |
| 🎬 **Video Generation** | Generate videos with Veo 2, Seedance models |
| 📁 **Smart Gallery** | Automatic organization by date with persistence |
| 💾 **Auto-Download** | Save creations automatically to organized folders |
| 🔄 **Smart Retry** | Exponential backoff + safety filter persistence |
| 🌍 **Multi-Language** | Portuguese, English, and Spanish |
| 🎭 **Themes** | Dark and Light mode support |

---

## 🚀 Quick Start

### Run Instantly

**Windows:**
```cmd
run.bat
```

**Linux / macOS:**
```bash
chmod +x run.sh && ./run.sh
```

The app will open at `http://localhost:3333`

---

## 📦 Installation Options

<details>
<summary><strong>🖥️ Desktop App (Electron)</strong></summary>

Build a standalone executable:

**Windows:**
```cmd
build.bat
```

**Linux / macOS:**
```bash
chmod +x build.sh && ./build.sh
```

Find the installer in the `dist/` folder.

</details>

<details>
<summary><strong>📥 Full Installation</strong></summary>

**Windows:**
```cmd
install.bat
```

**Linux / macOS:**
```bash
chmod +x install.sh && ./install.sh
```

Creates desktop shortcuts and configures everything automatically.

</details>

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
│   ├── styles.css      # Styling  
│   ├── app.js          # Frontend logic
│   ├── server.js       # Backend server
│   └── gallery/        # Saved media
│       ├── images/     # By date (DD-MM-YYYY)
│       └── videos/     # By date (DD-MM-YYYY)
├── run.bat / run.sh    # Quick start scripts
├── build.bat / build.sh # Electron build scripts
├── main.js             # Electron main process
└── package.json        # Dependencies
```

---

## 🛠️ Requirements

- **Node.js** v16 or higher
- **Internet connection** for API access
- ~2GB disk space (for Electron builds)

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

## 📝 License

MIT License - Feel free to use, modify, and distribute.

---

<p align="center">
  Made with 🤍 by <a href="https://github.com/Hirothewolf">Hirothewolf</a>
  <br/>
  Powered by <a href="https://pollinations.ai/">🐝 Pollinations.ai</a>
</p>
