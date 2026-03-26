import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

/**
 * Detect if a file is HEIC/HEIF format (by extension or MIME type).
 * iOS sometimes reports HEIC files as "image/heic", "image/heif", or even empty type.
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.heic') || name.endsWith('.heif')) return true;
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return false;
}

/**
 * Convert a HEIC/HEIF file to JPEG. Returns the original file if not HEIC.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    console.log(`[HEIC] Converting ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to JPEG...`);
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });

    // heic2any can return a single Blob or an array of Blobs (for multi-image HEIC)
    const jpegBlob = Array.isArray(result) ? result[0] : result;

    const newName = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg';
    const jpegFile = new File([jpegBlob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(`[HEIC] Converted ${file.name} -> ${newName} (${(jpegFile.size / 1024 / 1024).toFixed(2)} MB)`);
    return jpegFile;
  } catch (error) {
    console.error('[HEIC] Conversion failed:', error);
    throw new Error(`Não foi possível converter o arquivo HEIC "${file.name}". Tente exportar como JPEG antes de enviar.`);
  }
}

/**
 * Intelligent image compression utility.
 * Optimizes images for OCR/AI processing while strictly reducing file sizes
 * to prevent OOM errors in serverless Edge Functions.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // If not an image (e.g. PDF), return as is.
  if (!file.type.startsWith('image/') && !isHeicFile(file)) {
    return file;
  }

  // Convert HEIC to JPEG first
  let processedFile = file;
  if (isHeicFile(file)) {
    processedFile = await convertHeicToJpeg(file);
  }

  // Options specifically tuned for OCR / reading text from documents
  const options = {
    maxSizeMB: 1,           // Keep file under 1MB to prevent OOM
    maxWidthOrHeight: 2048, // 2048px is large enough to keep text perfectly crisp for AI models
    useWebWorker: true,
    fileType: 'image/jpeg'  // Convert images to JPEG for better compression/support
  };

  try {
    // browser-image-compression returns a Blob, so we recreate the File to keep name/type
    const compressedBlob = await imageCompression(processedFile, options);
    
    // Create new file with original name (but change extension to .jpg if it was another format and got converted)
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    const compressedFile = new File([compressedBlob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(`[Compression] ${file.name} | Original: ${(file.size / 1024 / 1024).toFixed(2)} MB -> Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, fallback to original to not block the user entirely
    return file;
  }
}

/**
 * Helper to compress an array of files.
 */
export async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(file => compressImageIfNeeded(file)));
}