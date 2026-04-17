const fs = require('fs');

let content = fs.readFileSync('src/app/components/StyleTransferView.tsx', 'utf8');
const evalStart = content.indexOf('function EvalForm');
const evalEnd = content.lastIndexOf('}');

if (evalStart !== -1) {
  const evalContent = content.substring(evalStart, evalEnd + 1);
  content = content.substring(0, evalStart);
  fs.writeFileSync('src/app/components/StyleTransferView.tsx', content);

  const evalImports = `import React, { useState } from 'react';
import { type Locale, t } from '@/lib/i18n';
import { addEvalRecord } from '@/lib/storage';

export default ` + evalContent.replace(/function EvalForm/g, 'function EvalForm');
  
  fs.writeFileSync('src/app/components/EvalForm.tsx', evalImports);
  console.log('Extracted EvalForm!');
}
