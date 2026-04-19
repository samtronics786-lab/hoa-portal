const { Sequelize } = require('sequelize');

const dbName = process.env.PGDATABASE || 'hoa_portal';
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || 'hoa_password';
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = process.env.PGPORT ? Number(process.env.PGPORT) : 5432;
const databaseUrl = process.env.DATABASE_URL;
const useSsl = String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
  String(process.env.DB_SSL || '').toLowerCase() === 'true';

const sharedOptions = {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: useSsl
    ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
    : undefined
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, sharedOptions)
  : new Sequelize(dbName, dbUser, dbPassword, {
    ...sharedOptions,
    host: dbHost,
    port: dbPort
  });

module.exports = sequelize;
