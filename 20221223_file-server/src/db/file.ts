import { DataTypes, Model } from "sequelize";

import sequelize, { GUID } from "./index";

export class File extends Model {
  declare id: string;
  declare name: string;
  declare mimeType: string;
  declare sizeBytes: number;
  declare uploadedAt: Date;
}

File.init(
  {
    id: {
      allowNull: false,
      primaryKey: true,
      type: GUID,
    },
    name: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    mimeType: {
      field: "mime_type",
      allowNull: false,
      type: DataTypes.TEXT,
    },
    sizeBytes: {
      field: "size_bytes",
      allowNull: false,
      type: DataTypes.BIGINT,
    },
    uploadedAt: {
      field: "uploaded_at",
      allowNull: false,
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: "file",
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  }
);

export default File;