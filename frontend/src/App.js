import { useContext } from "react";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

function AppContent() {
  const { user } = useContext(AuthContext);

  if (user) {
    if (user.role === "ADMIN") {
      return <AdminPage />;
    } else {
      return <ChatPage />;
    }
  }

  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}