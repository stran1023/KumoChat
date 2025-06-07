import { useEffect, useState, useContext } from "react";
import axios from "axios";
import forge from "node-forge";
import CryptoJS from "crypto-js";
import { AuthContext } from "../../context/AuthContext";
import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function BroadcastChat() {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/messages/broadcast`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = JSON.parse(localStorage.getItem("user"));
      const passphrase = prompt("🔐 Nhập mật khẩu để giải mã tin nhắn:");
      const privateKeyPem = decryptPrivateKey(user.encryptedPrivateKey, passphrase);
      if (!privateKeyPem) return;

      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

      // Giải mã từng tin nhắn
      const decryptedMsgs = res.data.map(msg => {
        try {
          const aesKeyBytes = privateKey.decrypt(forge.util.decode64(msg.encryptedAESKey), "RSA-OAEP");
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
    };

    fetchBroadcasts();
  }, [token]);

  return (
    <Box>
      <Typography variant="subtitle1">📢 Tin nhắn broadcast</Typography>
      <List dense sx={{ maxHeight: 300, overflow: "auto", bgcolor: "#f4f4f4", mt: 2 }}>
        {messages.map(msg => (
          <ListItem key={msg.id}>
            <ListItemText
              primary={`Từ: ${msg.senderName}`}
              secondary={msg.decryptedContent}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

// 🔐 Hàm giải mã private key đã mã hóa bằng mật khẩu (bạn đã có rồi)
function decryptPrivateKey(encryptedPem, passphrase) {
  try {
    const privateKey = forge.pki.decryptRsaPrivateKey(encryptedPem, passphrase);
    return privateKey ? forge.pki.privateKeyToPem(privateKey) : null;
  } catch {
    return null;
  }
}