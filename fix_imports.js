const fs = require('fs');

function addImport(file, newImportStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import React,", newImportStr + "\nimport React,");
  fs.writeFileSync(file, content);
}

// CompareView
addImport('src/app/components/CompareView.tsx', `import { flattenPrompt } from '@/types';\nimport { getGroupLabel, getFieldLabel } from '@/lib/i18n';`);

// EvalForm
addImport('src/app/components/EvalForm.tsx', `import type { AppSettings } from '@/types';\nimport { generateId, addPromptInstance } from '@/lib/storage';`);

// GenerateView
let gContent = fs.readFileSync('src/app/components/GenerateView.tsx', 'utf8');
gContent = gContent.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
gContent = "import { type VariantField } from '@/types';\nimport EvalForm from '@/app/components/EvalForm';\nimport { callAI } from '@/lib/storage';\n" + gContent;
fs.writeFileSync('src/app/components/GenerateView.tsx', gContent);

// ImageEditView
addImport('src/app/components/ImageEditView.tsx', `import { createEmptyPrompt, getGroupCategory } from '@/types';`);

// LogsView
let lContent = fs.readFileSync('src/app/components/LogsView.tsx', 'utf8');
lContent = lContent.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';");
fs.writeFileSync('src/app/components/LogsView.tsx', lContent);

// SettingsView
addImport('src/app/components/SettingsView.tsx', `import { callImageGen } from '@/lib/storage';`);

// StyleTransferView
addImport('src/app/components/StyleTransferView.tsx', `import { callAI } from '@/lib/storage';\nimport { getGroupLabel, getFieldLabel } from '@/lib/i18n';\nimport EvalForm from '@/app/components/EvalForm';`);

// page.tsx
let pContent = fs.readFileSync('src/app/page.tsx', 'utf8');
const dupImport = "import CompareView from '@/app/components/CompareView';\n";
let firstIndex = pContent.indexOf(dupImport);
if (firstIndex !== -1) {
   let secondIndex = pContent.indexOf(dupImport, firstIndex + dupImport.length);
   if (secondIndex !== -1) {
       pContent = pContent.substring(0, secondIndex) + pContent.substring(secondIndex + dupImport.length);
       fs.writeFileSync('src/app/page.tsx', pContent);
   }
}
console.log('Done fixing imports.');
