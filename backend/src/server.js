require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Express setup
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route imports
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const messageRoutes = require("./routes/messages");
const keyRoutes = require("./routes/keys");
const fileRoutes = require("./routes/files");
const departmentRoutes = require("./routes/department");

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/messages", messageRoutes);
app.use("/keys", keyRoutes);
app.use("/files", fileRoutes);
app.use("/departments", departmentRoutes);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Thay bằng URL frontend thật nếu deploy
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Lưu socketId cho từng user
const onlineUsers = new Map();

io.on("connection", (socket) => {
  // console.log("🟢 New connection:", socket.id);

  socket.on("join", ({ userId, departmentIds }) => {
    socket.join(userId);
    console.log(`✅ User joined private room: ${userId}`);
    onlineUsers.set(userId, socket.id);
    // Emit cho tất cả ai đang online:
    io.emit("update_online_users", Array.from(onlineUsers.keys()));

    if (Array.isArray(departmentIds)) {
      departmentIds.forEach((depId) => {
        socket.join(depId);
        console.log(`✅ User joined group room: ${depId}`);
      });
    }

    onlineUsers.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    // console.log("🔴 Disconnected:", socket.id);
    for (let [userId, sid] of onlineUsers) {
      if (sid === socket.id){
        onlineUsers.delete(userId);
        break;
      } 
    }
    io.emit("update_online_users", Array.from(onlineUsers.keys()));
  });
});

// ✅ Gắn io vào app để các route khác xài
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// Test route
app.get("/", (_, res) => res.send("✅ KumoChat backend running with Socket.io"));

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});