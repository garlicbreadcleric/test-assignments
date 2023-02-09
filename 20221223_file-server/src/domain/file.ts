import fs from "fs";
import crypto from "crypto";

import formidable from "formidable";
import File from "../db/file";

export const FILE_DIR = "./files";

export async function copyFileFs(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('error', (err) => {
      reject(err);
    });

    writeStream.on('finish', () => {
      resolve();
    });

    readStream.pipe(writeStream);
  });
}

export async function deleteFileFs(filePath: string): Promise<void> {
  return await new Promise((resolve, reject) => {
    fs.unlink(filePath, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function getFileById(fileId: string): Promise<File | null> {
  return await File.findOne({ where: { id: fileId } });
}

export async function createFileFromFormData(formData: formidable.File): Promise<File> {
  const now = new Date();
  const fileId = crypto.randomUUID();

  await copyFileFs(formData.filepath, `${FILE_DIR}/${fileId}`);
  const file = await File.create({
    id: fileId,
    name: formData.originalFilename,
    mimeType: formData.mimetype,
    sizeBytes: formData.size,
    uploadedAt: now,
  });
  return file;
}

export async function updateFileFromFormData(file: File, formData: formidable.File): Promise<File> {
  const now = new Date();

  file.name = formData.originalFilename || "untitled";
  file.mimeType = formData.mimetype || "application/octet-stream";
  file.sizeBytes = formData.size;
  file.uploadedAt = now;
  file.save();
  await copyFileFs(formData.filepath, `${FILE_DIR}/${file.id}`);

  return file;
}

export async function deleteFile(file: File): Promise<void> {
  await file.destroy();
  await deleteFileFs(`${FILE_DIR}/${file.id}`);
}

export async function getFilesList(page: number, pageSize: number): Promise<File[]> {
  return await File.findAll({ order: [['uploadedAt', 'DESC']], offset: pageSize * (page - 1), limit: pageSize });
}
