import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/**
 * Save an uploaded File object to disk
 * @param {File} file - The file object from formData.get('image')
 * @param {Object} [options]
 * @param {string} [uploadRoot='./uploads'] - Base directory to save
 * @param {string} [options.subDir=''] - Optional sub-directory (e.g., date, type)
 * @param {string} [options.customFileName] - Optional custom file name
 * @returns {Promise<Object>} - File info object
 */
export async function saveUploadedFile(file, options = {}) {
    if (!file || !(file instanceof File)) {
        throw new Error('Invalid file object');
    }

    const uploadRoot = './uploads';
    const subDir = options.subDir || '';
    const fileName = options.customFileName || file.name;

    const uploadDir = path.join(uploadRoot, subDir);
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    return {
        path: filePath,
        name: fileName,
        type: file.type,
        size: buffer.length,
    };
}
