const webpush = require('web-push');
const { createTransporter } = require('./emailService');

// Initialize web push (for browser push notifications)
const initializeWebPush = () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    console.warn('VAPID keys not configured. Push notifications will be disabled.');
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@najahtutors.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
};

// WhatsApp Business API (using Twilio)
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
      console.warn('Twilio WhatsApp not configured. Skipping WhatsApp notification.');
      return { success: false, message: 'WhatsApp not configured' };
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Format phone number (add country code if not present)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // Add India country code
    }
    formattedPhone = `whatsapp:+${formattedPhone}`;

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_FROM, // e.g., 'whatsapp:+14155238886'
      to: formattedPhone
    });

    console.log('WhatsApp message sent:', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification (using existing email service)
const sendEmailNotification = async (email, name, subject, htmlContent) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Najah Tutors" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error.message };
  }
};

// Send push notification
const sendPushNotification = async (subscription, payload) => {
  try {
    if (!initializeWebPush()) {
      return { success: false, message: 'Push notifications not configured' };
    }

    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent:', result.statusCode);
    return { success: true, statusCode: result.statusCode };
  } catch (error) {
    console.error('Error sending push notification:', error);
    // If subscription is invalid, return error
    if (error.statusCode === 410) {
      return { success: false, error: 'Subscription expired', expired: true };
    }
    return { success: false, error: error.message };
  }
};

// Send class schedule notification (all channels)
exports.sendClassScheduleNotification = async (student, liveClass) => {
  const results = {
    email: null,
    whatsapp: null,
    push: null
  };

  // Format class details
  const classDate = new Date(liveClass.scheduledDate);
  const formattedDate = classDate.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = classDate.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const subject = liveClass.subject || 'Live Class';
  const board = liveClass.board || '';
  const className = liveClass.className || '';
  const timeSlot = liveClass.timeSlot || `${formattedTime}`;
  const meetingLink = liveClass.meetingLink || 'Link will be shared soon';

  // Email content
  const emailSubject = `📚 Reminder: ${subject} Class Scheduled - ${formattedDate}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .class-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .info-row { margin: 10px 0; }
        .info-label { font-weight: bold; color: #667eea; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Class Reminder</h1>
        </div>
        <div class="content">
          <h2>Hello ${student.name},</h2>
          <p>This is a reminder about your upcoming live class:</p>
          
          <div class="class-info">
            <div class="info-row"><span class="info-label">Subject:</span> ${subject}</div>
            <div class="info-row"><span class="info-label">Board:</span> ${board}</div>
            <div class="info-row"><span class="info-label">Class:</span> ${className}</div>
            <div class="info-row"><span class="info-label">Date:</span> ${formattedDate}</div>
            <div class="info-row"><span class="info-label">Time:</span> ${timeSlot}</div>
            ${liveClass.days && liveClass.days.length > 0 ? `<div class="info-row"><span class="info-label">Days:</span> ${liveClass.days.join(', ')}</div>` : ''}
            ${meetingLink !== 'Link will be shared soon' ? `<div class="info-row"><span class="info-label">Meeting Link:</span> <a href="${meetingLink}">Join Class</a></div>` : ''}
          </div>

          <p>Please make sure to join the class on time. We look forward to seeing you!</p>
          
          <p>Best regards,<br><strong>Najah Tutors Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message
  const whatsappMessage = `📚 *Najah Tutors - Class Reminder*

Hello ${student.name},

Your *${subject}* class is scheduled:

📅 Date: ${formattedDate}
⏰ Time: ${timeSlot}
${board ? `📋 Board: ${board}` : ''}
${className ? `🎓 Class: ${className}` : ''}
${liveClass.days && liveClass.days.length > 0 ? `📆 Days: ${liveClass.days.join(', ')}` : ''}
${meetingLink !== 'Link will be shared soon' ? `🔗 Link: ${meetingLink}` : ''}

Please join on time. See you there!

Best regards,
Najah Tutors Team`;

  // Push notification payload
  const pushPayload = {
    title: `📚 ${subject} Class Reminder`,
    body: `Your class is scheduled for ${formattedDate} at ${timeSlot}`,
    icon: '/najah.png',
    badge: '/najah.png',
    data: {
      url: '/live_classes.html',
      classId: liveClass._id.toString()
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      }
    ]
  };

  // Send email
  if (student.email) {
    results.email = await sendEmailNotification(student.email, student.name, emailSubject, emailHtml);
  }

  // Send WhatsApp
  if (student.phone) {
    results.whatsapp = await sendWhatsAppMessage(student.phone, whatsappMessage);
  }

  // Send push notification (if subscription exists)
  if (student.pushSubscription) {
    try {
      const subscription = typeof student.pushSubscription === 'string' 
        ? JSON.parse(student.pushSubscription) 
        : student.pushSubscription;
      results.push = await sendPushNotification(subscription, pushPayload);
    } catch (error) {
      console.error('Error parsing push subscription:', error);
      results.push = { success: false, error: 'Invalid subscription' };
    }
  }

  return results;
};

// Send bulk notifications to multiple students
exports.sendBulkClassNotifications = async (students, liveClass) => {
  const results = [];
  
  for (const student of students) {
    try {
      const result = await exports.sendClassScheduleNotification(student, liveClass);
      results.push({
        studentId: student._id,
        studentName: student.name,
        ...result
      });
    } catch (error) {
      results.push({
        studentId: student._id,
        studentName: student.name,
        error: error.message
      });
    }
  }

  return results;
};

// Send class cancellation notification
exports.sendClassCancellationNotification = async (student, liveClass, reason) => {
  const classDate = new Date(liveClass.scheduledDate);
  const formattedDate = classDate.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const emailSubject = `⚠️ Class Cancelled: ${liveClass.subject} - ${formattedDate}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f56565 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Class Cancelled</h1>
        </div>
        <div class="content">
          <h2>Hello ${student.name},</h2>
          <p>We regret to inform you that the following class has been cancelled:</p>
          
          <div class="warning">
            <strong>Subject:</strong> ${liveClass.subject}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            ${reason ? `<strong>Reason:</strong> ${reason}` : ''}
          </div>

          <p>We apologize for any inconvenience. Please check your dashboard for updates on rescheduled classes.</p>
          
          <p>Best regards,<br><strong>Najah Tutors Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const whatsappMessage = `⚠️ *Najah Tutors - Class Cancelled*

Hello ${student.name},

We regret to inform you that your *${liveClass.subject}* class scheduled for ${formattedDate} has been cancelled.

${reason ? `Reason: ${reason}` : ''}

Please check your dashboard for updates.

Best regards,
Najah Tutors Team`;

  const pushPayload = {
    title: `⚠️ Class Cancelled: ${liveClass.subject}`,
    body: `Your class scheduled for ${formattedDate} has been cancelled`,
    icon: '/najah.png',
    data: {
      url: '/live_classes.html'
    }
  };

  const results = {
    email: null,
    whatsapp: null,
    push: null
  };

  if (student.email) {
    results.email = await sendEmailNotification(student.email, student.name, emailSubject, emailHtml);
  }

  if (student.phone) {
    results.whatsapp = await sendWhatsAppMessage(student.phone, whatsappMessage);
  }

  if (student.pushSubscription) {
    try {
      const subscription = typeof student.pushSubscription === 'string' 
        ? JSON.parse(student.pushSubscription) 
        : student.pushSubscription;
      results.push = await sendPushNotification(subscription, pushPayload);
    } catch (error) {
      results.push = { success: false, error: 'Invalid subscription' };
    }
  }

  return results;
};

// Send course creation notification (email + WhatsApp)
exports.sendCourseCreationNotification = async (student, course) => {
  const results = {
    email: null,
    whatsapp: null
  };

  const courseName = course.name || 'New Course';
  const board = course.board || '';
  const className = course.class || '';
  const subjects = course.subjects && course.subjects.length > 0 
    ? course.subjects.map(s => s.name).join(', ') 
    : 'Various subjects';

  // Email content
  const emailSubject = `🎓 New Course Available: ${courseName}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .course-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .info-row { margin: 10px 0; }
        .info-label { font-weight: bold; color: #667eea; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Course Available!</h1>
        </div>
        <div class="content">
          <h2>Hello ${student.name},</h2>
          <p>We're excited to announce a new course that might interest you:</p>
          
          <div class="course-info">
            <div class="info-row"><span class="info-label">Course Name:</span> ${courseName}</div>
            ${board ? `<div class="info-row"><span class="info-label">Board:</span> ${board}</div>` : ''}
            ${className ? `<div class="info-row"><span class="info-label">Class:</span> ${className}</div>` : ''}
            <div class="info-row"><span class="info-label">Subjects:</span> ${subjects}</div>
          </div>

          <p>Check out this new course and enroll if you're interested!</p>
          
          <p>Best regards,<br><strong>Najah Tutors Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message
  const whatsappMessage = `🎓 *Najah Tutors - New Course Available!*

Hello ${student.name},

We're excited to announce a new course:

*${courseName}*
${board ? `📋 Board: ${board}` : ''}
${className ? `🎓 Class: ${className}` : ''}
📚 Subjects: ${subjects}

Check out this new course and enroll if you're interested!

Best regards,
Najah Tutors Team`;

  // Send email
  if (student.email) {
    results.email = await sendEmailNotification(student.email, student.name, emailSubject, emailHtml);
  }

  // Send WhatsApp
  if (student.phone) {
    results.whatsapp = await sendWhatsAppMessage(student.phone, whatsappMessage);
  }

  return results;
};

// Send enrollment notification (email + WhatsApp)
exports.sendEnrollmentNotification = async (student, enrollment) => {
  const results = {
    email: null,
    whatsapp: null
  };

  const course = enrollment.course || {};
  const courseName = course.name || 'Course';
  const board = course.board || '';
  const className = course.class || '';
  const subjects = enrollment.subjects && enrollment.subjects.length > 0 
    ? enrollment.subjects.join(', ') 
    : 'Various subjects';
  const amount = enrollment.amount || 0;

  // Email content
  const emailSubject = `✅ Enrollment Confirmed: ${courseName}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .enrollment-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78; }
        .info-row { margin: 10px 0; }
        .info-label { font-weight: bold; color: #48bb78; }
        .button { display: inline-block; padding: 12px 30px; background: #48bb78; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Enrollment Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${student.name},</h2>
          <p>Your enrollment has been confirmed successfully!</p>
          
          <div class="enrollment-info">
            <div class="info-row"><span class="info-label">Course:</span> ${courseName}</div>
            ${board ? `<div class="info-row"><span class="info-label">Board:</span> ${board}</div>` : ''}
            ${className ? `<div class="info-row"><span class="info-label">Class:</span> ${className}</div>` : ''}
            <div class="info-row"><span class="info-label">Subjects:</span> ${subjects}</div>
            ${amount > 0 ? `<div class="info-row"><span class="info-label">Amount:</span> ₹${amount}</div>` : ''}
          </div>

          <p>We're excited to have you with us! You can now access your course materials and join live classes.</p>
          
          <p>Best regards,<br><strong>Najah Tutors Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message
  const whatsappMessage = `✅ *Najah Tutors - Enrollment Confirmed!*

Hello ${student.name},

Your enrollment has been confirmed successfully!

*Course:* ${courseName}
${board ? `📋 Board: ${board}` : ''}
${className ? `🎓 Class: ${className}` : ''}
📚 Subjects: ${subjects}
${amount > 0 ? `💰 Amount: ₹${amount}` : ''}

We're excited to have you with us! You can now access your course materials and join live classes.

Best regards,
Najah Tutors Team`;

  // Send email
  if (student.email) {
    results.email = await sendEmailNotification(student.email, student.name, emailSubject, emailHtml);
  }

  // Send WhatsApp
  if (student.phone) {
    results.whatsapp = await sendWhatsAppMessage(student.phone, whatsappMessage);
  }

  return results;
};

// Send welcome WhatsApp message (for marketing enrollment)
exports.sendWelcomeWhatsApp = async (phone, name, password) => {
  const whatsappMessage = `🎉 *Welcome to Najah Tutors!*

Hello ${name},

Thank you for enrolling in our live online classes. Your account has been created successfully!

*Your Login Credentials:*
📧 Email: (will be sent via email)
🔑 Password: *${password}*

⚠️ Please save this password securely. You can change it after logging in.

You can now login to your account using these credentials.

If you have any questions, please don't hesitate to contact us.

Best regards,
Najah Tutors Team`;

  return await sendWhatsAppMessage(phone, whatsappMessage);
};

// Get VAPID public key for frontend subscription
exports.getVapidPublicKey = () => {
  return process.env.VAPID_PUBLIC_KEY || null;
};

