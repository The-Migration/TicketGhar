const { Ticket, Event, Attendee, User } = require('../models');
const { Op } = require('sequelize');

// Scan a ticket (QR code or manual entry)
const scanTicket = async (req, res) => {
  try {
    const { ticketCode, scanLocation, scanNotes } = req.body;
    const scannerId = req.user.id; // The user who is scanning

    if (!ticketCode) {
      return res.status(400).json({ error: 'Ticket code is required' });
    }

    // Find the ticket
    const ticket = await Ticket.findOne({
      where: {
        ticketCode: ticketCode.trim().toUpperCase()
      },
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: Attendee,
          as: 'attendee'
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ticket not found',
        ticketCode: ticketCode.trim().toUpperCase()
      });
    }

    // Check if ticket is already scanned
    if (ticket.attendee) {
      return res.status(400).json({
        error: 'Ticket already scanned',
        ticketCode: ticket.ticketCode,
        scannedAt: ticket.attendee.scannedAt,
        scannedBy: ticket.attendee.scannedBy,
        scanLocation: ticket.attendee.scanLocation
      });
    }

    // Check if ticket is valid for scanning
    if (ticket.status === 'refunded') {
      return res.status(400).json({
        error: 'Cannot scan refunded ticket',
        ticketCode: ticket.ticketCode,
        status: ticket.status
      });
    }

    if (ticket.status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot scan cancelled ticket',
        ticketCode: ticket.ticketCode,
        status: ticket.status
      });
    }

    // Create attendee record
    const attendee = await Attendee.create({
      ticketId: ticket.id,
      eventId: ticket.eventId,
      ticketCode: ticket.ticketCode,
      holderName: ticket.holderName,
      holderEmail: ticket.holderEmail,
      holderPhone: ticket.holderPhone,
      seatInfo: ticket.seatInfo,
      scannedAt: new Date(),
      scannedBy: scannerId,
      scanLocation: scanLocation || null,
      scanNotes: scanNotes || null,
      isVip: ticket.isVip || false,
      isAccessible: ticket.isAccessible || false,
      specialRequests: ticket.specialRequests || null
    });

    // Update ticket status to 'used' and mark as scanned
    await ticket.update({
      status: 'used',
      usedAt: new Date(),
      usedBy: scannerId,
      usedLocation: scanLocation || null
    });

    res.json({
      success: true,
      message: 'Ticket scanned successfully',
      attendee: attendee.toPublicJSON(),
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        holderName: ticket.holderName,
        holderEmail: ticket.holderEmail,
        eventName: ticket.event?.name
      }
    });

  } catch (error) {
    console.error('Error scanning ticket:', error);
    res.status(500).json({ error: 'Failed to scan ticket' });
  }
};

// Get attendees for an event
const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    const offset = (page - 1) * limit;
    const where = { eventId };

    // Add search functionality
    if (search) {
      where[Op.or] = [
        { ticketCode: { [Op.iLike]: `%${search}%` } },
        { holderName: { [Op.iLike]: `%${search}%` } },
        { holderEmail: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const attendees = await Attendee.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'scanner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['scannedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      attendees: attendees.rows.map(attendee => attendee.toPublicJSON()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(attendees.count / limit),
        totalItems: attendees.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting event attendees:', error);
    res.status(500).json({ error: 'Failed to get event attendees' });
  }
};

// Get attendee statistics for an event
const getEventAttendeeStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const stats = await Attendee.findAll({
      where: { eventId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalAttendees'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_vip = true THEN 1 END')), 'vipAttendees'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_accessible = true THEN 1 END')), 'accessibleAttendees'],
        [sequelize.fn('DATE', sequelize.col('scanned_at')), 'scanDate']
      ],
      group: [sequelize.fn('DATE', sequelize.col('scanned_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('scanned_at')), 'ASC']]
    });

    const totalStats = await Attendee.findOne({
      where: { eventId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalAttendees'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_vip = true THEN 1 END')), 'vipAttendees'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_accessible = true THEN 1 END')), 'accessibleAttendees']
      ]
    });

    res.json({
      totalStats: {
        totalAttendees: parseInt(totalStats.dataValues.totalAttendees) || 0,
        vipAttendees: parseInt(totalStats.dataValues.vipAttendees) || 0,
        accessibleAttendees: parseInt(totalStats.dataValues.accessibleAttendees) || 0
      },
      dailyStats: stats.map(stat => ({
        date: stat.dataValues.scanDate,
        totalAttendees: parseInt(stat.dataValues.totalAttendees) || 0,
        vipAttendees: parseInt(stat.dataValues.vipAttendees) || 0,
        accessibleAttendees: parseInt(stat.dataValues.accessibleAttendees) || 0
      }))
    });

  } catch (error) {
    console.error('Error getting attendee stats:', error);
    res.status(500).json({ error: 'Failed to get attendee statistics' });
  }
};

// Check if a ticket can be scanned
const checkTicketScanStatus = async (req, res) => {
  try {
    const { ticketCode } = req.params;

    const ticket = await Ticket.findOne({
      where: {
        ticketCode: ticketCode.trim().toUpperCase()
      },
      include: [
        {
          model: Event,
          as: 'event'
        },
        {
          model: Attendee,
          as: 'attendee'
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ 
        error: 'Ticket not found',
        canScan: false
      });
    }

    const canScan = !ticket.attendee && 
                   ticket.status !== 'refunded' && 
                   ticket.status !== 'cancelled';

    res.json({
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      holderName: ticket.holderName,
      holderEmail: ticket.holderEmail,
      eventName: ticket.event?.name,
      canScan,
      alreadyScanned: !!ticket.attendee,
      scannedAt: ticket.attendee?.scannedAt || null,
      reason: !canScan ? (
        ticket.attendee ? 'Already scanned' :
        ticket.status === 'refunded' ? 'Ticket has been refunded' :
        ticket.status === 'cancelled' ? 'Ticket has been cancelled' :
        'Unknown reason'
      ) : null
    });

  } catch (error) {
    console.error('Error checking ticket scan status:', error);
    res.status(500).json({ error: 'Failed to check ticket scan status' });
  }
};

module.exports = {
  scanTicket,
  getEventAttendees,
  getEventAttendeeStats,
  checkTicketScanStatus
};
