const fs = require('fs');
const path = require('path');

// Get .env file path
const getEnvPath = () => {
  return path.join(__dirname, '..', '.env');
};

// @desc    Get current settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = async (req, res, next) => {
  try {
    const envPath = getEnvPath();
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      return res.status(404).json({
        success: false,
        message: '.env file not found'
      });
    }

    // Read .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Parse environment variables
    const settings = {};
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex !== -1) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          
          // Only return settings we want to expose (email and WhatsApp)
          if (key === 'SMTP_USER' || key === 'SMTP_PASS' || key === 'TWILIO_WHATSAPP_FROM') {
            settings[key] = value;
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        email: settings.SMTP_USER || '',
        emailPassword: settings.SMTP_PASS || '',
        whatsappNumber: settings.TWILIO_WHATSAPP_FROM || ''
      }
    });
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const { email, emailPassword, whatsappNumber } = req.body;
    const envPath = getEnvPath();

    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      return res.status(404).json({
        success: false,
        message: '.env file not found'
      });
    }

    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    const updatedLines = [];
    const updates = {};

    // Track which settings we need to update
    if (email !== undefined) updates.SMTP_USER = email;
    if (emailPassword !== undefined) updates.SMTP_PASS = emailPassword;
    if (whatsappNumber !== undefined) updates.TWILIO_WHATSAPP_FROM = whatsappNumber;

    let foundKeys = new Set();

    // Process each line
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if this line contains a key we want to update
      let updated = false;
      for (const [key, value] of Object.entries(updates)) {
        if (trimmedLine.startsWith(`${key}=`)) {
          updatedLines.push(`${key}=${value}`);
          foundKeys.add(key);
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        updatedLines.push(line);
      }
    });

    // Add new keys if they didn't exist
    for (const [key, value] of Object.entries(updates)) {
      if (!foundKeys.has(key)) {
        // Add at the end, before any trailing newlines
        if (updatedLines[updatedLines.length - 1] === '') {
          updatedLines[updatedLines.length - 1] = `${key}=${value}`;
          updatedLines.push('');
        } else {
          updatedLines.push(`${key}=${value}`);
        }
      }
    }

    // Write back to .env file
    const updatedContent = updatedLines.join('\n');
    fs.writeFileSync(envPath, updatedContent, 'utf8');

    // Update process.env for current session (optional, but helpful)
    if (email !== undefined) process.env.SMTP_USER = email;
    if (emailPassword !== undefined) process.env.SMTP_PASS = emailPassword;
    if (whatsappNumber !== undefined) process.env.TWILIO_WHATSAPP_FROM = whatsappNumber;

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        email: email !== undefined ? email : undefined,
        emailPassword: emailPassword !== undefined ? '***' : undefined,
        whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : undefined
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

