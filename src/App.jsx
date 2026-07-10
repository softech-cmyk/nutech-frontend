import React from "react";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";
import PushNotificationManager from "./components/PushNotificationManager";

function App() {
  return (
    <React.Fragment>
      <Toaster position="top-right" reverseOrder={false} />
      <PushNotificationManager />
      <AppRoutes />
    </React.Fragment>
  );
}

export default App;