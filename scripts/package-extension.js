import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// 獲取當前目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const packageJsonPath = path.resolve(rootDir, 'package.json');

// 讀取 package.json 獲取版本號
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// 創建輸出目錄
const outputDir = path.resolve(rootDir, 'packages');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 打包文件名
const zipFileName = `nhi-extractor-v${version}.zip`;
const zipFilePath = path.resolve(outputDir, zipFileName);

// 刪除舊的打包文件（如果存在）
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
  console.log(`已刪除舊的打包文件: ${zipFilePath}`);
}

// 使用系統命令打包 dist 目錄
const command = `cd "${distDir}" && zip -r "${zipFilePath}" *`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`打包錯誤: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`打包警告: ${stderr}`);
  }
  
  console.log(`擴充功能已成功打包: ${zipFilePath}`);
  console.log(`版本: ${version}`);
  
  // 顯示打包文件大小
  const stats = fs.statSync(zipFilePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
  console.log(`打包文件大小: ${fileSizeInMegabytes.toFixed(2)} MB`);
});
