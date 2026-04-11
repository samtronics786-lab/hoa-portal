const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  sequelize,
  User,
  HOACommunity,
  PropertyLot,
  Homeowner,
  Charge,
  Payment,
  MaintenanceRequest,
  MaintenanceComment,
  Notice,
  Document,
  BoardMemberAssignment,
  ManagementCommunityAssignment,
  MeetingRecord,
  Event,
  EventAsset,
  Survey,
  SurveyOption,
  SurveyResponse
} = require('../models');

async function seed() {
  await sequelize.sync({ force: true });

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

  const superAdminPwd = await bcrypt.hash('Admin123!', saltRounds);
  const superAdmin = await User.create({ email: 'superadmin@hoa.com', username: 'superadmin', passwordHash: superAdminPwd, role: 'super_admin' });
  const managementAdmin = await User.create({ email: 'manager@hoa.com', username: 'manager', passwordHash: await bcrypt.hash('Manager123!', saltRounds), role: 'management_admin' });

  const community = await HOACommunity.create({ name: 'Deans Pond HOA', address: '100 Main Street, NJ', description: 'Single-family community' });
  const lots = [];
  for (let i = 1; i <= 50; i++) {
    const lot = await PropertyLot.create({ lotNumber: `Lot-${i}`, address: `Address ${i}` , hoaCommunityId: community.id});
    lots.push(lot);
  }

  const homeowners = [];
  for (let i = 1; i <= 25; i++) {
    const lot = lots[i-1];
    const phone = `+1555100${String(i).padStart(4, '0')}`;
    const homeownerUser = await User.create({
      email: `homeowner${i}@hoa.com`,
      username: `homeowner${i}`,
      mobileNumber: phone,
      passwordHash: await bcrypt.hash('Homeowner123!', saltRounds),
      role: 'homeowner'
    });
    const homeowner = await Homeowner.create({
      name: `Homeowner ${i}`,
      email: `homeowner${i}@hoa.com`,
      phone,
      propertyLotId: lot.id,
      userId: homeownerUser.id
    });
    homeowners.push(homeowner);
  }

  const boardHomeowner = homeowners[0];
  const boardUser = await User.create({ email: 'board@hoa.com', username: 'board', passwordHash: await bcrypt.hash('Board123!', saltRounds), role: 'board_member' });
  boardHomeowner.userId = boardUser.id;
  boardHomeowner.email = 'board@hoa.com';
  await boardHomeowner.save();

  await BoardMemberAssignment.create({
    homeownerId: boardHomeowner.id,
    hoaCommunityId: community.id,
    role: 'President',
    termStart: new Date('2026-01-01'),
    termEnd: new Date('2026-12-31')
  });

  await sequelize.getQueryInterface().bulkInsert('management_community_assignments', [{
    id: crypto.randomUUID(),
    userId: managementAdmin.id,
    hoaCommunityId: community.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  const monthlyDues = await Charge.create({
    homeownerId: boardHomeowner.id,
    communityId: community.id,
    description: 'April Monthly Dues',
    amount: 350.0,
    dueDate: new Date('2026-04-10'),
    status: 'pending'
  });

  await Charge.create({
    homeownerId: homeowners[1].id,
    communityId: community.id,
    description: 'March Monthly Dues',
    amount: 350.0,
    dueDate: new Date('2026-03-10'),
    status: 'overdue'
  });

  await Payment.create({
    homeownerId: boardHomeowner.id,
    chargeId: monthlyDues.id,
    amount: 175.0,
    transactionId: 'txn_seed_001',
    status: 'success',
    paidAt: new Date('2026-04-01')
  });

  const gateRequest = await MaintenanceRequest.create({
    homeownerId: boardHomeowner.id,
    propertyLotId: lots[0].id,
    category: 'Common Area',
    title: 'Broken gate latch',
    description: 'The front gate latch is no longer locking correctly.',
    priority: 'high',
    status: 'in_review',
    internalNotes: 'Vendor quote requested.'
  });

  const irrigationRequest = await MaintenanceRequest.create({
    homeownerId: homeowners[2].id,
    propertyLotId: lots[2].id,
    category: 'Landscape',
    title: 'Irrigation leak near entrance',
    description: 'Water is pooling near the entrance monument sign.',
    priority: 'urgent',
    status: 'assigned',
    vendorAssignment: 'GreenScape Maintenance'
  });

  await Notice.create({ title: 'Welcome', message: 'Welcome to the community', hoaCommunityId: community.id, visibility: 'all' });
  await MaintenanceComment.create({
    maintenanceRequestId: gateRequest.id,
    userId: managementAdmin.id,
    comment: 'Vendor quote requested and under review.'
  });

  await MaintenanceComment.create({
    maintenanceRequestId: irrigationRequest.id,
    userId: superAdmin.id,
    comment: 'Please keep this ticket visible to homeowners until the entrance repair is complete.'
  });

  await Notice.create({ title: 'Spring Operations Update', message: 'Ticketing, events, and survey participation are now available inside the HOA portal.', hoaCommunityId: community.id, visibility: 'all' });
  await Document.create({ title: 'Community Bylaws', category: 'governing', hoaCommunityId: community.id, uploaderId: superAdmin.id, url: 'https://example.com/bylaws.pdf', visibility: 'all' });
  await Document.create({ title: 'March 2026 Financial Statement', category: 'financials', hoaCommunityId: community.id, uploaderId: managementAdmin.id, url: 'https://example.com/march-financials.pdf', visibility: 'board' });
  await Document.create({ title: 'April Board Packet', category: 'board', hoaCommunityId: community.id, uploaderId: managementAdmin.id, url: 'https://example.com/april-board-packet.pdf', visibility: 'board' });
  await MeetingRecord.create({
    hoaCommunityId: community.id,
    title: 'April 2026 Board Meeting',
    meetingDate: new Date('2026-04-12T18:30:00Z'),
    agenda: 'Review open maintenance items, financial statement publication, and election calendar.',
    minutes: 'Management provided the March statement, reviewed irrigation repair estimates, and confirmed election timelines.',
    visibility: 'board',
    postedById: managementAdmin.id
  });

  const springSocial = await Event.create({
    hoaCommunityId: community.id,
    title: 'Spring Community Social',
    summary: 'Neighbors gathering at the green for food, games, and family activities.',
    description: 'Join the community for an afternoon social on the common green. Management will share seasonal updates, and families are encouraged to bring picnic blankets and lawn games.',
    location: 'Deans Pond Common Green',
    startAt: new Date('2026-05-09T16:00:00Z'),
    endAt: new Date('2026-05-09T19:00:00Z'),
    eventType: 'social',
    status: 'upcoming',
    visibility: 'all',
    postedById: managementAdmin.id
  });

  await EventAsset.create({
    eventId: springSocial.id,
    title: 'Spring Social Flyer',
    assetType: 'flyer',
    url: 'https://example.com/spring-social-flyer.pdf',
    uploaderId: managementAdmin.id
  });

  const holiCelebration = await Event.create({
    hoaCommunityId: community.id,
    title: 'Holi Celebration 2026',
    summary: 'Community color celebration and neighborhood gathering.',
    description: 'Residents gathered for the annual Holi celebration with music, colors, and refreshments in the central common area.',
    location: 'Community Lawn',
    startAt: new Date('2026-03-08T17:00:00Z'),
    endAt: new Date('2026-03-08T20:00:00Z'),
    eventType: 'seasonal',
    status: 'completed',
    visibility: 'all',
    postedById: managementAdmin.id
  });

  await EventAsset.create({
    eventId: holiCelebration.id,
    title: 'Holi Celebration Photo',
    assetType: 'photo',
    url: 'https://example.com/holi-celebration-photo.jpg',
    uploaderId: managementAdmin.id
  });

  const survey = await Survey.create({
    hoaCommunityId: community.id,
    title: 'Community Landscaping Preferences',
    description: 'Share which landscape improvement should be prioritized next quarter.',
    question: 'Which improvement should the association prioritize first?',
    startAt: new Date('2026-04-01T00:00:00Z'),
    endAt: new Date('2026-04-20T23:59:59Z'),
    status: 'open',
    postedById: managementAdmin.id
  });

  const optionA = await SurveyOption.create({
    surveyId: survey.id,
    label: 'Entrance landscaping refresh',
    description: 'Refresh the monument beds and front entrance plantings.',
    sortOrder: 0
  });

  await SurveyOption.create({
    surveyId: survey.id,
    label: 'Walking trail lighting',
    description: 'Add better lighting along the main walking path.',
    sortOrder: 1
  });

  await SurveyResponse.create({
    surveyId: survey.id,
    surveyOptionId: optionA.id,
    homeownerId: homeowners[4].id,
    propertyLotId: homeowners[4].propertyLotId,
    submittedAt: new Date('2026-04-01T13:00:00Z')
  });

  console.log('Seeding completed');
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
