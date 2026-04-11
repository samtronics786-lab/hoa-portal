const { HOACommunity, ManagementCommunityAssignment } = require('../models');

async function getAccessibleCommunityIds(user) {
  if (!user) return [];
  if (user.role === 'super_admin') {
    const communities = await HOACommunity.findAll({ attributes: ['id'] });
    return communities.map((community) => community.id);
  }

  if (!['management_admin', 'community_manager', 'admin_staff'].includes(user.role)) {
    return [];
  }

  const assignments = await ManagementCommunityAssignment.findAll({
    where: { userId: user.id },
    attributes: ['hoaCommunityId']
  });

  return assignments.map((assignment) => assignment.hoaCommunityId);
}

async function assertCommunityAccess(user, communityId) {
  const communityIds = await getAccessibleCommunityIds(user);
  if (!communityIds.includes(communityId)) {
    const error = new Error('Forbidden: community access denied');
    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  getAccessibleCommunityIds,
  assertCommunityAccess
};
