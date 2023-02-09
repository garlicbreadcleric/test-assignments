import crypto from "crypto";

import express, { Request, Response } from "express";
import formidable from "formidable";
import IncomingForm from "formidable/Formidable";

import { createFileFromFormData, deleteFile, FILE_DIR, getFileById, getFilesList, updateFileFromFormData } from "../domain/file";
import { ApplicationError, ErrorCode } from "../error";

import { authMiddleware } from "../middleware";

const router = express.Router();

async function getFormFile(req: Request, form: IncomingForm): Promise<formidable.File> {
  const files: formidable.Files = await new Promise((resolve, reject) => form.parse(req, (err, _fields, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  }));

  if (files.file == null) {
    throw new ApplicationError(ErrorCode.NoFileAttached, {}, "No file attached to the `file` form field.");
  }
  const attachedFile = files.file instanceof Array ? files.file[0] : files.file;
  return attachedFile;
}

function getIntQueryParam(q: any): number | null {
  if (q != null) {
    if (q instanceof Array) {
      if (typeof q[0] === "string") {
        return parseInt(q[0]);
      }
    } else {
      if (typeof q === "string") {
        return parseInt(q);
      }
    }
  }
  return null;
}

router.post("/upload", authMiddleware, async (req, res, next) => {
  try {
    const form = formidable({});

    const attachedFile = await getFormFile(req, form);
    const file = await createFileFromFormData(attachedFile);

    return res.json({
      fileId: file.id,
      fileName: file.name,
      fileSize: file.sizeBytes,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
    });
  } catch (err: any) {
    next(err);
  }
});

router.get("/list", authMiddleware, async (req, res, next) => {
  try {
    let pageSize = getIntQueryParam(req.query.list_size) || 10;
    let page = getIntQueryParam(req.query.page) || 1;

    const files = await getFilesList(page, pageSize);
    return res.json(files.map(file => ({
      fileId: file.id,
      fileName: file.name,
      fileSize: file.sizeBytes,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
    })));
  } catch (err: any) {
    next(err);
  }
});

router.delete("/delete/:id", authMiddleware, async (req, res, next) => {
  try {
    const file = await getFileById(req.params.id);
    if (file == null) {
      throw new ApplicationError(ErrorCode.InvalidFileId, { fileId: req.params.id }, `File with id ${req.params.id} does not exist.`);
    }
    await deleteFile(file);
    return res.json({});
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const file = await getFileById(req.params.id);
    if (file == null) {
      throw new ApplicationError(ErrorCode.InvalidFileId, { fileId: req.params.id }, `File with id ${req.params.id} does not exist.`);
    }
    return res.json({
      fileId: file.id,
      fileName: file.name,
      fileSize: file.sizeBytes,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", authMiddleware, async (req, res, next) => {
  try {
    const file = await getFileById(req.params.id);
    if (file == null) {
      throw new ApplicationError(ErrorCode.InvalidFileId, { fileId: req.params.id }, `File with id ${req.params.id} does not exist.`);
    }
    return res.download(`${FILE_DIR}/${file.id}`, file.name);
  } catch (err) {
    next(err);
  }
});

router.put("/update/:id", authMiddleware, async (req, res, next) => {
  try {
    const form = formidable({});

    const attachedFile = await getFormFile(req, form);
    const file = await getFileById(req.params.id);
    if (file == null) {
      throw new ApplicationError(ErrorCode.InvalidFileId, { fileId: req.params.id }, `File with id ${req.params.id} does not exist.`);
    }
    
    const updatedFile = await updateFileFromFormData(file, attachedFile);
    return res.json({
      fileId: updatedFile.id,
      fileName: updatedFile.name,
      fileSize: updatedFile.sizeBytes,
      mimeType: updatedFile.mimeType,
      uploadedAt: updatedFile.uploadedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;