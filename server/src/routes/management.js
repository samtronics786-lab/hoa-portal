const express = require('express');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');
const { HOACommunity, PropertyLot, Homeowner, Charge, Payment, MaintenanceRequest, MaintenanceAttachment, MaintenanceComment, Document, Notice, MeetingRecord, Event, EventAsset, AuditLog, User, BoardMemberAssignment, ManagementCommunityAssignment, Survey, SurveyOption, SurveyResponse } = require('../models');
const { logAudit } = require('../utils/auditLog');
const { getAccessibleCommunityIds, assertCommunityAccess } = require('../utils/communityScope');
const { saveBase64Upload } = require('../utils/uploads');
const { sendEmail, isEmailConfigured, EmailDeliveryError } = require('../utils/email');
const { getTicketNotificationRecipients, sendTicketEmail } = require('../utils/ticketNotifications');

const router = express.Router();

async function getScopedCommunityIds(req) {
  return getAccessibleCommunityIds(req.user);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

function buildDateRange(field, query) {
  const range = {};
  if (query.dateFrom) range[Op.gte] = new Date(`${query.dateFrom}T00:00:00`);
  if (query.dateTo) range[Op.lte] = new Date(`${query.dateTo}T23:59:59`);
  return Object.keys(range).length ? { [field]: range } : {};
}

function requireSuperAdmin(req, res) {
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ message: 'Only super admins can access payment and statement functions' });
    return false;
  }
  return true;
}

function buildTicketInclude() {
  return [{
    model: Homeowner,
    as: 'homeowner',
    attributes: ['id', 'name', 'email', 'phone'],
    include: [{ model: PropertyLot, as: 'propertyLot', attributes: ['id', 'address', 'hoaCommunityId'] }]
  }, {
    model: MaintenanceAttachment,
    as: 'attachments'
  }, {
    model: MaintenanceComment,
    as: 'comments',
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }]
  }];
}

router.use(authenticate);
router.use(authorize(['super_admin', 'management_admin', 'community_manager', 'admin_staff']));

router.get('/overview', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const propertyScope = { hoaCommunityId: { [Op.in]: communityIds } };
  const homeownerScope = {
    '$propertyLot.hoaCommunityId$': { [Op.in]: communityIds }
  };

  const [communities, homeowners, openRequests, openRequestCount, recentNotices, recentDocuments, activeSurveys] = await Promise.all([
    HOACommunity.count({ where: { id: { [Op.in]: communityIds } } }),
    Homeowner.count({
      include: [{ model: PropertyLot, as: 'propertyLot', attributes: [] }],
      where: homeownerScope
    }),
    MaintenanceRequest.findAll({
      where: {
        status: { [Op.in]: ['submitted', 'in_review', 'assigned', 'in_progress'] }
      },
      include: [{
        model: Homeowner,
        as: 'homeowner',
        attributes: ['id', 'name'],
        include: [{ model: PropertyLot, as: 'propertyLot', attributes: ['hoaCommunityId'] }]
      }],
      order: [['createdAt', 'DESC']],
      limit: 8
    }),
    MaintenanceRequest.count({
      where: {
        status: { [Op.in]: ['submitted', 'in_review', 'assigned', 'in_progress'] }
      },
      include: [{
        model: Homeowner,
        as: 'homeowner',
        attributes: [],
        include: [{ model: PropertyLot, as: 'propertyLot', attributes: [], where: propertyScope }]
      }]
    }),
    Notice.findAll({ where: { hoaCommunityId: { [Op.in]: communityIds } }, order: [['createdAt', 'DESC']], limit: 5 }),
    Document.findAll({
      where: {
        hoaCommunityId: { [Op.in]: communityIds },
        ...(req.user.role === 'super_admin' ? {} : { category: { [Op.ne]: 'financials' } })
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    }),
    Survey.count({ where: { status: { [Op.in]: ['open', 'published'] }, hoaCommunityId: { [Op.in]: communityIds } } })
  ]);

  const scopedOpenRequests = openRequests.filter((request) => communityIds.includes(request.homeowner?.propertyLot?.hoaCommunityId));

  const summary = {
    communityCount: communities,
    homeownerCount: homeowners,
    openRequestCount,
    activeSurveyCount: activeSurveys
  };

  if (req.user.role === 'super_admin') {
    summary.overdueChargeCount = await Charge.count({ where: { status: 'overdue', communityId: { [Op.in]: communityIds } } });
  }

  res.json({
    summary,
    openRequests: scopedOpenRequests,
    recentNotices,
    recentDocuments
  });
});

router.post('/communities', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can create communities' });
  }
  const creation = await HOACommunity.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'management.create_community', entityType: 'hoa_community', entityId: creation.id });
  res.status(201).json(creation);
});

router.get('/communities', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const list = await HOACommunity.findAll({ where: { id: { [Op.in]: communityIds } }, order: [['name', 'ASC']] });
  res.json(list);
});

router.patch('/communities/:communityId', async (req, res) => {
  try {
    await assertCommunityAccess(req.user, req.params.communityId);
    const community = await HOACommunity.findByPk(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const { name, address, description } = req.body;
    if (name !== undefined) community.name = name;
    if (address !== undefined) community.address = address;
    if (description !== undefined) community.description = description;
    await community.save();
    await logAudit({ req, userId: req.user.id, action: 'management.update_community', entityType: 'hoa_community', entityId: community.id });
    res.json(community);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to update community' });
  }
});

router.get('/property-lots', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const lots = await PropertyLot.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [{ model: HOACommunity, as: 'community' }],
    order: [['createdAt', 'DESC']]
  });
  res.json(lots);
});

router.post('/property-lots', async (req, res) => {
  try {
    await assertCommunityAccess(req.user, req.body.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const lot = await PropertyLot.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'management.create_property_lot', entityType: 'property_lot', entityId: lot.id });
  res.status(201).json(lot);
});

router.patch('/property-lots/:lotId', async (req, res) => {
  const lot = await PropertyLot.findByPk(req.params.lotId);
  if (!lot) return res.status(404).json({ message: 'Property lot not found' });
  try {
    await assertCommunityAccess(req.user, lot.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const { lotNumber, address, status } = req.body;
  if (lotNumber !== undefined) lot.lotNumber = lotNumber;
  if (address !== undefined) lot.address = address;
  if (status !== undefined) lot.status = status;
  await lot.save();
  await logAudit({ req, userId: req.user.id, action: 'management.update_property_lot', entityType: 'property_lot', entityId: lot.id });
  res.json(lot);
});

router.get('/homeowners', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const homeowners = await Homeowner.findAll({
    include: [{
      model: PropertyLot,
      as: 'propertyLot',
      include: [{ model: HOACommunity, as: 'community' }],
      where: { hoaCommunityId: { [Op.in]: communityIds } }
    }],
    order: [['createdAt', 'DESC']]
  });
  res.json(homeowners);
});

router.post('/homeowners', async (req, res) => {
  const lot = await PropertyLot.findByPk(req.body.propertyLotId);
  if (!lot) return res.status(404).json({ message: 'Property lot not found' });
  try {
    await assertCommunityAccess(req.user, lot.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const homeowner = await Homeowner.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'management.create_homeowner', entityType: 'homeowner', entityId: homeowner.id });
  res.status(201).json(homeowner);
});

router.patch('/homeowners/:homeownerId', async (req, res) => {
  const homeowner = await Homeowner.findByPk(req.params.homeownerId, {
    include: [{ model: PropertyLot, as: 'propertyLot' }]
  });
  if (!homeowner) return res.status(404).json({ message: 'Homeowner not found' });
  try {
    await assertCommunityAccess(req.user, homeowner.propertyLot.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const { name, email, phone } = req.body;
  if (name !== undefined) homeowner.name = name;
  if (email !== undefined) homeowner.email = email;
  if (phone !== undefined) homeowner.phone = phone;
  await homeowner.save();
  await logAudit({ req, userId: req.user.id, action: 'management.update_homeowner', entityType: 'homeowner', entityId: homeowner.id });
  res.json(homeowner);
});

router.post('/charges', async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    await assertCommunityAccess(req.user, req.body.communityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const charge = await Charge.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'management.create_charge', entityType: 'charge', entityId: charge.id });
  res.status(201).json(charge);
});

router.get('/charges', async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const communityIds = await getScopedCommunityIds(req);
  const charges = await Charge.findAll({
    where: { communityId: { [Op.in]: communityIds } },
    include: [{ model: Homeowner, as: 'homeowner', attributes: ['id', 'name', 'email'] }],
    order: [['dueDate', 'DESC'], ['createdAt', 'DESC']]
  });
  res.json(charges);
});

router.patch('/charges/:chargeId', async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const charge = await Charge.findByPk(req.params.chargeId, {
    include: [{ model: Homeowner, as: 'homeowner', attributes: ['id', 'name', 'email'] }]
  });
  if (!charge) return res.status(404).json({ message: 'Charge not found' });
  try {
    await assertCommunityAccess(req.user, charge.communityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  const { status, delinquencyStage, paymentPlanStatus, paymentPlanNotes, dueDate } = req.body;
  if (status !== undefined) charge.status = status;
  if (delinquencyStage !== undefined) charge.delinquencyStage = delinquencyStage;
  if (paymentPlanStatus !== undefined) charge.paymentPlanStatus = paymentPlanStatus;
  if (paymentPlanNotes !== undefined) charge.paymentPlanNotes = paymentPlanNotes;
  if (dueDate !== undefined) charge.dueDate = dueDate;
  await charge.save();

  await logAudit({
    req,
    userId: req.user.id,
    action: 'management.update_charge',
    entityType: 'charge',
    entityId: charge.id,
    details: { status: charge.status, delinquencyStage: charge.delinquencyStage, paymentPlanStatus: charge.paymentPlanStatus }
  });

  res.json(charge);
});

router.post('/charges/:chargeId/send-reminder', async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const charge = await Charge.findByPk(req.params.chargeId, {
    include: [{ model: Homeowner, as: 'homeowner', attributes: ['id', 'name', 'email'] }]
  });
  if (!charge) return res.status(404).json({ message: 'Charge not found' });
  try {
    await assertCommunityAccess(req.user, charge.communityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  if (!isEmailConfigured()) {
    return res.status(503).json({ message: 'Reminder email delivery is not configured' });
  }

  try {
    await sendEmail({
      to: charge.homeowner?.email,
      subject: 'HOA Portal payment reminder',
      text: `This is a reminder that ${charge.description} for ${Number(charge.amount).toFixed(2)} is currently ${charge.status}. Please review your HOA Portal account.`
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      return res.status(503).json({ message: `Reminder email delivery failed: ${error.message}` });
    }
    throw error;
  }

  charge.lastReminderAt = new Date();
  if (charge.delinquencyStage === 'current') {
    charge.delinquencyStage = 'reminder_sent';
  }
  await charge.save();

  await logAudit({
    req,
    userId: req.user.id,
    action: 'management.send_payment_reminder',
    entityType: 'charge',
    entityId: charge.id
  });

  res.json({ success: true });
});

router.get('/board-assignments', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const assignments = await BoardMemberAssignment.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [
      { model: HOACommunity, as: 'community' },
      { model: Homeowner, as: 'homeowner', required: false }
    ],
    order: [['createdAt', 'DESC']]
  });
  res.json(assignments);
});

router.post('/board-assignments', async (req, res) => {
  try {
    await assertCommunityAccess(req.user, req.body.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const assignment = await BoardMemberAssignment.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'management.create_board_assignment', entityType: 'board_assignment', entityId: assignment.id });
  res.status(201).json(assignment);
});

router.patch('/board-assignments/:assignmentId', async (req, res) => {
  const assignment = await BoardMemberAssignment.findByPk(req.params.assignmentId);
  if (!assignment) return res.status(404).json({ message: 'Board assignment not found' });
  try {
    await assertCommunityAccess(req.user, assignment.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const { role, termStart, termEnd } = req.body;
  if (role !== undefined) assignment.role = role;
  if (termStart !== undefined) assignment.termStart = termStart;
  if (termEnd !== undefined) assignment.termEnd = termEnd;
  await assignment.save();
  await logAudit({ req, userId: req.user.id, action: 'management.update_board_assignment', entityType: 'board_assignment', entityId: assignment.id });
  res.json(assignment);
});

router.post('/maintenance/assign', async (req, res) => {
  const { requestId, status, internalNotes, vendorAssignment, completionNotes } = req.body;
  const request = await MaintenanceRequest.findByPk(requestId, {
    include: buildTicketInclude()
  });
  if (!request) return res.status(404).json({ message: 'Request not found' });
  try {
    await assertCommunityAccess(req.user, request.homeowner.propertyLot.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  const previousStatus = request.status;
  request.status = status || request.status;
  if (internalNotes !== undefined) request.internalNotes = internalNotes;
  if (vendorAssignment !== undefined) request.vendorAssignment = vendorAssignment;
  if (completionNotes !== undefined) request.completionNotes = completionNotes;
  await request.save();
  await logAudit({
    req,
    userId: req.user.id,
    action: 'ticket.status_updated',
    entityType: 'maintenance_request',
    entityId: request.id,
    details: { status: request.status, previousStatus }
  });

  const recipients = await getTicketNotificationRecipients(request.homeowner.propertyLot.hoaCommunityId);
  await sendTicketEmail({
    to: recipients,
    subject: `Ticket status updated: ${request.title}`,
    text: `Ticket "${request.title}" is now ${request.status}.\n\nUpdated by: ${req.user.username || req.user.email}\nProperty: ${request.homeowner.propertyLot.address}\nHomeowner: ${request.homeowner.name}`
  });

  if (['completed', 'closed'].includes(request.status) && request.homeowner.email) {
    await sendTicketEmail({
      to: [request.homeowner.email],
      subject: `Your HOA ticket has been resolved: ${request.title}`,
      text: `Your ticket "${request.title}" is now marked ${request.status}.\n\nResolution notes:\n${request.completionNotes || request.internalNotes || 'Management has marked the request resolved.'}`
    });
  }

  res.json(request);
});

router.post('/maintenance/:requestId/comments', async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.requestId, {
      include: buildTicketInclude()
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    await assertCommunityAccess(req.user, request.homeowner.propertyLot.hoaCommunityId);

    if (!req.body.comment?.trim()) {
      return res.status(400).json({ message: 'A comment is required' });
    }

    const comment = await MaintenanceComment.create({
      maintenanceRequestId: request.id,
      userId: req.user.id,
      comment: req.body.comment.trim()
    });

    await logAudit({
      req,
      userId: req.user.id,
      action: 'ticket.comment_added',
      entityType: 'maintenance_comment',
      entityId: comment.id,
      details: { requestId: request.id }
    });

    const recipients = await getTicketNotificationRecipients(request.homeowner.propertyLot.hoaCommunityId);
    await sendTicketEmail({
      to: recipients,
      subject: `Ticket comment added: ${request.title}`,
      text: `${req.user.username || req.user.email} added a comment on ticket "${request.title}".\n\nComment:\n${comment.comment}`
    });

    const response = await MaintenanceComment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }]
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to add ticket comment' });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const { title, message, hoaCommunityId, visibility = 'all', targetUserId = null } = req.body;
    if (!title || !message || !hoaCommunityId) {
      return res.status(400).json({ message: 'Title, message, and community are required' });
    }
    if (visibility === 'individual' && !targetUserId) {
      return res.status(400).json({ message: 'A target homeowner is required for individual notices' });
    }
    await assertCommunityAccess(req.user, hoaCommunityId);

    const notice = await Notice.create({
      title,
      message,
      hoaCommunityId,
      visibility,
      targetUserId
    });
    await logAudit({ req, userId: req.user.id, action: 'management.publish_notice', entityType: 'notice', entityId: notice.id, details: { visibility } });
    res.status(201).json(notice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create notice' });
  }
});

router.post('/documents', async (req, res) => {
  try {
    const { title, category, hoaCommunityId, url, visibility = 'all', fileData, fileName } = req.body;
    if (!title || !category || !hoaCommunityId || (!url && !fileData)) {
      return res.status(400).json({ message: 'Title, category, community, and either a URL or uploaded file are required' });
    }
    if (category === 'financials' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admins can publish financial statements' });
    }
    await assertCommunityAccess(req.user, hoaCommunityId);

    let finalUrl = url;
    if (fileData) {
      finalUrl = saveBase64Upload({
        req,
        fileData,
        fileName,
        fallbackName: title
      }).url;
    }

    const doc = await Document.create({
      title,
      category,
      hoaCommunityId,
      url: finalUrl,
      visibility,
      uploaderId: req.user.id
    });
    await logAudit({ req, userId: req.user.id, action: 'management.publish_document', entityType: 'document', entityId: doc.id, details: { category, visibility, uploadType: fileData ? 'file' : 'url' } });
    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create document' });
  }
});

router.get('/maintenance', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const requests = await MaintenanceRequest.findAll({
    include: buildTicketInclude(),
    order: [['createdAt', 'DESC']]
  });
  res.json(requests.filter((request) => communityIds.includes(request.homeowner?.propertyLot?.hoaCommunityId)));
});

router.post('/maintenance/:requestId/attachments', async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.requestId, {
      include: [{
        model: Homeowner,
        as: 'homeowner',
        include: [{ model: PropertyLot, as: 'propertyLot' }]
      }]
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    await assertCommunityAccess(req.user, request.homeowner.propertyLot.hoaCommunityId);
    const { fileData, fileName } = req.body;
    if (!fileData || !fileName) {
      return res.status(400).json({ message: 'Attachment file is required' });
    }
    const upload = saveBase64Upload({ req, fileData, fileName, fallbackName: request.title });
    const attachment = await MaintenanceAttachment.create({
      maintenanceRequestId: request.id,
      fileName,
      url: upload.url,
      uploadedById: req.user.id
    });
    await logAudit({ req, userId: req.user.id, action: 'management.add_maintenance_attachment', entityType: 'maintenance_attachment', entityId: attachment.id });
    res.status(201).json(attachment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to upload attachment' });
  }
});

router.get('/notices', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const notices = await Notice.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [{ model: HOACommunity, as: 'community' }],
    order: [['createdAt', 'DESC']]
  });
  res.json(notices);
});

router.delete('/notices/:noticeId', async (req, res) => {
  const notice = await Notice.findByPk(req.params.noticeId);
  if (!notice) return res.status(404).json({ message: 'Notice not found' });
  try {
    await assertCommunityAccess(req.user, notice.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  await notice.destroy();
  await logAudit({ req, userId: req.user.id, action: 'management.delete_notice', entityType: 'notice', entityId: notice.id });
  res.json({ success: true });
});

router.get('/documents', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const documents = await Document.findAll({
    where: {
      hoaCommunityId: { [Op.in]: communityIds },
      ...(req.user.role === 'super_admin' ? {} : { category: { [Op.ne]: 'financials' } })
    },
    include: [{ model: HOACommunity, as: 'community' }],
    order: [['createdAt', 'DESC']]
  });
  res.json(documents);
});

router.delete('/documents/:documentId', async (req, res) => {
  const document = await Document.findByPk(req.params.documentId);
  if (!document) return res.status(404).json({ message: 'Document not found' });
  try {
    await assertCommunityAccess(req.user, document.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  if (document.category === 'financials' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can manage financial statements' });
  }
  await document.destroy();
  await logAudit({ req, userId: req.user.id, action: 'management.delete_document', entityType: 'document', entityId: document.id });
  res.json({ success: true });
});

router.get('/meeting-records', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const records = await MeetingRecord.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [{ model: HOACommunity, as: 'community' }],
    order: [['meetingDate', 'DESC']]
  });
  res.json(records);
});

router.get('/events', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const events = await Event.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [
      { model: HOACommunity, as: 'community' },
      { model: EventAsset, as: 'assets' }
    ],
    order: [['startAt', 'DESC']]
  });
  res.json(events);
});

router.post('/events', async (req, res) => {
  try {
    const { hoaCommunityId, title, summary, description, location, startAt, endAt, eventType = 'general', status = 'upcoming', visibility = 'all' } = req.body;
    if (!hoaCommunityId || !title || !startAt) {
      return res.status(400).json({ message: 'Community, title, and event start time are required' });
    }
    await assertCommunityAccess(req.user, hoaCommunityId);

    const event = await Event.create({
      hoaCommunityId,
      title,
      summary,
      description,
      location,
      startAt,
      endAt,
      eventType,
      status,
      visibility,
      postedById: req.user.id
    });

    await logAudit({ req, userId: req.user.id, action: 'management.create_event', entityType: 'event', entityId: event.id, details: { eventType, status } });
    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create event' });
  }
});

router.patch('/events/:eventId', async (req, res) => {
  const event = await Event.findByPk(req.params.eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  try {
    await assertCommunityAccess(req.user, event.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  const { title, summary, description, location, startAt, endAt, eventType, status, visibility } = req.body;
  if (title !== undefined) event.title = title;
  if (summary !== undefined) event.summary = summary;
  if (description !== undefined) event.description = description;
  if (location !== undefined) event.location = location;
  if (startAt !== undefined) event.startAt = startAt;
  if (endAt !== undefined) event.endAt = endAt;
  if (eventType !== undefined) event.eventType = eventType;
  if (status !== undefined) event.status = status;
  if (visibility !== undefined) event.visibility = visibility;
  await event.save();

  await logAudit({ req, userId: req.user.id, action: 'management.update_event', entityType: 'event', entityId: event.id, details: { status: event.status, eventType: event.eventType } });
  res.json(event);
});

router.post('/events/:eventId/assets', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await assertCommunityAccess(req.user, event.hoaCommunityId);

    const { title, assetType = 'photo', url, fileData, fileName } = req.body;
    if (!title || (!url && !fileData)) {
      return res.status(400).json({ message: 'Asset title and either a URL or uploaded file are required' });
    }

    let finalUrl = url;
    if (fileData) {
      finalUrl = saveBase64Upload({
        req,
        fileData,
        fileName,
        fallbackName: title
      }).url;
    }

    const asset = await EventAsset.create({
      eventId: event.id,
      title,
      assetType,
      url: finalUrl,
      uploaderId: req.user.id
    });

    await logAudit({ req, userId: req.user.id, action: 'management.add_event_asset', entityType: 'event_asset', entityId: asset.id, details: { assetType } });
    res.status(201).json(asset);
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Failed to upload event asset' });
  }
});

router.delete('/meeting-records/:recordId', async (req, res) => {
  const record = await MeetingRecord.findByPk(req.params.recordId);
  if (!record) return res.status(404).json({ message: 'Meeting record not found' });
  try {
    await assertCommunityAccess(req.user, record.hoaCommunityId);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
  await record.destroy();
  await logAudit({ req, userId: req.user.id, action: 'management.delete_meeting_record', entityType: 'meeting_record', entityId: record.id });
  res.json({ success: true });
});

router.post('/meeting-records', async (req, res) => {
  try {
    const { hoaCommunityId, title, meetingDate, agenda, minutes, visibility = 'board' } = req.body;
    if (!hoaCommunityId || !title || !meetingDate) {
      return res.status(400).json({ message: 'Community, title, and meeting date are required' });
    }
    await assertCommunityAccess(req.user, hoaCommunityId);

    const record = await MeetingRecord.create({
      hoaCommunityId,
      title,
      meetingDate,
      agenda,
      minutes,
      visibility,
      postedById: req.user.id
    });

    await logAudit({
      req,
      userId: req.user.id,
      action: 'management.publish_meeting_record',
      entityType: 'meeting_record',
      entityId: record.id,
      details: { visibility }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create meeting record' });
  }
});

router.get('/audit-logs', async (req, res) => {
  const logs = await AuditLog.findAll({
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }],
    order: [['createdAt', 'DESC']],
    limit: 50
  });
  res.json(logs);
});

router.get('/surveys', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const surveys = await Survey.findAll({
    where: { hoaCommunityId: { [Op.in]: communityIds } },
    include: [
      { model: HOACommunity, as: 'community' },
      { model: SurveyOption, as: 'options' },
      { model: SurveyResponse, as: 'responses' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(surveys.map((survey) => ({
    ...survey.toJSON(),
    responseCount: survey.responses?.length || 0
  })));
});

router.post('/surveys', async (req, res) => {
  try {
    const {
      hoaCommunityId,
      title,
      description,
      question,
      startAt,
      endAt,
      status = 'draft',
      options = []
    } = req.body;

    if (!hoaCommunityId || !title || !question || !startAt || !endAt || options.length < 2) {
      return res.status(400).json({ message: 'Community, title, question, start/end dates, and at least two survey options are required' });
    }
    await assertCommunityAccess(req.user, hoaCommunityId);

    const survey = await Survey.create({
      hoaCommunityId,
      title,
      description,
      question,
      startAt,
      endAt,
      status,
      postedById: req.user.id
    });

    const createdOptions = await Promise.all(options.map((option, index) => SurveyOption.create({
      surveyId: survey.id,
      label: option.label,
      description: option.description,
      sortOrder: index
    })));

    await logAudit({ req, userId: req.user.id, action: 'management.create_survey', entityType: 'survey', entityId: survey.id, details: { optionCount: createdOptions.length } });

    res.status(201).json({ ...survey.toJSON(), options: createdOptions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create survey' });
  }
});

router.post('/surveys/:surveyId/status', async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.surveyId);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    await assertCommunityAccess(req.user, survey.hoaCommunityId);

    if (req.body.status) {
      survey.status = req.body.status;
    }
    await survey.save();

    await logAudit({ req, userId: req.user.id, action: 'management.update_survey_status', entityType: 'survey', entityId: survey.id, details: { status: survey.status } });

    res.json(survey);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update survey status' });
  }
});

router.get('/reports/collections', async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const communityIds = await getScopedCommunityIds(req);
  const scopedCommunityIds = req.query.hoaCommunityId ? communityIds.filter((id) => id === req.query.hoaCommunityId) : communityIds;
  const rows = await Charge.findAll({
    where: {
      communityId: { [Op.in]: scopedCommunityIds },
      ...(req.query.status ? { status: req.query.status } : {}),
      ...buildDateRange('dueDate', req.query)
    },
    include: [{
      model: Homeowner,
      as: 'homeowner',
      attributes: ['name', 'email']
    }],
    order: [['dueDate', 'DESC']]
  });

  const data = rows.map((charge) => ({
    communityId: charge.communityId,
    homeowner: charge.homeowner?.name,
    email: charge.homeowner?.email,
    description: charge.description,
    amount: charge.amount,
    dueDate: charge.dueDate ? new Date(charge.dueDate).toISOString().slice(0, 10) : '',
    status: charge.status
  }));

  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="collections-report.csv"');
    return res.send(toCsv(data));
  }

  res.json(data);
});

router.get('/reports/maintenance', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const scopedCommunityIds = req.query.hoaCommunityId ? communityIds.filter((id) => id === req.query.hoaCommunityId) : communityIds;
  const rows = await MaintenanceRequest.findAll({
    where: {
      ...(req.query.status ? { status: req.query.status } : {}),
      ...buildDateRange('createdAt', req.query)
    },
    include: [{
      model: Homeowner,
      as: 'homeowner',
      attributes: ['name'],
      include: [{ model: PropertyLot, as: 'propertyLot', attributes: ['address', 'hoaCommunityId'], where: { hoaCommunityId: { [Op.in]: scopedCommunityIds } } }]
    }, {
      model: MaintenanceAttachment,
      as: 'attachments',
      attributes: ['id']
    }],
    order: [['createdAt', 'DESC']]
  });
  const data = rows.map((request) => ({
    homeowner: request.homeowner?.name,
    property: request.homeowner?.propertyLot?.address,
    category: request.category,
    title: request.title,
    priority: request.priority,
    status: request.status,
    attachments: request.attachments?.length || 0,
    createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : ''
  }));
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="maintenance-report.csv"');
    return res.send(toCsv(data));
  }
  res.json(data);
});

router.get('/reports/surveys', async (req, res) => {
  const communityIds = await getScopedCommunityIds(req);
  const scopedCommunityIds = req.query.hoaCommunityId ? communityIds.filter((id) => id === req.query.hoaCommunityId) : communityIds;
  const rows = await Survey.findAll({
    where: {
      hoaCommunityId: { [Op.in]: scopedCommunityIds },
      ...(req.query.status ? { status: req.query.status } : {}),
      ...buildDateRange('startAt', req.query)
    },
    include: [{ model: HOACommunity, as: 'community' }, { model: SurveyResponse, as: 'responses' }],
    order: [['createdAt', 'DESC']]
  });
  const data = rows.map((survey) => ({
    community: survey.community?.name,
    title: survey.title,
    question: survey.question,
    status: survey.status,
    responseCount: survey.responses?.length || 0,
    startAt: survey.startAt ? new Date(survey.startAt).toISOString() : '',
    endAt: survey.endAt ? new Date(survey.endAt).toISOString() : ''
  }));
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="surveys-report.csv"');
    return res.send(toCsv(data));
  }
  res.json(data);
});

router.get('/users', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can manage users' });
  }
  const users = await User.findAll({
    attributes: ['id', 'username', 'email', 'mobileNumber', 'role', 'status', 'mfaEnabled', 'createdAt'],
    include: [{
      model: ManagementCommunityAssignment,
      as: 'communityAssignments',
      include: [{ model: HOACommunity, as: 'community' }]
    }],
    order: [['createdAt', 'DESC']]
  });
  res.json(users);
});

router.post('/users', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can create users' });
  }
  const { email, username, mobileNumber, password, role, status = 'active', mfaEnabled = false } = req.body;
  if (!email || !role) return res.status(400).json({ message: 'Email and role are required' });
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const passwordHash = await bcrypt.hash(password || `Temp${Math.random().toString(36).slice(2)}!`, saltRounds);
  const user = await User.create({ email, username, mobileNumber, passwordHash, role, status, mfaEnabled });
  await logAudit({ req, userId: req.user.id, action: 'super_admin.create_user', entityType: 'user', entityId: user.id });
  res.status(201).json(user);
});

router.patch('/users/:userId', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can update users' });
  }
  const user = await User.findByPk(req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { username, email, mobileNumber, role, status, mfaEnabled } = req.body;
  if (username !== undefined) user.username = username;
  if (email !== undefined) user.email = email;
  if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (mfaEnabled !== undefined) user.mfaEnabled = Boolean(mfaEnabled);
  await user.save();
  await logAudit({ req, userId: req.user.id, action: 'super_admin.update_user', entityType: 'user', entityId: user.id, details: { username: user.username, role: user.role, status: user.status, mfaEnabled: user.mfaEnabled } });
  res.json(user);
});

router.get('/community-assignments', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can manage community assignments' });
  }
  const assignments = await ManagementCommunityAssignment.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'username', 'email', 'role', 'status'] },
      { model: HOACommunity, as: 'community', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });
  res.json(assignments);
});

router.post('/community-assignments', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can manage community assignments' });
  }
  const assignment = await ManagementCommunityAssignment.create(req.body);
  await logAudit({ req, userId: req.user.id, action: 'super_admin.create_community_assignment', entityType: 'community_assignment', entityId: assignment.id });
  res.status(201).json(assignment);
});

router.delete('/community-assignments/:assignmentId', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Only super admins can manage community assignments' });
  }
  const assignment = await ManagementCommunityAssignment.findByPk(req.params.assignmentId);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  await assignment.destroy();
  await logAudit({ req, userId: req.user.id, action: 'super_admin.delete_community_assignment', entityType: 'community_assignment', entityId: req.params.assignmentId });
  res.json({ success: true });
});

module.exports = router;
