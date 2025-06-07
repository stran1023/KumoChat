const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const axios = require("axios");
const crypto = require("crypto");
const verifyToken = require("../middlewares/auth");
require("dotenv").config();

const router = express.Router();
const VT_API_KEY = process.env.VT_API_KEY;

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Cấu hình lưu file
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// POST /files/upload
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const filePath = path.resolve(req.file.path);
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  const clamCmd = `"C:\\Program Files\\ClamAV\\clamscan.exe" --database="C:\\Program Files\\ClamAV\\database" "${filePath}"`;

  exec(clamCmd, async (err, stdout) => {
    if (err || !stdout.includes("Infected files: 0")) {
      console.error("❌ ClamAV flagged or failed:", stdout);
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "🚫 ClamAV phát hiện virus hoặc lỗi" });
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // Kiểm tra VirusTotal đã có chưa
      try {
        const existsRes = await axios.get(`https://www.virustotal.com/api/v3/files/${sha256}`, {
          headers: { "x-apikey": VT_API_KEY },
        });

        const maliciousCount = existsRes.data.data.attributes.last_analysis_stats.malicious;
        if (maliciousCount > 0) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: `🚨 VirusTotal: ${maliciousCount} cảnh báo độc hại!` });
        }

        return res.status(201).json({ fileUrl });
      } catch (existsErr) {
        if (existsErr.response?.status !== 404) {
          console.error("❌ VT check error:", existsErr.message);
          return res.status(500).json({ message: "❌ Lỗi khi kiểm tra với VirusTotal" });
        }

        // File chưa có trên VirusTotal → Upload
        const FormData = require("form-data");
        const form = new FormData();
        form.append("file", fs.createReadStream(filePath));

        const vtRes = await axios.post("https://www.virustotal.com/api/v3/files", form, {
          headers: {
            ...form.getHeaders(),
            "x-apikey": VT_API_KEY,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        const analysisId = vtRes.data.data.id;

        // Đợi phân tích
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 10; i++) {
          const report = await axios.get(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
            headers: { "x-apikey": VT_API_KEY },
          });

          if (report.data.data.attributes.status === "completed") {
            const malicious = report.data.data.attributes.stats.malicious;
            if (malicious > 0) {
              fs.unlinkSync(filePath);
              return res.status(400).json({ message: `🚨 VirusTotal phát hiện ${malicious} cảnh báo!` });
            }
            return res.status(201).json({ fileUrl });
          }

          await delay(180000);
        }

        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "⏱ VirusTotal timeout hoặc không xác định kết quả" });
      }
    } catch (e) {
      console.error("❌ Tổng lỗi:", e.message);
      fs.unlinkSync(filePath);
      return res.status(500).json({ message: "❌ Lỗi kiểm tra file" });
    }
  });
});

module.exports = router;
