import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
// Use environment variables for security
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);
console.log("Service Role Key starts with:", serviceRoleKey?.slice(0, 10));

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// List of 10 demo users to create
const demoUsers = [
  {
    id: "a1b2c3d4-1111-1111-1111-111111111111",
    email: "budi.santoso+demo@example.com",
    password: "Password123!",
    name: "Budi Santoso",
  },
  {
    id: "a1b2c3d4-2222-2222-2222-222222222222",
    email: "siti.aminah+demo@example.com",
    password: "Password123!",
    name: "Siti Aminah",
  },
  {
    id: "a1b2c3d4-3333-3333-3333-333333333333",
    email: "andi.wijaya+demo@example.com",
    password: "Password123!",
    name: "Andi Wijaya",
  },
  {
    id: "a1b2c3d4-4444-4444-4444-444444444444",
    email: "dewi.lestari+demo@example.com",
    password: "Password123!",
    name: "Dewi Lestari",
  },
  {
    id: "a1b2c3d4-5555-5555-5555-555555555555",
    email: "rizky.pratama+demo@example.com",
    password: "Password123!",
    name: "Rizky Pratama",
  },
  {
    id: "a1b2c3d4-6666-6666-6666-666666666666",
    email: "fitriani.putri+demo@example.com",
    password: "Password123!",
    name: "Fitriani Putri",
  },
  {
    id: "a1b2c3d4-7777-7777-7777-777777777777",
    email: "agus.saputra+demo@example.com",
    password: "Password123!",
    name: "Agus Saputra",
  },
  {
    id: "a1b2c3d4-8888-8888-8888-888888888888",
    email: "lina.marlina+demo@example.com",
    password: "Password123!",
    name: "Lina Marlina",
  },
  {
    id: "a1b2c3d4-9999-9999-9999-999999999999",
    email: "yusuf.hidayat+demo@example.com",
    password: "Password123!",
    name: "Yusuf Hidayat",
  },
  {
    id: "a1b2c3d4-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "maya.sari+demo@example.com",
    password: "Password123!",
    name: "Maya Sari",
  },
];

async function createUsers() {
  for (const user of demoUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`Error creating user ${user.email}:`, error.message);
    } else {
      console.log(`Created user: ${user.email} (id: ${data.user.id})`);
      // Update the user's profile with the name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: user.name })
        .eq("id", user.id);
      if (profileError) {
        console.error(
          `Error updating profile for ${user.email}:`,
          profileError.message
        );
      } else {
        console.log(`Updated profile name for: ${user.email}`);
      }
    }
  }
}

createUsers();
