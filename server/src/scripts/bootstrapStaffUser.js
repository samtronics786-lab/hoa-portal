require('dotenv').config();

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, User, HOACommunity, ManagementCommunityAssignment } = require('../models');
const { runMigrations } = require('../migrations');
const { normalizePhoneNumber } = require('../utils/phone');

const allowedRoles = ['super_admin', 'management_admin', 'community_manager', 'admin_staff', 'board_member'];
const allowedStatuses = ['active', 'inactive', 'suspended'];

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
}

function parseCommunityIds(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function printUsage() {
  console.log(`
Usage:
  npm run bootstrap:staff -- --email admin@deanspondcommunity.com --username admin --password "StrongPassword123!" --role super_admin

Optional flags:
  --status active|inactive|suspended
  --mobile +15551234567
  --mfa true|false
  --communities <community-id-1,community-id-2>

Notes:
  - This script is non-destructive.
  - If the user already exists by email or username, it updates that user.
  - Community assignments are only applied for non-super-admin staff roles.
`);
}

async function bootstrapStaffUser() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.email || !args.password || !args.role) {
    printUsage();
    process.exit(1);
  }

  if (!allowedRoles.includes(args.role)) {
    throw new Error(`Invalid role "${args.role}". Allowed roles: ${allowedRoles.join(', ')}`);
  }

  const status = args.status || 'active';
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status "${status}". Allowed statuses: ${allowedStatuses.join(', ')}`);
  }

  const communityIds = parseCommunityIds(args.communities);
  if (args.role !== 'super_admin' && !communityIds.length) {
    console.warn('No community assignments provided. The staff user will exist, but may not see any community-scoped data until assignments are added.');
  }

  await sequelize.authenticate();
  await runMigrations();

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const passwordHash = await bcrypt.hash(args.password, saltRounds);
  const normalizedMobileNumber = args.mobile ? normalizePhoneNumber(args.mobile) : null;

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [
        { email: args.email },
        ...(args.username ? [{ username: args.username }] : [])
      ]
    }
  });

  const [user, created] = existingUser
    ? [existingUser, false]
    : [User.build({ email: args.email }), true];

  user.email = args.email;
  user.username = args.username || user.username || args.email;
  user.passwordHash = passwordHash;
  user.role = args.role;
  user.status = status;
  user.mfaEnabled = toBoolean(args.mfa, false);
  user.mobileNumber = normalizedMobileNumber;
  await user.save();

  if (communityIds.length) {
    const communities = await HOACommunity.findAll({
      where: { id: { [Op.in]: communityIds } }
    });

    if (communities.length !== communityIds.length) {
      const foundIds = new Set(communities.map((community) => community.id));
      const missingIds = communityIds.filter((id) => !foundIds.has(id));
      throw new Error(`Some community IDs were not found: ${missingIds.join(', ')}`);
    }

    await ManagementCommunityAssignment.destroy({
      where: { userId: user.id }
    });

    if (args.role !== 'super_admin') {
      await Promise.all(communityIds.map((hoaCommunityId) => (
        ManagementCommunityAssignment.create({ userId: user.id, hoaCommunityId })
      )));
    }
  }

  console.log(JSON.stringify({
    action: created ? 'created' : 'updated',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      mobileNumber: user.mobileNumber
    },
    assignmentsUpdated: communityIds.length > 0
  }, null, 2));
}

bootstrapStaffUser()
  .catch((error) => {
    console.error('Failed to bootstrap staff user:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      // Ignore shutdown errors.
    }
  });
