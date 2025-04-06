import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parseArgs } from 'node:util';

import { build } from 'esbuild';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.dirname(__dirname);

async function bundleContentScript({sourcemap = false, minify = true} = {}) {
  try {
    // Bundle content script
    await build({
      entryPoints: [path.resolve(ROOT, 'src', 'contentScript.jsx')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      outfile: path.resolve(ROOT, 'dist', 'content.js'),
      minify,
      sourcemap,
      jsx: 'automatic',
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    // Bundle background script separately
    await build({
      entryPoints: [path.resolve(ROOT, 'src', 'background.js')],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      outfile: path.resolve(ROOT, 'dist', 'background.js'),
      minify,
      sourcemap,
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

// Copy a file and automatically create parent folders
function copyFileSync(source, target) {
  if (!fs.existsSync(path.dirname(target))) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }

  fs.copyFileSync(source, target);
}

// Copy a directory recursively
function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    for (const file of fs.readdirSync(source)) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      if (fs.lstatSync(sourcePath).isDirectory()) {
        copyFolderSync(sourcePath, targetPath);
      } else {
        copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

function copyExtensionFiles() {
  try {
    // Copy manifest.json to dist
    copyFileSync(
      path.resolve(ROOT, 'public', 'manifest.json'),
      path.resolve(ROOT, 'dist', 'manifest.json')
    );

    // Copy popup.html to dist
    copyFileSync(
      path.resolve(ROOT, 'public', 'popup.html'),
      path.resolve(ROOT, 'dist', 'popup.html')
    );

    // Create images directory if it doesn't exist
    const distImagesDir = path.resolve(ROOT, 'dist', 'images');
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir, { recursive: true });
    }

    // Check if the images directory exists in public
    const publicImagesDir = path.resolve(ROOT, 'public', 'images');
    if (fs.existsSync(publicImagesDir)) {
      // Copy the images folder
      copyFolderSync(publicImagesDir, distImagesDir);
    } else {
      console.log('Images directory not found, creating placeholder image files');
      for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
        fs.writeFileSync(path.resolve(distImagesDir, icon), '');
      }
    }

    console.log('Extension files copied successfully');
  } catch (err) {
    console.error('Error copying extension files:', err);
  }
}

// Function to create zip
function createZip(filename) {
  try {
    // Create zip directory if it doesn't exist
    const zipDir = path.resolve(ROOT, 'zip');
    if (!fs.existsSync(zipDir)) {
      fs.mkdirSync(zipDir, { recursive: true });
    }

    const zipFilePath = path.resolve(zipDir, filename);

    // Check if dist directory exists
    const distDir = path.resolve(ROOT, 'dist');
    if (!fs.existsSync(distDir)) {
      console.error('Error: dist directory does not exist. Run build first.');
      process.exit(1);
    }

    // Create zip using command line (different approach based on OS)
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // For Windows
      // Using PowerShell to create zip
      const command = `powershell -command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
      execSync(command);
    } else {
      // For macOS/Linux
      // Navigate to dist directory and zip all contents
      const command = `cd "${distDir}" && zip -r "${zipFilePath}" .`;
      execSync(command);
    }

    console.log(`Successfully created zip at: ${zipFilePath}`);
    return zipFilePath;
  } catch (error) {
    console.error('Error creating zip:', error);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs({
    options: {
      help: {
        type: 'boolean',
        short: 'h'
      },
      zip: {
        type: 'boolean',
      },
      alpha: {
        type: 'boolean',
      },
      test: {
        type: 'boolean',
      }
    },
    allowPositionals: true,
  });

  if (args.values.help) {
    const usage = `\
Usage: node build.js [options ...]

Options:
    --help | -h      Display usage help.
    --zip            Build a zip bundle under \`zip/\`.
    --alpha          Build an alpha zip bundle under \`zip/\`.
    --test           Build and distribute a local test version.
`;
    process.stdout.write(usage);
    return;
  }

  if (args.values.test) {
    await bundleContentScript({sourcemap: true});
    await copyExtensionFiles();

    for (const file of fs.readdirSync(path.resolve(ROOT, 'tests', 'extension'))) {
      copyFileSync(
        path.resolve(ROOT, 'tests', 'extension', file),
        path.resolve(ROOT, 'dist', file),
      );
    }

    console.log(`Successfully copied local test files`);
    return;
  }

  await bundleContentScript();
  await copyExtensionFiles();

  if (args.values.zip || args.values.alpha) {
    // Get the current date in YYYYMMDD format
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

    // Get version from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const version = packageJson.version;

    if (args.values.zip) {
      createZip(`NHITW_cloud_analyzer_v${version}_${dateStr}.zip`);
    } else {
      createZip(`NHITW_cloud_analyzer_v${version}_${dateStr}_ALPHA.zip`);
    }
    return;
  }
}

await main();
