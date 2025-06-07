const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, publicKey, encryptedPrivateKey } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        keys: {
          create: {
            publicKey,
            encryptedPrivKey: encryptedPrivateKey,
          },
        },
      },
    });

    res.status(201).json({ message: "User registered. Awaiting approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { keys: true }
  });

  if (!user || !user.isApproved) {
    return res.status(401).json({ message: "User not approved or does not exist" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  await prisma.loginLog.create({
    data: {
        userId: user.id,
        action: "LOGIN",
    }
  });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      publicKey: user.keys?.publicKey,
      encryptedPrivateKey: user.keys?.encryptedPrivKey,
    },
  });
});

const verifyToken = require("../middlewares/auth");

router.get("/me", verifyToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      keys: true,
      departments: {
        include: {
          department: true
        }
      }
    }
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  const department = user.departments?.[0]?.department || null;

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    publicKey: user.keys?.publicKey,
    encryptedPrivateKey: user.keys?.encryptedPrivKey,
    department: department,
  });
});

router.post("/logout", verifyToken, async (req, res) => {
  await prisma.loginLog.create({
    data: {
      userId: req.user.userId,
      action: "LOGOUT",
    }
  });
  res.json({ message: "✅ Logged out" });
});

module.exports = router;