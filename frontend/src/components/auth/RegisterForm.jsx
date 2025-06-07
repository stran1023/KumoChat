import { useState } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import axios from "axios";
import { generateRSAKeyPair } from "../../utils/crypto";

export default function RegisterForm() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    publicKey: "",
    encryptedPrivateKey: "",
  });

  const [keysGenerated, setKeysGenerated] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGenerateKeys = async () => {
    if (!form.password) {
      alert("❗ Bạn cần nhập mật khẩu trước khi tạo key");
      return;
    }

    const { publicKey, encryptedPrivateKey } = await generateRSAKeyPair(form.password);
    setForm((prev) => ({
      ...prev,
      publicKey,
      encryptedPrivateKey,
    }));
    setKeysGenerated(true);
    alert("✅ Đã tạo RSA keypair!");
  };

  const handleRegister = async () => {
    if (!form.publicKey || !form.encryptedPrivateKey) {
      alert("⚠️ Bạn cần tạo RSA keypair trước khi đăng ký");
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, form);
      alert("🎉 Đăng ký thành công! Chờ admin duyệt nha.");
    } catch (err) {
      console.error(err);
      alert("❌ Đăng ký thất bại!");
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 8 }}>
      <Typography variant="h5" gutterBottom>Đăng ký tài khoản</Typography>

      <TextField
        label="Username"
        name="username"
        fullWidth margin="normal"
        value={form.username}
        onChange={handleChange}
      />
      <TextField
        label="Email"
        name="email"
        fullWidth margin="normal"
        value={form.email}
        onChange={handleChange}
      />
      <TextField
        label="Mật khẩu"
        name="password"
        type="password"
        fullWidth margin="normal"
        value={form.password}
        onChange={handleChange}
      />

      <Button
        variant="outlined"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleGenerateKeys}
      >
        🔐 Tự động tạo RSA Keypair
      </Button>

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleRegister}
        disabled={!keysGenerated}
      >
        📝 Đăng ký
      </Button>

      {keysGenerated && (
        <Box mt={3}>
          <Typography variant="subtitle2">🔑 Public Key (ẩn):</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto", bgcolor: "#f9f9f9", p: 1 }}>
            {form.publicKey}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
