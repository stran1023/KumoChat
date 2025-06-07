const prisma = require("../utils/prisma");

// Check admin
function isAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// Check leader of a group (dùng trong req.body.departmentId hoặc req.params)
async function isLeader(req, res, next) {
  const departmentId = req.body.departmentId || req.params.departmentId;
  const department = await prisma.department.findUnique({
    where: { id: departmentId }
  });

  if (!department || department.leaderId !== req.user.userId) {
    return res.status(403).json({ message: "Leader only" });
  }

  next();
}

// Check membership in a group
async function isGroupMember(req, res, next) {
  const departmentId = req.body.departmentId || req.params.departmentId;
  const member = await prisma.userDepartment.findFirst({
    where: {
      userId: req.user.userId,
      departmentId
    }
  });

  if (!member) {
    return res.status(403).json({ message: "Not in this group" });
  }

  next();
}

module.exports = { isAdmin, isLeader, isGroupMember };
