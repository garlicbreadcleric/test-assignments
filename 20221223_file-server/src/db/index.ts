import { Dialect, Sequelize, DataTypes } from "sequelize";

// FIXME: Hard-coded environment.
import { development as config } from "./config.json";

export const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect as Dialect,
  }
);
export default sequelize;

export const GUID = DataTypes.CHAR(36);
