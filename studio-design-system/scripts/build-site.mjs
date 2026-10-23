import fs from 'node:fs';
import path from 'node:path';
import {root,outputs,writeOutputs} from './design-system.mjs';
const check=process.argv.includes('--check');
if(check){const stale=[...outputs()].filter(([file,text])=>!fs.existsSync(path.join(root,'dist',file))||fs.readFileSync(path.join(root,'dist',file),'utf8')!==text).map(([file])=>file);if(stale.length)throw Error('Generated output is stale. Run npm run build:\n'+stale.join('\n'));console.log('All generated pages and design-system assets are current.');}
else console.log(`Built ${writeOutputs().size} pages and assets from the shared design system.`);
