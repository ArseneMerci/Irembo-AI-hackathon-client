"use client";
import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import { CiMicrophoneOn } from "react-icons/ci";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import gif from "../public/speaker.gif";

const AudioRecorderComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize audioRef with new Audio only on the client side
      audioRef.current = new Audio();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const wavBlob = await convertToWav(audioBlob);
        sendAudioToBackend(wavBlob);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioUrl(null);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLoading(true);
    }
  };

  const convertToWav = async (webmBlob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return out;

    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.wav`);

    try {
      const response = await fetch('http://localhost:8000/audio', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        console.error('Failed to upload audio');
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const handleToggleRecording = () => {
    if (!isRecording && !isPlaying && !isLoading) {
      startRecording();
    } else if (isRecording) {
      stopRecording();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-500">QuickSupport Agent</h1>
      <div className="w-full max-w-md p-8 ">
        <div className="flex justify-center space-x-8">
          {isLoading ? (
            <div>
              <div className="p-4 flex items-center justify-center">
                <style jsx>{`
                  @keyframes loadCharacters {
                    0% { content: "T"; }
                    10% { content: "Th"; }
                    20% { content: "Thi"; }
                    30% { content: "Thin"; }
                    40% { content: "Think"; }
                    50% { content: "Thinki"; }
                    60% { content: "Thinkin"; }
                    70% { content: "Thinking"; }
                    80% { content: "Thinking."; }
                    90% { content: "Thinking.."; }
                    100% { content: "Thinking..."; }
                  }
                  .animate-ai-thinking::after {
                    content: "";
                    animation: loadCharacters 1.3s steps(11) infinite;
                  }
                  .code-font {
                    font-family: 'Courier New', Courier, monospace;
                  }
                `}</style>
                <span className="animate-ai-thinking text-2xl font-bold text-blue-500 flex code-font">
                  <span className="sr-only">Thinking...</span>
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleToggleRecording}
              disabled={isPlaying || isLoading}
              className={`flex items-center justify-center rounded-full w-20 h-20 focus:outline-none transition-all duration-300 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600"
                  : isPlaying || isLoading
                  ? "hidden"
                  : "shadow-2xl bg-blue-400 hover:bg-blue-500"
              } ${isPlaying || isLoading ? "opacity-50" : "opacity-100"}`}
            >
              {isRecording ? (
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <CiMicrophoneOn size={46} />
              )}
            </button>
          )}

          <div
            className={`flex items-center justify-center rounded-full w-20 h-20 transition-all duration-300 border-2 border-blue-50 bg-white shadow-2xl ${isPlaying ? "" : "hidden"}`}
          >
            <Image src={gif} alt="Play" width={48} height={48} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioRecorderComponent;