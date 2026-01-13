#!/usr/bin/env node
/**
 * Simple HTTP server to serve the collaborative editor demo
 * Run: node serve-demo.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Default to demo file
  let filePath = req.url === '/' || req.url === ''
    ? './public/demo-collaborative-editor.html'
    : './public' + req.url;

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 - File Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('500 - Internal Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 Collaborative Editor Demo Server');
  console.log('━'.repeat(50));
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('');
  console.log('📝 Instructions:');
  console.log('1. Open the URL in multiple browser windows');
  console.log('2. Start typing in one window');
  console.log('3. Watch the text appear in real-time in other windows!');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('━'.repeat(50));
});
