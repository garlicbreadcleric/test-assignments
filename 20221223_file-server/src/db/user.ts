import { DataTypes, Model } from "sequelize";

import sequelize, { GUID } from "./index";

export class User extends Model {
  declare id: string;
  declare passwordHash: string;
  declare refreshToken: string;
}

User.init(
  {
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.CHAR(255),
    },
    passwordHash: {
      field: "password_hash",
      allowNull: false,
      type: DataTypes.TEXT,
    },
    refreshToken: {
      field: "refresh_token",
      allowNull: false,
      unique: true,
      type: GUID,
    },
  },
  {
    sequelize,
    tableName: "user",
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  }
);

export default User;
