const { DataTypes } = require('sequelize');

module.exports = {
  async up({ sequelize, queryInterface }) {
    await queryInterface.addColumn('maintenance_requests', 'ticketNumber', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    });

    await sequelize.query(`
      WITH numbered AS (
        SELECT
          id,
          to_char("createdAt", 'YYYYMMDD') || '-' ||
            lpad(row_number() OVER (
              PARTITION BY to_char("createdAt", 'YYYYMMDD')
              ORDER BY "createdAt", id
            )::text, 5, '0') AS ticket_number
        FROM maintenance_requests
        WHERE "ticketNumber" IS NULL
      )
      UPDATE maintenance_requests mr
      SET "ticketNumber" = numbered.ticket_number
      FROM numbered
      WHERE mr.id = numbered.id;
    `);

    await queryInterface.addIndex('maintenance_requests', ['ticketNumber'], {
      unique: true,
      name: 'maintenance_requests_ticket_number_unique'
    });
  },

  async down({ queryInterface }) {
    await queryInterface.removeIndex('maintenance_requests', 'maintenance_requests_ticket_number_unique');
    await queryInterface.removeColumn('maintenance_requests', 'ticketNumber');
  }
};
