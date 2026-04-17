const fs = require('fs');

const extractComponent = (componentName, nextMarker, filename, importsToAdd) => {
  let content = fs.readFileSync('src/app/page.tsx', 'utf8');
  let startStr = `function ${componentName}(`;
  let start = content.indexOf(startStr);
  if (start === -1) {
     startStr = `function ${componentName} `;
     start = content.indexOf(startStr);
  }
  
  // Find the exact line it starts on
  start = content.lastIndexOf('// ============================================================', start);

  let end = content.indexOf(nextMarker, start + 100);
  if (start !== -1 && end !== -1) {
    const compContent = content.substring(start, end);
    const newPageContent = content.substring(0, start) + content.substring(end);
    fs.writeFileSync('src/app/page.tsx', newPageContent);
    
    // Convert 'function Name' to 'export default function Name' 
    let exported = compContent.replace(`function ${componentName}`, `export default function ${componentName}`);

    const finalContent = importsToAdd + '\n' + exported;
    fs.writeFileSync(`src/app/components/${filename}`, finalContent);
    console.log(`Extracted ${componentName}`);
  } else {
    console.log(`Could not find ${componentName} (start: ${start}, end: ${end})`);
  }
};

const commonImports = `import React, { useState, useRef } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema } from '@/types';
import { type Locale, t } from '@/lib/i18n';
`;

// "nextMarker" for CompareView
extractComponent('CompareView', '// ============================================================\r\n// Generate View', 'CompareView.tsx', commonImports + `import { callAI, fileToBase64 } from '@/lib/storage';`);
if (!fs.existsSync('src/app/components/CompareView.tsx') || fs.readFileSync('src/app/components/CompareView.tsx', 'utf8').length < 100) {
    extractComponent('CompareView', '// ============================================================\n// Generate View', 'CompareView.tsx', commonImports + `import { callAI, fileToBase64 } from '@/lib/storage';`);
}

// Then Add import to page.tsx
let pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');
if (!pageContent.includes('import CompareView from')) {
    pageContent = pageContent.replace("import EditStyleView from '@/app/components/EditStyleView';", "import EditStyleView from '@/app/components/EditStyleView';\nimport CompareView from '@/app/components/CompareView';");
    fs.writeFileSync('src/app/page.tsx', pageContent);
}

