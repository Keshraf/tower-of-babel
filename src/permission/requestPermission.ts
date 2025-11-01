/**
 * requestPermission.ts
 * Requests user permission for microphone access.
 * @returns {Promise<void>} A Promise that resolves when permission is granted or rejects with an error.
 */
export async function getUserPermission(): Promise<void> {
  try {
    // First, check if permission is already granted
    const permissionStatus = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    if (permissionStatus.state === "granted") {
      console.log("Microphone permission already granted");
      return;
    }

    if (permissionStatus.state === "denied") {
      console.warn("Microphone permission was previously denied");
      throw new Error("Microphone permission denied");
    }

    // Permission is in 'prompt' state, so request it
    console.log("Requesting microphone permission...");

    return new Promise((resolve, reject) => {
      // Using navigator.mediaDevices.getUserMedia to request microphone access
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Permission granted, handle the stream if needed
          console.log("Microphone access granted");

          // Stop the tracks to prevent the recording indicator from being shown
          stream.getTracks().forEach(function (track) {
            track.stop();
          });

          resolve();
        })
        .catch((error) => {
          console.error("Error requesting microphone permission", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error checking microphone permission", error);
    throw error;
  }
}

// Call the function to request microphone permission only if needed
getUserPermission();
