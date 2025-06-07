import { useState, useEffect, useContext } from "react";
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Divider } from "@mui/material";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import MessageArea from "./MessageArea";
import { SocketContext } from "../../context/SocketContext";

export default function PrivateChat() {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const { socket } = useContext(SocketContext);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    if (!socket) return;
    socket.on("update_online_users", (ids) => setOnlineUserIds(ids));
    return () => socket.off("update_online_users");
  }, [socket]);

  // Lấy tất cả user
    useEffect(() => {
    const fetchAllUsers = async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        });

        const approved_Users = res.data.filter(user => user.isApproved === true);

        setUsers(approved_Users);
    };
    fetchAllUsers();
    }, [token]);

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

  const filteredUsers = users.filter(u => u.role !== "ADMIN");

  return (
    <Box>
      <Typography variant="subtitle1">🧍 Chọn người để nhắn tin</Typography>

        <List dense sx={{ maxHeight: 200, overflow: "auto", bgcolor: "#f4f4f4", mt: 1 }}>
        {filteredUsers.map((u) => (
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
