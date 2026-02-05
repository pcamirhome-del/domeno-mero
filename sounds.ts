// Sound Manager using Real Audio Files
// Using reliable CDN links for sound effects

const sounds = {
    place: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Click/Tap
    draw: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3', // Slide
    win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Success chime
    lose: 'https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3', // Fail tone
    laugh: 'https://assets.mixkit.co/active_storage/sfx/2056/2056-preview.mp3', // Mocking laugh (approx)
    angry: 'https://assets.mixkit.co/active_storage/sfx/2177/2177-preview.mp3', // Grunt
    kiss: 'https://assets.mixkit.co/active_storage/sfx/2034/2034-preview.mp3', // Kiss sound
  };
  
  // Preload sounds
  const audioCache: Record<string, HTMLAudioElement> = {};
  
  Object.entries(sounds).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audioCache[key] = audio;
  });
  
  export const playSound = (type: 'place' | 'draw' | 'win' | 'lose' | 'laugh' | 'angry' | 'kiss') => {
    try {
      const audio = audioCache[type];
      if (audio) {
        audio.currentTime = 0;
        // Randomize pitch slightly for repetitive sounds like placing tiles
        if (type === 'place') {
            audio.playbackRate = 0.9 + Math.random() * 0.2;
        } else {
            audio.playbackRate = 1;
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Auto-play was prevented
                // console.warn("Audio playback prevented:", error);
            });
        }
      }
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };