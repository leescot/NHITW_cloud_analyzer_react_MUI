import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursive copy function
function copyFileSync(source, target) {
  // If target is a directory, create it
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
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      if (fs.lstatSync(sourcePath).isDirectory()) {
        copyFolderSync(sourcePath, targetPath);
      } else {
        copyFileSync(sourcePath, targetPath);
      }
    });
  }
}

// Main function
function copyExtensionFiles() {
  try {
    // Copy manifest.json to dist
    copyFileSync(
      path.resolve(__dirname, '../public/manifest.json'),
      path.resolve(__dirname, '../dist/manifest.json')
    );

    // Copy popup.html to dist
    copyFileSync(
      path.resolve(__dirname, '../public/popup.html'),
      path.resolve(__dirname, '../dist/popup.html')
    );

    // Create images directory if it doesn't exist
    const distImagesDir = path.resolve(__dirname, '../dist/images');
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir, { recursive: true });
    }

    // Check if the images directory exists in public
    const publicImagesDir = path.resolve(__dirname, '../public/images');
    if (fs.existsSync(publicImagesDir)) {
      // Copy the images folder
      copyFolderSync(publicImagesDir, distImagesDir);
    } else {
      console.log('Images directory not found, creating empty directory');
      // Create placeholder image files
      ['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
        fs.writeFileSync(path.resolve(distImagesDir, icon), '');
      });
    }

    console.log('Extension files copied successfully');
  } catch (err) {
    console.error('Error copying extension files:', err);
  }
}

copyExtensionFiles(); 