
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject('FileReader result is not a string');
      }
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject('FileReader result is not a string');
      }
      resolve(reader.result);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const extractFramesFromVideo = (videoBlob: Blob, framesPerSecond: number = 1): Promise<File[]> => {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.muted = true;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const files: File[] = [];

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!context) {
        URL.revokeObjectURL(videoUrl);
        return reject(new Error('Could not get canvas context'));
      }

      const duration = video.duration;
      const interval = 1 / framesPerSecond;
      let currentTime = 0;
      let frameCount = 0;

      const captureFrame = () => {
        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `frame-${frameCount++}.jpg`, { type: 'image/jpeg' });
            files.push(file);
          }
          
          currentTime += interval;
          if (currentTime <= duration) {
            captureFrame();
          } else {
            URL.revokeObjectURL(videoUrl);
            resolve(files);
          }
        }, 'image/jpeg', 0.85); // Use a reasonable quality for analysis
      };
      
      // Start capturing frames
      captureFrame();
    };

    video.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        let error = 'Unknown video error';
        if (video.error) {
            switch(video.error.code) {
                case video.error.MEDIA_ERR_ABORTED:
                    error = 'Video playback aborted.';
                    break;
                case video.error.MEDIA_ERR_NETWORK:
                    error = 'A network error caused the video download to fail.';
                    break;
                case video.error.MEDIA_ERR_DECODE:
                    error = 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
                    break;
                case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    error = 'The video could not be loaded, either because the server or network failed or because the format is not supported.';
                    break;
            }
        }
        reject(new Error(error));
    };
    
    video.src = videoUrl;
    video.load();
  });
};