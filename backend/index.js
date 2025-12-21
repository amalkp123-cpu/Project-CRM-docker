require("dotenv").config({ path: ".env" });
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool, initializeDatabase } = require("./database/db");
const { authenticateToken } = require("./middleware/auth.middleware");
const authRoutes = require("./routes/auth.routes");
const pClientRoutes = require("./routes/pClient.routes");
const fileRoutes = require("./routes/hst_docs");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

(async () => {
  await initializeDatabase();
})();

// API Routes FIRST
app.use("/api/auth", authRoutes);
app.use("/api/pClient", authenticateToken, pClientRoutes);
app.use("/api/hst-docs", authenticateToken, fileRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// SPA catch-all using middleware instead of route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
