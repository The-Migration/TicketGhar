const { Ticket, Event, OrderItem, Order } = require('../models');
const crypto = require('crypto');
const jsPDF = require('jspdf');
const QRCode = require('qrcode');

// Generate a secure download token
function generateDownloadToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Get tickets for a specific user
exports.getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tickets = await Ticket.findAll({
      where: { userId },
      include: [
        {
          model: Event,
          as: 'event'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(tickets);
  } catch (error) {
    console.error('Error getting user tickets:', error);
    res.status(500).json({ message: 'Failed to get user tickets' });
  }
};

// Get a specific ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event'
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ message: 'Failed to get ticket' });
  }
};

// Validate a ticket
exports.validateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { securityCode } = req.body;
    
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const isValid = ticket.verify(securityCode);
    
    res.json({
      valid: isValid,
      ticket: ticket.toPublicJSON()
    });
  } catch (error) {
    console.error('Error validating ticket:', error);
    res.status(500).json({ message: 'Failed to validate ticket' });
  }
};

// Check in a ticket
exports.checkInTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (!ticket.canBeUsed()) {
      return res.status(400).json({ message: 'Ticket cannot be used' });
    }
    
    await ticket.use(req.user.id, location);
    
    res.json({
      message: 'Ticket checked in successfully',
      ticket: ticket.toPublicJSON()
    });
  } catch (error) {
    console.error('Error checking in ticket:', error);
    res.status(500).json({ message: 'Failed to check in ticket' });
  }
};

// Transfer a ticket
exports.transferTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { newUserId } = req.body;
    
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (!ticket.canBeTransferred()) {
      return res.status(400).json({ message: 'Ticket cannot be transferred' });
    }
    
    await ticket.transfer(newUserId, req.user.id);
    
    res.json({
      message: 'Ticket transferred successfully',
      ticket: ticket.toPublicJSON()
    });
  } catch (error) {
    console.error('Error transferring ticket:', error);
    res.status(500).json({ message: 'Failed to transfer ticket' });
  }
};

// Get ticket QR code - Enhanced with security
exports.getTicketQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: require('../models').Event,
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate']
        },
        {
          model: require('../models').TicketType,
          as: 'ticketType',
          attributes: ['id', 'name', 'price']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Generate secure QR data with signed token
    const qrData = ticket.toQRData();
    
    // Create QR code with the signed token
    const qrCodeDataUrl = await QRCode.toDataURL(qrData.signedToken, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      qrCode: qrCodeDataUrl,
      ticketData: {
        ticketCode: qrData.ticketCode,
        eventName: ticket.event?.name,
        venue: ticket.event?.venue,
        startDate: ticket.event?.startDate,
        holderName: qrData.holderName,
        ticketType: ticket.ticketType?.name,
        status: qrData.status
      },
      securityInfo: {
        hasSignedToken: !!qrData.signedToken,
        userHash: qrData.userHash,
        verificationHash: qrData.verificationHash,
        timestamp: qrData.timestamp
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
};

// Verify ticket QR code - New endpoint for secure verification
exports.verifyTicketQRCode = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        message: 'QR code token is required',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Decode the JWT token to get ticket information
    const jwtSecret = process.env.JWT_SECRET || 'ticket-ghar-secret-key';
    let decoded;
    
    try {
      decoded = jwt.verify(token, jwtSecret, {
        issuer: 'ticket-ghar',
        audience: 'ticket-verification'
      });
    } catch (jwtError) {
      return res.status(403).json({ 
        message: 'Invalid or expired QR code token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Find the ticket
    const ticket = await Ticket.findByPk(decoded.ticketId, {
      include: [
        {
          model: require('../models').Event,
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate']
        },
        {
          model: require('../models').TicketType,
          as: 'ticketType',
          attributes: ['id', 'name', 'price']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket not found',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    // Verify the QR code token
    const isValid = ticket.verifyQRCode(token);
    
    if (!isValid) {
      return res.status(403).json({ 
        message: 'QR code verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }
    
    // Check ticket status
    if (ticket.status !== 'active') {
      return res.status(403).json({ 
        message: `Ticket is ${ticket.status}`,
        code: 'INVALID_STATUS',
        status: ticket.status
      });
    }
    
    // Check if event has started
    const now = new Date();
    const eventStart = new Date(ticket.event.startDate);
    const eventEnd = new Date(ticket.event.endDate);
    
    if (now < eventStart) {
      return res.status(403).json({ 
        message: 'Event has not started yet',
        code: 'EVENT_NOT_STARTED',
        eventStart: ticket.event.startDate
      });
    }
    
    if (now > eventEnd) {
      return res.status(403).json({ 
        message: 'Event has ended',
        code: 'EVENT_ENDED',
        eventEnd: ticket.event.endDate
      });
    }
    
    res.json({
      message: 'Ticket verified successfully',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        holderName: ticket.holderName,
        event: {
          name: ticket.event.name,
          venue: ticket.event.venue,
          startDate: ticket.event.startDate
        },
        ticketType: ticket.ticketType.name,
        seatInfo: ticket.seatInfo,
        isVip: ticket.isVip,
        isAccessible: ticket.isAccessible
      },
      verification: {
        timestamp: new Date().toISOString(),
        verifiedBy: req.user?.id || 'system',
        userHash: decoded.userHash,
        securityCode: decoded.securityCode
      }
    });
  } catch (error) {
    console.error('Error verifying QR code:', error);
    res.status(500).json({ message: 'Failed to verify QR code' });
  }
};

// Get event ticket statistics
exports.getEventTicketStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const statistics = await Ticket.getTicketStatistics(eventId);
    
    res.json(statistics);
  } catch (error) {
    console.error('Error getting ticket statistics:', error);
    res.status(500).json({ message: 'Failed to get ticket statistics' });
  }
};

// Download ticket with one-time token
exports.downloadTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        message: 'Download token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Find the ticket
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: OrderItem,
          as: 'orderItem',
          include: [
            {
              model: Order,
              as: 'order'
            }
          ]
        },
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket not found',
        code: 'TICKET_NOT_FOUND'
      });
    }

    // Validate download token
    if (!ticket.downloadToken || ticket.downloadToken !== token) {
      return res.status(403).json({ 
        message: 'Invalid download token',
        code: 'INVALID_TOKEN'
      });
    }

    if (ticket.downloadTokenUsed) {
      return res.status(403).json({ 
        message: 'Download token has already been used',
        code: 'TOKEN_ALREADY_USED'
      });
    }

    if (ticket.downloadTokenExpiresAt && new Date() > ticket.downloadTokenExpiresAt) {
      return res.status(403).json({ 
        message: 'Download token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Mark token as used
    await ticket.update({
      downloadTokenUsed: true
    });

    // Generate PDF
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text('🎫 Event Ticket', 20, 30);
    
    // Add event details
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Event: ${ticket.event?.name || 'N/A'}`, 20, 50);
    doc.text(`Venue: ${ticket.event?.venue || 'N/A'}`, 20, 65);
    
    // Format date
    const eventDate = ticket.event?.startDate;
    let formattedDate = 'N/A';
    if (eventDate) {
      const dateObj = new Date(eventDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    doc.text(`Date: ${formattedDate}`, 20, 80);
    
    // Add ticket details
    doc.setFontSize(14);
    doc.text(`Ticket Code: ${ticket.ticketCode}`, 20, 100);
    doc.text(`Holder: ${ticket.holderName || 'N/A'}`, 20, 115);
    doc.text(`Email: ${ticket.holderEmail || 'N/A'}`, 20, 130);
    
    if (ticket.seatInfo) {
      doc.text(`Seat: ${ticket.seatInfo.section || ''} ${ticket.seatInfo.row || ''} ${ticket.seatInfo.seat || ''}`, 20, 145);
    }
    
    // Add security note
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray color
    doc.text('This ticket is valid for one-time use only.', 20, 170);
    doc.text('Please present this ticket at the event entrance.', 20, 180);
    doc.text('QR code can be scanned for quick check-in.', 20, 190);
    
    // Generate QR code for ticket validation using JWT token
    const jwt = require('jsonwebtoken');
    const qrData = jwt.sign({
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      eventId: ticket.eventId,
      userHash: ticket.generateUserHash(),
      securityCode: ticket.securityCode,
      timestamp: new Date().toISOString()
    }, process.env.JWT_SECRET, { expiresIn: '1y' });
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { 
        width: 100,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });
      
      // Add QR code to PDF
      doc.addImage(qrCodeDataUrl, 'PNG', 140, 40, 50, 50);
      
      // Add QR code label
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('Scan for event check-in', 140, 95);
      doc.text('Present this QR code at entrance', 140, 102);
      
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Continue without QR code if there's an error
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketCode}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send PDF
    const pdfBuffer = doc.output('arraybuffer');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error downloading ticket:', error);
    res.status(500).json({ 
      message: 'Failed to download ticket',
      code: 'DOWNLOAD_ERROR'
    });
  }
};

// Generate download token for a ticket
exports.generateDownloadToken = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Generate new download token
    const downloadToken = generateDownloadToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await ticket.update({
      downloadToken,
      downloadTokenExpiresAt: expiresAt,
      downloadTokenUsed: false
    });
    
    res.json({
      message: 'Download token generated successfully',
      downloadToken,
      expiresAt,
      downloadUrl: `${req.protocol}://${req.get('host')}/api/tickets/${ticketId}/download?token=${downloadToken}`
    });
    
  } catch (error) {
    console.error('Error generating download token:', error);
    res.status(500).json({ message: 'Failed to generate download token' });
  }
};

// Get ticket download status
exports.getTicketDownloadStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId, {
      attributes: ['id', 'downloadToken', 'downloadTokenUsed', 'downloadTokenExpiresAt']
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    const status = {
      hasToken: !!ticket.downloadToken,
      isUsed: ticket.downloadTokenUsed || false,
      isExpired: ticket.downloadTokenExpiresAt ? new Date() > ticket.downloadTokenExpiresAt : false,
      canDownload: !!(ticket.downloadToken && !ticket.downloadTokenUsed && 
        (!ticket.downloadTokenExpiresAt || new Date() <= ticket.downloadTokenExpiresAt))
    };
    
    res.json(status);
    
  } catch (error) {
    console.error('Error getting ticket download status:', error);
    res.status(500).json({ message: 'Failed to get ticket download status' });
  }
};

// Verify ticket QR code
exports.verifyTicketQRCode = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'QR token is required' });
    }
    
    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find ticket by ID from token
    const ticket = await Ticket.findByPk(decoded.ticketId, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'venue', 'startDate', 'endDate', 'description', 'status']
        },
        {
          model: require('../models').TicketType,
          as: 'ticketType',
          attributes: ['id', 'name', 'description']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Verify ticket status
    if (ticket.status !== 'active') {
      return res.status(400).json({ 
        message: `Ticket is ${ticket.status}. Cannot verify.`,
        ticket: {
          id: ticket.id,
          status: ticket.status,
          holderName: ticket.holderName
        }
      });
    }
    
    // Verify event is active
    if (ticket.event.status !== 'active') {
      return res.status(400).json({ 
        message: 'Event is not active',
        ticket: {
          id: ticket.id,
          status: ticket.status,
          holderName: ticket.holderName,
          event: ticket.event
        }
      });
    }
    
    // Verify user hash matches
    const expectedUserHash = ticket.generateUserHash();
    if (decoded.userHash !== expectedUserHash) {
      return res.status(400).json({ message: 'Invalid ticket hash' });
    }
    
    // Verify security code
    if (decoded.securityCode !== ticket.securityCode) {
      return res.status(400).json({ message: 'Invalid security code' });
    }
    
    // Return verification result
    res.json({
      message: 'Ticket verified successfully',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        holderName: ticket.holderName,
        event: {
          name: ticket.event.name,
          venue: ticket.event.venue,
          startDate: ticket.event.startDate
        },
        ticketType: ticket.ticketType.name,
        isVip: ticket.isVip,
        isAccessible: ticket.isAccessible
      },
      verification: {
        timestamp: new Date().toISOString(),
        verifiedBy: req.user?.id || 'system',
        userHash: decoded.userHash,
        securityCode: decoded.securityCode
      }
    });
  } catch (error) {
    console.error('QR verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid QR code token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'QR code token has expired' });
    }
    
    res.status(500).json({ message: 'Failed to verify ticket' });
  }
}; 