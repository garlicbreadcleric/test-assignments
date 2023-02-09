import { DataTypes, Model } from "sequelize";

import sequelize, { GUID } from "./index";

export class Session extends Model {
  declare bearerToken: string;
  declare userId: string;
  declare expiresAt: Date;
  declare isExpired: boolean;
}

Session.init(
  {
    bearerToken: {
      field: "bearer_token",
      allowNull: false,
      primaryKey: true,
      type: GUID,
    },
    userId: {
      field: "user_id",
      allowNull: false,
      type: GUID,
      references: {
        model: {
          tableName: "user",
        },
        key: "id",
      },
    },
    expiresAt: {
      field: "expires_at",
      allowNull: false,
      type: DataTypes.DATE,
    },
    isExpired: {
      field: "is_expired",
      allowNull: false,
      type: DataTypes.BOOLEAN,
    },
  },
  {
    sequelize,
    tableName: "session",
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  }
);
