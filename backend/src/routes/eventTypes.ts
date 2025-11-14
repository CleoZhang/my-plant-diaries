import { Router, Request, Response } from 'express';
import db from '../database';
import { EventType } from '../types';

const router = Router();

// Get all event types
router.get('/', (req: Request, res: Response) => {
  db.all(
    'SELECT * FROM event_types ORDER BY is_custom ASC, name ASC',
    [],
    (err, rows: EventType[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Create custom event type
router.post('/', (req: Request, res: Response) => {
  const eventType: EventType = req.body;
  
  const query = 'INSERT INTO event_types (name, emoji, is_custom) VALUES (?, ?, 1)';

  db.run(query, [eventType.name, eventType.emoji], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, ...eventType, is_custom: true });
  });
});

// Delete custom event type
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.run('DELETE FROM event_types WHERE id = ? AND is_custom = 1', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Event type not found or cannot be deleted' });
      return;
    }
    res.json({ message: 'Event type deleted successfully' });
  });
});

export default router;
