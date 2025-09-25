import fs from "fs";

// Read the users.sql file
const sqlContent = fs.readFileSync("users.sql", "utf8");

// Extract all email addresses using regex
const emailRegex = /'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'/g;
const emails = [];
let match;

while ((match = emailRegex.exec(sqlContent)) !== null) {
  emails.push(match[1]);
}

// Remove duplicates
const uniqueEmails = [...new Set(emails)];

console.log(`📧 Total emails found: ${uniqueEmails.length}`);
console.log("\n📋 All email addresses:");
console.log("========================");

uniqueEmails.forEach((email, index) => {
  console.log(`${index + 1}. ${email}`);
});

// Save to a file for easy access
fs.writeFileSync("all-emails.txt", uniqueEmails.join("\n"));
console.log(`\n💾 All emails saved to 'all-emails.txt'`);

// Also create a JSON file for the email campaign
const emailList = uniqueEmails.map((email) => ({
  email: email,
  name: email.split("@")[0], // Use part before @ as name
}));

fs.writeFileSync("email-list.json", JSON.stringify(emailList, null, 2));
console.log(`📄 Email list saved to 'email-list.json' for the campaign script`);
