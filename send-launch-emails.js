/* eslint-disable @typescript-eslint/no-require-imports */
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Import the complete email list from the generated JSON file
const fs = require("fs");
const emailList = JSON.parse(fs.readFileSync("email-list.json", "utf8"));

// Split emails into 6 batches (520 emails ÷ 6 = ~87 per batch)
const batchSize = Math.ceil(emailList.length / 6);
const batches = [];

for (let i = 0; i < emailList.length; i += batchSize) {
  batches.push(emailList.slice(i, i + batchSize));
}

console.log(`📧 Total emails: ${emailList.length}`);
console.log(`📦 Number of batches: ${batches.length}`);
batches.forEach((batch, index) => {
  console.log(`   Batch ${index + 1}: ${batch.length} emails`);
});
console.log("");

// Function to send emails for a specific batch
async function sendBatch(batchNumber) {
  if (batchNumber < 1 || batchNumber > batches.length) {
    console.error(`❌ Invalid batch number. Please choose 1-${batches.length}`);
    return;
  }

  const batch = batches[batchNumber - 1];
  console.log(
    `🚀 Starting Batch ${batchNumber} with ${batch.length} emails...`
  );
  console.log("");

  let successCount = 0;
  let failureCount = 0;

  for (const user of batch) {
    console.log(`📤 Sending to: ${user.email} (${user.name})`);

    try {
      const success = await sendJualDigitalAnnouncement(user.email, user.name);

      if (success) {
        console.log(`✅ Success: ${user.email}`);
        successCount++;
      } else {
        console.log(`❌ Failed: ${user.email}`);
        failureCount++;
      }

      // Add delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error sending to ${user.email}:`, error);
      failureCount++;
    }

    console.log("");
  }

  console.log(`🎯 Batch ${batchNumber} Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📊 Total: ${batch.length}`);

  if (failureCount === 0) {
    console.log(`🎉 Batch ${batchNumber} completed successfully!`);
  } else {
    console.log(`⚠️ Some emails in batch ${batchNumber} failed to send.`);
  }
}

// Function to send Jual Digital launch announcement email
async function sendJualDigitalAnnouncement(email, name) {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Jual Digital - Platform Digital Marketplace Terbaru!</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
        .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
        .tagline { color: #ffffff; font-size: 18px; margin-bottom: 0; }
        .content { padding: 30px 20px; }
        .title { font-size: 24px; color: #333333; margin-bottom: 20px; text-align: center; font-weight: bold; }
        .description { font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 20px; }
        .features { background-color: #f8f9fa; padding: 25px 20px; margin: 20px 0; border-radius: 8px; }
        .feature-title { font-size: 18px; color: #333333; margin-bottom: 15px; font-weight: bold; }
        .feature-list { margin: 0; padding-left: 20px; }
        .feature-item { margin-bottom: 8px; color: #555555; }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; margin: 10px; }
        .cta-button:hover { opacity: 0.9; }
        .footer { background-color: #333333; color: #ffffff; padding: 20px; text-align: center; font-size: 14px; }
        .social-links { margin: 20px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; }
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .content { padding: 20px 15px !important; }
          .header { padding: 20px 15px !important; }
          .title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀 Jual Digital</div>
          <p class="tagline">Platform Digital Marketplace Terdepan</p>
        </div>
        
        <div class="content">
          <h1 class="title">🎉 Selamat Datang di Jual Digital!</h1>
          
          <p class="description">
            Hai ${name}! Kami sangat senang mengumumkan bahwa <strong>Jual Digital</strong> telah resmi diluncurkan dan siap melayani Anda!
          </p>
          
          <p class="description">
            Jual Digital adalah platform marketplace digital terbaru yang menghubungkan penjual dan pembeli produk digital dengan cara yang mudah, aman, dan menguntungkan.
          </p>
          
          <div class="features">
            <h2 class="feature-title">✨ Fitur Unggulan:</h2>
            <ul class="feature-list">
              <li class="feature-item">🚀 Platform marketplace digital yang modern dan user-friendly</li>
              <li class="feature-item">💳 Sistem pembayaran yang aman dan terpercaya</li>
              <li class="feature-item">📱 Responsif di semua perangkat (desktop, tablet, mobile)</li>
              <li class="feature-item">🔒 Keamanan data yang tinggi dengan teknologi terkini</li>
              <li class="feature-item">📊 Dashboard analitik untuk penjual</li>
              <li class="feature-item">⭐ Sistem review dan rating yang transparan</li>
            </ul>
          </div>
          
          <div class="cta-section">
            <h2 class="feature-title">🎯 Mulai Sekarang!</h2>
            <p class="description">
              Bergabunglah dengan ribuan pengguna yang sudah merasakan kemudahan berjual-beli produk digital!
            </p>
            
            <a href="https://jualdigital.id" class="cta-button">🌐 Kunjungi Website</a>
            <a href="https://jualdigital.id/mulai-jualan" class="cta-button">💼 Daftar Jadi Penjual</a>
          </div>
          
          <div class="social-links">
            <p style="text-align: center; margin-bottom: 15px; color: #666666;">
              Ikuti kami di media sosial:
            </p>
            <div style="text-align: center;">
              <a href="#" class="social-link">📘 Facebook</a>
              <a href="#" class="social-link">📷 Instagram</a>
              <a href="#" class="social-link">🐦 Twitter</a>
              <a href="#" class="social-link">💼 LinkedIn</a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2024 Jual Digital. Semua hak dilindungi.</p>
          <p>Email ini dikirim ke ${email}</p>
          <p>
            <a href="#" style="color: #ffffff;">Berhenti Berlangganan</a> | 
            <a href="#" style="color: #ffffff;">Kebijakan Privasi</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject:
      "🚀 Jual Digital Telah Diluncurkan! Platform Marketplace Digital Terbaru",
    html: htmlContent,
  };

  return sgMail.send(msg);
}

// Main function to send emails to all users (unused - kept for reference)
// async function sendToAllUsers() {
console.log("🚀 Starting to send Jual Digital launch announcement emails...");
console.log(`📧 Total users: ${emailList.length}`);
console.log("");

let successCount = 0;
let failureCount = 0;

for (const user of emailList) {
  console.log(`📤 Sending to: ${user.email} (${user.name})`);

  try {
    const success = await sendJualDigitalAnnouncement(user.email, user.name);

    if (success) {
      console.log(`✅ Success: ${user.email}`);
      successCount++;
    } else {
      console.log(`❌ Failed: ${user.email}`);
      failureCount++;
    }

    // Add delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`❌ Error sending to ${user.email}:`, error);
    failureCount++;
  }

  console.log("");
}

console.log("🎯 Email Campaign Summary:");
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failureCount}`);
console.log(`📊 Total: ${emailList.length}`);

if (failureCount === 0) {
  console.log("🎉 All emails sent successfully!");
} else {
  console.log("⚠️ Some emails failed to send. Check the logs above.");
}
// }

// Function to show batch information
function showBatchInfo() {
  console.log("📦 Email Campaign Batches:");
  console.log("==========================");
  batches.forEach((batch, index) => {
    console.log(`Batch ${index + 1}: ${batch.length} emails`);
  });
  console.log("");
  console.log("💡 To send a specific batch, use: sendBatch(batchNumber)");
  console.log("💡 To send all emails at once, use: sendToAllUsers()");
  console.log("");
}

// Check if required environment variables are set
if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY environment variable is required");
  process.exit(1);
}

if (!process.env.SENDGRID_FROM_EMAIL) {
  console.error("❌ SENDGRID_FROM_EMAIL environment variable is required");
  process.exit(1);
}

// Show batch information and provide usage instructions
console.log("🚀 Jual Digital Email Campaign - Batching System");
console.log("================================================");
showBatchInfo();

// Check if a batch number is provided as command line argument
const batchNumber = process.argv[2];
if (batchNumber) {
  const batchNum = parseInt(batchNumber);
  if (!isNaN(batchNum)) {
    console.log(`🎯 Starting Batch ${batchNum}...`);
    sendBatch(batchNum).catch(console.error);
  } else {
    console.error("❌ Invalid batch number. Please provide a number 1-6");
    process.exit(1);
  }
} else {
  console.log("💡 Usage:");
  console.log(
    "   node send-launch-emails.js          - Show batch information"
  );
  console.log(
    "   node send-launch-emails.js 1        - Send Batch 1 (87 emails)"
  );
  console.log(
    "   node send-launch-emails.js 2        - Send Batch 2 (87 emails)"
  );
  console.log(
    "   node send-launch-emails.js 3        - Send Batch 3 (87 emails)"
  );
  console.log(
    "   node send-launch-emails.js 4        - Send Batch 4 (87 emails)"
  );
  console.log(
    "   node send-launch-emails.js 5        - Send Batch 5 (87 emails)"
  );
  console.log(
    "   node send-launch-emails.js 6        - Send Batch 6 (86 emails)"
  );
  console.log("");
  console.log("📅 Recommended Schedule:");
  console.log("   Day 1: Batch 1 (87 emails)");
  console.log("   Day 2: Batch 2 (87 emails)");
  console.log("   Day 3: Batch 3 (87 emails)");
  console.log("   Day 4: Batch 4 (87 emails)");
  console.log("   Day 5: Batch 5 (87 emails)");
  console.log("   Day 6: Batch 6 (86 emails)");
  console.log("");
  console.log(
    "⚠️  Remember: SendGrid free tier allows only 100 emails per day!"
  );
}
