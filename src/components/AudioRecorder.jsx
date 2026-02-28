import { useState, useRef, useEffect } from "react";

/**
 * AudioRecorder - Records Tamil speech using the Web Speech API.
 * Provides transcript text AND a Blob for upload.
 * Props:
 *   onTranscript(text: string) - Called with live transcript
 *   onAudioBlob(blob: Blob)     - Called when recording stops with audio blob
 */
export default function AudioRecorder({ onTranscript, onAudioBlob }) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState("");
    const [pulse, setPulse] = useState(false);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (recognitionRef.current) recognitionRef.current.abort();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        setError("");
        setTranscript("");

        // 1. Get microphone stream for audio blob recording
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setError("Microphone access denied. Please allow it and try again.");
            return;
        }

        // 2. Start MediaRecorder (for blob upload)
        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            if (onAudioBlob) onAudioBlob(blob);
            stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        // 3. Start Web Speech API for realtime Tamil transcript
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Your browser does not support speech recognition. Please use Chrome.");
            mediaRecorder.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ta-IN"; // Tamil
        recognition.continuous = true;
        recognition.interimResults = true;

        let finalTranscript = "";
        recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalTranscript += t + " ";
                else interim += t;
            }
            const combined = finalTranscript + interim;
            setTranscript(combined);
            if (onTranscript) onTranscript(combined);
        };
        recognition.onerror = (e) => setError(`Speech error: ${e.error}`);
        recognition.start();
        recognitionRef.current = recognition;

        setIsRecording(true);
        setPulse(true);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        setIsRecording(false);
        setPulse(false);
    };

    const toggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Animated Microphone Button */}
            <button
                type="button"
                onClick={toggleRecording}
                className={`relative size-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 ${isRecording
                        ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110"
                        : "bg-[#13ecc8] hover:bg-[#0dd4b3] focus:ring-teal-300"
                    }`}
                title={isRecording ? "Stop Recording" : "Start Recording in Tamil"}
            >
                {/* Pulse ring when recording */}
                {isRecording && (
                    <>
                        <span className="absolute inline-flex size-full rounded-full bg-red-400 opacity-60 animate-ping"></span>
                        <span className="absolute inline-flex size-full rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDelay: "0.4s" }}></span>
                    </>
                )}
                <span className="material-symbols-outlined text-4xl text-white z-10 select-none">
                    {isRecording ? "stop_circle" : "mic"}
                </span>
            </button>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {isRecording ? "🔴 Recording in Tamil... Tap to stop" : "Tap to record in Tamil"}
            </p>

            {/* Live Transcript Display */}
            {transcript && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 min-h-[60px] break-words font-medium">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Live Transcript</span>
                    {transcript}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="w-full bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 font-semibold">
                    {error}
                </div>
            )}
        </div>
    );
}
