const fs = require('fs');
const path = 'cypress/reports';

if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true, force: true });
    console.log(`Folder deleted: ${path}`);
} else {
    console.log(`Folder does not exist: ${path}`);
}