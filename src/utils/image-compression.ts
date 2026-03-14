import imageCompression from 'browser-image-compression';

/**
 * Intelligent image compression utility.
 * Optimizes images for OCR/AI processing while strictly reducing file sizes
 * to prevent OOM errors in serverless Edge Functions.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // If not an image (e.g. PDF), return as is.
  if (!file.type.startsWith('image/')) {
    return file;
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
    const compressedBlob = await imageCompression(file, options);
    
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
