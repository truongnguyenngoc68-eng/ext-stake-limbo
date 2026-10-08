import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],base:'./',build:{rollupOptions:{input:'panel.html',output:{entryFileNames:'app.js',assetFileNames:'[name][extname]'}}}});
