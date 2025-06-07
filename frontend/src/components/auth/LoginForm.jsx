import { useState, useContext } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

export default function LoginForm() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
        email,
        password,
      });

      login(res.data.token, res.data.user);
      alert("✅ Đăng nhập thành công!");
    } catch (err) {
      console.error(err);
      alert("❌ Sai email hoặc mật khẩu");
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 10 }}>
      <Typography variant="h5" gutterBottom>Đăng nhập</Typography>
      <TextField label="Email" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Mật khẩu" type="password" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button variant="contained" fullWidth onClick={handleLogin}>Login</Button>
    </Box>
  );
}
