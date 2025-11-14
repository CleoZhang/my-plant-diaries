import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import convert from 'heic-convert';
import exifParser from 'exif-parser';
import { moveToPlantFolder } from '../utils/uploadUtils';

const router = Router();

// Helper function to convert HEIC/HEIF to PNG
const convertHeicToPng = async (inputPath: string, outputPath: string): Promise<void> => {
  const inputBuffer = await fs.promises.readFile(inputPath);
  const outputBuffer = await convert({
    buffer: inputBuffer as any,
    format: 'PNG',
    quality: 1
  });
  await fs.promises.writeFile(outputPath, Buffer.from(outputBuffer as ArrayBuffer));
};

// Helper function to extract date from photo EXIF data
const extractPhotoDate = (filePath: string): string | null => {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    
    // Try to get the date from EXIF data
    if (result.tags?.DateTimeOriginal) {
      return new Date(result.tags.DateTimeOriginal * 1000).toISOString();
    } else if (result.tags?.DateTime) {
      return new Date(result.tags.DateTime * 1000).toISOString();
    } else if (result.tags?.CreateDate) {
      return new Date(result.tags.CreateDate * 1000).toISOString();
    }
  } catch (error) {
    // If EXIF parsing fails, return null
    console.log('Could not extract EXIF date from photo');
  }
  return null;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Upload single photo
router.post('/single', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const plantName = req.body.plantName;
  if (!plantName) {
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: 'Plant name is required' });
    return;
  }

  try {
    let finalFilename = req.file.filename;
    let finalPath = req.file.path;
    let finalSize = req.file.size;

    // Extract photo date from EXIF before any conversion
    let photoDate = extractPhotoDate(req.file.path);

    // Check if the file is HEIC/HEIF and convert to PNG
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      const pngFilename = req.file.filename.replace(/\.(heic|heif)$/i, '.png');
      const pngPath = path.join(path.dirname(req.file.path), pngFilename);
      
      await convertHeicToPng(req.file.path, pngPath);
      
      // Delete original HEIC file
      fs.unlinkSync(req.file.path);
      
      finalFilename = pngFilename;
      finalPath = pngPath;
      finalSize = fs.statSync(pngPath).size;
    } else {
      // For non-HEIC files, try to extract date from the final file
      photoDate = photoDate || extractPhotoDate(finalPath);
    }

    // Move file to plant-specific subfolder
    const relativePath = moveToPlantFolder(finalPath, plantName, finalFilename);

    res.json({
      filename: finalFilename,
      path: relativePath,
      size: finalSize,
      takenAt: photoDate || new Date().toISOString()
    });
  } catch (error) {
    // Clean up uploaded file if conversion fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Upload multiple photos
router.post('/multiple', upload.array('photos', 10), async (req: Request, res: Response) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const plantName = req.body.plantName;
  if (!plantName) {
    // Clean up uploaded files
    (req.files as Express.Multer.File[]).forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    res.status(400).json({ error: 'Plant name is required' });
    return;
  }

  try {
    const files = await Promise.all(
      (req.files as Express.Multer.File[]).map(async (file) => {
        let finalFilename = file.filename;
        let finalPath = file.path;
        let finalSize = file.size;

        // Extract photo date from EXIF before any conversion
        let photoDate = extractPhotoDate(file.path);

        // Check if the file is HEIC/HEIF and convert to PNG
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.heic' || ext === '.heif') {
          const pngFilename = file.filename.replace(/\.(heic|heif)$/i, '.png');
          const pngPath = path.join(path.dirname(file.path), pngFilename);
          
          await convertHeicToPng(file.path, pngPath);
          
          // Delete original HEIC file
          fs.unlinkSync(file.path);
          
          finalFilename = pngFilename;
          finalPath = pngPath;
          finalSize = fs.statSync(pngPath).size;
        } else {
          // For non-HEIC files, try to extract date from the final file
          photoDate = photoDate || extractPhotoDate(finalPath);
        }

        // Move file to plant-specific subfolder
        const relativePath = moveToPlantFolder(finalPath, plantName, finalFilename);

        return {
          filename: finalFilename,
          path: relativePath,
          size: finalSize,
          takenAt: photoDate || new Date().toISOString()
        };
      })
    );

    res.json(files);
  } catch (error) {
    // Clean up uploaded files if conversion fails
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

export default router;
