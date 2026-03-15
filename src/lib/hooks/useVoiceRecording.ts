"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceRecordingOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  duration: number;
  transcript: string;
  isTranscribing: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
  supported: boolean;
}

/**
 * Voice recording hook using Web Speech API for real-time transcription.
 * Falls back to MediaRecorder + server-side processing if Speech API unavailable.
 */
export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {}
): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check for Web Speech API support
  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    setDuration(0);

    if (supported) {
      // Use Web Speech API
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript((finalTranscript + interim).trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone access.");
        } else if (event.error !== "aborted") {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (finalTranscript.trim()) {
          options.onTranscription?.(finalTranscript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } else {
      // Fallback: MediaRecorder for audio capture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setIsTranscribing(true);

          try {
            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");
            const res = await fetch("/api/speech-to-text", {
              method: "POST",
              body: formData,
            });
            if (!res.ok) throw new Error("Transcription failed");
            const data = await res.json();
            setTranscript(data.transcription);
            options.onTranscription?.(data.transcription);
          } catch (err: any) {
            setError("Transcription failed. Please try again or type manually.");
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecording(true);
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("Microphone access denied.");
        } else {
          setError("Could not access microphone.");
        }
      }
    }
  }, [supported, options.onTranscription]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    stopRecording();
    setTranscript("");
    setDuration(0);
    setError(null);
    setIsTranscribing(false);
  }, [stopRecording]);

  return {
    isRecording,
    duration,
    transcript,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
    reset,
    supported,
  };
}
