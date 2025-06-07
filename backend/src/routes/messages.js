const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const verifyToken = require("../middlewares/auth");

// ✅ POST /messages/private
router.post("/private", verifyToken, async (req, res) => {
  const { receiverId, encryptedContent, encryptedAESKeys, fileUrl } = req.body;

  if (!receiverId || !encryptedContent || !Array.isArray(encryptedAESKeys)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newMsg = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId,
        encryptedContent,
        fileUrl,
        isBroadcast: false,
        encryptedAESKeys: {
          create: encryptedAESKeys.map(({ userId, aesKey }) => ({
            userId,
            aesKey,
        }))
      },
    },
    include: {
      sender: true,
      encryptedAESKeys: true,
    },
  });

  // Sau khi tạo newMsg
  const fullMsg = await prisma.message.findUnique({
    where: { id: newMsg.id },
    include: {
      sender: {
        select: { username: true }
      },
      encryptedAESKeys: {
        where: {
          userId: {
            in: [req.user.userId, receiverId]
          }
        },
        select: { userId: true, aesKey: true }
      }
    }
  });

  const socketMsg = {
    ...fullMsg,
    senderName: fullMsg.sender.username,
  };

  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");
  const receiverSocketId = onlineUsers.get(receiverId);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("private_message", socketMsg); // 👈 emit bản đủ
  }

  res.status(201).json(socketMsg); // 👈 gửi lại cho chính người gửi (sender)

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to send message" });
  }
});

// POST /messages/group
router.post("/group", verifyToken, async (req, res) => {
  const { departmentId, encryptedContent } = req.body;

  if (!departmentId || !encryptedContent) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newMsg = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        departmentId,
        encryptedContent,
        isBroadcast: false,
      },
      include: {
        sender: true
      }
    });

    const io = req.app.get("io");
    io.emit("group_message", {
      ...newMsg,
      senderName: newMsg.sender.username
    });

    res.status(201).json(newMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to send group message" });
  }
});

// GET /messages/broadcast
router.get("/broadcast", verifyToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        isBroadcast: true,
        encryptedAESKeys: {
          some: { userId: req.user.userId }
        }
      },
      orderBy: { sentAt: "desc" },
      include: {
        sender: {
          select: { username: true }
        },
        encryptedAESKeys: {
          where: { userId: req.user.userId },
          select: { aesKey: true }
        }
      }
    });

    res.json(messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender?.username || "Không rõ",
      encryptedContent: msg.encryptedContent,
      encryptedAESKey: msg.encryptedAESKeys[0]?.aesKey || null,
      sentAt: msg.sentAt
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to load broadcasts" });
  }
});

// GET /messages/group/:departmentId
router.get("/group/:departmentId", verifyToken, async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        departmentId: req.params.departmentId,
        isBroadcast: false,
      },
      include: {
        sender: {
          select: { username: true }
        },
      },
      orderBy: { sentAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch group messages" });
  }
});

// ✅ GET /messages/private/:id (đọc lại tin nhắn với giải mã bên client)
router.get("/private/:id", verifyToken, async (req, res) => {
  const peerId = req.params.id;
  const userId = req.user.userId;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: peerId,
          },
          {
            senderId: peerId,
            receiverId: userId,
          },
        ],
      },
      orderBy: {
        sentAt: "asc",
      },
      include: {
        sender: {
          select: { username: true }
        },
        encryptedAESKeys: {
          where: {
            userId: {
              in: [userId, peerId],
            },
          },
          select: { aesKey: true, userId: true },
        },
      },
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch private messages" });
  }
});

module.exports = router;

