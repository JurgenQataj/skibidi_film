import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || "";

export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeUserToPush = async (token) => {
  if (!('serviceWorker' in navigator)) {
    console.warn("Service workers are not supported in this browser");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn("Push manager unavailable.");
      return;
    }

    // Replace with the VAPID Public Key from your .env
    const publicVapidKey = "BPnIjDgxIejdPqkpM1UR86RJbXVRNd9TVFdSysLiMO7wdzE5VryDjKGC3HHTJoFWb02d7tje5_Ws5uxvRgCho_M";

    // Re-check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log("User is already subscribed to push notifications");
      return existingSubscription;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    console.log("Push Subscription Object:", subscription);
    
    // Save to our backend
    await axios.post(`${API_URL}/api/push/subscribe`, subscription, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return subscription;

  } catch (error) {
    console.error("Failed to subscribe the user to push notifications:", error);
  }
};
