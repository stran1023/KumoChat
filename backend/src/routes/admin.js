const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const verifyToken = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/role");

// POST /admin/approve-user/:id
router.post("/approve-user/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { isApproved: true }, // ✅ cập nhật dữ liệu
      select: {
        username: true,
        isApproved: true
      }
    });

    res.json({ message: `✅ Approved user ${user.username}` });
  } catch (err) {
    res.status(400).json({ message: "User not found or already approved" });
  }
});

// POST /admin/create-department
router.post("/create-department", verifyToken, isAdmin, async (req, res) => {
  const { name, groupAESKeyEncrypted } = req.body;

  try {
    const department = await prisma.department.create({
      data: {
        name,
        createdById: req.user.userId,
        leaderId: req.user.userId, // mặc định admin là leader tạm thời
        users: {
          create: {
            userId: req.user.userId,
          },
        },
        groupKeyShares: {
          create: {
            userId: req.user.userId,
            encryptedKey: groupAESKeyEncrypted,
          },
        },
      },
    });

    res.status(201).json({
      message: "✅ Department created",
      departmentId: department.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to create department" });
  }
});

// POST /admin/add-user-to-department
router.post("/add-user-to-department", verifyToken, isAdmin, async (req, res) => {
  const { userId, departmentId, groupAESKeyEncrypted } = req.body;

  try {
    const [user, department] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.department.findUnique({ where: { id: departmentId } }),
    ]);

    if (!user || !department) {
      return res.status(404).json({ message: "User or Department not found" });
    }

    const [existingMembership, existingKey] = await Promise.all([
      prisma.userDepartment.findFirst({
        where: { userId, departmentId },
      }),
      prisma.groupKeyShare.findFirst({
        where: { userId, departmentId },
      }),
    ]);

    if (existingMembership) {
      return res.status(400).json({ message: "❌ User đã thuộc phòng ban này rồi" });
    }

    if (existingKey) {
      return res.status(400).json({ message: "❌ Key đã được chia trước đó" });
    }

    await prisma.userDepartment.create({
      data: { userId, departmentId },
    });

    await prisma.groupKeyShare.create({
      data: {
        userId,
        departmentId,
        encryptedKey: groupAESKeyEncrypted,
      },
    });

    res.json({ message: "✅ User added to department and group key distributed" });
  } catch (err) {
    console.error("❌ Error in /add-user-to-department:", err);
    res.status(500).json({ message: "❌ Failed to add user to department" });
  }
});

// POST /admin/assign-leader
router.post("/assign-leader", verifyToken, isAdmin, async (req, res) => {
  const { departmentId, userId } = req.body;

  try {
    // 1. Tìm leader hiện tại của phòng ban
    const currentDept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { leaderId: true }
    });

    // 2. Nếu có leader hiện tại, cập nhật họ thành USER
    if (currentDept?.leaderId && currentDept.leaderId !== userId) {
      await prisma.user.update({
        where: { id: currentDept.leaderId },
        data: { role: "USER" }
      });
    }

    // 3. Kiểm tra user mới có thuộc phòng ban không
    const member = await prisma.userDepartment.findUnique({
      where: {
        userId_departmentId: { userId, departmentId }
      }
    });

    if (!member) {
      return res.status(400).json({ message: "❌ User is not in the department" });
    }

    // 4. Gán leader mới cho phòng ban
    await prisma.department.update({
      where: { id: departmentId },
      data: { leaderId: userId }
    });

    // 5. Cập nhật role của user mới thành LEADER
    await prisma.user.update({
      where: { id: userId },
      data: { role: "LEADER" }
    });

    res.json({ message: "✅ Assigned user as leader of department" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to assign leader" });
  }
});

// POST /admin/broadcast
router.post("/broadcast", verifyToken, isAdmin, async (req, res) => {
  const { encryptedContent, encryptedAESKeys, fileUrl } = req.body;

  if (!encryptedContent || !Array.isArray(encryptedAESKeys)) {
    return res.status(400).json({ message: "Missing encryptedContent or encryptedAESKeys" });
  }

  try {
    const newMsg = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        encryptedContent,
        fileUrl,
        isBroadcast: true,
        encryptedAESKeys: {
          create: encryptedAESKeys.map(({ userId, aesKey }) => ({
            userId,
            aesKey,
          }))
        }
      },
      include: {
        sender: { select: { username: true } }
      }
    });

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");

    // Gửi cho tất cả user có trong encryptedAESKeys
    encryptedAESKeys.forEach(({ userId }) => {
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit("broadcast_message", {
          id: newMsg.id,
          senderId: newMsg.senderId,
          senderName: newMsg.sender.username,
          encryptedContent: newMsg.encryptedContent,
          sentAt: newMsg.sentAt,
        });
      }
    });

    res.status(201).json({ message: "✅ Broadcast sent to all users" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to send broadcast" });
  }
});

// GET /admin/users
router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
        departments: {
          select: {
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      }
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch users" });
  }
});

// GET /admin/logs
router.get("/logs", verifyToken, isAdmin, async (req, res) => {
  try {
    const logs = await prisma.loginLog.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: "desc"
      }
    });

    const result = logs.map(log => ({
      userId: log.userId,
      username: log.user.username,
      email: log.user.email,
      action: log.action,
      timestamp: log.timestamp,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch login logs" });
  }
});

// GET /admin/group-key/:departmentId
router.get("/group-key/:departmentId", verifyToken, isAdmin, async (req, res) => {
  const { departmentId } = req.params;

  try {
    const share = await prisma.groupKeyShare.findFirst({
      where: {
        departmentId,
        userId: req.user.userId, // chính admin đang login
      },
    });

    if (!share) {
      return res.status(404).json({ message: "❌ No key found for this department and admin" });
    }

    res.json({ encryptedKey: share.encryptedKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to retrieve group key" });
  }
});

// GET /admin/users/:id → trả về publicKey
router.get("/users/:id", verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        keys: {
          select: {
            publicKey: true
          }
        }
      }
    });

    if (!user || !user.keys) {
      return res.status(404).json({ message: "❌ User or public key not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      publicKey: user.keys.publicKey
    });
  } catch (err) {
    console.error("❌ Error in GET /users/:id", err);
    res.status(500).json({ message: "❌ Failed to fetch user" });
  }
});

// GET /admin/messages/broadcast
router.get("/messages/broadcast", verifyToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        isBroadcast: true,
        senderId: req.user.userId, // ✅ chỉ lấy những message admin đã gửi
      },
      orderBy: { sentAt: "desc" },
      include: {
        encryptedAESKeys: true, // 👈 có thể kiểm tra đã gửi cho những ai
        sender: { select: { id: true, username: true } },
      }
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch broadcasts" });
  }
});

// DELETE /admin/users/:userId
router.delete("/delete_user/:userId", verifyToken, isAdmin, async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Xoá các quan hệ phụ thuộc trước
    await prisma.userDepartment.deleteMany({
      where: { userId }
    });

    await prisma.groupKeyShare.deleteMany({
      where: { userId }
    });

    await prisma.encryptedAESKey.deleteMany({
      where: { userId }
    });

    await prisma.loginLog.deleteMany({
      where: { userId }
    });

    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    // 2. Cập nhật các phòng ban do user này lãnh đạo
    await prisma.department.updateMany({
      where: { leaderId: userId },
      data: { leaderId: null }
    });

    // 3. Cập nhật các phòng ban được tạo bởi user này (tuỳ quyết định: giữ lại hay xoá)
    await prisma.department.updateMany({
      where: { createdById: userId },
      data: { createdById: null }
    });

    // 4. Xoá key pair (nếu có)
    await prisma.keyPair.deleteMany({
      where: { userId }
    });

    // 5. Cuối cùng xoá user
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: "✅ Tài khoản đã bị xoá thành công" });
  } catch (err) {
    console.error("❌ Lỗi xoá user:", err);
    res.status(500).json({ message: "❌ Lỗi xoá tài khoản" });
  }
});

module.exports = router;
