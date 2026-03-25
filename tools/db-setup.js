require("dotenv").config();
const postgres = require("postgres");
const { execSync } = require("child_process");
const { URL } = require("url");

async function setup() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("❌ DATABASE_URL tidak ditemukan di .env");
    process.exit(1);
  }

  try {
    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1); // Ambil nama database dari URL (misal: 'btnwadb')
    
    // Connect ke database 'postgres' (default) untuk membuat database target
    const adminUrl = new URL(dbUrl);
    adminUrl.pathname = "/postgres"; // Selalu ada di default installasi Postgres

    console.log(`\n🔍 Mengecek ketersediaan database: ${dbName}...`);
    
    const sqlAdmin = postgres(adminUrl.toString());
    
    // Cek apakah database sudah ada
    const result = await sqlAdmin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    
    if (result.length === 0) {
      console.log(`🔨 Database '${dbName}' belum ada. Sedang membuat...`);
      // Perintah CREATE DATABASE tidak bisa diparameterisasi dengan $1 di postgres.js
      await sqlAdmin.unsafe(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' berhasil dibuat.`);
    } else {
      console.log(`✅ Database '${dbName}' sudah tersedia.`);
    }
    
    await sqlAdmin.end();

    // 2. Jalankan Drizzle Kit Push untuk sinkronisasi tabel
    console.log(`\n🚀 Sinkronisasi tabel via Drizzle Kit Push...`);
    execSync("npx drizzle-kit push", { stdio: "inherit" });
    
    console.log(`\n✨ Pembuatan database & tabel SELESAI.`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Gagal melakukan setup database:`, error.message);
    process.exit(1);
  }
}

setup();
