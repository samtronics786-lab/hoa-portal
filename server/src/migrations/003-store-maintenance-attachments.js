const { DataTypes } = require('sequelize');

module.exports = {
  async up({ queryInterface }) {
    await queryInterface.addColumn('maintenance_attachments', 'mimeType', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('maintenance_attachments', 'fileData', {
      type: DataTypes.BLOB('long'),
      allowNull: true
    });
    await queryInterface.changeColumn('maintenance_attachments', 'url', {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  async down({ queryInterface }) {
    await queryInterface.changeColumn('maintenance_attachments', 'url', {
      type: DataTypes.STRING,
      allowNull: false
    });
    await queryInterface.removeColumn('maintenance_attachments', 'fileData');
    await queryInterface.removeColumn('maintenance_attachments', 'mimeType');
  }
};
