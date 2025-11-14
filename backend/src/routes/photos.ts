import { Router, Request, Response } from 'express';
import db from '../database';
import { PlantPhoto } from '../types';

const router = Router();

// Get all photos for a plant
router.get('/plant/:plantId', (req: Request, res: Response) => {
  const { plantId } = req.params;

  db.all(
    'SELECT * FROM plant_photos WHERE plant_id = ? ORDER BY created_at DESC',
    [plantId],
    (err, rows: PlantPhoto[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Create new photo entry
router.post('/', (req: Request, res: Response) => {
  const photo: PlantPhoto = req.body;
  
  const query = `
    INSERT INTO plant_photos (plant_id, photo_path, caption, taken_at)
    VALUES (?, ?, ?, ?)
  `;

  const params = [
    photo.plant_id,
    photo.photo_path,
    photo.caption || null,
    photo.taken_at || new Date().toISOString()
  ];

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, ...photo });
  });
});

// Update photo
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { caption, taken_at } = req.body;
  
  const query = `
    UPDATE plant_photos 
    SET caption = ?, taken_at = ?
    WHERE id = ?
  `;

  db.run(query, [caption, taken_at, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }
    res.json({ id, caption, taken_at });
  });
});

// Delete photo
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.run('DELETE FROM plant_photos WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }
    res.json({ message: 'Photo deleted successfully' });
  });
});

export default router;
