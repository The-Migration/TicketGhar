const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false, // Use TLS instead of SSL for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendTicketEmail({ to, subject, text, html, attachments }) {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments
  };
  return transporter.sendMail(mailOptions);
}

function generateTicketPDF({ event, ticket }) {
  return new Promise(async (resolve, reject) => {
    try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

      // Header
    doc.fontSize(22).text('Event Ticket', { align: 'center' });
    doc.moveDown();
      
      // Event details
    doc.fontSize(16).text(`Event: ${event?.name || event?.title || 'Unknown Event'}`);
    doc.text(`Venue: ${event?.venue || event?.location || 'TBD'}`);
    doc.text(`Date: ${event?.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}`);
    doc.moveDown();
      
      // Ticket details
    doc.fontSize(14).text(`Ticket Code: ${ticket?.ticketCode || ticket?.ticketNumber || 'N/A'}`);
    if (ticket?.seatString) doc.text(`Seat: ${ticket.seatString}`);
    doc.text(`Holder: ${ticket?.holderName || ticket?.customerName || 'N/A'}`);
    doc.text(`Email: ${ticket?.holderEmail || ticket?.customerEmail || 'N/A'}`);
      
      // Use the same QR code generation as the ticket model for consistency
      // Use the same QR code token from the database for consistency
      // Ensure QR code exists
      let signedToken = ticket?.qrCodeToken;
      
      if (!signedToken) {
        // If no QR code token exists, generate one using the ticket code
        try {
          const { Ticket } = require('../models');
          const ticketInstance = await Ticket.findByPk(ticket?.id);
          if (ticketInstance && typeof ticketInstance.generateQRCode === 'function') {
            await ticketInstance.generateQRCode();
            signedToken = ticketInstance.qrCodeToken;
          } else {
            // Fallback: use ticket code as QR data
            signedToken = ticket?.ticketCode || ticket?.ticketNumber || 'DEFAULT';
          }
        } catch (error) {
          console.error('Error generating QR code for email PDF:', error);
          // Fallback: use ticket code as QR data
          signedToken = ticket?.ticketCode || ticket?.ticketNumber || 'DEFAULT';
        }
      }
      
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(signedToken, {
          width: 100,
          margin: 2,
          color: {
            dark: '#1e40af',
            light: '#ffffff'
          }
        });
        
        // Add QR code to PDF (position it on the right side)
        // Convert data URL to buffer for PDFKit
        const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrCodeBuffer, 400, 50, { width: 80, height: 80 });
        
        // Add QR code label
        doc.fontSize(8);
        doc.fillColor('#6b7280'); // Gray color
        doc.text('Scan for event check-in', 400, 135);
        doc.text('Present this QR code at entrance', 400, 142);
        
      } catch (qrError) {
        console.error('Error generating QR code for email PDF:', qrError);
        // Continue without QR code if there's an error
      }
      
      // Add security note
      doc.fontSize(10);
      doc.fillColor('#6b7280'); // Gray color
      doc.text('This ticket is valid for one-time use only.', 50, 200);
      doc.text('Please present this ticket at the event entrance.', 50, 210);
      doc.text('QR code can be scanned for quick check-in.', 50, 220);
      
      // Add refund policy information if available
      if (event.refundDeadline && event.refundPolicy) {
        const refundDeadline = new Date(event.refundDeadline);
        const now = new Date();
        
        if (refundDeadline > now) {
          doc.moveDown();
          doc.fontSize(12).fillColor('orange').text('Refund Policy:');
          doc.fontSize(10).fillColor('gray').text(event.refundPolicy);
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('orange').text(`Refund Deadline: ${refundDeadline.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
          })}`);
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('gray').text('For refund requests, contact:');
          doc.fontSize(10).fillColor('gray').text('Email: support@ticketghar.com');
          doc.fontSize(10).fillColor('gray').text('Phone: +92 300 1234567');
        }
      }
      
    doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function sendOtpEmail(to, otp) {
  const subject = 'Your Ticket Ghar OTP Code';
  const html = `<p>Your OTP code is: <b>${otp}</b></p><p>This code will expire in 10 minutes.</p>`;
  await sendTicketEmail({ to, subject, html });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const subject = 'Reset your Ticket Ghar password';
  const html = `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 10 minutes.</p>`;
  await sendTicketEmail({ to, subject, html });
}

// Queue and Session Notifications
async function sendQueueTurnNotification(to, eventName, queuePosition, estimatedWaitMinutes) {
  const subject = `🎫 Your turn to buy tickets for ${eventName}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎫 It's Your Turn!</h2>
      <p>Hello!</p>
      <p>Great news! You're now at position <strong>${queuePosition}</strong> in the queue for <strong>${eventName}</strong>.</p>
      <p>You have approximately <strong>${estimatedWaitMinutes} minutes</strong> to complete your purchase.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0;">⏰ Important:</h3>
        <ul style="color: #374151;">
          <li>You have <strong>8 minutes</strong> to complete your purchase once you start</li>
          <li>If you don't complete the purchase in time, your session will expire</li>
          <li>You may need to rejoin the queue if your session expires</li>
        </ul>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Event Page</a></p>
      
      <p style="color: #6b7280; font-size: 14px;">If you have any issues, please contact support immediately.</p>
    </div>
  `;
  await sendTicketEmail({ to, subject, html });
}

async function sendSessionExpiredNotification(to, eventName, reason = 'timeout') {
  const subject = `⚠️ Purchase session expired for ${eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">⚠️ Session Expired</h2>
      <p>Hello!</p>
      <p>Your purchase session for <strong>${eventName}</strong> has expired.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #991b1b; margin-top: 0;">What happened?</h3>
        <p style="color: #7f1d1d;">${reason === 'timeout' ? 'Your 8-minute purchase window has expired. You may need to rejoin the queue to try again.' : reason}</p>
      </div>
      
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin-top: 0;">What you can do:</h3>
        <ul style="color: #0c4a6e;">
          <li>Rejoin the queue for the event</li>
          <li>Make sure you complete your purchase within 8 minutes</li>
          <li>Contact support if you continue to have issues</li>
        </ul>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Rejoin Queue</a></p>
      
      <p style="color: #6b7280; font-size: 14px;">We apologize for any inconvenience. If this keeps happening, please contact our support team.</p>
    </div>
  `;
  await sendTicketEmail({ to, subject, html });
}

async function sendQueueProcessingNotification(to, eventName, queuePosition, processingStarted) {
  const subject = `🔄 Processing started for ${eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🔄 Processing Started!</h2>
      <p>Hello!</p>
      <p>Your queue entry for <strong>${eventName}</strong> is now being processed.</p>
      <p>You are at position <strong>${queuePosition}</strong> in the queue.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">What's happening:</h3>
        <ul style="color: #15803d;">
          <li>Your queue entry is being processed</li>
          <li>You should receive another notification when it's your turn to purchase</li>
          <li>Please wait for the purchase notification</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">You'll receive another email when it's your turn to buy tickets.</p>
    </div>
  `;
  await sendTicketEmail({ to, subject, html });
}

async function sendQueueJoinedNotification(to, eventName, queuePosition, estimatedWaitMinutes) {
  const subject = `🎫 You've joined the queue for ${eventName}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🎫 Welcome to the Queue!</h2>
      <p>Hello!</p>
      <p>You have successfully joined the queue for <strong>${eventName}</strong>.</p>
      <p>Your current position: <strong>${queuePosition}</strong></p>
      <p>Estimated wait time: <strong>${estimatedWaitMinutes} minutes</strong></p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #166534; margin-top: 0;">What happens next?</h3>
        <ul style="color: #15803d;">
          <li>You'll receive an email when it's your turn to purchase</li>
          <li>You'll have 8 minutes to complete your purchase</li>
          <li>Stay on the event page to monitor your position</li>
        </ul>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Event Page</a></p>
      
      <p style="color: #6b7280; font-size: 14px;">We'll notify you when it's your turn to purchase tickets!</p>
    </div>
  `;
  await sendTicketEmail({ to, subject, html });
}

async function sendQueueErrorNotification(to, eventName, errorType, errorDetails) {
  const subject = `❌ Queue issue for ${eventName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">❌ Queue Issue Detected</h2>
      <p>Hello!</p>
      <p>We detected an issue with your queue entry for <strong>${eventName}</strong>.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #991b1b; margin-top: 0;">Issue Details:</h3>
        <p style="color: #7f1d1d;"><strong>Type:</strong> ${errorType}</p>
        <p style="color: #7f1d1d;"><strong>Details:</strong> ${errorDetails}</p>
      </div>
      
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin-top: 0;">What you can do:</h3>
        <ul style="color: #0c4a6e;">
          <li>Try rejoining the queue</li>
          <li>Clear your browser cache and cookies</li>
          <li>Contact support if the issue persists</li>
        </ul>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Event Page</a></p>
      
      <p style="color: #6b7280; font-size: 14px;">Our team has been notified of this issue and is working to resolve it.</p>
    </div>
  `;
  await sendTicketEmail({ to, subject, html });
}

// Send ticket confirmation email with PDF attachments
async function sendTicketConfirmationEmail({ to, customerName, order, tickets, event }) {
  const subject = `🎫 Your tickets for ${event.name} - Order ${order.orderNumber}`;
  
  // Generate PDF attachments for each ticket
  const attachments = [];
  for (const ticket of tickets) {
    try {
      const pdfBuffer = await generateTicketPDF({ event, ticket });
      attachments.push({
        filename: `ticket-${ticket.ticketNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } catch (error) {
      console.error('Error generating PDF for ticket:', ticket.id, error);
    }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🎫 Your Tickets Are Ready!</h2>
      <p>Hello ${customerName}!</p>
      <p>Thank you for your purchase! Your tickets for <strong>${event.name}</strong> are attached to this email.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Event:</strong> ${event.name}</p>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
        <p><strong>Venue:</strong> ${event.venue}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
        <p><strong>Number of Tickets:</strong> ${tickets.length}</p>
      </div>

      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">📱 Important Information</h3>
        <ul style="color: #1e40af;">
          <li>Your tickets are attached as PDF files to this email</li>
          <li>Save these tickets to your phone or print them</li>
          <li>Present your ticket QR code at the event entrance</li>
          <li>Each ticket is valid for one person only</li>
        </ul>
      </div>

      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #92400e; margin-top: 0;">⚠️ Event Reminders</h3>
        <ul style="color: #92400e;">
          <li>Arrive at least 30 minutes before the event starts</li>
          <li>Bring a valid ID that matches the name on your ticket</li>
          <li>Check the event page for any last-minute updates</li>
        </ul>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-tickets" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View My Tickets</a></p>
      
      <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
      <p style="color: #6b7280; font-size: 14px;">Enjoy your event!</p>
    </div>
  `;

  const text = `
    Your tickets for ${event.name} are ready!
    
    Order Number: ${order.orderNumber}
    Event: ${event.name}
    Date: ${new Date(event.startDate).toLocaleDateString()}
    Time: ${new Date(event.startDate).toLocaleTimeString()}
    Venue: ${event.venue}
    Total Amount: $${order.totalAmount}
    Number of Tickets: ${tickets.length}
    
    Your tickets are attached as PDF files to this email.
    Save these tickets to your phone or print them.
    Present your ticket QR code at the event entrance.
    
    View your tickets online: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-tickets
  `;

  await sendTicketEmail({ to, subject, text, html, attachments });
}

module.exports = { 
  sendTicketEmail, 
  generateTicketPDF, 
  sendOtpEmail, 
  sendPasswordResetEmail,
  sendQueueTurnNotification,
  sendSessionExpiredNotification,
  sendQueueProcessingNotification,
  sendQueueErrorNotification,
  sendQueueJoinedNotification,
  sendTicketConfirmationEmail
}; 