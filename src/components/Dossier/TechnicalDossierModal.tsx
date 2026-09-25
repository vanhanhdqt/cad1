/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  X,
  Printer,
  Download,
  ShieldCheck,
  MapPin,
  Wrench,
  Calendar,
  Volume2,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { Asset } from '../../types';
import { playBase64Audio } from '../../services/audioPlayer';

interface TechnicalDossierModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToDrive?: (fileName: string, content: string) => void;
}

export const TechnicalDossierModal: React.FC<TechnicalDossierModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSaveToDrive
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen || !asset) return null;

  const handleTTSVoice = async () => {
    setIsPlaying(true);
    try {
      const text = `Hồ sơ kỹ thuật số One-Click Dossier cho thiết bị ${asset.assetTag}. Thiết bị: ${asset.assetName}. Hệ thống: ${asset.system}. Lắp đặt tại: ${asset.room}. Tọa độ CAD: X ${asset.cadCoordinates.x} mm, Y ${asset.cadCoordinates.y} mm. Bản vẽ nguồn: ${asset.sourceDrawing}, phiên bản ${asset.sourceRevision}. Toàn bộ thông số kỹ thuật đã được kỹ sư kiểm tra và nghiệm thu As-built.`;
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
      console.error('Audio briefing error:', err);
    } finally {
      setIsPlaying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                One-Click Technical Dossier (Hồ sơ Kỹ thuật Số Hóa)
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {asset.assetTag} - {asset.assetName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTTSVoice}
              disabled={isPlaying}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Đọc toàn bộ hồ sơ (Gemini TTS)"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isPlaying ? 'Đang đọc...' : 'Audio Voice'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="In / Lưu PDF"
            >
              <Printer className="w-4 h-4" />
              <span>In PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Core Dossier Body */}
        <div className="space-y-4 text-xs">
          {/* Identity & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Mã thiết bị (Tag)</div>
              <div className="text-white font-bold text-sm">{asset.assetTag}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Hệ thống</div>
              <div className="text-indigo-400 font-semibold">{asset.system}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Mức độ quan trọng</div>
              <div className="text-amber-400 font-semibold">{asset.criticality}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Trạng thái vận hành</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {asset.status}
              </div>
            </div>
          </div>

          {/* Spatial Coordinates & Drawing Reference */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Định vị Tọa độ Không gian & Nguồn Bản vẽ (Traceability)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-slate-400">Vị trí phòng: <span className="text-white font-medium">{asset.room}</span></div>
                <div className="text-slate-400">Tầng & Phân khu: <span className="text-white font-medium">{asset.floor} - {asset.zone}</span></div>
                <div className="text-slate-400">Bản vẽ nguồn: <span className="text-indigo-300 font-medium">{asset.sourceDrawing}</span></div>
                <div className="text-slate-400">Phiên bản As-built: <span className="text-emerald-400 font-medium">{asset.sourceRevision}</span></div>
              </div>
              <div className="font-mono text-slate-300 space-y-0.5 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div>X: {asset.cadCoordinates.x.toLocaleString()} mm</div>
                <div>Y: {asset.cadCoordinates.y.toLocaleString()} mm</div>
                <div>Z: {asset.cadCoordinates.z || 0} mm</div>
                <div className="text-[11px] text-amber-300">CAD Handle: #{asset.cadCoordinates.sourceHandle}</div>
                <div className="text-[10px] text-slate-500">Hệ quy chiếu: {asset.cadCoordinates.coordinateSystem}</div>
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Thông số Kỹ thuật Nghiệm thu</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {asset.specs.map(s => (
                <div key={s.specId} className="py-2 flex items-center justify-between">
                  <span className="text-slate-300">{s.parameter}</span>
                  <span className="font-mono font-bold text-sky-400">
                    {s.value} {s.unit || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification & Quality Sign-off */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-400">Kỹ sư nghiệm thu: </span>
              <span className="text-white font-semibold">{asset.verifiedBy || 'Đã kiểm tra qua CAD'}</span>
            </div>
            <div>
              <span className="text-slate-400">Thời gian cập nhật: </span>
              <span className="text-slate-300">{asset.lastVerifiedAt || 'Hôm nay'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Đóng
          </button>
          {onSaveToDrive && (
            <button
              onClick={() => {
                const textContent = `HỒ SƠ THIẾT BỊ (TECHNICAL DOSSIER)\nMã: ${asset.assetTag}\nTên: ${asset.assetName}\nVị trí: ${asset.room}\nTọa độ CAD: X=${asset.cadCoordinates.x}, Y=${asset.cadCoordinates.y}\nBản vẽ: ${asset.sourceDrawing} (${asset.sourceRevision})\nKỹ sư nghiệm thu: ${asset.verifiedBy}`;
                onSaveToDrive(`Dossier_${asset.assetTag}.txt`, textContent);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              <HardDrive className="w-4 h-4" />
              <span>Lưu Hồ sơ vào Google Drive</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
