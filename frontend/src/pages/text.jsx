import { useEffect, useState, useContext } from "react";
import {
  Box, Button, Typography, Select, MenuItem, InputLabel, FormControl, List, ListItem, ListItemText, Tabs, Tab
} from "@mui/material";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import forge from "node-forge";
import { decryptPrivateKey } from "../utils/decryption";
import { encryptMessage } from "../utils/encryption";
import PrivateChatAdmin from "../components/chat/PrivateChatAdmin";
import GroupChatAdmin from "../components/chat/GroupChatAdmin";
import BroadcastChatAdmin from "../components/chat/BroadcastChatAdmin";

export default function AdminPage() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const { socket } = useContext(SocketContext);
  const { logout } = useContext(AuthContext);
  const [chatTab, setChatTab] = useState(0);
  const [selectedViewDeptId, setSelectedViewDeptId] = useState("");
  const [showUnapprovedOnly, setShowUnapprovedOnly] = useState(false);


  const handleLogout = () => {
    if (socket) socket.disconnect();
    logout();
  };

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
    const token = localStorage.getItem("token");

    // 1. Phê duyệt user
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/approve-user/${userId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Lấy public key của user vừa duyệt
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const recipientPublicKeyPem = res.data.publicKey;

    // 3. Mã hóa tin nhắn "hi"
    const { encryptedContent, encryptedAESKey } = encryptMessage("Chào mừng bạn đến với công ty", recipientPublicKeyPem);

    // 4. Gửi tin nhắn riêng
    await axios.post(`${process.env.REACT_APP_API_URL}/messages/private`, {
      receiverId: userId,
      encryptedContent,
      encryptedAESKey,
      plaintext: "Chào mừng bạn đến với công ty"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 5. Cập nhật UI
    setUsers(users.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    alert("✅ Đã phê duyệt và gửi lời chào!");
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
    <Box>
      <Button
        variant="contained"
        color="error"
        onClick={handleLogout}
        sx={{ ml: 2, whiteSpace: "nowrap" }}
      >
        🚪 Logout
      </Button>

      <Typography variant="h6" mb={2}>👑 Bảng điều khiển Admin</Typography>

      <Button variant="contained" onClick={createDepartment}>➕ Tạo phòng ban</Button>

      {/* Bộ lọc */}
      <Box display="flex" gap={2} mt={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Lọc theo phòng ban</InputLabel>
          <Select
            value={selectedViewDeptId}
            onChange={(e) => setSelectedViewDeptId(e.target.value)}
            label="Lọc theo phòng ban"
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="none">Chưa có</MenuItem>
            {departments.map(dep => (
              <MenuItem key={dep.id} value={dep.id}>{dep.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={showUnapprovedOnly ? "unapproved" : "all"}
            onChange={(e) => setShowUnapprovedOnly(e.target.value === "unapproved")}
            label="Trạng thái"
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="unapproved">Chưa duyệt</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Danh sách người dùng */}
      <Typography mt={2} variant="subtitle2">
        👥 Tổng số: {filteredUsers.length} người dùng
      </Typography>

      <List sx={{ mt: 1, bgcolor: "#f4f4f4", maxHeight: 400, overflow: "auto" }}>
        {filteredUsers.slice(0, 10).map(user => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={`${user.username} (${user.role}) - Phòng: ${user.departments?.map(d => d.department?.name).join(", ") || "Chưa có"}`}
              secondary={`Email: ${user.email} – Đã duyệt: ${user.isApproved ? "✅" : "❌"}`}
            />
            {!user.isApproved && (
              <Button size="small" onClick={() => approveUser(user.id)}>Phê duyệt</Button>
            )}
            <Button size="small" onClick={() => setSelectedUserId(user.id)}>Chọn</Button>
          </ListItem>
        ))}
      </List>

      {filteredUsers.length > 10 && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
          ⚠️ Chỉ hiển thị 10 người dùng đầu tiên.
        </Typography>
      )}

      {selectedUser && (
        <Box mt={3} p={2} bgcolor="#e3f2fd" borderRadius={2}>
          <Typography variant="subtitle1">👤 Chọn user: {selectedUser.username}</Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Phòng ban</InputLabel>
            <Select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
              {departments.map(dep => (
                <MenuItem key={dep.id} value={dep.id}>{dep.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" sx={{ mt: 1 }} onClick={addUserToDepartment}>
            ➕ Thêm user vào phòng ban
          </Button>
        </Box>
      )}

      {/* Tabs trò chuyện */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6">💬 Giao tiếp nội bộ</Typography>

        <Tabs
          value={chatTab}
          onChange={(_, newVal) => setChatTab(newVal)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab label="🧍 Nhắn riêng" />
          <Tab label="👥 Nhóm" />
          <Tab label="📢 Broadcast" />
        </Tabs>

        {chatTab === 0 && <PrivateChatAdmin />}
        {chatTab === 1 && <GroupChatAdmin />}
        {chatTab === 2 && <BroadcastChatAdmin />}
      </Box>

      {/* Gán trưởng phòng */}
      <Box mt={4} p={2} bgcolor="#fff3e0" borderRadius={2}>
        <Typography variant="subtitle1">👑 Gán trưởng phòng</Typography>

        <FormControl fullWidth margin="normal">
          <InputLabel>Phòng ban</InputLabel>
          <Select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            {departments.map(dep => (
              <MenuItem key={dep.id} value={dep.id}>{dep.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Username</InputLabel>
          <Select value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
            {users
              .filter(u => 
                u.role === "USER" &&
                u.departments.some(dep => dep.department.id === selectedDept)
              )
              .map(u => (
                <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={assignLeader}>🎖 Gán Leader</Button>
      </Box>
    </Box>
  );
}