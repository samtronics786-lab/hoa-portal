const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const {
  Homeowner,
  MaintenanceRequest,
  MaintenanceAttachment,
  MaintenanceComment,
  Notice,
  Document,
  PropertyLot,
  HOACommunity,
  Event,
  EventAsset,
  User,
  Survey,
  SurveyOption,
  SurveyResponse
} = require('../models');
const { logAudit } = require('../utils/auditLog');
const { saveBase64Upload } = require('../utils/uploads');
const { getTicketNotificationRecipients, sendTicketEmail } = require('../utils/ticketNotifications');

const router = express.Router();

router.use(authenticate);

async function getHomeownerContext(userId) {
  return Homeowner.findOne({
    where: { userId },
    include: [{
      model: PropertyLot,
      as: 'propertyLot',
      include: [{ model: HOACommunity, as: 'community' }]
    }, {
      model: User,
      as: 'user'
    }]
  });
}

function buildTicketInclude() {
  return [
    {
      model: Homeowner,
      as: 'homeowner',
      attributes: ['id', 'name', 'propertyLotId'],
      include: [{ model: PropertyLot, as: 'propertyLot', attributes: ['id', 'address', 'hoaCommunityId'] }]
    },
    { model: MaintenanceAttachment, as: 'attachments' },
    {
      model: MaintenanceComment,
      as: 'comments',
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }]
    }
  ];
}

router.get('/me', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const [myOpenRequests, communityOpenRequests, documentCount, noticeCount] = await Promise.all([
    MaintenanceRequest.count({
      where: {
        homeownerId: homeowner.id,
        status: { [Op.notIn]: ['completed', 'closed'] }
      }
    }),
    MaintenanceRequest.count({
      where: {
        propertyLotId: {
          [Op.in]: await PropertyLot.findAll({
            where: { hoaCommunityId: homeowner.propertyLot.hoaCommunityId },
            attributes: ['id'],
            raw: true
          }).then((rows) => rows.map((row) => row.id))
        },
        status: { [Op.notIn]: ['completed', 'closed'] }
      }
    }),
    Document.count({
      where: {
        hoaCommunityId: homeowner.propertyLot.hoaCommunityId,
        visibility: { [Op.in]: ['all', 'homeowner'] },
        category: { [Op.ne]: 'financials' }
      }
    }),
    Notice.count({
      where: {
        hoaCommunityId: homeowner.propertyLot.hoaCommunityId,
        [Op.or]: [
          { visibility: 'all' },
          { visibility: 'homeowner' },
          { visibility: 'individual', targetUserId: req.user.id }
        ]
      }
    })
  ]);

  res.json({
    ...homeowner.toJSON(),
    summary: {
      myOpenRequests,
      communityOpenRequests,
      documentCount,
      noticeCount
    }
  });
});

router.put('/me', async (req, res) => {
  try {
    const homeowner = await Homeowner.findOne({ where: { userId: req.user.id }, include: [{ model: User, as: 'user' }] });
    if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

    const { name, phone, email } = req.body;
    if (name) homeowner.name = name;
    if (phone !== undefined) {
      homeowner.phone = phone;
      if (homeowner.user) homeowner.user.mobileNumber = phone;
    }
    if (email) {
      homeowner.email = email;
      if (homeowner.user) homeowner.user.email = email;
    }

    await homeowner.save();
    if (homeowner.user) await homeowner.user.save();

    await logAudit({
      req,
      userId: req.user.id,
      action: 'homeowner.update_profile',
      entityType: 'homeowner',
      entityId: homeowner.id,
      details: { name: homeowner.name, phone: homeowner.phone, email: homeowner.email }
    });

    res.json(homeowner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update homeowner profile' });
  }
});

router.get('/charges', async (req, res) => {
  return res.status(403).json({ message: 'Payment and statement functions are available to super admins only' });
});

router.get('/payments', async (req, res) => {
  return res.status(403).json({ message: 'Payment and statement functions are available to super admins only' });
});

router.get('/statement', async (req, res) => {
  return res.status(403).json({ message: 'Payment and statement functions are available to super admins only' });
});

router.get('/statement/download', async (req, res) => {
  return res.status(403).json({ message: 'Payment and statement functions are available to super admins only' });
});

router.post('/payments/checkout', async (req, res) => {
  return res.status(403).json({ message: 'Payment and statement functions are available to super admins only' });
});

router.post('/maintenance', async (req, res) => {
  try {
    const homeowner = await getHomeownerContext(req.user.id);
    if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

    const { category, title, description, priority, attachments = [] } = req.body;
    if (!category || !title || !description) {
      return res.status(400).json({ message: 'Category, title, and description are required' });
    }

    const request = await MaintenanceRequest.create({
      homeownerId: homeowner.id,
      propertyLotId: homeowner.propertyLotId,
      category,
      title,
      description,
      priority
    });

    if (Array.isArray(attachments) && attachments.length) {
      await Promise.all(attachments.map(async (attachment) => {
        const upload = await saveBase64Upload({
          req,
          fileData: attachment.fileData,
          fileName: attachment.fileName,
          fallbackName: title,
          folder: `tickets/${request.id}`
        });
        return MaintenanceAttachment.create({
          maintenanceRequestId: request.id,
          fileName: attachment.fileName,
          url: upload.url,
          uploadedById: req.user.id
        });
      }));
    }

    await logAudit({
      req,
      userId: req.user.id,
      action: 'ticket.created',
      entityType: 'maintenance_request',
      entityId: request.id,
      details: { category, priority }
    });

    const recipients = await getTicketNotificationRecipients(homeowner.propertyLot.hoaCommunityId);
    await sendTicketEmail({
      to: recipients,
      subject: `New homeowner ticket: ${title}`,
      text: `A new ticket was created in ${homeowner.propertyLot.community.name}.\n\nHomeowner: ${homeowner.name}\nProperty: ${homeowner.propertyLot.address}\nCategory: ${category}\nPriority: ${priority || 'medium'}\nTitle: ${title}\n\nDescription:\n${description}`
    });

    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit ticket' });
  }
});

router.get('/maintenance', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const communityLotIds = await PropertyLot.findAll({
    where: { hoaCommunityId: homeowner.propertyLot.hoaCommunityId },
    attributes: ['id'],
    raw: true
  }).then((rows) => rows.map((row) => row.id));

  const requests = await MaintenanceRequest.findAll({
    where: {
      [Op.or]: [
        {
          propertyLotId: { [Op.in]: communityLotIds },
          status: { [Op.notIn]: ['completed', 'closed'] }
        },
        { homeownerId: homeowner.id }
      ]
    },
    include: buildTicketInclude(),
    order: [['createdAt', 'DESC']]
  });

  res.json(requests);
});

router.post('/maintenance/:requestId/comments', async (req, res) => {
  try {
    const homeowner = await getHomeownerContext(req.user.id);
    if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

    const request = await MaintenanceRequest.findByPk(req.params.requestId, { include: buildTicketInclude() });
    if (!request) return res.status(404).json({ message: 'Ticket not found' });

    const requestCommunityId = request.homeowner?.propertyLot?.hoaCommunityId;
    if (requestCommunityId !== homeowner.propertyLot.hoaCommunityId || ['completed', 'closed'].includes(request.status)) {
      return res.status(403).json({ message: 'You can only comment on current open community tickets' });
    }

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

    const recipients = await getTicketNotificationRecipients(requestCommunityId);
    await sendTicketEmail({
      to: recipients,
      subject: `Ticket comment added: ${request.title}`,
      text: `${homeowner.name} added a comment on ticket "${request.title}".\n\nComment:\n${comment.comment}`
    });

    const response = await MaintenanceComment.findByPk(comment.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }]
    });

    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add ticket comment' });
  }
});

router.get('/notices', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const notices = await Notice.findAll({
    where: {
      hoaCommunityId: homeowner.propertyLot.hoaCommunityId,
      [Op.or]: [
        { visibility: 'all' },
        { visibility: 'homeowner' },
        { visibility: 'individual', targetUserId: req.user.id }
      ]
    },
    order: [['createdAt', 'DESC']]
  });
  res.json(notices);
});

router.get('/documents', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const documents = await Document.findAll({
    where: {
      hoaCommunityId: homeowner.propertyLot.hoaCommunityId,
      visibility: { [Op.in]: ['all', 'homeowner'] },
      category: { [Op.ne]: 'financials' }
    },
    order: [['createdAt', 'DESC']]
  });
  res.json(documents);
});

router.get('/events', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const events = await Event.findAll({
    where: {
      hoaCommunityId: homeowner.propertyLot.hoaCommunityId,
      visibility: 'all'
    },
    include: [{ model: EventAsset, as: 'assets' }],
    order: [['startAt', 'DESC']]
  });
  res.json(events);
});

router.get('/surveys', async (req, res) => {
  const homeowner = await getHomeownerContext(req.user.id);
  if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

  const surveys = await Survey.findAll({
    where: { hoaCommunityId: homeowner.propertyLot.hoaCommunityId },
    include: [{ model: SurveyOption, as: 'options' }],
    order: [['startAt', 'DESC']]
  });

  const responses = await SurveyResponse.findAll({
    where: {
      surveyId: { [Op.in]: surveys.map((survey) => survey.id) },
      propertyLotId: homeowner.propertyLotId
    }
  });

  const responseMap = new Map(responses.map((response) => [response.surveyId, response]));
  const now = new Date();

  res.json(surveys.map((survey) => {
    const response = responseMap.get(survey.id);
    const isOpen = survey.status === 'open' && new Date(survey.startAt) <= now && new Date(survey.endAt) >= now;
    return {
      ...survey.toJSON(),
      canRespond: isOpen && !response,
      hasResponded: Boolean(response),
      response
    };
  }));
});

router.post('/surveys/:surveyId/respond', async (req, res) => {
  try {
    const homeowner = await getHomeownerContext(req.user.id);
    if (!homeowner) return res.status(404).json({ message: 'Homeowner profile not found' });

    const survey = await Survey.findOne({
      where: {
        id: req.params.surveyId,
        hoaCommunityId: homeowner.propertyLot.hoaCommunityId
      },
      include: [{ model: SurveyOption, as: 'options' }]
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }

    const now = new Date();
    if (survey.status !== 'open' || new Date(survey.startAt) > now || new Date(survey.endAt) < now) {
      return res.status(400).json({ message: 'Survey is not open for responses' });
    }

    const existingResponse = await SurveyResponse.findOne({
      where: {
        surveyId: survey.id,
        propertyLotId: homeowner.propertyLotId
      }
    });
    if (existingResponse) {
      return res.status(409).json({ message: 'This property has already responded to the survey' });
    }

    const option = survey.options.find((item) => item.id === req.body.surveyOptionId);
    if (!option) {
      return res.status(400).json({ message: 'Selected survey option is invalid' });
    }

    const response = await SurveyResponse.create({
      surveyId: survey.id,
      surveyOptionId: option.id,
      homeownerId: homeowner.id,
      propertyLotId: homeowner.propertyLotId
    });

    await logAudit({
      req,
      userId: req.user.id,
      action: 'survey.response_submitted',
      entityType: 'survey_response',
      entityId: response.id,
      details: { surveyId: survey.id, surveyOptionId: option.id }
    });

    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit survey response' });
  }
});

module.exports = router;
