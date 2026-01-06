require("dotenv").config({ path: ".env" });
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool, initializeDatabase } = require("./database/db");
const { authenticateToken } = require("./middleware/auth.middleware");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const pClientRoutes = require("./routes/pClient.routes");
const bClientRoutes = require("./routes/bClient.routes");
const fileRoutes = require("./routes/hst_docs");
const dashboardRoutes = require("./routes/dashboard.routes");

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
app.use("/api/user", userRoutes);
app.use("/api/pClient", authenticateToken, pClientRoutes);
app.use("/api/bClient", authenticateToken, bClientRoutes);
app.use("/api/hst-docs", authenticateToken, fileRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);

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
