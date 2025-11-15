import { db } from '../database';
import { hashPassword } from '../utils/auth';

/**
 * Script to create admin user with ID = 1
 * Email: admin@plantdiaries.local
 * Password: admin123 (CHANGE THIS IN PRODUCTION!)
 */

async function seedAdminUser() {
  const adminEmail = 'admin@plantdiaries.local';
  const adminPassword = 'admin123'; // Change this!
  const adminDisplayName = 'Admin';

  try {
    // Check if admin already exists
    db.get('SELECT id FROM users WHERE id = 1', [], async (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err);
        process.exit(1);
      }

      if (row) {
        console.log('Admin user already exists with ID = 1');
        process.exit(0);
      }

      // Hash the password
      const passwordHash = await hashPassword(adminPassword);

      // Insert admin user with explicit ID = 1
      db.run(
        `INSERT INTO users (id, email, password_hash, display_name, is_admin) 
         VALUES (1, ?, ?, ?, 1)`,
        [adminEmail, passwordHash, adminDisplayName],
        function (err) {
          if (err) {
            console.error('Error creating admin user:', err);
            process.exit(1);
          }

          console.log('✅ Admin user created successfully!');
          console.log('   Email:', adminEmail);
          console.log('   Password:', adminPassword);
          console.log('   ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!');
          
          // Reset the autoincrement to ensure next user gets ID = 2
          db.run(
            `UPDATE sqlite_sequence SET seq = 1 WHERE name = 'users'`,
            (err) => {
              if (err) {
                console.error('Note: Could not reset sequence:', err.message);
              }
              process.exit(0);
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
seedAdminUser();
