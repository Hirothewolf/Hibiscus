/**
 * Hibiscus 🌺 - Backend Server
 * Provides local file storage for gallery persistence
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = 3333;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname)); // Serve files from the same directory as server.js (app/)

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');

// Helper to append log
function appendLog(entry) {
    const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message} ${entry.data ? JSON.stringify(entry.data) : ''}\n`;
    fs.appendFile(logFile, logLine, (err) => {
        if (err) console.error('Failed to write to log file:', err);
    });
}

// ===== Logs Endpoint =====
app.post('/api/logs', (req, res) => {
    const { level, message, data, timestamp } = req.body;

    if (!level || !message) {
        return res.status(400).json({ error: 'Missing level or message' });
    }

    const entry = {
        timestamp: timestamp || new Date().toISOString(),
        level,
        message,
        data
    };

    appendLog(entry);

    // Also log to console
    console.log(`[CLIENT-LOG] [${level.toUpperCase()}] ${message}`);

    res.json({ success: true });
});

// ===== Helper Functions & Config =====
function getGalleryPath() {
    return path.join(__dirname, 'gallery');
}

const GALLERY_DIR = getGalleryPath();
const IMAGES_DIR = path.join(GALLERY_DIR, 'images');
const VIDEOS_DIR = path.join(GALLERY_DIR, 'videos');
const GALLERY_INDEX = path.join(GALLERY_DIR, 'index.json');

console.log('📂 Gallery directory:', GALLERY_DIR);

// Ensure gallery directories exist
[GALLERY_DIR, IMAGES_DIR, VIDEOS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
});

// Initialize gallery index if not exists
if (!fs.existsSync(GALLERY_INDEX)) {
    fs.writeFileSync(GALLERY_INDEX, JSON.stringify({ items: [], stats: { images: 0, videos: 0, downloads: 0 } }, null, 2));
    console.log('📋 Created gallery index');
}

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Helper functions
function getGalleryIndex() {
    try {
        return JSON.parse(fs.readFileSync(GALLERY_INDEX, 'utf8'));
    } catch (error) {
        return { items: [], stats: { images: 0, videos: 0, downloads: 0 } };
    }
}

function saveGalleryIndex(data) {
    fs.writeFileSync(GALLERY_INDEX, JSON.stringify(data, null, 2));
}

function generateId(type = 'image') {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const prefix = type === 'video' ? 'video' : 'image';
    return `${prefix}-${day}-${month}-${year}-${hours}${minutes}${seconds}`;
}

function getDateFolder() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ===== Routes =====

// API Routes
app.get('/api/gallery', (req, res) => {
    const data = getGalleryIndex();
    res.json(data);
});

app.post('/api/gallery', async (req, res) => {
    try {
        const { type, prompt, params, blob, customDir } = req.body;

        if (!blob) {
            return res.status(400).json({ error: 'No blob data provided' });
        }

        const id = generateId(type);
        const dateFolder = getDateFolder();

        // Use custom directory if provided, otherwise use default
        let typeDir;
        if (customDir) {
            const customBase = path.resolve(customDir);
            typeDir = path.join(customBase, type === 'video' ? 'videos' : 'images');
        } else {
            typeDir = type === 'video' ? VIDEOS_DIR : IMAGES_DIR;
        }

        const folderPath = path.join(typeDir, dateFolder);

        // Create date folder
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Determine file extension
        const ext = type === 'video' ? '.mp4' : '.png';
        const filename = `${id}${ext}`;
        const filePath = path.join(folderPath, filename);
        const typeFolder = type === 'video' ? 'videos' : 'images';
        const relativePath = `gallery/${typeFolder}/${dateFolder}/${filename}`;

        // Save file
        const base64Data = blob.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        // Update index
        const data = getGalleryIndex();
        const item = {
            id,
            type,
            prompt,
            params,
            filename,
            path: relativePath,
            date: new Date().toISOString(),
            dateFolder,
            favorite: false
        };
        data.items.unshift(item);

        // Update stats
        if (type === 'video') {
            data.stats.videos++;
        } else {
            data.stats.images++;
        }

        saveGalleryIndex(data);

        console.log(`💾 Saved ${type}: ${relativePath}`);
        res.json({ success: true, item });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gallery/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = getGalleryIndex();
        const itemIndex = data.items.findIndex(item => item.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const item = data.items[itemIndex];

        // Delete file
        const filePath = path.join(__dirname, item.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Update index
        data.items.splice(itemIndex, 1);
        saveGalleryIndex(data);

        console.log(`🗑️ Deleted: ${item.path}`);
        res.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/gallery/:id', (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const data = getGalleryIndex();
        const item = data.items.find(item => item.id === id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        if (body.favorite !== undefined) {
            item.favorite = body.favorite;
        }

        saveGalleryIndex(data);
        console.log(`✏️ Updated: ${id}`, body);
        res.json({ success: true, item });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', (req, res) => {
    const data = getGalleryIndex();
    res.json(data.stats);
});

app.post('/api/stats', (req, res) => {
    try {
        const body = req.body;
        const data = getGalleryIndex();
        data.stats = { ...data.stats, ...body };
        saveGalleryIndex(data);
        res.json({ success: true, stats: data.stats });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gallery', (req, res) => {
    try {
        const data = getGalleryIndex();

        // Delete all files
        for (const item of data.items) {
            const filePath = path.join(__dirname, item.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Reset index
        saveGalleryIndex({ items: [], stats: { images: 0, videos: 0, downloads: 0 } });

        console.log('🗑️ Cleared gallery');
        res.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve Gallery Files
app.use('/gallery', express.static(GALLERY_DIR));

// Start Server
app.listen(port, () => {
    console.log('');
    console.log('🌺 ═══════════════════════════════════════════════════');
    console.log('   Hibiscus - AI Art Studio');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 Server running at: http://localhost:${port}`);
    console.log(`   🖼️  Images folder: ${IMAGES_DIR}`);
    console.log(`   🎬 Videos folder: ${VIDEOS_DIR}`);
    console.log('');
    console.log('   Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});
