import { useState, useContext } from "react";
import { Tabs, Tab, Box, Paper, Typography, Button } from "@mui/material";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";

import PrivateChat from "../components/chat/PrivateChat";
import GroupChat from "../components/chat/GroupChat";
import BroadcastChat from "../components/chat/BroadcastChat";

export default function ChatPage() {
  const [tab, setTab] = useState(0);
  const { socket } = useContext(SocketContext);
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    if (socket) socket.disconnect();
    logout(); // ✅ xóa token, user — app sẽ render AuthPage tự động
  };

  return (
  <Box sx={{ maxWidth: 900, mx: "auto", mt: 5, px: 2 }}>
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 3,
        bgcolor: "#fdf7f5",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: "#a14d52",
            fontFamily: "'Quicksand', sans-serif",
          }}
        >
          💬 KumoChat – Giao tiếp nội bộ
        </Typography>
        <Button
          variant="contained"
          sx={{
            bgcolor: "#f28b82",
            "&:hover": { bgcolor: "#ec6c6c" },
            color: "#fff",
            fontWeight: 500,
          }}
          onClick={handleLogout}
        >
          🚪 Logout
        </Button>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        indicatorColor="primary"
        textColor="primary"
        centered
        sx={{
          mb: 3,
          ".MuiTab-root": {
            fontWeight: "bold",
            fontSize: 16,
            textTransform: "none",
            px: 3,
          },
          ".Mui-selected": {
            color: "#d35b66 !important",
          },
          ".MuiTabs-indicator": {
            backgroundColor: "#d35b66",
            height: 3,
            borderRadius: 2,
          },
        }}
      >
        <Tab label="🧍 Nhắn riêng" />
        <Tab label="👥 Nhóm" />
        <Tab label="📢 Broadcast" />
      </Tabs>

      <Box>
        {tab === 0 && <PrivateChat />}
        {tab === 1 && <GroupChat />}
        {tab === 2 && <BroadcastChat />}
      </Box>
    </Paper>
  </Box>
  );
}
