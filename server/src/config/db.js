const { Sequelize } = require('sequelize');

const dbName = process.env.PGDATABASE || 'hoa_portal';
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || 'hoa_password';
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = process.env.PGPORT ? Number(process.env.PGPORT) : 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;