import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './database.sqlite';

/**
 * Migration script to move physical photo files to include user_id in folder structure
 * Old location: uploads/plant_name/filename.jpg
 * New location: uploads/{user_id}/plant_name/filename.jpg
 */
function migratePhotoFiles() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  db.serialize(() => {
    console.log('Starting physical photo file migration...\n');

    // Get all photos with their plant's user_id and current paths
    const query = `
      SELECT 
        pp.id as photo_id,
        pp.photo_path,
        pp.plant_id,
        p.user_id,
        p.name as plant_name
      FROM plant_photos pp
      JOIN plants p ON pp.plant_id = p.id
    `;

    db.all(query, [], (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching photos:', err);
        db.close();
        process.exit(1);
      }

      console.log(`Found ${rows.length} photos to check\n`);

      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      let movedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      rows.forEach((row, index) => {
        try {
          // Parse the path from database
          const dbPath = row.photo_path;
          const parts = dbPath.split('/');
          
          // Expected format: /uploads/user_id/plant_name/filename.jpg
          if (parts.length < 4) {
            console.warn(`⚠️  Unexpected path format: ${dbPath}`);
            skippedCount++;
            return;
          }
          
          const userId = parts[2];
          const plantFolder = parts[3];
          const filename = parts.slice(4).join('/'); // Handle filenames with slashes

          // Old location (without user_id): uploads/plant_name/filename.jpg
          const oldPhysicalPath = path.join(__dirname, '../../', uploadDir, plantFolder, filename);
          
          // New location (with user_id): uploads/user_id/plant_name/filename.jpg
          const newPhysicalPath = path.join(__dirname, '../../', uploadDir, userId, plantFolder, filename);

          // Check if file is already at new location
          if (fs.existsSync(newPhysicalPath)) {
            console.log(`✓ Already migrated: ${plantFolder}/${filename}`);
            skippedCount++;
            return;
          }

          // Check if file exists at old location
          if (!fs.existsSync(oldPhysicalPath)) {
            console.log(`⚠️  Source file not found: ${oldPhysicalPath}`);
            console.log(`   Photo ID: ${row.photo_id}, Plant: ${row.plant_name}`);
            skippedCount++;
            return;
          }

          // Create destination folder if it doesn't exist
          const destFolder = path.dirname(newPhysicalPath);
          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
            console.log(`📁 Created folder: ${destFolder}`);
          }

          // Move the file
          fs.renameSync(oldPhysicalPath, newPhysicalPath);
          movedCount++;
          console.log(`✅ Moved: ${plantFolder}/${filename} -> uploads/${userId}/${plantFolder}/${filename}`);

          // Check if the old plant folder is now empty and remove it
          const oldFolder = path.dirname(oldPhysicalPath);
          if (fs.existsSync(oldFolder)) {
            const filesInOldFolder = fs.readdirSync(oldFolder);
            if (filesInOldFolder.length === 0) {
              fs.rmdirSync(oldFolder);
              console.log(`🗑️  Removed empty folder: ${oldFolder}`);
            }
          }

        } catch (error: any) {
          errorCount++;
          errors.push({
            photo_id: row.photo_id,
            plant_name: row.plant_name,
            path: row.photo_path,
            error: error.message
          });
          console.error(`❌ Error processing photo ${row.photo_id}: ${error.message}`);
        }

        // Check if we're done
        if (index === rows.length - 1) {
          console.log('\n' + '='.repeat(60));
          console.log('Physical File Migration Complete!');
          console.log('='.repeat(60));
          console.log(`✅ Successfully moved: ${movedCount} files`);
          console.log(`⏭️  Skipped (already exists or not found): ${skippedCount} files`);
          if (errorCount > 0) {
            console.log(`❌ Errors: ${errorCount} files`);
            console.log('\nFailed moves:');
            errors.forEach(e => {
              console.log(`  - Photo ID ${e.photo_id} (${e.plant_name}): ${e.error}`);
            });
          }
          console.log('='.repeat(60) + '\n');
          
          db.close();
        }
      });

      // If no rows, close immediately
      if (rows.length === 0) {
        console.log('No photos to migrate!');
        db.close();
      }
    });
  });
}

// Run the migration
console.log('Physical Photo File Migration Script');
console.log('='.repeat(60));
console.log('This will move photo files to include user_id in folder structure');
console.log('Old location: uploads/plant_name/filename.jpg');
console.log('New location: uploads/user_id/plant_name/filename.jpg');
console.log('='.repeat(60) + '\n');

migratePhotoFiles();
