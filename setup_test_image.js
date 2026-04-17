const fs = require('fs');

// Generate a tiny 1x1 base64 transparent PNG for testing upload
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
fs.writeFileSync('test_image.png', Buffer.from(base64Png, 'base64'));
console.log('Created test_image.png');
