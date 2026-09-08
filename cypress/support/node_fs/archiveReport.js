const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '../../reports');
const oldDir = path.join(reportsDir, 'old');
const currentReport = path.join(reportsDir, 'current-report.json');

// Crée le dossier old s'il n'existe pas
if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir);

// Si le rapport existe, déplace-le avec un numéro
if (fs.existsSync(currentReport)) {
  const files = fs.readdirSync(oldDir).filter(f => f.endsWith('.json'));
  const nextNum = files.length + 1;
  const newName = path.join(oldDir, `report_${nextNum}.json`);
  fs.renameSync(currentReport, newName);
  console.log(`Archived current-report.json as report_${nextNum}.json`);
}