const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

const serviceProviderRoutes = require("./routes/serviceProviderRoutes");
const taskRoutes = require("./routes/taskRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const contractRoutes = require("./routes/contractRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/service-providers", serviceProviderRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/auth", authRoutes);

// Routes placeholder
app.get("/", (req, res) => {
  res.send("Estate Management API Running...");
});

// Connect DB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));