Overview: KumoChat is a secure internal chat system with private, group, and broadcast messaging. It uses
end-to-end encryption (AES + RSA) and scans files using ClamAV and VirusTotal before upload. Admins can
manage users, departments, and assign roles. Built with real-time updates via Socket.IO and a clean, responsive
React interface.

◦ Tech Stack: Node.js, Express, PostgreSQL, React, Socket.IO, Prisma ORM, MUI
◦ Security: JWT, AES/RSA Encryption, ClamAV, VirusTotal
◦ Key Features:
    ∗ Sign up, Sign in for users
    ∗ Admin dashboard with user sign-up approval, department creation, and leader assignment
    ∗ E2EE with hybrid encryption (AES for messages, RSA for key exchange)
    ∗ Private chat between users in the same department
    ∗ Group chat encrypted per department using shared AES keys
    ∗ Admin broadcast to all users (read-only)
    ∗ File scanning via ClamAV and VirusTotal before upload
    ∗ Role-based access control (User, Leader, Admin)

You can download to run local by:
Folder backend: npm install -> npx nodemon src/server.js
Folder frontend: npm install -> npm start

Or see the results in report folder.
