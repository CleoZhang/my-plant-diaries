import { Router, Request, Response } from 'express';
import db from '../database';
import { Tag } from '../types';

const router = Router();

// Get all tags by type
router.get('/', (req: Request, res: Response) => {
  const { type } = req.query;
  
  let query = 'SELECT * FROM tags';
  const params: any[] = [];

  if (type) {
    query += ' WHERE tag_type = ?';
    params.push(type);
  }

  query += ' ORDER BY tag_name ASC';

  db.all(query, params, (err, rows: Tag[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create new tag
router.post('/', (req: Request, res: Response) => {
  const tag: Tag = req.body;
  
  const query = 'INSERT INTO tags (tag_name, tag_type) VALUES (?, ?)';

  db.run(query, [tag.tag_name, tag.tag_type], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, ...tag });
  });
});

// Delete tag
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }
    res.json({ message: 'Tag deleted successfully' });
  });
});

export default router;
