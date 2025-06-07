import { useState } from "react";
import { Tabs, Tab, Box, Paper } from "@mui/material";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

export default function AuthPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 10 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered>
          <Tab label="Đăng nhập" />
          <Tab label="Đăng ký" />
        </Tabs>

        <Box mt={3}>
          {tab === 0 && <LoginForm />}
          {tab === 1 && <RegisterForm />}
        </Box>
      </Paper>
    </Box>
  );
}