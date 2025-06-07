import { useEffect, useState, useContext } from "react";
import {
  Box, Button, Typography, Tabs, Tab
} from "@mui/material";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import Management from "../components/admin/Management";
import Communication from "../components/admin/Communication";

export default function AdminPage() {
  const { token, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [adminTab, setAdminTab] = useState(0);

  const handleLogout = () => {
    if (socket) socket.disconnect();
    logout();
  };

  useEffect(() => {
    const fetchData = async () => {
      const [userRes, deptRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.REACT_APP_API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(userRes.data);
      setDepartments(deptRes.data);
    };
    fetchData();
  }, [token]);

  return (
    <Box sx={{ p: 4, borderRadius: 4, bgcolor: "#fefbf7", border: "1px solid #f3e8e2", fontFamily: "'Noto Sans JP', sans-serif" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#6e4b3a" }}>
          🏯 Bảng điều khiển Admin
        </Typography>
        <Button
          variant="contained"
          onClick={handleLogout}
          sx={{ bgcolor: "#f28b82", "&:hover": { bgcolor: "#e76c6c" }, color: "#fff", fontWeight: 500, borderRadius: 2 }}
        >
          🚪 Đăng xuất
        </Button>
      </Box>

      <Tabs
        value={adminTab}
        onChange={(_, newVal) => setAdminTab(newVal)}
        indicatorColor="primary"
        textColor="primary"
        sx={{
          mb: 3,
          ".MuiTabs-indicator": { height: 3, bgcolor: "#c68c5f", borderRadius: 2 },
          ".MuiTab-root": { fontWeight: 500, fontSize: 16, textTransform: "none", px: 3 },
          ".Mui-selected": { color: "#c68c5f !important" }
        }}
      >
        <Tab label="📋 Quản lý" />
        <Tab label="💬 Giao tiếp nội bộ" />
      </Tabs>

      <Box>
        {adminTab === 0 && (
          <Management
            users={users} setUsers={setUsers}
            departments={departments} setDepartments={setDepartments}
            token={token}
          />
        )}
        {adminTab === 1 && (
          <Communication
            users={users}
            departments={departments}
          />
        )}
      </Box>
    </Box>
  );
}