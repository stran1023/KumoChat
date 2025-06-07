## Overview

KumoChat is a secure internal chat system that facilitates private, group, and broadcast messaging. It employs end-to-end encryption (AES + RSA) and scans files using ClamAV and VirusTotal before upload. Admins have the ability to manage users, departments, and assign roles. Built with real-time updates via Socket.IO and a clean, responsive React interface, KumoChat ensures secure and efficient communication.

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React, Socket.IO, MUI
- **ORM**: Prisma

## Security Features

- **Authentication**: JWT
- **Encryption**: AES/RSA
- **File Scanning**: ClamAV, VirusTotal

## Key Features

- **User Management**:
  - Sign up and sign in for users
  - Admin dashboard for user approval, department creation, and leader assignment

- **Messaging**:
  - End-to-End Encryption (E2EE) with hybrid encryption (AES for messages, RSA for key exchange)
  - Private chat between users in the same department
  - Group chat encrypted per department using shared AES keys
  - Admin broadcast to all users (read-only)

- **File Security**:
  - File scanning via ClamAV and VirusTotal before upload

- **Access Control**:
  - Role-based access control (User, Leader, Admin)

## You can see the results in the report folder: images included already!
or scroll down to run it on your local machine.

## Getting Started

To run KumoChat locally, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/kumochat.git
   cd kumochat

2. Backend setup
   ```bash
    cd backend
    npm install
    npx nodemon src/server.js
4. Frontend setup
   ```bash
    cd ../frontend
    npm install
    npm start
