/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Radio,
  ExternalLink,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Tag,
  MapPin
} from 'lucide-react';
import { playBase64Audio, stopAudio } from '../../services/audioPlayer';
import {
  appendLiveFieldLogToSheet,
  createFieldInspectionSpreadsheetWithTemplates
} from '../../services/workspaceService';
import { ConfirmationModal } from '../ConfirmationModal';

export interface FieldLogItem {
  logId: string;
  timestamp: string;
  engineer: string;
  category: 'TỦ ĐIỆN' | 'PHÒNG MÁY' | 'THANG CUỐN' | 'THANG MÁY' | 'NHÀ VỆ SINH' | 'PHÒNG BƠM';
  equipment: string;
  assetTag: string;
  location: string;
  readings: string;
  condition: 'BÌNH THƯỜNG' | 'CẦN BẢO TRÌ' | 'SỰ CỐ KHẨN CẤP';
  actionRequired: string;
  priority: 'CAO' | 'TRUNG BÌNH' | 'THẤP';
  syncedToSheets?: boolean;
}

interface LiveFieldVoiceLoggerProps {
  hasWorkspaceToken: boolean;
  onRequireAuth: () => void;
  engineerName?: string;
}

export const LiveFieldVoiceLogger: React.FC<LiveFieldVoiceLoggerProps> = ({
  hasWorkspaceToken,
  onRequireAuth,
  engineerName = 'KS. Nguyễn Văn Hậu'
}) => {
  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string | null>(null);
  const [activeSpreadsheetUrl, setActiveSpreadsheetUrl] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  // Conversation history
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'model'; text: string; time: string }>>([
    {
      role: 'model',
      text: `Xin chào ${engineerName}! Tôi là Trợ lý AI Live Field Voice. Hãy nhấn nút Micro và nói tự nhiên về hiện trạng thiết bị hoặc phòng máy bạn đang kiểm tra. Tôi sẽ trò chuyện, tư vấn kỹ thuật và tự động ghi log vào Google Sheets cho bạn.`,
      time: '21:28'
    }
  ]);

  // Field logs list
  const [fieldLogs, setFieldLogs] = useState<FieldLogItem[]>([
    {
      logId: 'LOG-LIVE-001',
      timestamp: '2026-09-24 21:15',
      engineer: engineerName,
      category: 'TỦ ĐIỆN',
      equipment: 'Tủ điện hạ thế tổng MDB-A01',
      assetTag: 'MDB-A01',
      location: 'Phòng E-101 (Tầng 1)',
      readings: 'Nhiệt độ thanh cái 38.2°C, dòng tải 1850A, không phát hiện phóng điện cục bộ',
      condition: 'BÌNH THƯỜNG',
      actionRequired: 'Duy trì chế độ giám sát ca đêm',
      priority: 'TRUNG BÌNH',
      syncedToSheets: true
    },
    {
      logId: 'LOG-LIVE-002',
      timestamp: '2026-09-24 21:22',
      engineer: engineerName,
      category: 'PHÒNG BƠM',
      equipment: 'Máy bơm chữa cháy chính Diesel FP-01',
      assetTag: 'FP-01',
      location: 'Trạm bơm PR-01 (Basement B1)',
      readings: 'Áp lực đầu đẩy 11.2 bar, ắc quy khởi động 26.4V. Phát hiện rỉ sét nhẹ ở bích van hút số 2',
      condition: 'CẦN BẢO TRÌ',
      actionRequired: 'Cạo rỉ và sơn phủ epoxy chống ăn mòn trong tuần tới',
      priority: 'CAO',
      syncedToSheets: true
    }
  ]);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize Web Speech API for real-time Vietnamese voice transcription
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpeechTranscript(transcript);
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isProcessing]);

  // Toggle microphone listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setSpeechTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  // Process live conversation & auto log extraction
  const handleProcessInput = async (textToSend: string) => {
    if (!textToSend.trim() || isProcessing) return;

    const userMessage = textToSend.trim();
    setInputText('');
    setSpeechTranscript('');

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setConversation(prev => [...prev, { role: 'user', text: userMessage, time: timeNow }]);
    setIsProcessing(true);

    try {
      // Call server endpoint
      const res = await fetch('/api/gemini/live-field-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speechInput: userMessage,
          engineerName,
          conversationHistory: conversation.slice(-4)
        })
      });

      const data = await res.json();
      const botReply = data.voiceReply || 'Đã ghi nhận thông tin kiểm tra hiện trường.';

      setConversation(prev => [
        ...prev,
        {
          role: 'model',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Automatically speak reply back to field engineer
      speakTTS(botReply);

      // If structured logRecord was extracted, add to field logs and auto-sync to Google Sheets!
      if (data.logRecord) {
        const newLog: FieldLogItem = {
          logId: `LOG-LIVE-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
          engineer: engineerName,
          category: data.logRecord.category || 'PHÒNG MÁY',
          equipment: data.logRecord.equipment || 'Thiết bị kiểm tra',
          assetTag: data.logRecord.assetTag || 'TAG-CHƯA-RÕ',
          location: data.logRecord.location || 'Khu vực hiện trường',
          readings: data.logRecord.readings || userMessage,
          condition: data.logRecord.condition || 'BÌNH THƯỜNG',
          actionRequired: data.logRecord.actionRequired || 'Theo dõi vận hành định kỳ',
          priority: data.logRecord.priority || 'TRUNG BÌNH',
          syncedToSheets: false
        };

        setFieldLogs(prev => [newLog, ...prev]);

        // Auto append to Google Sheets if spreadsheet active and user signed in
        if (hasWorkspaceToken && activeSpreadsheetId) {
          try {
            await appendLiveFieldLogToSheet(activeSpreadsheetId, newLog);
            newLog.syncedToSheets = true;
          } catch (sheetErr) {
            console.warn('Auto-append sheet error:', sheetErr);
          }
        }
      }
    } catch (err) {
      console.error('Field extract error:', err);
      setConversation(prev => [
        ...prev,
        {
          role: 'model',
          text: 'Xin lỗi, không thể kết nối hệ thống AI. Vui lòng thử lại.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Speak via Gemini TTS
  const speakTTS = async (text: string) => {
    setIsSpeakingVoice(true);
    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), voice: 'Puck' })
      });
      const data = await res.json();
      if (data.audioData) {
        await playBase64Audio(data.audioData, data.sampleRate || 24000);
      }
    } catch (e) {
      console.warn('TTS playback error:', e);
    } finally {
      setIsSpeakingVoice(false);
    }
  };

  // Generate the 3 Field Inspection Google Sheet Templates with confirmation
  const handleGenerateSheetTemplates = () => {
    if (!hasWorkspaceToken) {
      onRequireAuth();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Tự Động Sinh Mẫu Google Sheets Nhật Ký Hiện Trường?',
      message: `Hệ thống sẽ tạo một bảng tính Google Sheets chuyên dụng gồm 3 Mẫu Kỹ Thuật:
1. MAU_LOG_HIEN_TRUONG (Nhật ký hiện trường tự động cập nhật)
2. THEO_DOI_SU_CO_BAO_TRI (Bảng theo dõi sự cố & phụ tùng thay thế)
3. NGHIEM_THU_VAN_HANH_MEP (Biên bản nghiệm thu kỹ thuật)`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsCreatingTemplate(true);
        try {
          const res = await createFieldInspectionSpreadsheetWithTemplates(
            `TSN_NhatKy_HienTruong_Live_${new Date().toISOString().slice(0, 10)}`
          );
          setActiveSpreadsheetId(res.spreadsheetId);
          setActiveSpreadsheetUrl(res.url);

          // Mark current logs as synced
          setFieldLogs(prev => prev.map(l => ({ ...l, syncedToSheets: true })));
        } catch (err: any) {
          alert(`Lỗi sinh mẫu Sheet: ${err.message}`);
        } finally {
          setIsCreatingTemplate(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 flex items-center justify-center">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Gemini Trò Chuyện & Ghi Log Hiện Trường Tự Động
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                LIVE VOICE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Trò chuyện trực tiếp bằng giọng nói ngoài công trường. AI tự động trích xuất thông số, đánh giá tình trạng và tự động cập nhật vào Google Sheets.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSpreadsheetUrl ? (
            <a
              href={activeSpreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Mở Mẫu Google Sheets Đã Sinh</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              onClick={handleGenerateSheetTemplates}
              disabled={isCreatingTemplate}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition disabled:opacity-60"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isCreatingTemplate ? 'Đang Khởi Tạo Mẫu...' : 'Sinh Mẫu Google Sheets Tự Động (3 Mẫu)'}</span>
            </button>
          )}

          {isSpeakingVoice && (
            <button
              onClick={stopAudio}
              className="p-2 bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              title="Dừng âm thanh"
            >
              <VolumeX className="w-4 h-4" />
              <span>Dừng Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Live Voice Chat on Left + Auto-Logged Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Interactive Voice Conversation (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[680px] overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Hội Thoại Hiện Trường (Live Voice)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{engineerName}</span>
          </div>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800 text-rose-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? 'KS' : <Radio className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[9px] text-slate-400 text-right opacity-80">{msg.time}</div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-rose-400 flex items-center justify-center border border-slate-700">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
                  <span>Gemini đang lắng nghe và trích xuất nhật ký kỹ thuật...</span>
                </div>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          {/* Voice Input & Interactive Controls */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 space-y-2">
            {/* Realtime voice wave status */}
            {isListening && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-rose-400 animate-bounce" />
                  <span>Đang nghe giọng nói của bạn... Hãy nói về thiết bị hiện trường!</span>
                </div>
                <span className="text-[10px] font-mono">vi-VN</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl flex items-center justify-center transition shadow-lg ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/40 ring-4 ring-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={isListening ? 'Dừng ghi âm' : 'Bật Micro để nói chuyện'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-rose-400" />}
              </button>

              <input
                type="text"
                placeholder={
                  isListening
                    ? 'Đang nhận diện giọng nói...'
                    : 'Nói hoặc gõ: "Kiểm tra tủ MDB-A01, nhiệt độ 38 độ C, áp lực 11 bar..."'
                }
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleProcessInput(inputText);
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />

              <button
                onClick={() => handleProcessInput(inputText)}
                disabled={!inputText.trim() || isProcessing}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Auto-Updated Field Log & Auto-Sheet Sync (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 flex flex-col justify-between h-[680px]">
          <div>
            {/* Header & Status */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Nhật Ký Hiện Trường Tự Động Trích Xuất ({fieldLogs.length} logs)
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Auto-Synced
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dữ liệu tự động cập nhật ngay khi bạn nói xong mà không cần nhập tay.
                </p>
              </div>

              {activeSpreadsheetUrl && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Sheets Đang Kết Nối</span>
                </div>
              )}
            </div>

            {/* List of Extracted Field Logs */}
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {fieldLogs.map(log => (
                <div
                  key={log.logId}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{log.equipment}</span>
                        <span className="font-mono font-bold text-indigo-300 text-xs">[{log.assetTag}]</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                          {log.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        <span>{log.location}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.condition === 'BÌNH THƯỜNG'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : log.condition === 'CẦN BẢO TRÌ'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {log.condition}
                    </span>
                  </div>

                  {/* Readings & Actions */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                    <div className="text-slate-300">
                      <span className="text-slate-400 font-medium">Số liệu đo kiểm: </span>
                      {log.readings}
                    </div>
                    <div className="text-sky-300">
                      <span className="text-slate-400 font-medium">Đề xuất xử lý: </span>
                      {log.actionRequired}
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[11px]">
                    <span className="text-slate-400">
                      Kỹ sư: <span className="text-slate-200 font-medium">{log.engineer}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 text-[10px] font-semibold">Ưu tiên: {log.priority}</span>
                      <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Đã ghi nhận
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info bar */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Mẹo: Kỹ sư có thể nói bằng giọng nói tự nhiên, không cần đọc từng trường.</span>
            <button
              onClick={() => {
                const sampleText =
                  'Tôi đang kiểm tra thang cuốn ES-01 tại Sảnh Đến. Tay vịn chuyển động êm ái, nhưng phát hiện bậc thang số 14 có vết xước nhẹ, đề xuất đánh bóng làm phẳng.';
                handleProcessInput(sampleText);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Nạp câu nói mẫu thử
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
