import { useEffect, useState, useContext } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { SocketContext } from "../../context/SocketContext";
import { encryptMessage } from "../../utils/encryption";
import {
  decryptPrivateKey,
  decryptAESKey,
  decryptContentAES
} from "../../utils/decryption";
import { encryptAESKeyWithPublicKey } from "../../utils/encryption";
import UploadFile from "../../components/chat/UploadFile"

export default function MessageArea({ mode, target, initialMessages = [] }) {
  const { token, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [messages, setMessages] = useState([]);
  const [decryptedMessages, setDecryptedMessages] = useState([]);
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState(null);

  // Reset khi đổi người
  useEffect(() => {
    setMessages(initialMessages);
    setDecryptedMessages([]);
    setPrivateKey(null);
    setPassword("");
  }, [target, initialMessages]);

  // Lắng nghe socket realtime
  useEffect(() => {
    if (!socket) return;

    const privateOrGroupHandler = (msg) => {
      const match =
        mode === "private" &&
        (msg.senderId === target.id || msg.receiverId === target.id);

      if (match || mode === "group") {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const broadcastHandler = (msg) => {
      if (mode === "broadcast") {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const eventName = mode === "private" ? "private_message" : "group_message";
    socket.on(eventName, privateOrGroupHandler);
    socket.on("broadcast_message", broadcastHandler);

    return () => {
      socket.off(eventName, privateOrGroupHandler);
      socket.off("broadcast_message", broadcastHandler);
    };
  }, [socket, mode, target]);

  const handleSend = async () => {
    if (!content.trim()) return;

    try {
      if (mode === "private") {
        const receiverRes = await axios.get(`${process.env.REACT_APP_API_URL}/keys/public/${target.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const senderRes = await axios.get(`${process.env.REACT_APP_API_URL}/keys/public/${user.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const {
          encryptedContent,
          encryptedAESKey: receiverAESKey,
          aesKeyRaw
        } = encryptMessage(content, receiverRes.data.publicKey, true);

        // ✅ Sửa chỗ này
        const senderAESKey = encryptAESKeyWithPublicKey(aesKeyRaw, senderRes.data.publicKey);

        const res = await axios.post(`${process.env.REACT_APP_API_URL}/messages/private`, {
          receiverId: target.id,
          encryptedContent,
          encryptedAESKeys: [
            { userId: target.id, aesKey: receiverAESKey },
            { userId: user.userId, aesKey: senderAESKey },
          ],
        }, { headers: { Authorization: `Bearer ${token}` } });

        setMessages((prev) => [...prev, {
          ...res.data, // dùng bản từ server trả về vì có đủ dữ liệu và id chuẩn
          decryptedContent: content
        }]);
      }

      setContent("");
    } catch (err) {
      console.error("❌ Lỗi gửi tin:", err);
    }
  };

  // Giải mã tin nhắn
  useEffect(() => {
    if (!privateKey) return;

    let isMounted = true;

    const decryptAll = async () => {
      const decrypted = await Promise.all(messages.map((msg) => {
        if (msg.senderId === user.userId && msg.decryptedContent) {
          return msg;
        }

        try {
          const aesEntry = msg.encryptedAESKeys?.find(e => e.userId === user.userId);
          if (!aesEntry?.aesKey) return { ...msg, decryptedContent: "❌ Không có AES key phù hợp" };

          const aesKey = decryptAESKey(aesEntry.aesKey, privateKey);
          const clearText = decryptContentAES(msg.encryptedContent, aesKey);
          return { ...msg, decryptedContent: clearText };
        } catch {
          return { ...msg, decryptedContent: "❌ Không giải mã được" };
        }
      }));

      if (isMounted) setDecryptedMessages(decrypted);
    };

    decryptAll();

    return () => {
      isMounted = false;
    };
  }, [messages, privateKey, user.userId]);

  const handleLoadPrivateKey = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/keys/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const decrypted = decryptPrivateKey(res.data.encryptedPrivateKey, password);
      if (!decrypted) {
        alert("❌ Sai mật khẩu hoặc khóa không hợp lệ");
      } else {
        setPrivateKey(decrypted);
        alert("🔓 Đã giải mã private key thành công!");
      }
    } catch (err) {
      console.error("❌ Lỗi tải khóa:", err);
    }
  };

  return (
    <Box>
      {!privateKey && (
        <Box mb={2}>
          <Typography variant="body2">🔐 Nhập mật khẩu để xem tin nhắn cũ:</Typography>
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
        {decryptedMessages.map((msg, i) => (
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

        <UploadFile onUploadSuccess={(fileUrl) => {
          setContent(prev => `${prev} ${fileUrl}`);
        }} />

        <IconButton onClick={handleSend} color="primary">
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
