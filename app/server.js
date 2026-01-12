/**
 * Hibiscus 🌺 - Backend Server
 * Provides local file storage for gallery persistence
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
// Using WHATWG URL API instead of deprecated url.parse()

// Configuration
const PORT = process.env.PORT || 3333;

// Detect if running in packaged Electron app
function getGalleryPath() {
    // Check if running in Electron packaged mode
    if (process.env.ELECTRON_RUN_AS_NODE || process.resourcesPath) {
        // In packaged Electron, gallery is in extraResources
        const electronGallery = path.join(process.resourcesPath || '', 'gallery');
        if (fs.existsSync(electronGallery) || process.resourcesPath) {
            console.log('📦 Running in Electron packaged mode');
            return electronGallery;
        }
    }
    // Development mode - gallery is in same folder as server.js
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

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve(body);
            }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function sendError(res, message, status = 500) {
    sendJSON(res, { error: message }, status);
}

// Request handler
async function handleRequest(req, res) {
    // Using WHATWG URL API (secure alternative to deprecated url.parse)
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // API Routes
    if (pathname.startsWith('/api/')) {
        return handleAPI(req, res, pathname, query);
    }
    
    // Serve gallery files
    if (pathname.startsWith('/gallery/')) {
        const filePath = path.join(__dirname, pathname);
        return serveFile(res, filePath);
    }
    
    // Serve static files
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    serveFile(res, filePath);
}

function serveFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

async function handleAPI(req, res, pathname, query) {
    try {
        // GET /api/gallery - List all gallery items
        if (pathname === '/api/gallery' && req.method === 'GET') {
            const data = getGalleryIndex();
            return sendJSON(res, data);
        }
        
        // POST /api/gallery - Save new item
        if (pathname === '/api/gallery' && req.method === 'POST') {
            const body = await parseBody(req);
            const { type, prompt, params, blob, customDir } = body;
            
            if (!blob) {
                return sendError(res, 'No blob data provided', 400);
            }
            
            const id = generateId(type);
            const dateFolder = getDateFolder();
            
            // Use custom directory if provided, otherwise use default
            let typeDir;
            if (customDir) {
                // Custom directory: create images/videos subfolders inside it
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
                dateFolder
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
            return sendJSON(res, { success: true, item });
        }
        
        // DELETE /api/gallery/:id - Delete item
        if (pathname.startsWith('/api/gallery/') && req.method === 'DELETE') {
            const id = pathname.split('/').pop();
            const data = getGalleryIndex();
            const itemIndex = data.items.findIndex(item => item.id === id);
            
            if (itemIndex === -1) {
                return sendError(res, 'Item not found', 404);
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
            return sendJSON(res, { success: true });
        }
        
        // GET /api/stats - Get statistics
        if (pathname === '/api/stats' && req.method === 'GET') {
            const data = getGalleryIndex();
            return sendJSON(res, data.stats);
        }
        
        // POST /api/stats - Update statistics
        if (pathname === '/api/stats' && req.method === 'POST') {
            const body = await parseBody(req);
            const data = getGalleryIndex();
            data.stats = { ...data.stats, ...body };
            saveGalleryIndex(data);
            return sendJSON(res, { success: true, stats: data.stats });
        }
        
        // DELETE /api/gallery - Clear all
        if (pathname === '/api/gallery' && req.method === 'DELETE') {
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
            return sendJSON(res, { success: true });
        }
        
        sendError(res, 'Not Found', 404);
        
    } catch (error) {
        console.error('API Error:', error);
        sendError(res, error.message);
    }
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log('');
    console.log('🌺 ═══════════════════════════════════════════════════');
    console.log('   Hibiscus - AI Art Studio');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 Server running at: http://localhost:${PORT}`);
    console.log(`   🖼️  Images folder: ${IMAGES_DIR}`);
    console.log(`   🎬 Videos folder: ${VIDEOS_DIR}`);
    console.log('');
    console.log('   Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
