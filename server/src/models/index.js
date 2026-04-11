const sequelize = require('../config/db');
const User = require('./user');
const HOACommunity = require('./hoaCommunity');
const PropertyLot = require('./propertyLot');
const Homeowner = require('./homeowner');
const BoardMemberAssignment = require('./boardMemberAssignment');
const Charge = require('./charge');
const Payment = require('./payment');
const MaintenanceRequest = require('./maintenanceRequest');
const MaintenanceComment = require('./maintenanceComment');
const Document = require('./document');
const Notice = require('./notice');
const Election = require('./election');
const BallotOption = require('./ballotOption');
const Vote = require('./vote');
const Survey = require('./survey');
const SurveyOption = require('./surveyOption');
const SurveyResponse = require('./surveyResponse');
const MeetingRecord = require('./meetingRecord');
const Event = require('./event');
const EventAsset = require('./eventAsset');
const AuditLog = require('./auditLog');
const ManagementCommunityAssignment = require('./managementCommunityAssignment');
const MaintenanceAttachment = require('./maintenanceAttachment');
const UserSession = require('./userSession');

// Associations
HOACommunity.hasMany(PropertyLot, { foreignKey: 'hoaCommunityId', as: 'propertyLots' });
PropertyLot.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

PropertyLot.hasMany(Homeowner, { foreignKey: 'propertyLotId', as: 'homeowners' });
Homeowner.belongsTo(PropertyLot, { foreignKey: 'propertyLotId', as: 'propertyLot' });
User.hasOne(Homeowner, { foreignKey: 'userId', as: 'homeownerProfile' });
Homeowner.belongsTo(User, { foreignKey: 'userId', as: 'user' });

HOACommunity.hasMany(BoardMemberAssignment, { foreignKey: 'hoaCommunityId', as: 'boardAssignments' });
BoardMemberAssignment.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });
Homeowner.hasMany(BoardMemberAssignment, { foreignKey: 'homeownerId', as: 'boardAssignments' });
BoardMemberAssignment.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

HOACommunity.hasMany(ManagementCommunityAssignment, { foreignKey: 'hoaCommunityId', as: 'managementAssignments' });
ManagementCommunityAssignment.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

Homeowner.hasMany(Charge, { foreignKey: 'homeownerId', as: 'charges' });
Charge.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

Homeowner.hasMany(Payment, { foreignKey: 'homeownerId', as: 'payments' });
Payment.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

Homeowner.hasMany(MaintenanceRequest, { foreignKey: 'homeownerId', as: 'maintenanceRequests' });
MaintenanceRequest.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

MaintenanceRequest.hasMany(MaintenanceAttachment, { foreignKey: 'maintenanceRequestId', as: 'attachments' });
MaintenanceAttachment.belongsTo(MaintenanceRequest, { foreignKey: 'maintenanceRequestId', as: 'request' });
MaintenanceRequest.hasMany(MaintenanceComment, { foreignKey: 'maintenanceRequestId', as: 'comments' });
MaintenanceComment.belongsTo(MaintenanceRequest, { foreignKey: 'maintenanceRequestId', as: 'request' });
User.hasMany(MaintenanceComment, { foreignKey: 'userId', as: 'maintenanceComments' });
MaintenanceComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

HOACommunity.hasMany(Document, { foreignKey: 'hoaCommunityId', as: 'documents' });
Document.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

HOACommunity.hasMany(Notice, { foreignKey: 'hoaCommunityId', as: 'notices' });
Notice.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

HOACommunity.hasMany(MeetingRecord, { foreignKey: 'hoaCommunityId', as: 'meetingRecords' });
MeetingRecord.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

HOACommunity.hasMany(Event, { foreignKey: 'hoaCommunityId', as: 'events' });
Event.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

Event.hasMany(EventAsset, { foreignKey: 'eventId', as: 'assets' });
EventAsset.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

HOACommunity.hasMany(Election, { foreignKey: 'hoaCommunityId', as: 'elections' });
Election.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

HOACommunity.hasMany(Survey, { foreignKey: 'hoaCommunityId', as: 'surveys' });
Survey.belongsTo(HOACommunity, { foreignKey: 'hoaCommunityId', as: 'community' });

Survey.hasMany(SurveyOption, { foreignKey: 'surveyId', as: 'options' });
SurveyOption.belongsTo(Survey, { foreignKey: 'surveyId', as: 'survey' });

Survey.hasMany(SurveyResponse, { foreignKey: 'surveyId', as: 'responses' });
SurveyResponse.belongsTo(Survey, { foreignKey: 'surveyId', as: 'survey' });

SurveyOption.hasMany(SurveyResponse, { foreignKey: 'surveyOptionId', as: 'responses' });
SurveyResponse.belongsTo(SurveyOption, { foreignKey: 'surveyOptionId', as: 'option' });

Homeowner.hasMany(SurveyResponse, { foreignKey: 'homeownerId', as: 'surveyResponses' });
SurveyResponse.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

Election.hasMany(BallotOption, { foreignKey: 'electionId', as: 'options' });
BallotOption.belongsTo(Election, { foreignKey: 'electionId', as: 'election' });

Election.hasMany(Vote, { foreignKey: 'electionId', as: 'votes' });
Vote.belongsTo(Election, { foreignKey: 'electionId', as: 'election' });

BallotOption.hasMany(Vote, { foreignKey: 'ballotOptionId', as: 'votes' });
Vote.belongsTo(BallotOption, { foreignKey: 'ballotOptionId', as: 'option' });

Homeowner.hasMany(Vote, { foreignKey: 'homeownerId', as: 'votes' });
Vote.belongsTo(Homeowner, { foreignKey: 'homeownerId', as: 'homeowner' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ManagementCommunityAssignment, { foreignKey: 'userId', as: 'communityAssignments' });
ManagementCommunityAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  HOACommunity,
  PropertyLot,
  Homeowner,
  BoardMemberAssignment,
  Charge,
  Payment,
  MaintenanceRequest,
  MaintenanceComment,
  Document,
  Notice,
  Election,
  BallotOption,
  Vote,
  Survey,
  SurveyOption,
  SurveyResponse,
  MeetingRecord,
  Event,
  EventAsset,
  AuditLog,
  ManagementCommunityAssignment,
  MaintenanceAttachment,
  UserSession
};
