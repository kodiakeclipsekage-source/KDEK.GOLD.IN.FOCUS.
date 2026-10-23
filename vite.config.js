import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks(id){if(id.includes('pdfjs-dist'))return 'pdf';if(id.includes('firebase'))return 'firebase';if(id.includes('zod')||id.includes('decimal.js'))return 'validation';}}}}});
