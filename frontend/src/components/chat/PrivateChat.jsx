import { useState, useEffect, useContext } from "react";
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Divider } from "@mui/material";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import MessageArea from "./MessageArea";
import { SocketContext } from "../../context/SocketContext";

export default function PrivateChat() {
  const { token, user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);

  const { socket } = useContext(SocketContext);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on("update_online_users", (ids) => setOnlineUserIds(ids));
    return () => socket.off("update_online_users");
  }, [socket]);

  // Lấy phòng ban của mình trước
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const depId = res.data.department?.id || res.data.departments?.[0]?.id;
        setDepartmentId(depId);
      } catch (err) {
        console.error("❌ Lỗi lấy phòng ban:", err);
      }
    };
    fetchDepartment();
  }, [token]);

  // Sau đó fetch user cùng phòng ban
  useEffect(() => {
    const fetchUsers = async () => {
      if (!departmentId) return;
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/departments/${departmentId}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const filtered = res.data.filter(u => u.id !== user.userId);
        setUsers(filtered);
      } catch (err) {
        console.error("❌ Lỗi lấy user trong phòng ban:", err);
      }
    };
    fetchUsers();
  }, [departmentId, token, user.userId]);

  const [messages, setMessages] = useState([]);
  
  // Load tin nhắn cũ
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedUser) return;
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/messages/private/${selectedUser.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data); // 👈 lưu tin nhắn cũ
      } catch (err) {
        console.error("❌ Không lấy được tin nhắn cũ:", err);
      }
    };

    fetchHistory();
  }, [selectedUser, token]);

  return (
    <Box>
      <Typography variant="subtitle1">🧍 Chọn người trong phòng ban để nhắn tin</Typography>

      <List dense sx={{ maxHeight: 200, overflow: "auto", bgcolor: "#f4f4f4", mt: 1 }}>
        {users.map((u) => (
          <ListItem key={u.id} disablePadding>
            <ListItemButton onClick={() => setSelectedUser(u)}>
              <ListItemText
                primary={u.username}
                secondary={onlineUserIds.includes(u.id) ? "🟢 Online" : "⚪️ Offline"}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {selectedUser ? (
        <MessageArea
          mode="private"
          target={selectedUser}
          userList={users}
          initialMessages={messages}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Chọn một người để bắt đầu trò chuyện
        </Typography>
      )}
    </Box>
  );
}
