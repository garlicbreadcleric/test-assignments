"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const GUID = Sequelize.CHAR(36);

    await queryInterface.createTable("user", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.CHAR(255),
      },
      password_hash: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      refresh_token: {
        allowNull: false,
        unique: true,
        type: GUID,
      },
    });

    await queryInterface.createTable("session", {
      bearer_token: {
        allowNull: false,
        primaryKey: true,
        type: GUID,
      },
      user_id: {
        allowNull: false,
        references: {
          model: {
            tableName: "user",
          },
          key: "id",
        },
        type: Sequelize.CHAR(255),
      },
      expires_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      is_expired: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });

    await queryInterface.createTable("file", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: GUID,
      },
      name: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      mime_type: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      size_bytes: {
        allowNull: false,
        type: Sequelize.BIGINT,
      },
      uploaded_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    for (const table of ["file", "session", "user"]) {
      await queryInterface.dropTable(table);
    }
  },
};
