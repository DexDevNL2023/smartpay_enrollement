const fs = require('fs');
const path = 'cypress/reports';

if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
    console.log(`Folder created: ${path}`);
} else {
    console.log(`Folder already exists: ${path}`);
}