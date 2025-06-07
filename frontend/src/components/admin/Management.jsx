import { useEffect, useState, useContext } from "react";
import {
  Box, Button, Typography, Select, MenuItem, InputLabel, FormControl, List, ListItem, ListItemText, Paper
} from "@mui/material";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import forge from "node-forge";
import { decryptPrivateKey } from "../../utils/decryption";

export default function Management() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [selectedViewDeptId, setSelectedViewDeptId] = useState("");
  const [showUnapprovedOnly, setShowUnapprovedOnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [userRes, deptRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.REACT_APP_API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(userRes.data);
      setDepartments(deptRes.data);
    };
    fetchData();
  }, [token]);

  const approveUser = async (userId) => {

    // 1. Phê duyệt user
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/approve-user/${userId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 5. Cập nhật UI
    setUsers(users.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    alert("✅ Đã phê duyệt!");
  };

  const createDepartment = async () => {
    const name = prompt("Tên phòng ban:");
    if (!name) return;

    // Lấy user từ localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    const publicKeyPem = user.publicKey;

    // Tạo AES key 256 bit (32 bytes)
    const aesKey = forge.random.getBytesSync(32); // binary string

    // Mã hóa AES key bằng RSA Public Key
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encryptedKey = publicKey.encrypt(aesKey, "RSA-OAEP");
    const encryptedBase64 = forge.util.encode64(encryptedKey);

    // Gửi request lên server
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/create-department`, {
      name,
      groupAESKeyEncrypted: encryptedBase64
    }, {
      headers: { Authorization: `Bearer ${token}` } // nếu token nằm trong user, hoặc dùng token từ context
    });

    alert("✅ Đã tạo thành công phòng ban mới!");

    // Refresh lại danh sách phòng ban
    const deptRes = await axios.get(`${process.env.REACT_APP_API_URL}/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDepartments(deptRes.data);
  };

  const addUserToDepartment = async () => {
    if (!selectedUserId || !selectedDept) return;

    const user = JSON.parse(localStorage.getItem("user"));
    const passphrase = prompt("🔐 Nhập mật khẩu để giải mã khóa riêng của bạn:");

    // 1. Giải mã private key của admin
    const privateKey = decryptPrivateKey(user.encryptedPrivateKey, passphrase);
    if (!privateKey) return;

    // 2. Giải mã group key từ bộ nhớ/tạm thời (bạn đang giữ key cũ dạng mã hóa)
    // 1. Lấy key đã mã hóa dành cho bạn từ backend
    const resKey = await axios.get(`${process.env.REACT_APP_API_URL}/admin/group-key/${selectedDept}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const encryptedGroupKeyBase64 = resKey.data.encryptedKey;
    
    const encryptedBytes = forge.util.decode64(encryptedGroupKeyBase64);
    const aesKeyRaw = privateKey.decrypt(encryptedBytes, "RSA-OAEP");

    // 3. Lấy public key của user mới
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${selectedUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const publicKeyPem = res.data.publicKey;
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

    // 4. Mã hóa lại AES key cho user đó
    const encryptedForUser = publicKey.encrypt(aesKeyRaw, "RSA-OAEP");
    const encryptedBase64 = forge.util.encode64(encryptedForUser);

    // 5. Gửi request thêm user
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/add-user-to-department`, {
      userId: selectedUserId,
      departmentId: selectedDept,
      groupAESKeyEncrypted: encryptedBase64
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    alert("✅ User đã được thêm vào phòng ban và đã nhận key mã hóa!");
  };

  const assignLeader = async () => {
    if (!selectedDept || !leaderId) return;
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/assign-leader`, {
      departmentId: selectedDept,
      userId: leaderId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    alert("✅ Gán leader thành công");
  };

  const deleteUser = async (userId) => {
    const confirm = window.confirm("Bạn có chắc chắn muốn xoá tài khoản này không?");

    if (!confirm) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/admin/delete_user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsers(users.filter(u => u.id !== userId));
      alert("✅ Đã xoá user thành công");
    } catch (error) {
      console.error("❌ Lỗi xoá user:", error);
      alert("❌ Không thể xoá user. Vui lòng thử lại.");
    }
  };

  const filteredUsers = users.filter(user => {
    const inSelectedDept =
      selectedViewDeptId === "" || // tất cả
      (selectedViewDeptId === "none" && (!user.departments || user.departments.length === 0)) || // chưa có phòng
      user.departments?.some(d => d.department?.id === selectedViewDeptId); // thuộc phòng cụ thể

    const matchApproval = !showUnapprovedOnly || !user.isApproved;

    return inSelectedDept && matchApproval;
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
  <Box sx={{ px: 3, py: 4, fontFamily: "'Noto Sans JP', sans-serif", bgcolor: "#faf8f6" }}>

    {/* Bộ lọc */}
    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#fef4f4" }}>
      <Typography variant="h6" gutterBottom sx={{ color: "#a14d52", fontWeight: 600 }}>
        🌸 Bộ lọc người dùng
      </Typography>
      <Box display="flex" gap={3} flexWrap="wrap">
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Phòng ban</InputLabel>
          <Select value={selectedViewDeptId} onChange={(e) => setSelectedViewDeptId(e.target.value)} label="Phòng ban">
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="none">Chưa có</MenuItem>
            {departments.map(dep => (
              <MenuItem key={dep.id} value={dep.id}>{dep.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select value={showUnapprovedOnly ? "unapproved" : "all"} onChange={(e) => setShowUnapprovedOnly(e.target.value === "unapproved")} label="Trạng thái">
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="unapproved">Chưa duyệt</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>

    {/* Danh sách người dùng */}
    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#f9f7f3" }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: "#5c4b51" }}>
        👥 Danh sách người dùng ({filteredUsers.length})
      </Typography>
      <List sx={{ mt: 1, maxHeight: 400, overflow: "auto" }}>
        {filteredUsers.slice(0, 10).map(user => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={`${user.username} (${user.role}) - Phòng: ${user.departments?.map(d => d.department?.name).join(", ") || "Chưa có"}`}
              secondary={`📧 ${user.email} – Trạng thái: ${user.isApproved ? "✅ Đã duyệt" : "❌ Chưa duyệt"}`}
            />
            <Box display="flex" gap={1}>
              {!user.isApproved && (
                <Button variant="outlined" size="small" color="secondary" onClick={() => approveUser(user.id)}>
                  ✔️ Duyệt
                </Button>
              )}
              <Button variant="contained" size="small" color="primary" onClick={() => setSelectedUserId(user.id)}>
                Chọn
              </Button>
              <Button variant="outlined" color="error" size="small" onClick={() => deleteUser(user.id)}>
                🗑 Xoá
              </Button>
            </Box>
          </ListItem>
        ))}
      </List>
      {filteredUsers.length > 10 && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic", color: "#999" }}>
          ⚠️ Hiển thị tối đa 10 người dùng đầu tiên.
        </Typography>
      )}
    </Paper>

    {/* Gán phòng ban */}
    {selectedUser && (
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#e3f2fd" }}>
        <Typography variant="h6" gutterBottom>👤 Gán phòng ban cho: {selectedUser.username}</Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel>Phòng ban</InputLabel>
          <Select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map(dep => (
              <MenuItem key={dep.id} value={dep.id}>{dep.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" color="success" sx={{ mt: 2 }} onClick={addUserToDepartment}>
          ➕ Thêm vào phòng ban
        </Button>
      </Paper>
    )}

    {/* Tạo phòng ban */}
    <Box mb={4}>
      <Button variant="contained" color="secondary" sx={{ bgcolor: "#f7b2ad" }} onClick={createDepartment}>
        🏯 Tạo phòng ban mới
      </Button>
    </Box>

    {/* Gán trưởng phòng */}
    <Paper
      elevation={1}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: "#fefaf7", // màu beige gạo siêu nhẹ
        border: "1px solid #f3e8e2", // thêm viền mảnh để nhẹ nhàng mà vẫn rõ khu vực
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontWeight: 600, color: "#7a5c50" }} // chữ nâu nhẹ kiểu nhật
      >
        👑 Gán trưởng phòng
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel>Phòng ban</InputLabel>
        <Select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          {departments.map((dep) => (
            <MenuItem key={dep.id} value={dep.id}>
              {dep.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel>Username</InputLabel>
        <Select
          value={leaderId}
          onChange={(e) => setLeaderId(e.target.value)}
        >
          {users
            .filter(
              (u) =>
                u.role === "USER" &&
                u.departments.some((dep) => dep.department.id === selectedDept)
            )
            .map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.username}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        color="primary"
        sx={{
          mt: 2,
          bgcolor: "#d4a373",
          "&:hover": { bgcolor: "#c68c5f" },
        }}
        onClick={assignLeader}
      >
        🎖 Bổ nhiệm Leader
      </Button>
    </Paper>
  </Box>
  );
}