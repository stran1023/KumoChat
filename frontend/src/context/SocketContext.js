import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null); // ✅ lưu đúng socket để context dùng

  useEffect(() => {
    if (user && !socketRef.current) {
      const socket = io(process.env.REACT_APP_SOCKET_URL);
      socketRef.current = socket;
      setSocketInstance(socket); // ✅ cập nhật để các component dùng được ngay

      socket.emit("join", {
        userId: user.userId,
        departmentIds: user.departmentIds ? [user.departmentIds] : [],
      });

      // console.log("📡 Socket joined:", user.userId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketInstance }}>
      {children}
    </SocketContext.Provider>
  );
};
