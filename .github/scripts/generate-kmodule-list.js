#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculates SHA-256 hash of a file
 */
function calculateSHA256(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error(`Error calculating SHA256 for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Extracts module metadata from a .akm.js file
 */
function extractModuleMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract AKM.module({ ... }) block
    const moduleMatch = content.match(/AKM\.module\s*\(\s*\{([\s\S]*?)\}\s*\)/);
    if (!moduleMatch) {
      return null;
    }
    
    const moduleBlock = moduleMatch[1];
    const metadata = {};
    
    // Extract individual fields
    const nameMatch = moduleBlock.match(/name\s*:\s*['"](.*?)['"]/);
    const versionMatch = moduleBlock.match(/version\s*:\s*['"](.*?)['"]/);
    const authorMatch = moduleBlock.match(/author\s*:\s*['"](.*?)['"]/);
    const descriptionMatch = moduleBlock.match(/description\s*:\s*['"](.*?)['"]/);
    const licenseMatch = moduleBlock.match(/license\s*:\s*['"](.*?)['"]/);
    
    if (nameMatch) metadata.name = nameMatch[1];
    if (versionMatch) metadata.version = versionMatch[1];
    if (authorMatch) metadata.author = authorMatch[1];
    if (descriptionMatch) metadata.description = descriptionMatch[1];
    if (licenseMatch) metadata.license = licenseMatch[1];
    
    return Object.keys(metadata).length > 0 ? metadata : null;
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Generates list.json for a kmodule directory
 */
function generateKmoduleList(kmodulePath) {
  const list = {
    generated: new Date().toISOString(),
    modules: []
  };
  
  // Read all directories in the kmodule folder
  const items = fs.readdirSync(kmodulePath);
  
  for (const item of items) {
    const itemPath = path.join(kmodulePath, item);
    const stat = fs.statSync(itemPath);
    
    if (!stat.isDirectory()) {
      continue;
    }
    
    // Look for .akm file in this directory
    const files = fs.readdirSync(itemPath);
    const akmFile = files.find(f => f.endsWith('.akm'));
    
    if (!akmFile) {
      continue;
    }
    
    // Look for corresponding .akm.js file for metadata
    const akmJsFile = akmFile + '.js';
    const akmJsPath = path.join(itemPath, akmJsFile);
    
    const akmPath = path.join(itemPath, akmFile);
    const sha256 = calculateSHA256(akmPath);
    
    const moduleEntry = {
      folder: item,
      module: akmFile,
      sha256: sha256
    };
    
    // Try to extract metadata if .akm.js exists
    if (files.includes(akmJsFile)) {
      const metadata = extractModuleMetadata(akmJsPath);
      if (metadata) {
        moduleEntry.metadata = metadata;
      }
    }
    
    list.modules.push(moduleEntry);
  }
  
  // Sort modules by folder name
  list.modules.sort((a, b) => a.folder.localeCompare(b.folder));
  
  return list;
}

/**
 * Main function to process all kmodule directories
 */
function main() {
  const architectures = ['i386', 'x86_64'];
  const repoRoot = path.resolve(__dirname, '../..');
  
  for (const arch of architectures) {
    const kmodulePath = path.join(repoRoot, arch, 'kmodule');
    
    if (!fs.existsSync(kmodulePath)) {
      console.log(`Skipping ${arch}/kmodule: directory not found`);
      continue;
    }
    
    const list = generateKmoduleList(kmodulePath);
    const outputPath = path.join(kmodulePath, 'list.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(list, null, 2) + '\n');
    console.log(`Generated ${outputPath} with ${list.modules.length} modules`);
  }
}

main();
