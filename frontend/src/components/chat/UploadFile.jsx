import React, { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { Button, Typography } from "@mui/material";

export default function UploadFile({ onUploadSuccess }) {
  const { token } = useContext(AuthContext);
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setStatus("🕐 Đang kiểm tra file...");

      const res = await axios.post(`${process.env.REACT_APP_API_URL}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setStatus("✅ File sạch! Đã upload xong");

      // Gửi URL file sạch lên cho component cha xử lý
      onUploadSuccess(res.data.fileUrl);

      // Reset sau 3s
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("❌ Lỗi upload:", err);
      setStatus(err.response?.data?.message || "❌ Upload thất bại");
      onUploadSuccess("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button variant="outlined" component="label" color="secondary" disabled={isUploading}>
        📎 {isUploading ? "Đang upload..." : "Chọn & Upload File"}
        <input type="file" hidden onChange={handleFileSelect} />
      </Button>

      {status && (
        <Typography variant="body2" sx={{ mt: 1, color: "#a14d52" }}>
          {status}
        </Typography>
      )}
    </>
  );
}
