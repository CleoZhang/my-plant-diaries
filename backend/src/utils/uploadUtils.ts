import fs from 'fs';
import path from 'path';

/**
 * Sanitizes a plant name to be used as a folder name
 * Removes special characters and replaces spaces with underscores
 */
export function sanitizePlantName(plantName: string): string {
  return plantName
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .toLowerCase();
}

/**
 * Creates and returns the path for a plant's photo subfolder
 * Creates the folder if it doesn't exist
 * Structure: uploads/{userId}/{plantName}/
 */
export function getPlantUploadFolder(userId: number, plantName: string): string {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const sanitized = sanitizePlantName(plantName);
  const plantFolder = path.join(uploadDir, userId.toString(), sanitized);
  
  // Create the folder if it doesn't exist
  if (!fs.existsSync(plantFolder)) {
    fs.mkdirSync(plantFolder, { recursive: true });
  }
  
  return plantFolder;
}

/**
 * Deletes a plant's photo subfolder and all its contents
 */
export function deletePlantUploadFolder(userId: number, plantName: string): void {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const sanitized = sanitizePlantName(plantName);
  const plantFolder = path.join(uploadDir, userId.toString(), sanitized);
  
  if (fs.existsSync(plantFolder)) {
    try {
      // Delete all files in the folder
      const files = fs.readdirSync(plantFolder);
      files.forEach(file => {
        const filePath = path.join(plantFolder, file);
        fs.unlinkSync(filePath);
      });
      
      // Delete the folder itself
      fs.rmdirSync(plantFolder);
      console.log(`Deleted plant folder: ${plantFolder}`);
    } catch (error) {
      console.error(`Failed to delete plant folder ${plantFolder}:`, error);
    }
  }
}

/**
 * Moves files from temp/root uploads folder to plant-specific subfolder
 */
export function moveToPlantFolder(userId: number, currentPath: string, plantName: string, filename: string): string {
  const plantFolder = getPlantUploadFolder(userId, plantName);
  const newPath = path.join(plantFolder, filename);
  
  // Move the file
  fs.renameSync(currentPath, newPath);
  
  // Return the relative path for database storage
  const sanitized = sanitizePlantName(plantName);
  return `/uploads/${userId}/${sanitized}/${filename}`;
}
