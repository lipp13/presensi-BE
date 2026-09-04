require("dotenv").config();

const app = require("./app");
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  console.log("==================================================");
  console.log("🚀 Presensi PKL Backend Server Berhasil Dijalankan");
  console.log(`📡 URL     : http://localhost:${PORT}`);
  console.log(`🏥 Health  : http://localhost:${PORT}/api/health`);
  console.log(`⚙️  Env     : ${NODE_ENV}`);
  console.log("==================================================");
});

module.exports = server;