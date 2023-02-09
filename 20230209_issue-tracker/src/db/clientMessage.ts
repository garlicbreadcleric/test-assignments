import { DateTime } from "luxon";
import { DataTypes, FindOptions, Model, Op, Sequelize, Transaction } from "sequelize";

import { ApplicationError, ErrorCode } from "../error";
import sequelize from "./index";

export class ClientMessage extends Model {
  declare id: number;
  declare phone: string;
  declare message: string;
  declare createdAt: Date;

  sanitize() {
    return {
      id: this.id,
      phone: this.phone,
      message: this.message,
      createdAt: this.createdAt,
    };
  }
}

ClientMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    phone: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(),
    },
  },
  {
    sequelize,
    tableName: "clientMessages",
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  }
);

export default ClientMessage;

export type ClientMessageCreate = {
  phone: string;
  message: string;
};

export type ClientMessageListQuery = {
  afterId?: number;
  count?: number;
};

export type ClientMessageList = {
  messages: ClientMessage[];
  total: number;
};

export async function createMessage(
  { phone, message }: ClientMessageCreate,
  transaction: Transaction
): Promise<ClientMessage> {
  const now = DateTime.now();
  const hourAgo = now.minus({ hours: 1 });

  const messagesInLastHour = await ClientMessage.findAndCountAll({
    where: {
      phone,
      createdAt: { [Op.gte]: hourAgo.toJSDate() },
    },
    limit: 5,
    transaction,
  });

  if (messagesInLastHour.count >= 5) {
    throw new ApplicationError(
      ErrorCode.TooManyMessages,
      {},
      "Too many messages; maximum of 5 messages per hour is allowed"
    );
  }

  const clientMessage = await ClientMessage.create(
    {
      phone,
      message,
      createdAt: now,
    },
    { transaction }
  );
  clientMessage.save();
  return clientMessage;
}

export async function getMessagesList(
  { afterId, count }: ClientMessageListQuery,
  transaction: Transaction
): Promise<ClientMessageList> {
  const total = await ClientMessage.count();
  const query: FindOptions<ClientMessage> = {
    order: [["createdAt", "DESC"]],
    limit: count,
    transaction,
  };
  if (afterId != null) {
    query.where = { id: { [Op.lt]: afterId } };
  }
  const messages = await ClientMessage.findAll(query);

  return { messages, total };
}
