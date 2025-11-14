import db from '../database';
import fs from 'fs';
import path from 'path';
import { getPlantUploadFolder, sanitizePlantName } from './uploadUtils';

/**
 * Migrates existing photos from the root uploads folder to plant-specific subfolders
 * This should be run once after implementing the subfolder structure
 */
export async function migrateExistingPhotos(): Promise<void> {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  
  console.log('Starting photo migration...');
  
  // Get all plants
  const plants = await new Promise<any[]>((resolve, reject) => {
    db.all('SELECT id, name FROM plants', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  for (const plant of plants) {
    console.log(`Migrating photos for plant: ${plant.name}`);
    
    // Get all photos and profile photo for this plant
    const photos = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT id, photo_path FROM plant_photos WHERE plant_id = ?', [plant.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const plantData = await new Promise<any>((resolve, reject) => {
      db.get('SELECT profile_photo FROM plants WHERE id = ?', [plant.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const allPhotoPaths = [
      ...photos.map(p => p.photo_path),
      ...(plantData.profile_photo ? [plantData.profile_photo] : [])
    ];

    // Create plant folder
    const plantFolder = getPlantUploadFolder(plant.name);
    const sanitized = sanitizePlantName(plant.name);

    for (const photoPath of allPhotoPaths) {
      if (!photoPath) continue;

      // Extract filename from path
      const filename = path.basename(photoPath);
      const oldPath = path.join(uploadDir, filename);
      
      // Skip if file doesn't exist in root uploads folder
      if (!fs.existsSync(oldPath)) {
        console.log(`  Skipping ${filename} - already migrated or doesn't exist`);
        continue;
      }

      // New path in plant subfolder
      const newPath = path.join(plantFolder, filename);
      const newRelativePath = `/uploads/${sanitized}/${filename}`;

      try {
        // Move the file
        fs.renameSync(oldPath, newPath);
        console.log(`  Moved: ${filename}`);

        // Update database paths
        // Update plant_photos
        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE plant_photos SET photo_path = ? WHERE photo_path = ?',
            [newRelativePath, photoPath],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Update profile_photo if this is the profile photo
        if (plantData.profile_photo === photoPath) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              'UPDATE plants SET profile_photo = ? WHERE id = ?',
              [newRelativePath, plant.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      } catch (error) {
        console.error(`  Failed to migrate ${filename}:`, error);
      }
    }
  }

  console.log('Photo migration completed!');
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateExistingPhotos()
    .then(() => {
      console.log('Migration successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
