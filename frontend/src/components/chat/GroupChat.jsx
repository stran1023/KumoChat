import { useState, useEffect, useContext } from "react";
import {
  Box, Typography, CircularProgress, TextField, IconButton, Button, List, ListItem, ListItemText
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import { decryptPrivateKey, decryptGroupKey, decryptGroupMessage } from "../../utils/decryption";
import { encryptGroupMessage } from "../../utils/encryption";

export default function GroupChat() {
  const { token, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [groupKey, setGroupKey] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/departments/${user.userId}/departments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartments(res.data);
        setSelectedDeptId(res.data.departments[0]?.id || "");
      } catch (err) {
        console.error("❌ Lỗi lấy danh sách phòng ban:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [user.userId, token]);

  // Realtime nhận tin nhắn
  useEffect(() => {
    if (!socket) return;

    const handler = (msg) => {
      if (msg.departmentId === selectedDeptId) {
        try {
          const plaintext = decryptGroupMessage(msg.encryptedContent, groupKey);
          setMessages((prev) => [...prev, { ...msg, decryptedContent: plaintext }]);
        } catch {
          setMessages((prev) => [...prev, { ...msg, decryptedContent: "❌ Không giải mã được" }]);
        }
      }
    };

    socket.on("group_message", handler);
    return () => socket.off("group_message", handler);
  }, [socket, selectedDeptId, groupKey]);

  const handleLoadPrivateKey = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/keys/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const decrypted = decryptPrivateKey(res.data.encryptedPrivateKey, password);
      if (!decrypted) alert("❌ Sai mật khẩu hoặc khóa không hợp lệ");
      else {
        setPrivateKey(decrypted);
        alert("🔓 Đã giải mã khóa riêng thành công!");
      }
    } catch (err) {
      console.error("❌ Lỗi tải khóa:", err);
    }
  };

  // Lấy groupKey và tin nhắn sau khi đã có privateKey
  useEffect(() => {
    const fetchGroupKeyAndMessages = async () => {
      if (!selectedDeptId || !privateKey) return;

      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/keys/group/${selectedDeptId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const rawKey = decryptGroupKey(res.data.encryptedGroupKey, privateKey);
        if (!rawKey) return;

        setGroupKey(rawKey);

        const msgRes = await axios.get(`${process.env.REACT_APP_API_URL}/messages/group/${selectedDeptId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const decrypted = msgRes.data.map((msg) => {
          try {
            const plain = decryptGroupMessage(msg.encryptedContent, rawKey);
            return { ...msg, decryptedContent: plain };
          } catch {
            return { ...msg, decryptedContent: "❌ Không giải mã được" };
          }
        });

        setMessages(decrypted);
      } catch (err) {
        console.error("❌ Lỗi lấy group key hoặc tin nhắn:", err);
      }
    };

    fetchGroupKeyAndMessages();
  }, [selectedDeptId, privateKey, token]);

  const handleSend = async () => {
    if (!content.trim() || !groupKey || !selectedDeptId) return;

    try {
      const { encryptedContent } = encryptGroupMessage(content, groupKey);

      await axios.post(`${process.env.REACT_APP_API_URL}/messages/group`, {
        departmentId: selectedDeptId,
        encryptedContent,

      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setContent("");
    } catch (err) {
      console.error("❌ Gửi tin nhắn nhóm lỗi:", err);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6">👥 
        Nhắn trong phòng ban của bạn: {departments.departments[0]?.name || "Chưa có phòng ban"}
        </Typography>

      {!privateKey && (
        <Box mb={2}>
          <Typography variant="body2">🔐 Nhập mật khẩu để xem tin nhắn nhóm: </Typography>
          <Box display="flex" gap={1} mt={1}>
            <TextField
              type="password"
              size="small"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="outlined" onClick={handleLoadPrivateKey}>
              Giải mã
            </Button>
          </Box>
        </Box>
      )}

      <List dense sx={{ maxHeight: 300, overflow: "auto", bgcolor: "#f0f0f0", mb: 2 }}>
        {messages.map((msg, i) => (
          <ListItem key={i}>
            <ListItemText
              primary={msg.senderId === user.userId ? "Bạn" : msg.sender?.username || msg.senderId}
              secondary={msg.decryptedContent}
            />
          </ListItem>
        ))}
      </List>

      <Box display="flex" gap={1}>
        <TextField
          fullWidth
          placeholder="Nhập tin nhắn..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <IconButton onClick={handleSend} color="primary">
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}