import React from "react";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <React.Fragment>
      <Toaster position="top-right" reverseOrder={false} />
      <AppRoutes />
    </React.Fragment>
  );
}

export default App;