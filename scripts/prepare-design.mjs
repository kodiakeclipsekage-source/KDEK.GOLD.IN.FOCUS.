import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {configuration,tokensCSS,typographyCSS} from '../studio-design-system/scripts/design-system.mjs';

// Generate from the supplied design-system source; never edit its dist CSS.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public');
const source=path.join(root,'studio-design-system','dist');
const config=configuration();
await fs.mkdir(path.join(output,'fonts'),{recursive:true});
await fs.writeFile(path.join(output,'studio-tokens.css'),tokensCSS(config));
await fs.writeFile(path.join(output,'studio-typography.css'),typographyCSS(config));
for(const name of ['the-bold-font.woff','kanit-400.woff','kanit-500.woff','kanit-600.woff','LICENSE.rtf','Kanit-OFL.txt']){
 await fs.copyFile(path.join(source,'fonts',name),path.join(output,'fonts',name));
}
for(const name of ['brand-badge.webp','brand-full.png','brand-logo.png','favicon.ico'])await fs.copyFile(path.join(source,name),path.join(output,name));
console.log('KDEK Studio: tokens, local fonts and brand assets prepared.');
