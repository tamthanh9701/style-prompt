const fs = require('fs');

const extractAndSave = (sourceFile, targetFile, startString, endString, imports, exportedFunctionNames) => {
  let content = fs.readFileSync(sourceFile, 'utf8');
  let start = content.indexOf(startString);
  if (start === -1) {
    console.log(`Could not find start marker: ${startString.substring(0,30)}...`);
    return false;
  }
  // move start up to include comments if possible
  const prevLine = content.lastIndexOf('// ============================================================', start);
  if (prevLine !== -1 && prevLine > start - 150) {
    start = prevLine;
  }

  let end = endString ? content.indexOf(endString, start + 100) : content.length;
  // move end to include the last newline
  if (end === -1) {
      if (endString) {
          console.log(`Could not find end marker: ${endString.substring(0,30)}...`);
          return false;
      }
      end = content.length;
  } else {
      // Find exact previous line break to not cut in half
      end = content.lastIndexOf('\n', end);
  }

  const compContent = content.substring(start, end);
  
  let finalCompContent = compContent;
  exportedFunctionNames.forEach(fn => {
    finalCompContent = finalCompContent.replace(`function ${fn}(`, `export default function ${fn}(`);
    finalCompContent = finalCompContent.replace(`function ${fn} `, `export default function ${fn} `);
  });

  const finalContent = imports + '\n\n' + finalCompContent;
  fs.writeFileSync(targetFile, finalContent);
  
  const newContent = content.substring(0, start) + content.substring(end);
  fs.writeFileSync(sourceFile, newContent);
  
  console.log(`Successfully extracted ${exportedFunctionNames.join(', ')} to ${targetFile}`);
  return true;
};

// 1. CompareView
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/CompareView.tsx', 
    'function CompareView', 
    'function GenerateView', 
    `import React, { useState, useRef } from 'react';\nimport type { StyleLibrary, AppSettings, PromptSchema } from '@/types';\nimport { type Locale, t } from '@/lib/i18n';\nimport { callAI, fileToBase64 } from '@/lib/storage';`,
    ['CompareView']
);

// 2. GenerateView
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/GenerateView.tsx', 
    'function GenerateView', 
    'function StyleTransferView', 
    `import React, { useState } from 'react';\nimport type { StyleLibrary, AppSettings, PromptSchema } from '@/types';\nimport { type Locale, t } from '@/lib/i18n';\nimport { callImageGen, generateId } from '@/lib/storage';\nimport { saveGenImage, getGenImages } from '@/lib/db';`,
    ['GenerateView']
);

// 3. StyleTransferView (includes EvalForm)
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/StyleTransferView.tsx', 
    'function StyleTransferView', 
    'function ImageEditView', 
    `import React, { useState, useEffect } from 'react';\nimport type { StyleLibrary, AppSettings, PromptInstance, EvalRecord } from '@/types';\nimport { type Locale, t } from '@/lib/i18n';\nimport { generateId, addPromptInstance, addEvalRecord, fileToBase64, callImageGen } from '@/lib/storage';\nimport { saveGenImage, getGenImages, type GenImageRecord } from '@/lib/db';`,
    ['StyleTransferView']
); // EvaluForm shouldn't be default exported, it is used by StyleTransferView locally or we can export it normally. We only export default StyleTransferView.

// 4. ImageEditView
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/ImageEditView.tsx', 
    'function ImageEditView', 
    'function LogsView', 
    `import React, { useState, useEffect, useRef } from 'react';\nimport type { StyleLibrary, AppSettings, PromptSchema } from '@/types';\nimport { type Locale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';\nimport { callAI, fileToBase64 } from '@/lib/storage';\nimport { PROMPT_GROUPS } from '@/types';\nimport FieldInput from '@/app/components/FieldInput';`,
    ['ImageEditView']
);

// 5. LogsView
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/LogsView.tsx', 
    'function LogsView', 
    'function SettingsView', 
    `import React, { useState, useEffect } from 'react';\nimport { type Locale, t } from '@/lib/i18n';`,
    ['LogsView']
);

// 6. SettingsView
extractAndSave(
    'src/app/page.tsx', 
    'src/app/components/SettingsView.tsx', 
    'function SettingsView', 
    null, // till end of file
    `import React, { useState, useEffect } from 'react';\nimport type { AppSettings } from '@/types';\nimport { type Locale, t } from '@/lib/i18n';\nimport { callAI } from '@/lib/storage';`,
    ['SettingsView']
);

console.log('Extraction complete! Now updating page.tsx imports...');
let pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');

const additionalImports = `
import CompareView from '@/app/components/CompareView';
import GenerateView from '@/app/components/GenerateView';
import StyleTransferView from '@/app/components/StyleTransferView';
import ImageEditView from '@/app/components/ImageEditView';
import LogsView from '@/app/components/LogsView';
import SettingsView from '@/app/components/SettingsView';
`;

pageContent = pageContent.replace("import EditStyleView from '@/app/components/EditStyleView';", "import EditStyleView from '@/app/components/EditStyleView';" + additionalImports);
fs.writeFileSync('src/app/page.tsx', pageContent);

console.log('Done!');
