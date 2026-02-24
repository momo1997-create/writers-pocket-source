// File Storage Abstraction for Writer's Pocket
// Currently uses local storage, designed for easy S3 migration

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const LOCAL_UPLOAD_DIR = '/app/uploads';

// Ensure upload directory exists
if (STORAGE_TYPE === 'local' && !fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

export async function uploadFile(file, category = 'manuscripts') {
  const fileId = uuidv4();
  const ext = path.extname(file.name || 'file');
  const fileName = `${fileId}${ext}`;
  const relativePath = `${category}/${fileName}`;

  if (STORAGE_TYPE === 'local') {
    const categoryDir = path.join(LOCAL_UPLOAD_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const fullPath = path.join(categoryDir, fileName);
    
    // Handle both Buffer and ArrayBuffer
    const buffer = file.arrayBuffer 
      ? Buffer.from(await file.arrayBuffer())
      : file;
    
    fs.writeFileSync(fullPath, buffer);

    return {
      fileId,
      fileName,
      fileUrl: `/api/files/${relativePath}`,
      storagePath: relativePath,
      storageType: 'local',
    };
  }

  // S3 integration placeholder
  if (STORAGE_TYPE === 's3') {
    // TODO: Implement S3 upload when AWS credentials are provided
    throw new Error('S3 storage not yet implemented');
  }

  throw new Error(`Unknown storage type: ${STORAGE_TYPE}`);
}

export async function getFile(relativePath) {
  if (STORAGE_TYPE === 'local') {
    const fullPath = path.join(LOCAL_UPLOAD_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.readFileSync(fullPath);
  }

  // S3 integration placeholder
  if (STORAGE_TYPE === 's3') {
    throw new Error('S3 storage not yet implemented');
  }

  return null;
}

export async function deleteFile(relativePath) {
  if (STORAGE_TYPE === 'local') {
    const fullPath = path.join(LOCAL_UPLOAD_DIR, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  // S3 integration placeholder
  if (STORAGE_TYPE === 's3') {
    throw new Error('S3 storage not yet implemented');
  }

  return false;
}

export function getFileUrl(relativePath) {
  if (STORAGE_TYPE === 'local') {
    return `/api/files/${relativePath}`;
  }

  // S3 URL placeholder
  if (STORAGE_TYPE === 's3') {
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${relativePath}`;
  }

  return null;
}
