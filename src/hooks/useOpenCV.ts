import { useState, useEffect, useRef } from 'react';

const useLocalOpenCV = false;

interface OpenCVError extends Error {
  code?: string;
}

interface OpenCVState {
  cv: any;
  loaded: boolean;
  loading: boolean;
  error: OpenCVError | null;
}

export function useOpenCV(): OpenCVState {
  const [cv, setCv] = useState<any>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<OpenCVError | null>(null);
  const isMounted = useRef<boolean>(true);
  const initPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initPromise.current) {
      return;
    }

    initPromise.current = (async () => {
      try {
        // Check if OpenCV is already loaded
        if (window.cv) {
          //console.log('OpenCV already loaded, using existing instance');
          if (isMounted.current) {
            setCv(window.cv);
            setLoaded(true);
            setLoading(false);
            setError(null);
          }
          return;
        }

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src*="opencv.js"]');
        if (existingScript) {
          //console.log('OpenCV script already exists, waiting for load...');
          return;
        }

        // Create and load the script
        const script = document.createElement('script');
        // Use the local OpenCV file from the public directory
        script.src = useLocalOpenCV ? '/opencv.js' : 'https://docs.opencv.org/4.8.0/opencv.js';
        script.async = true;
        script.type = 'text/javascript';

        // Set up the initialization callback
        window.Module = {
          preRun: [],
          postRun: [],
          printErr: (text: string) => {
            console.error('OpenCV Error:', text);
            if (isMounted.current) {
              setError(new Error(text));
            }
          },
          canvas: document.getElementById('canvas') as HTMLCanvasElement,
          setStatus: (text: string) => {
            //console.log('OpenCV Status:', text !== '' ? text : 'Success (default to success)');
          },
          totalDependencies: 0,
          monitorRunDependencies: (left: number) => {
            window.Module.totalDependencies = Math.max(window.Module.totalDependencies, left);
            window.Module.monitorRunDependencies = (left: number) => {
              window.Module.totalDependencies = Math.max(window.Module.totalDependencies, left);
              if (left === 0) {
                //console.log('OpenCV initialization complete');
                // Add a small delay before setting loading to false
                setTimeout(() => {
                  if (isMounted.current) {
                    setCv(window.cv);
                    setLoaded(true);
                    setLoading(false);
                    setError(null);
                  }
                }, 50);
              }
            };
          }
        };

        // Add script to document
        document.body.appendChild(script);

        // Handle script load
        script.onload = () => {
          //console.log('OpenCV script loaded');
        };

        // Handle script error
        script.onerror = (err) => {
          console.error('Failed to load OpenCV script:', err);
          if (isMounted.current) {
            setError(new Error('Failed to load OpenCV'));
            setLoading(false);
          }
        };

      } catch (err) {
        console.error('Error initializing OpenCV:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to initialize OpenCV'));
          setLoading(false);
        }
      }
    })();

    return () => {
      // Only remove the script if we're actually unmounting, not during strict mode
      if (!isMounted.current) {
        const script = document.querySelector('script[src*="opencv.js"]');
        if (script) {
          script.remove();
        }
      }
    };
  }, []);

  return { cv, loaded, loading, error };
}

