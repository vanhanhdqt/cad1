/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Tag,
  MapPin,
  Compass,
  Volume2,
  RefreshCw,
  ShieldCheck,
  Building,
  Zap
} from 'lucide-react';
import { Asset, PhotoAnalysisResult, PhotoMatchCandidate } from '../../types';
import { playBase64Audio } from '../../services/audioPlayer';

interface PhotoAssetMatcherProps {
  assets: Asset[];
  onConfirmMatch: (asset: Asset, photoUrl: string, analysisSummary: string) => void;
  onNavigateToCAD: (asset: Asset) => void;
}

export const PhotoAssetMatcher: React.FC<PhotoAssetMatcherProps> = ({
  assets,
  onConfirmMatch,
  onNavigateToCAD
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<PhotoMatchCandidate | null>(null);

  // Handle Photo capture / file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      analyzePhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Preset sample photo simulation for quick testing
  const handleSamplePhoto = (sampleType: 'MDB' | 'AHU' | 'PUMP') => {
    // Generate clean canvas representations with real nameplate text
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = sampleType === 'MDB' ? '#1e293b' : sampleType === 'AHU' ? '#0f172a' : '#18181b';
    ctx.fillRect(0, 0, 640, 480);

    // Draw device body
    ctx.fillStyle = sampleType === 'PUMP' ? '#dc2626' : sampleType === 'MDB' ? '#334155' : '#0284c7';
    ctx.fillRect(80, 80, 480, 320);

    // Draw Nameplate sticker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(160, 160, 320, 160);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(160, 160, 320, 160);

    // Draw Text on Nameplate
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px monospace';
    if (sampleType === 'MDB') {
      ctx.fillText('TAG: MDB-A01', 180, 200);
      ctx.font = '16px monospace';
      ctx.fillText('Schneider PrismaSeT P', 180, 235);
      ctx.fillText('380V - 2500A - 50Hz', 180, 265);
      ctx.fillText('QR: AST:TSN:MDB-A01:E101', 180, 295);
    } else if (sampleType === 'AHU') {
      ctx.fillText('TAG: AHU-02', 180, 200);
      ctx.font = '16px monospace';
      ctx.fillText('Carrier 39HQ Air Handler', 180, 235);
      ctx.fillText('Air Flow: 28,000 m3/h', 180, 265);
      ctx.fillText('Room: AHU-RM-02', 180, 295);
    } else {
      ctx.fillText('TAG: FP-01', 180, 200);
      ctx.font = '16px monospace';
      ctx.fillText('Ebara Fire Pump 150kW', 180, 235);
      ctx.fillText('Head: 110m - 750 GPM', 180, 265);
      ctx.fillText('Room: PR-01 (Basement)', 180, 295);
    }

    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
    analyzePhoto(dataUrl);
  };

  const analyzePhoto = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSelectedCandidate(null);

    const base64Data = dataUrl.split(',')[1] || '';

    try {
      // Call server-side Gemini Vision OCR
      const response = await fetch('/api/gemini/vision-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          prompt: `Phân tích ảnh hiện trường thiết bị MEP. Trích xuất mã tag thiết bị, nhãn mác nameplate, hãng sản xuất, model, và mã QR nếu có. Trả về kết quả trích xuất ngắn gọn.`
        })
      });

      const data = await response.json();
      const extractedText = data.text || '';

      // Match against known assets in the digital twin database
      const candidates: PhotoMatchCandidate[] = [];

      assets.forEach(asset => {
        let score = 0.1;
        const evidence: string[] = [];

        // Check exact tag match
        if (extractedText.includes(asset.assetTag)) {
          score += 0.75;
          evidence.push(`Khớp chính xác mã định danh Tag: ${asset.assetTag}`);
        }

        // Check manufacturer or model
        if (extractedText.toLowerCase().includes(asset.manufacturer.toLowerCase())) {
          score += 0.2;
          evidence.push(`Khớp hãng chế tạo: ${asset.manufacturer}`);
        }
        if (extractedText.toLowerCase().includes(asset.model.toLowerCase())) {
          score += 0.2;
          evidence.push(`Khớp dòng Model: ${asset.model}`);
        }

        // Context / room clues
        if (extractedText.includes(asset.room.slice(0, 5))) {
          score += 0.15;
          evidence.push(`Khớp ngữ cảnh phòng: ${asset.room}`);
        }

        const normalizedScore = Math.min(score, 0.99);

        if (normalizedScore > 0.3) {
          candidates.push({
            asset,
            similarityScore: normalizedScore,
            evidence: evidence.length > 0 ? evidence : ['Đặc trưng hình học và loại thiết bị tương đồng'],
            rank: 0,
            tagOCR: asset.assetTag,
            modelOCR: asset.model
          });
        }
      });

      // Sort candidates descending by similarity score
      candidates.sort((a, b) => b.similarityScore - a.similarityScore);
      candidates.forEach((c, idx) => (c.rank = idx + 1));

      const topResult: PhotoAnalysisResult = {
        photoId: `PHOTO-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        imageUrl: dataUrl,
        ocrDetectedText: [extractedText],
        matchStatus: candidates[0]?.similarityScore > 0.85 ? 'HIGH_CONFIDENCE' : 'CANDIDATE',
        candidates: candidates.slice(0, 3),
        inferredRoom: candidates[0]?.asset.room,
        inferredFloor: candidates[0]?.asset.floor
      };

      setAnalysisResult(topResult);
      if (topResult.candidates.length > 0) {
        setSelectedCandidate(topResult.candidates[0]);
      }
    } catch (err) {
      console.error('Photo analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Gemini TTS voice announcement for field engineer
  const handleTTSVoiceBriefing = async (candidate: PhotoMatchCandidate) => {
    setIsPlayingAudio(true);
    try {
      const textToSpeak = `Đã nhận diện thành công thiết bị ${candidate.asset.assetTag}: ${candidate.asset.assetName}. Thuộc hệ thống ${candidate.asset.system}, vị trí tại ${candidate.asset.room}, tọa độ CAD X ${candidate.asset.cadCoordinates.x} mili-mét, Y ${candidate.asset.cadCoordinates.y} mili-mét. Độ tin cậy đạt ${Math.round(candidate.similarityScore * 100)} phần trăm.`;
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: 'Puck' })
      });
      const data = await res.json();
      if (data.audioData) {
        await playBase64Audio(data.audioData, data.sampleRate || 24000);
      }
    } catch (err) {
      console.error('Audio briefing error:', err);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Photo-to-Asset Matching (Nhận diện Thiết bị Hiện trường)
            </h2>
            <p className="text-xs text-slate-400">
              Chụp ảnh thiết bị / nhãn mác $\rightarrow$ AI OCR & Computer Vision $\rightarrow$ Tự động tìm thiết bị và định vị vị trí CAD chính xác.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition"
          >
            <Camera className="w-4 h-4" />
            <span>Chụp ảnh / Tải ảnh lên</span>
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-[11px] text-slate-400">Mẫu thử nhanh:</span>
            <button
              onClick={() => handleSamplePhoto('MDB')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-medium border border-slate-700"
            >
              Tủ MDB
            </button>
            <button
              onClick={() => handleSamplePhoto('AHU')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-xs font-medium border border-slate-700"
            >
              Máy AHU
            </button>
            <button
              onClick={() => handleSamplePhoto('PUMP')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded text-xs font-medium border border-slate-700"
            >
              Bơm PCCC
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Preview + Candidate Matching Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Image Canvas & OCR Stream */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Ảnh hiện trường ghi nhận
              </span>
              {capturedImage && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Chụp lại (Retake)
                </button>
              )}
            </div>

            {capturedImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-black flex items-center justify-center">
                <img
                  src={capturedImage}
                  alt="Hiện trường thiết bị"
                  className="max-h-full max-w-full object-contain"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <div className="text-xs font-semibold">Gemini Vision đang phân tích Nameplate & QR...</div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/50"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 mb-3 shadow">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-white">Chạm để chụp ảnh hoặc tải ảnh lên</div>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Hỗ trợ chụp biển hiệu Nameplate, tem dán QR Code, tủ điện, động cơ, máy nén hoặc cụm bơm.
                </p>
              </div>
            )}
          </div>

          {/* OCR Stream Output */}
          {analysisResult && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-400" />
                <span>Trích xuất Nameplate OCR (Gemini Vision)</span>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
                {analysisResult.ocrDetectedText[0]}
              </p>
            </div>
          )}
        </div>

        {/* Right: Candidate Rankings & Action Verification */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Kết quả Đối sánh Thiết bị (Candidate Ranking)
                </span>
                <p className="text-[11px] text-slate-400">
                  Xếp hạng theo độ khớp mã tag, thông số trên mác máy và vị trí không gian.
                </p>
              </div>
              {analysisResult && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  {analysisResult.matchStatus}
                </span>
              )}
            </div>

            {analysisResult && analysisResult.candidates.length > 0 ? (
              <div className="space-y-3">
                {analysisResult.candidates.map(candidate => {
                  const isSelected = selectedCandidate?.asset.assetId === candidate.asset.assetId;

                  return (
                    <div
                      key={candidate.asset.assetId}
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/50'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              candidate.rank === 1
                                ? 'bg-amber-400 text-slate-900'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            #{candidate.rank}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{candidate.asset.assetTag}</span>
                              <span className="text-xs font-normal text-slate-400">
                                ({candidate.asset.assetName})
                              </span>
                            </div>
                            <div className="text-[11px] text-indigo-300">
                              {candidate.asset.manufacturer} - {candidate.asset.model}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-400 font-mono">
                            {Math.round(candidate.similarityScore * 100)}% Khớp
                          </div>
                          <div className="text-[10px] text-slate-400">Độ tin cậy</div>
                        </div>
                      </div>

                      {/* Evidence Chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {candidate.evidence.map((ev, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {ev}
                          </span>
                        ))}
                      </div>

                      {/* CAD Location Coordinates */}
                      <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                        <div>
                          <span className="text-slate-400">Tọa độ CAD: </span>
                          <span className="text-sky-300 font-semibold">
                            X={candidate.asset.cadCoordinates.x}, Y={candidate.asset.cadCoordinates.y} mm
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Vị trí: </span>
                          <span className="text-white font-medium">{candidate.asset.room}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                <Compass className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                Chụp ảnh thiết bị hoặc chọn một mẫu thử để hệ thống bắt đầu quy trình đối chiếu.
              </div>
            )}
          </div>

          {/* Action Bar for Confirmed Asset */}
          {selectedCandidate && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleTTSVoiceBriefing(selectedCandidate)}
                disabled={isPlayingAudio}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingAudio ? 'Đang đọc báo cáo...' : 'Nghe tóm tắt Voice (Gemini TTS)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToCAD(selectedCandidate.asset)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>Xem trên Mặt bằng CAD</span>
                </button>

                <button
                  onClick={() =>
                    onConfirmMatch(
                      selectedCandidate.asset,
                      capturedImage || '',
                      analysisResult?.ocrDetectedText[0] || ''
                    )
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác nhận Thiết bị & Cập nhật Digital Twin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
