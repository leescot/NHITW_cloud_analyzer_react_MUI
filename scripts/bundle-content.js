import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function bundleContentScript() {
  try {
    // Bundle content script
    await build({
      entryPoints: [path.resolve(__dirname, '../src/contentScript.jsx')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      outfile: path.resolve(__dirname, '../dist/content.js'),
      minify: true,
      sourcemap: false,
      jsx: 'automatic',
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    // Bundle background script separately
    await build({
      entryPoints: [path.resolve(__dirname, '../src/background.js')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      outfile: path.resolve(__dirname, '../dist/background.js'),
      minify: true,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    console.log('Content and background scripts bundled successfully');
  } catch (error) {
    console.error('Error bundling scripts:', error);
    process.exit(1); // Exit with error code
  }
}

bundleContentScript(); 