const fs = require('fs');
let content = fs.readFileSync('src/app/components/EditStyleView.tsx', 'utf8');
const start = content.indexOf('function FieldInput');
if (start !== -1) {
  content = content.substring(0, start);
  content = "import FieldInput from '@/app/components/FieldInput';\n" + content;
  fs.writeFileSync('src/app/components/EditStyleView.tsx', content);
  console.log('Removed FieldInput from EditStyleView');
}
