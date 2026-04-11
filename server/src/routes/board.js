const express = require('express');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');
const {
  Homeowner,
  BoardMemberAssignment,
  HOACommunity,
  PropertyLot,
  Document,
  Notice,
  MaintenanceRequest,
  MeetingRecord,
  Event,
  EventAsset
} = require('../models');

const router = express.Router();

router.use(authenticate);
router.use(authorize(['board_member', 'super_admin', 'management_admin']));

router.get('/overview', async (req, res) => {
  const homeowner = await Homeowner.findOne({ where: { userId: req.user.id } });

  if (!homeowner && req.user.role === 'board_member') {
    return res.status(404).json({ message: 'Board member profile not found' });
  }

  const assignmentWhere = homeowner ? { homeownerId: homeowner.id } : {};
  const assignments = await BoardMemberAssignment.findAll({
    where: assignmentWhere,
    include: [{ model: HOACommunity, as: 'community' }]
  });

  const communityIds = assignments.map((assignment) => assignment.hoaCommunityId);
  if (!communityIds.length) {
    return res.json({
      assignments: [],
      maintenanceSummary: [],
      boardDocuments: [],
      notices: [],
      meetingRecords: [],
      events: []
    });
  }

  const [maintenanceRows, boardDocuments, notices, meetingRecords, events] = await Promise.all([
    MaintenanceRequest.findAll({
      attributes: ['status'],
      include: [{
        model: Homeowner,
        as: 'homeowner',
        attributes: [],
        include: [{
          model: PropertyLot,
          as: 'propertyLot',
          attributes: [],
          where: { hoaCommunityId: { [Op.in]: communityIds } }
        }]
      }]
    }),
    Document.findAll({
      where: {
        hoaCommunityId: { [Op.in]: communityIds },
        visibility: { [Op.in]: ['all', 'board'] },
        category: { [Op.ne]: 'financials' }
      },
      order: [['createdAt', 'DESC']],
      limit: 8
    }),
    Notice.findAll({
      where: {
        hoaCommunityId: { [Op.in]: communityIds },
        visibility: { [Op.in]: ['all', 'board'] }
      },
      order: [['createdAt', 'DESC']],
      limit: 6
    }),
    MeetingRecord.findAll({
      where: {
        hoaCommunityId: { [Op.in]: communityIds },
        visibility: { [Op.in]: ['all', 'board'] }
      },
      order: [['meetingDate', 'DESC']],
      limit: 6
    }),
    Event.findAll({
      where: {
        hoaCommunityId: { [Op.in]: communityIds },
        visibility: { [Op.in]: ['all', 'board'] }
      },
      include: [{ model: EventAsset, as: 'assets' }],
      order: [['startAt', 'DESC']],
      limit: 8
    })
  ]);

  const maintenanceSummary = ['submitted', 'in_review', 'assigned', 'in_progress', 'completed', 'closed'].map((status) => ({
    status,
    count: maintenanceRows.filter((request) => request.status === status).length
  }));

  res.json({
    assignments,
    maintenanceSummary,
    boardDocuments,
    notices,
    meetingRecords,
    events
  });
});

module.exports = router;
