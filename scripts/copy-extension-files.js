import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyExtensionFiles() {
  try {
    // Copy manifest.json to dist
    await fs.copy(
      path.resolve(__dirname, '../public/manifest.json'),
      path.resolve(__dirname, '../dist/manifest.json')
    );

    // Copy popup.html to dist
    await fs.copy(
      path.resolve(__dirname, '../public/popup.html'),
      path.resolve(__dirname, '../dist/popup.html')
    );

    // Create images directory if it doesn't exist
    await fs.ensureDir(path.resolve(__dirname, '../dist/images'));

    // Check if the images directory exists
    const imagesDir = path.resolve(__dirname, '../public/images');
    const imagesDirExists = await fs.pathExists(imagesDir);

    if (imagesDirExists) {
      // Copy all image files
      const imageFiles = await fs.readdir(imagesDir);
      
      for (const file of imageFiles) {
        await fs.copy(
          path.resolve(__dirname, `../public/images/${file}`),
          path.resolve(__dirname, `../dist/images/${file}`)
        );
      }
    } else {
      console.log('Images directory not found, creating empty directory');
      // Create placeholder image if needed
      await fs.writeFile(
        path.resolve(__dirname, '../dist/images/icon16.png'),
        ''
      );
      await fs.writeFile(
        path.resolve(__dirname, '../dist/images/icon48.png'),
        ''
      );
      await fs.writeFile(
        path.resolve(__dirname, '../dist/images/icon128.png'),
        ''
      );
    }

    console.log('Extension files copied successfully');
  } catch (err) {
    console.error('Error copying extension files:', err);
  }
}

copyExtensionFiles(); 