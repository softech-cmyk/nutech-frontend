import { useEffect } from "react";
import { subscribeToPush } from "../utils/push";

const PushNotificationManager = () => {
  useEffect(() => {
    if (localStorage.getItem("token")) subscribeToPush();
  }, []);

  return null;
};

export default PushNotificationManager;
