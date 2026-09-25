/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Tag,
  Wrench,
  Calendar,
  Volume2,
  FileText,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { Asset, SystemDiscipline } from '../../types';
import { playBase64Audio } from '../../services/audioPlayer';
import { FileSpreadsheet } from 'lucide-react';

interface AssetRegistryProps {
  assets: Asset[];
  onSelectAssetForCAD: (asset: Asset) => void;
  onOpenDossier: (asset: Asset) => void;
  onScheduleCalendar: (asset: Asset) => void;
  onOpenExcelImport?: () => void;
}

export const AssetRegistry: React.FC<AssetRegistryProps> = ({
  assets,
  onSelectAssetForCAD,
  onOpenDossier,
  onScheduleCalendar,
  onOpenExcelImport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets[0] || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const filteredAssets = assets.filter(a => {
    if (selectedSystem !== 'ALL' && a.system !== selectedSystem) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.assetTag.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        a.manufacturer.toLowerCase().includes(q) ||
        a.room.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTTSVoice = async (asset: Asset) => {
    setIsPlayingAudio(true);
    try {
      const specsSummary = asset.specs.map(s => `${s.parameter}: ${s.value} ${s.unit || ''}`).join('. ');
      const text = `Hồ sơ kỹ thuật số Digital Twin thiết bị ${asset.assetTag}. Tên thiết bị: ${asset.assetName}. Hãng sản xuất: ${asset.manufacturer}. Vị trí lắp đặt tại ${asset.room}, tầng ${asset.floor}. Tọa độ CAD: X bằng ${asset.cadCoordinates.x} mm, Y bằng ${asset.cadCoordinates.y} mm. Các thông số chính gồm có: ${specsSummary}. Trạng thái vận hành hiện tại: ${asset.status}.`;

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
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Cơ sở Dữ liệu Hồ sơ Thiết bị & Digital Twin MEP
            </h2>
            <p className="text-xs text-slate-400">
              Quản lý danh mục tài sản, vị trí CAD 3D, thông số kỹ thuật (nameplate/datasheet), lịch sử bảo trì và xuất One-Click Technical Dossier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {onOpenExcelImport && (
            <button
              onClick={onOpenExcelImport}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition whitespace-nowrap"
              title="Import file Excel (.xlsx) danh mục thiết bị"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel (.xlsx)</span>
            </button>
          )}

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tag, model, phòng..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Container: Asset List + Asset Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Asset List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Discipline Selector */}
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'ELECTRICAL', 'HVAC', 'FIRE_PROTECTION', 'ARCHITECTURE'].map(sys => (
              <button
                key={sys}
                onClick={() => setSelectedSystem(sys)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedSystem === sys
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sys === 'ALL' ? 'Tất cả' : sys.slice(0, 4)}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 max-h-[660px] overflow-y-auto pr-1">
            {filteredAssets.map(asset => {
              const isSelected = selectedAsset?.assetId === asset.assetId;

              return (
                <div
                  key={asset.assetId}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm tracking-tight">
                          {asset.assetTag}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-700 text-indigo-300">
                          {asset.assetType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                        {asset.assetName}
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {asset.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <div className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span>{asset.room}</span>
                    </div>
                    <span className="font-mono text-indigo-300 font-medium">
                      Handle: {asset.cadCoordinates.sourceHandle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Asset Digital Twin Profile */}
        <div className="lg:col-span-7">
          {selectedAsset ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Asset Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {selectedAsset.assetTag}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedAsset.system}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{selectedAsset.assetName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTTSVoice(selectedAsset)}
                    disabled={isPlayingAudio}
                    title="Nghe hồ sơ bằng giọng đọc Gemini TTS"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isPlayingAudio ? 'Đang đọc...' : 'Nghe Audio'}</span>
                  </button>

                  <button
                    onClick={() => onOpenDossier(selectedAsset)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Xuất Hồ sơ Kỹ thuật (Dossier)</span>
                  </button>
                </div>
              </div>

              {/* Spatial Location & CAD Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Vị trí không gian CAD</span>
                  </div>
                  <div className="text-white font-semibold text-xs">{selectedAsset.room}</div>
                  <div className="text-[11px] text-slate-400">{selectedAsset.floor} - {selectedAsset.zone}</div>
                  <div className="text-[11px] font-mono text-sky-300 pt-1">
                    X: {selectedAsset.cadCoordinates.x} mm | Y: {selectedAsset.cadCoordinates.y} mm
                  </div>
                  <button
                    onClick={() => onSelectAssetForCAD(selectedAsset)}
                    className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Xem định vị trên bản vẽ CAD</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thông tin Nhà sản xuất & Mẫu mã</span>
                  </div>
                  <div className="text-white font-semibold text-xs">{selectedAsset.manufacturer}</div>
                  <div className="text-[11px] text-slate-400">Dòng máy (Model): {selectedAsset.model}</div>
                  <div className="text-[11px] text-slate-400">Số serial: {selectedAsset.serialNumber || 'Đang cập nhật'}</div>
                  <div className="text-[11px] text-emerald-400 pt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Xác nhận: {selectedAsset.verifiedBy}</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Table */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                  Bảng Thông số Kỹ thuật Thực tế (Technical Specifications)
                </div>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Thông số</th>
                        <th className="py-2.5 px-3">Giá trị</th>
                        <th className="py-2.5 px-3">Tài liệu nguồn</th>
                        <th className="py-2.5 px-3 text-center">Độ tin cậy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {selectedAsset.specs.map(spec => (
                        <tr key={spec.specId}>
                          <td className="py-2 px-3 font-medium text-slate-300">{spec.parameter}</td>
                          <td className="py-2 px-3 font-bold text-sky-400 font-mono">
                            {spec.value} {spec.unit || ''}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{spec.sourceDoc}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-400 font-semibold">
                            {Math.round(spec.confidence * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Maintenance & Inspection History */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Lịch sử Kiểm định & Bảo trì (Lifecycle Timeline)
                  </div>
                  <button
                    onClick={() => onScheduleCalendar(selectedAsset)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lên lịch Bảo trì (Google Calendar)</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedAsset.inspectionHistory.map(log => (
                    <div
                      key={log.logId}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-3"
                    >
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.action}</span>
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          <span className="text-[10px] text-slate-400">• Bởi {log.user}</span>
                        </div>
                        <p className="text-slate-300 mt-1 leading-relaxed">{log.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Chọn một thiết bị từ danh sách bên trái để hiển thị hồ sơ Digital Twin chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
