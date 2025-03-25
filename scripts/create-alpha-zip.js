import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to create zip
function createAlphaZip() {
  try {
    // Create zip directory if it doesn't exist
    const zipDir = path.resolve(__dirname, '../zip');
    if (!fs.existsSync(zipDir)) {
      fs.mkdirSync(zipDir, { recursive: true });
    }

    // Get the current date in YYYYMMDD format
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get version from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
    const version = packageJson.version;
    
    // Zip file name
    const zipFileName = `NHITW_cloud_analyzer_v${version}_${dateStr}_ALPHA.zip`;
    const zipFilePath = path.resolve(zipDir, zipFileName);
    
    // Check if dist directory exists
    const distDir = path.resolve(__dirname, '../dist');
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
    
    console.log(`Successfully created alpha zip at: ${zipFilePath}`);
    return zipFilePath;
  } catch (error) {
    console.error('Error creating alpha zip:', error);
    process.exit(1);
  }
}

// Execute if this script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAlphaZip();
}

export default createAlphaZip;
