/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Brain,
  Volume2,
  MapPin,
  Video,
  RefreshCw,
  User,
  Zap,
  CheckCircle2,
  VolumeX
} from 'lucide-react';
import { playBase64Audio, stopAudio } from '../../services/audioPlayer';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  thinkingMode?: boolean;
  groundingLinks?: Array<{ title: string; uri: string }>;
}

export const GeminiChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      role: 'model',
      content:
        'Xin chào! Tôi là Principal CAD/MEP Automation & Digital Twin Engineer. Tôi có thể giúp bạn giải đáp các vấn đề về đọc bản vẽ CAD, bóc tách khối lượng BOQ, tính toán diện tích phòng Shoelace, định vị thiết bị trên hệ tọa độ VN2000, hoặc tra cứu vị trí địa lý thông qua Google Maps Grounding. Bạn muốn kiểm tra hạng mục nào hôm nay?',
      modelUsed: 'gemini-3.5-flash'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [enableHighThinking, setEnableHighThinking] = useState(false);
  const [enableMapsGrounding, setEnableMapsGrounding] = useState(false);
  const [enableVideoAnalysis, setEnableVideoAnalysis] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText
    };

    const newThread = [...messages, userMsg];
    setMessages(newThread);
    setIsLoading(true);

    try {
      let modelResponseText = '';
      let usedModel = selectedModel;
      let usedThinking = false;
      let groundings: Array<{ title: string; uri: string }> = [];

      // 1. If High Thinking is enabled (or user chose complex query)
      if (enableHighThinking) {
        usedModel = 'gemini-3.1-pro-preview';
        usedThinking = true;
        const res = await fetch('/api/gemini/thinking-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText })
        });
        const data = await res.json();
        modelResponseText = data.text;
      }
      // 2. If Google Maps Grounding is requested
      else if (enableMapsGrounding) {
        usedModel = 'gemini-3.5-flash';
        const res = await fetch('/api/gemini/maps-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userText })
        });
        const data = await res.json();
        modelResponseText = data.text;
        if (data.groundingMetadata?.webSearchQueries) {
          groundings = (data.groundingMetadata.webSearchQueries || []).map((q: string) => ({
            title: q,
            uri: 'https://maps.google.com'
          }));
        }
      }
      // 3. Regular Multi-turn Chat
      else {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newThread.map(m => ({ role: m.role, text: m.content })),
            model: selectedModel
          })
        });
        const data = await res.json();
        modelResponseText = data.text;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'model',
          content: modelResponseText,
          modelUsed: usedModel,
          thinkingMode: usedThinking,
          groundingLinks: groundings
        }
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `Xin lỗi, đã xảy ra lỗi: ${err.message || 'Không thể kết nối Gemini API'}.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Video understanding feature using gemini-3.1-pro-preview
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const userMsg: Message = {
      id: `usr-vid-${Date.now()}`,
      role: 'user',
      content: `[Video đính kèm: ${file.name}] Phân tích video khảo sát hiện trường công trình MEP và nhận diện thiết bị.`
    };
    setMessages(prev => [...prev, userMsg]);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Video = (reader.result as string).split(',')[1] || '';
      try {
        const res = await fetch('/api/gemini/video-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoBase64: base64Video,
            mimeType: file.type || 'video/mp4',
            prompt: 'Phân tích video khảo sát hiện trường nhà ga/công trình kỹ thuật. Liệt kê các thiết bị MEP, tình trạng hoạt động, đọc nhãn mác, biển cảnh báo và các điểm cần bảo trì theo mốc thời gian video.'
          })
        });
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: `bot-vid-${Date.now()}`,
            role: 'model',
            content: data.text || 'Đã hoàn tất phân tích video.',
            modelUsed: 'gemini-3.1-pro-preview'
          }
        ]);
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: `err-vid-${Date.now()}`,
            role: 'model',
            content: `Lỗi phân tích video: ${err.message}`
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Convert response text to speech using gemini-3.8-flash-tts
  const handleTTS = async (msgId: string, text: string) => {
    if (isPlayingVoice === msgId) {
      stopAudio();
      setIsPlayingVoice(null);
      return;
    }

    setIsPlayingVoice(msgId);
    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Puck' })
      });
      const data = await res.json();
      if (data.audioData) {
        await playBase64Audio(data.audioData, data.sampleRate || 24000);
      }
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsPlayingVoice(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[740px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Trợ lý Kỹ sư CAD/MEP & Digital Twin</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Gemini Multi-Modal
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hỗ trợ bóc tách khối lượng, đối chiếu tọa độ CAD, phân tích video và tổng hợp giọng nói.
            </p>
          </div>
        </div>

        {/* Feature Switches */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value as any)}
            className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="gemini-3.5-flash">gemini-3.5-flash (Chuẩn)</option>
            <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Phức tạp)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Tốc độ cao)</option>
          </select>

          {/* High Thinking Mode Toggle */}
          <button
            onClick={() => setEnableHighThinking(!enableHighThinking)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              enableHighThinking
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>High Thinking (Pro)</span>
          </button>

          {/* Google Maps Grounding Toggle */}
          <button
            onClick={() => setEnableMapsGrounding(!enableMapsGrounding)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              enableMapsGrounding
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Google Maps</span>
          </button>

          {/* Video Analysis Upload Trigger */}
          <input
            type="file"
            accept="video/*"
            ref={videoInputRef}
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => videoInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-sky-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Nạp Video Khảo sát</span>
          </button>
        </div>
      </div>

      {/* Message Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow'
                }`}
              >
                {/* Meta Badge */}
                {!isUser && msg.modelUsed && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-300 font-semibold">{msg.modelUsed}</span>
                      {msg.thinkingMode && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          Thinking: HIGH
                        </span>
                      )}
                    </div>
                    {/* TTS Button */}
                    <button
                      onClick={() => handleTTS(msg.id, msg.content)}
                      className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition"
                      title="Đọc bằng giọng nói (gemini-3.8-flash-tts)"
                    >
                      {isPlayingVoice === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>TTS Voice</span>
                    </button>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Grounding links if any */}
                {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                    {msg.groundingLinks.map((g, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        {g.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center border border-slate-700">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>
                {enableHighThinking
                  ? 'Gemini 3.1 Pro đang suy luận chuyên sâu (High Thinking Mode)...'
                  : 'Đang xử lý câu hỏi kỹ thuật MEP...'}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Đặt câu hỏi: 'Bóc khối lượng máng cáp', 'Vị trí tủ MDB-A01 ở đâu', 'Kiểm tra xung đột AHU-02'..."
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
