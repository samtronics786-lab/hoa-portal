const { DataTypes } = require('sequelize');

function timestamps() {
  return {
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  };
}

async function dropEnum(queryInterface, name) {
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${name}" CASCADE;`);
}

module.exports = {
  async up({ queryInterface }) {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
      },
      username: { type: DataTypes.STRING, unique: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      mobileNumber: { type: DataTypes.STRING, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM('super_admin', 'management_admin', 'community_manager', 'admin_staff', 'board_member', 'homeowner'),
        allowNull: false,
        defaultValue: 'homeowner'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      mfaEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      mfaCode: { type: DataTypes.STRING },
      mfaCodeExpiresAt: { type: DataTypes.DATE },
      mobileLoginCode: { type: DataTypes.STRING },
      mobileLoginCodeExpiresAt: { type: DataTypes.DATE },
      resetToken: { type: DataTypes.STRING },
      resetTokenExpiresAt: { type: DataTypes.DATE },
      ...timestamps()
    });

    await queryInterface.createTable('hoa_communities', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
      },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      address: { type: DataTypes.STRING },
      description: { type: DataTypes.TEXT },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
      },
      ...timestamps()
    });

    await queryInterface.createTable('property_lots', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
      },
      lotNumber: { type: DataTypes.STRING, allowNull: false },
      address: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
      },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('homeowners', {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
      },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      phone: { type: DataTypes.STRING },
      propertyLotId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'property_lots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.UUID,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ...timestamps()
    });

    await queryInterface.createTable('board_member_assignments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      termStart: { type: DataTypes.DATE, allowNull: false },
      termEnd: { type: DataTypes.DATE },
      role: { type: DataTypes.STRING, allowNull: false },
      ...timestamps()
    });

    await queryInterface.createTable('charges', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      communityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      description: { type: DataTypes.STRING, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      dueDate: { type: DataTypes.DATE },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'overdue'),
        defaultValue: 'pending'
      },
      delinquencyStage: {
        type: DataTypes.ENUM('current', 'reminder_sent', 'late_notice', 'final_notice', 'payment_plan', 'collections'),
        defaultValue: 'current'
      },
      paymentPlanStatus: {
        type: DataTypes.ENUM('none', 'proposed', 'active', 'broken', 'completed'),
        defaultValue: 'none'
      },
      paymentPlanNotes: { type: DataTypes.TEXT },
      lastReminderAt: { type: DataTypes.DATE },
      ...timestamps()
    });

    await queryInterface.createTable('payments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      chargeId: {
        type: DataTypes.UUID,
        references: { model: 'charges', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      transactionId: { type: DataTypes.STRING },
      provider: {
        type: DataTypes.ENUM('stripe'),
        allowNull: false,
        defaultValue: 'stripe'
      },
      receiptUrl: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM('success', 'failed', 'pending'),
        defaultValue: 'pending'
      },
      paidAt: { type: DataTypes.DATE },
      ...timestamps()
    });

    await queryInterface.createTable('maintenance_requests', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      propertyLotId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'property_lots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      category: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
      },
      status: {
        type: DataTypes.ENUM('submitted', 'in_review', 'assigned', 'in_progress', 'completed', 'closed'),
        defaultValue: 'submitted'
      },
      internalNotes: { type: DataTypes.TEXT },
      vendorAssignment: { type: DataTypes.STRING },
      completionNotes: { type: DataTypes.TEXT },
      ...timestamps()
    });

    await queryInterface.createTable('maintenance_attachments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      maintenanceRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'maintenance_requests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: { type: DataTypes.STRING, allowNull: false },
      url: { type: DataTypes.STRING, allowNull: false },
      uploadedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('maintenance_comments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      maintenanceRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'maintenance_requests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      comment: { type: DataTypes.TEXT, allowNull: false },
      ...timestamps()
    });

    await queryInterface.createTable('documents', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      category: {
        type: DataTypes.ENUM('governing', 'rules', 'forms', 'notices', 'minutes', 'financials', 'board'),
        defaultValue: 'notices'
      },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      uploaderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      url: { type: DataTypes.STRING, allowNull: false },
      visibility: {
        type: DataTypes.ENUM('all', 'board', 'management', 'homeowner'),
        defaultValue: 'all'
      },
      ...timestamps()
    });

    await queryInterface.createTable('notices', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      visibility: {
        type: DataTypes.ENUM('all', 'board', 'homeowner', 'individual'),
        defaultValue: 'all'
      },
      targetUserId: {
        type: DataTypes.UUID,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      ...timestamps()
    });

    await queryInterface.createTable('meeting_records', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: { type: DataTypes.STRING, allowNull: false },
      meetingDate: { type: DataTypes.DATE, allowNull: false },
      agenda: { type: DataTypes.TEXT },
      minutes: { type: DataTypes.TEXT },
      visibility: {
        type: DataTypes.ENUM('board', 'all'),
        allowNull: false,
        defaultValue: 'board'
      },
      postedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('events', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: { type: DataTypes.STRING, allowNull: false },
      summary: { type: DataTypes.STRING },
      description: { type: DataTypes.TEXT },
      location: { type: DataTypes.STRING },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE },
      eventType: {
        type: DataTypes.ENUM('social', 'governance', 'maintenance', 'seasonal', 'volunteer', 'general'),
        allowNull: false,
        defaultValue: 'general'
      },
      status: {
        type: DataTypes.ENUM('upcoming', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'upcoming'
      },
      visibility: {
        type: DataTypes.ENUM('all', 'board'),
        allowNull: false,
        defaultValue: 'all'
      },
      postedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('event_assets', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      eventId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'events', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: { type: DataTypes.STRING, allowNull: false },
      assetType: {
        type: DataTypes.ENUM('photo', 'flyer'),
        allowNull: false,
        defaultValue: 'photo'
      },
      url: { type: DataTypes.STRING, allowNull: false },
      uploaderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('surveys', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      question: { type: DataTypes.TEXT, allowNull: false },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM('draft', 'open', 'closed', 'published'),
        allowNull: false,
        defaultValue: 'draft'
      },
      postedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('survey_options', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      surveyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'surveys', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      label: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
      ...timestamps()
    });

    await queryInterface.createTable('survey_responses', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      surveyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'surveys', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      surveyOptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'survey_options', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      propertyLotId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'property_lots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      ...timestamps()
    });

    await queryInterface.createTable('elections', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      type: {
        type: DataTypes.ENUM('board_member', 'member_vote', 'community_resolution'),
        allowNull: false,
        defaultValue: 'board_member'
      },
      eligibilityRule: {
        type: DataTypes.ENUM('per_property_lot'),
        allowNull: false,
        defaultValue: 'per_property_lot'
      },
      status: {
        type: DataTypes.ENUM('draft', 'open', 'closed', 'published'),
        allowNull: false,
        defaultValue: 'draft'
      },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },
      resultsPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps()
    });

    await queryInterface.createTable('ballot_options', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      electionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'elections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      label: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...timestamps()
    });

    await queryInterface.createTable('votes', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      electionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'elections', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ballotOptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ballot_options', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      homeownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'homeowners', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      propertyLotId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'property_lots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      ...timestamps()
    });

    await queryInterface.addIndex('votes', ['electionId', 'propertyLotId'], {
      unique: true,
      name: 'votes_electionId_propertyLotId'
    });

    await queryInterface.createTable('audit_logs', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: { type: DataTypes.STRING, allowNull: false },
      entityType: { type: DataTypes.STRING, allowNull: false },
      entityId: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM('success', 'failure'),
        allowNull: false,
        defaultValue: 'success'
      },
      ipAddress: { type: DataTypes.STRING },
      details: { type: DataTypes.JSONB },
      ...timestamps()
    });

    await queryInterface.createTable('management_community_assignments', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      hoaCommunityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hoa_communities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ...timestamps()
    });

    await queryInterface.createTable('user_sessions', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tokenId: { type: DataTypes.STRING, allowNull: false, unique: true },
      userAgent: { type: DataTypes.STRING },
      ipAddress: { type: DataTypes.STRING },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      lastActivityAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE },
      ...timestamps()
    });
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('user_sessions');
    await queryInterface.dropTable('management_community_assignments');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('votes');
    await queryInterface.dropTable('ballot_options');
    await queryInterface.dropTable('elections');
    await queryInterface.dropTable('survey_responses');
    await queryInterface.dropTable('survey_options');
    await queryInterface.dropTable('surveys');
    await queryInterface.dropTable('event_assets');
    await queryInterface.dropTable('events');
    await queryInterface.dropTable('meeting_records');
    await queryInterface.dropTable('notices');
    await queryInterface.dropTable('documents');
    await queryInterface.dropTable('maintenance_comments');
    await queryInterface.dropTable('maintenance_attachments');
    await queryInterface.dropTable('maintenance_requests');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('charges');
    await queryInterface.dropTable('board_member_assignments');
    await queryInterface.dropTable('homeowners');
    await queryInterface.dropTable('property_lots');
    await queryInterface.dropTable('hoa_communities');
    await queryInterface.dropTable('users');

    await dropEnum(queryInterface, 'enum_users_role');
    await dropEnum(queryInterface, 'enum_users_status');
    await dropEnum(queryInterface, 'enum_hoa_communities_status');
    await dropEnum(queryInterface, 'enum_property_lots_status');
    await dropEnum(queryInterface, 'enum_charges_status');
    await dropEnum(queryInterface, 'enum_charges_delinquencyStage');
    await dropEnum(queryInterface, 'enum_charges_paymentPlanStatus');
    await dropEnum(queryInterface, 'enum_payments_provider');
    await dropEnum(queryInterface, 'enum_payments_status');
    await dropEnum(queryInterface, 'enum_maintenance_requests_priority');
    await dropEnum(queryInterface, 'enum_maintenance_requests_status');
    await dropEnum(queryInterface, 'enum_documents_category');
    await dropEnum(queryInterface, 'enum_documents_visibility');
    await dropEnum(queryInterface, 'enum_notices_visibility');
    await dropEnum(queryInterface, 'enum_meeting_records_visibility');
    await dropEnum(queryInterface, 'enum_events_eventType');
    await dropEnum(queryInterface, 'enum_events_status');
    await dropEnum(queryInterface, 'enum_events_visibility');
    await dropEnum(queryInterface, 'enum_event_assets_assetType');
    await dropEnum(queryInterface, 'enum_surveys_status');
    await dropEnum(queryInterface, 'enum_elections_type');
    await dropEnum(queryInterface, 'enum_elections_eligibilityRule');
    await dropEnum(queryInterface, 'enum_elections_status');
    await dropEnum(queryInterface, 'enum_audit_logs_status');
  }
};
