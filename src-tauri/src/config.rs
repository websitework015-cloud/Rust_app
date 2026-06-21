// ─── MySQL Connection ─────────────────────────────────────────────────────────
// Update this URL before building and distributing the app.
//
// Format:  mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE
//
// For OTHER PCs to connect, HOST must be a public IP (not localhost).
// Steps:
//   1. Run MySQL on a VPS or enable remote access on your router (port 3306).
//   2. CREATE DATABASE cdr_app;
//   3. Create a user: CREATE USER 'cdruser'@'%' IDENTIFIED BY 'yourpassword';
//   4. Grant access: GRANT ALL PRIVILEGES ON cdr_app.* TO 'cdruser'@'%';
//   5. Replace the URL below with your real credentials.
pub const MYSQL_URL: &str = "mysql://root:taufiq@0155@@127.0.0.1:3306/cdr_app";
