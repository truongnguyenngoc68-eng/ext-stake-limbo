import {defineConfig} from 'vite';
export default defineConfig({build:{emptyOutDir:false,lib:{entry:'src/background.ts',name:'SlideBackground',formats:['iife'],fileName:()=> 'background.js'}}});
