const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const auth = require("../middlewares/auth");
const verifyToken = require("../middlewares/auth");

// GET /departments/:id/users
router.get("/:id/users", auth, async (req, res) => {
  const departmentId = req.params.id;

  try {
    const users = await prisma.user.findMany({
      where: {
        isApproved: true,
        departments: {
          some: {
            departmentId: departmentId
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    res.json(users);
  } catch (err) {
    console.error("❌ Lỗi lấy user trong phòng ban:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// GET /departments
router.get("/", verifyToken, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
    include: {
      leader: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    },
  });

    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch departments" });
  }
});

//GET /deparments/:userId/departments
router.get("/:userId/departments", verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
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
      }
    });

    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    const departments = user.departments.map((ud) => ud.department);

    res.json({ userId: user.id, username: user.username, departments });
  } catch (err) {
    console.error("❌ Lỗi lấy phòng ban của user:", err);
    res.status(500).json({ message: "❌ Internal server error" });
  }
});

module.exports = router;