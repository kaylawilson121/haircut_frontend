// useSceneControls.ts
import { useEffect, useState } from 'react';

export const IS_TRIMMER_TOUCHING_KEY = 'KeyA';

export function useSceneControls() {
  const [showFallback, setShowFallback] = useState(true);
  const [isTrimmerTouching, setIsTrimmerTouching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(false), 2000);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === IS_TRIMMER_TOUCHING_KEY) {
        setIsTrimmerTouching(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === IS_TRIMMER_TOUCHING_KEY) {
        setIsTrimmerTouching(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { showFallback, isTrimmerTouching };
}