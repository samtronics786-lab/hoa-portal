const { Op } = require('sequelize');
const {
  User,
  Homeowner,
  PropertyLot,
  BoardMemberAssignment,
  ManagementCommunityAssignment
} = require('../models');
const { sendEmail, isEmailConfigured } = require('./email');

async function getTicketNotificationRecipients(hoaCommunityId) {
  const [superAdmins, scopedManagers, boardAssignments] = await Promise.all([
    User.findAll({
      where: {
        role: 'super_admin',
        status: 'active'
      }
    }),
    ManagementCommunityAssignment.findAll({
      where: { hoaCommunityId },
      include: [{
        model: User,
        as: 'user',
        where: {
          status: 'active',
          role: { [Op.in]: ['management_admin', 'community_manager', 'admin_staff'] }
        }
      }]
    }),
    BoardMemberAssignment.findAll({
      where: { hoaCommunityId },
      include: [{
        model: Homeowner,
        as: 'homeowner',
        include: [{
          model: User,
          as: 'user',
          where: {
            status: 'active',
            role: 'board_member'
          }
        }, {
          model: PropertyLot,
          as: 'propertyLot'
        }]
      }]
    })
  ]);

  const recipients = new Map();
  superAdmins.forEach((user) => recipients.set(user.id, user.email));
  scopedManagers.forEach((assignment) => recipients.set(assignment.user.id, assignment.user.email));
  boardAssignments.forEach((assignment) => {
    if (assignment.homeowner?.user?.email) {
      recipients.set(assignment.homeowner.user.id, assignment.homeowner.user.email);
    }
  });

  return [...recipients.values()].filter(Boolean);
}

async function sendTicketEmail({ to, subject, text }) {
  if (!isEmailConfigured() || !to.length) return;
  await sendEmail({ to, subject, text });
}

module.exports = {
  getTicketNotificationRecipients,
  sendTicketEmail
};
