const fs = require('fs');

const inputPath = 'C:\\Users\\andre\\Desktop\\Regulament.txt';
const outputPath = 'C:\\Users\\andre\\Desktop\\FiveM_Panel_S4G\\rulesData.js';

const rawData = fs.readFileSync(inputPath, 'utf8');

const sections = [
  { header: 'Regulament general:', slug: 'general', title: 'Regulament General', category: 'Regulamente' },
  { header: 'Regulament Politie:', slug: 'politie', title: 'Regulament Departament Poliție (LSPD)', category: 'Regulamente' },
  { header: 'Sanctiuni:', slug: 'sanctiuni', title: 'Încălcări de Regulament (Check Points)', category: 'Coduri' },
  { header: 'Regulament Smurd:', slug: 'smurd', title: 'Regulament Serviciul SMURD', category: 'Regulamente' },
  { header: 'Regulament Lideri:', slug: 'lideri', title: 'Regulament Lideri', category: 'Regulamente' },
  { header: 'Regulament Mafii/Gang:', slug: 'mafii', title: 'Regulament Mafii / Gang-uri', category: 'Regulamente' },
  { header: 'Cod Penal:', slug: 'cod-penal', title: 'Cod Penal Server', category: 'Coduri' }
];

let parsedSections = [];
let currentSection = null;

const lines = rawData.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  const foundSection = sections.find(s => line === s.header);
  
  if (foundSection) {
    currentSection = {
      slug: foundSection.slug,
      title: foundSection.title,
      category: foundSection.category,
      content: ''
    };
    parsedSections.push(currentSection);
    continue;
  }
  
  if (currentSection) {
    if (line.startsWith('Capitolul')) {
      currentSection.content += `\n<h3>${line}</h3>\n`;
    } else if (line !== '') {
      if (/^\d+\.\d+/.test(line) || /^\d+\.\(\d+\)/.test(line)) {
         currentSection.content += `<p><b>${line}</b><br>\n`;
      } else {
         if (currentSection.content.endsWith('<br>\n')) {
             currentSection.content += `${line}</p>\n`;
         } else {
             currentSection.content += `<p>${line}</p>\n`;
         }
      }
    }
  }
}

const fileContent = `module.exports = ` + JSON.stringify(parsedSections, null, 2) + `;`;
fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log("Rules generated successfully!");
