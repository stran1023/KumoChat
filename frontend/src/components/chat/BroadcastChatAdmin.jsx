import { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { Box, Typography, List, ListItem, ListItemText, TextField, Button } from "@mui/material";
import forge from "node-forge";
import CryptoJS from "crypto-js";

export default function BroadcastChatAdmin() {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [broadcastInput, setBroadcastInput] = useState("");
  const [password, setPassword] = useState("");
  const [privateKey, setPrivateKey] = useState(null);
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setAdminId(user?.id);
  }, []);

  const sendBroadcast = async (message) => {

    // Fetch all users
    const resUsers = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const allUsers = resUsers.data;
    const encryptedAESKeys = [];

    // Tạo AES key một lần và mã hóa nội dung tin nhắn
    const forge = require("node-forge");
    const aesKeyRaw = forge.random.getBytesSync(32); // 256-bit key
    const encryptedContent = CryptoJS.AES.encrypt(message, aesKeyRaw).toString();

    // Mã hóa AES key bằng public key từng người
    for (const user of allUsers) {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const publicKeyPem = res.data.publicKey;
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const encryptedAESKey = forge.util.encode64(publicKey.encrypt(aesKeyRaw, "RSA-OAEP"));

      encryptedAESKeys.push({ userId: user.id, aesKey: encryptedAESKey });
    }

    // Gửi tin
    await axios.post(`${process.env.REACT_APP_API_URL}/admin/broadcast`, {
      encryptedContent,
      encryptedAESKeys
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    alert("✅ Tin nhắn broadcast đã gửi đến tất cả người dùng!");
    fetchBroadcasts();
  };

  const fetchBroadcasts = useCallback(async () => {
    if (!privateKey || !adminId) return;

    const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/messages/broadcast`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const decryptedMsgs = res.data.map(msg => {
      try {
        const myKey = msg.encryptedAESKeys.find(k => k.userId === adminId);

        if (!myKey) throw new Error("Không tìm thấy AES key cho admin");

        const aesKeyBytes = privateKey.decrypt(forge.util.decode64(myKey.aesKey), "RSA-OAEP");
        const decrypted = CryptoJS.AES.decrypt(msg.encryptedContent, aesKeyBytes);
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

        return {
          ...msg,
          senderName: msg.sender?.username || "admin",
          decryptedContent: plaintext || "(Không thể giải mã)"
        };
      } catch (err) {
        return {
          ...msg,
          senderName: msg.sender?.username || "Không rõ",
          decryptedContent: "(Lỗi giải mã)"
        };
      }
    });

    setMessages(decryptedMsgs);
  }, [token, privateKey, adminId]); // 👈 dependencies

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleSend = async () => {
    if (!broadcastInput.trim()) return;
    await sendBroadcast(broadcastInput);
    setBroadcastInput("");
  };

  const handleLoadPrivateKey = async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/keys/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const decrypted = decryptPrivateKey(res.data.encryptedPrivateKey, password);
    if (!decrypted) {
      alert("❌ Sai mật khẩu hoặc khóa không hợp lệ");
    } else {
      setPrivateKey(forge.pki.privateKeyFromPem(decrypted));
      alert("🔓 Đã giải mã private key thành công!");
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        📢 Gửi tin nhắn Broadcast (Admin)
      </Typography>

      {!privateKey && (
        <Box mb={2}>
          <Typography variant="body2">🔐 Nhập mật khẩu để xem tin nhắn broadcast:</Typography>
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

      <List dense sx={{ maxHeight: 300, overflow: "auto", bgcolor: "#f4f4f4", mb: 2 }}>
        {messages.map(msg => (
          <ListItem key={msg.id}>
            <ListItemText
              primary={`Từ: ${msg.senderName}`}
              secondary={msg.decryptedContent}
            />
          </ListItem>
        ))}
      </List>

      <TextField
        fullWidth
        label="Soạn tin broadcast"
        value={broadcastInput}
        onChange={(e) => setBroadcastInput(e.target.value)}
        multiline
        rows={2}
        sx={{ mb: 1 }}
      />
      <Button variant="contained" onClick={handleSend}>
        Gửi Broadcast 📤
      </Button>
    </Box>
  );
}

// 🔐 Hàm giải mã private key đã mã hóa bằng mật khẩu
function decryptPrivateKey(encryptedPem, passphrase) {
  try {
    const privateKey = forge.pki.decryptRsaPrivateKey(encryptedPem, passphrase);
    return privateKey ? forge.pki.privateKeyToPem(privateKey) : null;
  } catch {
    return null;
  }
}
