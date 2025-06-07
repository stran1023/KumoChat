import { useState } from "react";
import {
  Box, Paper, Typography, Tabs, Tab
} from "@mui/material";
import PrivateChatAdmin from "../../components/chat/PrivateChatAdmin";
import GroupChatAdmin from "../../components/chat/GroupChatAdmin";
import BroadcastChatAdmin from "../../components/chat/BroadcastChatAdmin";

export default function Communication({ users, departments }) {
  const [chatTab, setChatTab] = useState(0);

  return (
    <Box sx={{ mt: 5 }}>
      <Paper
        elevation={2}
        sx={{
          p: 4,
          borderRadius: 4,
          bgcolor: "#fdfaf6",
          border: "1px solid #f3e8e2",
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: "#7c584c",
            fontFamily: "'Noto Sans JP', sans-serif",
          }}
        >
          💬 Trung tâm trò chuyện
        </Typography>

        <Tabs
          value={chatTab}
          onChange={(_, newVal) => setChatTab(newVal)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            mb: 3,
            bgcolor: "#fffefc",
            borderRadius: 2,
            ".MuiTabs-indicator": {
              height: 3,
              bgcolor: "#c68c5f",
              borderRadius: 2,
            },
            ".MuiTab-root": {
              fontWeight: 500,
              fontSize: 16,
              px: 2,
              fontFamily: "'Noto Sans JP', sans-serif",
            },
            ".Mui-selected": {
              color: "#c68c5f !important",
            },
          }}
        >
          <Tab label="🧍 Nhắn riêng" />
          <Tab label="👥 Nhóm" />
          <Tab label="📢 Broadcast" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {chatTab === 0 && <PrivateChatAdmin users={users} departments={departments} />}
          {chatTab === 1 && <GroupChatAdmin users={users} departments={departments} />}
          {chatTab === 2 && <BroadcastChatAdmin users={users} departments={departments} />}
        </Box>
      </Paper>
    </Box>
  );
}
