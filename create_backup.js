const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a writable stream for the ZIP file
const output = fs.createWriteStream('CannaAI_Backup.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

// Listen for the archive to finish
output.on('close', () => {
  console.log(`Backup created successfully! Total bytes: ${archive.pointer()}`);
});

// Handle errors
archive.on('error', (err) => {
  throw err;
});

// Pipe the archive to the output file
archive.pipe(output);

// Function to recursively add directories
function addDirectory(dir, rootPath) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip problematic files and directories
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'nul') {
      return;
    }

    if (stat.isDirectory()) {
      addDirectory(filePath, rootPath);
    } else {
      // Add file to archive with relative path
      const relativePath = path.relative(rootPath, filePath);
      archive.file(filePath, { name: relativePath });
    }
  });
}

// Add all files from the CannaAI directory
const cannaAIPath = 'C:/Users/Ryan/Desktop/CannaAI';
addDirectory(cannaAIPath, cannaAIPath);

// Finalize the archive
archive.finalize();