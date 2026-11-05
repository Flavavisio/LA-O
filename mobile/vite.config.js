import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),publicDir:'../public',build:{outDir:'dist',emptyOutDir:true},server:{host:'127.0.0.1'}});
