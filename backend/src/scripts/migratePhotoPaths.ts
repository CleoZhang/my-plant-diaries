import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || './database.sqlite';

/**
 * Migration script to update photo paths to include user_id
 * Old format: /uploads/plant_name/filename.jpg
 * New format: /uploads/{user_id}/plant_name/filename.jpg
 */
function migratePhotoPaths() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });

  db.serialize(() => {
    console.log('Starting photo path migration...\n');

    // Get all photos with their plant's user_id
    const query = `
      SELECT 
        pp.id as photo_id,
        pp.photo_path,
        pp.plant_id,
        p.user_id,
        p.name as plant_name
      FROM plant_photos pp
      JOIN plants p ON pp.plant_id = p.id
      WHERE pp.photo_path NOT LIKE '/uploads/%/%/%'
    `;

    db.all(query, [], (err, rows: any[]) => {
      if (err) {
        console.error('Error fetching photos:', err);
        db.close();
        process.exit(1);
      }

      if (rows.length === 0) {
        console.log('No photos need migration. All paths are up to date!');
        db.close();
        return;
      }

      console.log(`Found ${rows.length} photos that need migration\n`);

      const updateStmt = db.prepare(`
        UPDATE plant_photos 
        SET photo_path = ? 
        WHERE id = ?
      `);

      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      rows.forEach((row, index) => {
        try {
          // Parse the old path: /uploads/plant_name/filename.jpg
          const oldPath = row.photo_path;
          const parts = oldPath.split('/');
          
          // Extract the plant folder name and filename
          // Path format: /uploads/plant_name/filename.jpg
          const plantFolder = parts[2]; // plant_name
          const filename = parts[3]; // filename.jpg
          
          // Construct new path: /uploads/user_id/plant_name/filename.jpg
          const userId = row.user_id || 1; // Default to user 1 if no user_id
          const newPath = `/uploads/${userId}/${plantFolder}/${filename}`;

          // Check if the physical file exists at the new location
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          const physicalPath = path.join(__dirname, '../../', uploadDir, userId.toString(), plantFolder, filename);
          
          if (!fs.existsSync(physicalPath)) {
            console.warn(`⚠️  Physical file not found: ${physicalPath}`);
            console.warn(`   Photo ID: ${row.photo_id}, Plant: ${row.plant_name}`);
            console.warn(`   Updating path anyway...\n`);
          }

          // Update the database
          updateStmt.run(newPath, row.photo_id, (updateErr: any) => {
            if (updateErr) {
              errorCount++;
              errors.push({
                photo_id: row.photo_id,
                plant_name: row.plant_name,
                old_path: oldPath,
                error: updateErr.message
              });
              console.error(`❌ Error updating photo ${row.photo_id}: ${updateErr.message}`);
            } else {
              successCount++;
              console.log(`✅ Updated photo ${row.photo_id}: ${oldPath} -> ${newPath}`);
            }

            // Check if we're done
            if (index === rows.length - 1) {
              updateStmt.finalize(() => {
                console.log('\n' + '='.repeat(60));
                console.log('Migration Complete!');
                console.log('='.repeat(60));
                console.log(`✅ Successfully updated: ${successCount} photos`);
                if (errorCount > 0) {
                  console.log(`❌ Errors: ${errorCount} photos`);
                  console.log('\nFailed updates:');
                  errors.forEach(e => {
                    console.log(`  - Photo ID ${e.photo_id} (${e.plant_name}): ${e.error}`);
                  });
                }
                console.log('='.repeat(60) + '\n');
                
                db.close();
              });
            }
          });
        } catch (error: any) {
          errorCount++;
          errors.push({
            photo_id: row.photo_id,
            plant_name: row.plant_name,
            old_path: row.photo_path,
            error: error.message
          });
          console.error(`❌ Error processing photo ${row.photo_id}: ${error.message}`);
        }
      });
    });
  });
}

// Run the migration
console.log('Photo Path Migration Script');
console.log('='.repeat(60));
console.log('This will update photo paths to include user_id');
console.log('Old format: /uploads/plant_name/filename.jpg');
console.log('New format: /uploads/user_id/plant_name/filename.jpg');
console.log('='.repeat(60) + '\n');

migratePhotoPaths();
