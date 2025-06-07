const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const verifyToken = require("../middlewares/auth");
const auth = require("../middlewares/auth");

// GET /keys/my
router.get("/my", auth, async (req, res) => {
  const userId = req.user.userId;

  const keypair = await prisma.keyPair.findUnique({
    where: { userId }
  });

  if (!keypair) return res.status(404).json({ message: "No key found" });

  res.json({
    publicKey: keypair.publicKey,
    encryptedPrivateKey: keypair.encryptedPrivKey
  });
});

// GET /keys/public/:userId
router.get("/public/:userId", auth, async (req, res) => {
  const userId = req.params.userId;

  const keypair = await prisma.keyPair.findUnique({
    where: { userId }
  });

  if (!keypair) return res.status(404).json({ message: "Không tìm thấy khóa" });

  res.json({
    publicKey: keypair.publicKey
  });
});

//POST /keys/group/init
router.post("/group/init", verifyToken, async (req, res) => {
  const { departmentId } = req.body;

  if (!departmentId) return res.status(400).json({ message: "Missing departmentId" });

  try {
    const users = await prisma.user.findMany({
      where: {
        departments: {
          some: {
            departmentId,
          },
        },
      },
      include: {
        keys: true,
      },
    });

    if (users.length === 0) return res.status(404).json({ message: "No members in department" });

    const aesKey = generateAESKey(); // bạn dùng libsodium / crypto để sinh key

    const shares = users.map(user => ({
      departmentId,
      userId: user.id,
      encryptedKey: encryptAESKeyWithPublicKey(aesKey, user.keys.publicKey),
    }));

    await prisma.groupKeyShare.createMany({ data: shares });

    res.status(201).json({ message: "✅ AES group key initialized" });
  } catch (err) {
    console.error("❌ Error initializing group key:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /keys/group/:departmentId
router.get("/group/:departmentId", verifyToken, async (req, res) => {
  try {
    const share = await prisma.groupKeyShare.findUnique({
      where: {
        userId_departmentId: {
          userId: req.user.userId,
          departmentId: req.params.departmentId
        }
      }
    });

    if (!share) {
      return res.status(404).json({ message: "❌ You don't have group key access" });
    }

    res.json({ encryptedGroupKey: share.encryptedKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch group key" });
  }
});

module.exports = router;