const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendee = sequelize.define('Attendee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tickets',
        key: 'id'
      },
      field: 'ticket_id'
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      },
      field: 'event_id'
    },
    ticketCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'ticket_code'
    },
    holderName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'holder_name'
    },
    holderEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'holder_email'
    },
    holderPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'holder_phone'
    },
    seatInfo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'seat_info'
    },
    scannedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'scanned_at'
    },
    scannedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'scanned_by'
    },
    scanLocation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'scan_location'
    },
    scanNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'scan_notes'
    },
    isVip: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_vip'
    },
    isAccessible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_accessible'
    },
    specialRequests: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'special_requests'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'attendees',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['event_id']
      },
      {
        fields: ['ticket_code']
      },
      {
        fields: ['scanned_at']
      },
      {
        fields: ['scanned_by']
      }
    ]
  });

  // Instance methods
  Attendee.prototype.toPublicJSON = function() {
    return {
      id: this.id,
      ticketCode: this.ticketCode,
      holderName: this.holderName,
      holderEmail: this.holderEmail,
      holderPhone: this.holderPhone,
      seatInfo: this.seatInfo,
      scannedAt: this.scannedAt,
      scannedBy: this.scannedBy,
      scanLocation: this.scanLocation,
      scanNotes: this.scanNotes,
      isVip: this.isVip,
      isAccessible: this.isAccessible,
      specialRequests: this.specialRequests,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  };

  return Attendee;
};
