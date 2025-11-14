declare module 'exif-parser' {
  interface ExifResult {
    tags?: {
      DateTimeOriginal?: number;
      DateTime?: number;
      CreateDate?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface ExifParser {
    parse(): ExifResult;
  }

  namespace exifParser {
    function create(buffer: Buffer): ExifParser;
  }

  export = exifParser;
}
