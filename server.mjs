import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { Server } from 'socket.io';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const rawPath = (req.url || '/').split('?')[0];
    const safePath = normalize(rawPath).replace(/^([.][.][/\\])+/, '');
    const path = safePath === '/' || safePath === '\\' || safePath === '' ? 'index.html' : safePath.replace(/^[/\\]/, '');
    const filePath = join(root, path);

    const content = await readFile(filePath);
    const type = mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let chatHistory = [];
const MAX_HISTORY = 50;
const HISTORY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
let onlineUsers = 0;

// Add words to this list to filter them out of usernames and messages
const BANNED_WORDS = ['badword1', 'badword2', 'inappropriate', 'spam'];

function filterText(text) {
  if (!text) return text;
  let filtered = String(text);
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
}

function cleanupHistory() {
  const now = Date.now();
  chatHistory = chatHistory.filter(msg => (now - msg.timestamp) < HISTORY_EXPIRY_MS);
}

io.on('connection', (socket) => {
  onlineUsers++;
  console.log(`User connected. Total: ${onlineUsers}`);
  io.emit('stats update', { onlineUsers });
  
  cleanupHistory();
  socket.emit('chat history', chatHistory);

  socket.on('chat message', (data) => {
    cleanupHistory();
    console.log(`Message from ${data.user}: ${data.text}`);
    
    // Filter both user name and message text
    const cleanUser = filterText(data.user || 'Anonymous');
    const cleanText = filterText(data.text);
    
    const msg = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(), // Store timestamp for expiration
      user: cleanUser,
      text: cleanText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    chatHistory.push(msg);
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift();
    }
    
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    onlineUsers = Math.max(0, onlineUsers - 1);
    console.log(`User disconnected. Total: ${onlineUsers}`);
    io.emit('stats update', { onlineUsers });
  });
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/`);
  console.log('Press Ctrl+C to stop.');
});
