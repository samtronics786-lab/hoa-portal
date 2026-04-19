const fs = require('fs');
const path = require('path');

const { sequelize } = require('../models');

const metaTableName = 'SequelizeMeta';
const migrationsDir = __dirname;

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => /^\d+.*\.js$/.test(fileName))
    .sort();
}

async function ensureMetaTable() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS "${metaTableName}" ("name" VARCHAR(255) PRIMARY KEY);`);
}

async function getAppliedMigrationNames() {
  await ensureMetaTable();
  const [rows] = await sequelize.query(`SELECT "name" FROM "${metaTableName}" ORDER BY "name" ASC;`);
  return new Set(rows.map((row) => row.name));
}

async function markApplied(fileName) {
  await sequelize.query(`INSERT INTO "${metaTableName}" ("name") VALUES ($1);`, {
    bind: [fileName]
  });
}

async function unmarkApplied(fileName) {
  await sequelize.query(`DELETE FROM "${metaTableName}" WHERE "name" = $1;`, {
    bind: [fileName]
  });
}

async function runMigrations(options = {}) {
  const logger = options.logger || console;
  const applied = await getAppliedMigrationNames();
  const migrationFiles = listMigrationFiles();

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, fileName);
    delete require.cache[require.resolve(migrationPath)];
    const migration = require(migrationPath);

    logger.info(`Running migration: ${fileName}`);
    await migration.up({
      sequelize,
      queryInterface: sequelize.getQueryInterface()
    });
    await markApplied(fileName);
  }
}

async function rollbackLastMigration(options = {}) {
  const logger = options.logger || console;
  const [rows] = await sequelize.query(`SELECT "name" FROM "${metaTableName}" ORDER BY "name" DESC LIMIT 1;`);
  const latest = rows[0];

  if (!latest) {
    logger.info('No migrations to roll back.');
    return;
  }

  const migrationPath = path.join(migrationsDir, latest.name);
  delete require.cache[require.resolve(migrationPath)];
  const migration = require(migrationPath);

  logger.info(`Rolling back migration: ${latest.name}`);
  await migration.down({
    sequelize,
    queryInterface: sequelize.getQueryInterface()
  });
  await unmarkApplied(latest.name);
}

async function resetMigrationState() {
  await sequelize.query(`DROP TABLE IF EXISTS "${metaTableName}";`);
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
  resetMigrationState,
  listMigrationFiles
};
