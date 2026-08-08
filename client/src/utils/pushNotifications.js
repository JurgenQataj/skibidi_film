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

/**
 * Iscrivi l'utente alle notifiche push.
 * Gestisce anche il rinnovo della subscription se le chiavi VAPID sono cambiate.
 */
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

    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BBxuLOz8QIq2f-hQhVbu0yXwkiynygrJwIFLlsTtAFcWzLi9SzEPRsHkjLVeQfwZjQfohg29lW88F60LLBMC09M";

    // Check for existing subscription and unsubscribe if it was created under old keys
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {
        console.warn("Could not unsubscribe old push subscription:", e);
      }
    }

    // Subscribe with current VAPID key
    subscription = await registration.pushManager.subscribe({
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

/**
 * Disiscrivi l'utente dalle notifiche push (browser + backend).
 * Se endpoint è specificato, rimuove solo quel device.
 * Altrimenti rimuove tutte le subscription dell'utente.
 */
export const unsubscribeUserFromPush = async (token, endpoint = null) => {
  if (!('serviceWorker' in navigator)) return;

  try {
    // 1. Disiscrivi dal browser
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // 2. Rimuovi dal backend
    await axios.delete(`${API_URL}/api/push/unsubscribe`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { endpoint: endpoint || subscription?.endpoint }
    });

    return true;
  } catch (error) {
    console.error("Failed to unsubscribe from push notifications:", error);
    return false;
  }
};

/**
 * Verifica lo stato della subscription push dell'utente.
 * Restituisce { subscribed: boolean, deviceCount: number, browserPermission: string }
 */
export const checkPushSubscriptionStatus = async (token) => {
  const result = {
    subscribed: false,
    deviceCount: 0,
    browserPermission: 'unsupported',
    hasActiveSubscription: false,
  };

  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return result;
  }

  result.browserPermission = Notification.permission;

  // Check if there's an active browser subscription
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    result.hasActiveSubscription = !!subscription;
  } catch (e) {
    console.warn("Could not check push subscription:", e);
  }

  // Check backend status
  try {
    const res = await axios.get(`${API_URL}/api/push/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    result.subscribed = res.data.subscribed;
    result.deviceCount = res.data.deviceCount;
  } catch (e) {
    console.warn("Could not check push status from backend:", e);
  }

  return result;
};
