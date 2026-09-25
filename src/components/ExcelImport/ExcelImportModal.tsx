/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Table,
  Check,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Asset } from '../../types';
import { parseEquipmentXLSX, downloadSampleEquipmentXLSX } from '../../services/excelService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedAssets: Asset[], mode: 'APPEND' | 'REPLACE') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const assets = await parseEquipmentXLSX(file);
      if (assets.length === 0) {
        setErrorMsg('File Excel không có dữ liệu hoặc không đọc được các cột thiết bị.');
      } else {
        setParsedPreview(assets);
      }
    } catch (err: any) {
      console.error('XLSX parse error:', err);
      setErrorMsg(`Lỗi đọc file Excel: ${err.message || 'Không đúng định dạng XLSX'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportSuccess(parsedPreview, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Import File Excel (.xlsx) Dữ Liệu Thiết Bị & Phòng Máy
              </h3>
              <p className="text-xs text-slate-400">
                Tải lên file bảng tính chứa danh mục thiết bị, tủ điện, thang máy/cuốn, WC, phòng máy, phòng bơm kèm tọa độ CAD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleEquipmentXLSX}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Tải mẫu file Excel chuẩn .xlsx"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Mẫu Excel Chuẩn (.xlsx)</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Dropzone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-950/40 space-y-3"
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Chạm để chọn hoặc kéo thả file Excel (.xlsx, .xls) vào đây</div>
              <p className="text-xs text-slate-400 mt-1">
                Tự động nhận diện các cột: Mã Tag, Tên thiết bị, Phân loại, Tầng, Phòng, Tọa độ CAD X, Y (mm), Hãng SX...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-white">{selectedFile.name}</span>
                <span className="text-slate-400 ml-2">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setParsedPreview([]);
                setErrorMsg(null);
              }}
              className="text-slate-400 hover:text-rose-400 font-semibold"
            >
              Chọn file khác
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Đang đọc và phân tích cấu trúc dữ liệu Excel...</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview Table */}
        {parsedPreview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã đọc thành công {parsedPreview.length} thiết bị từ file Excel</span>
                </span>
              </div>

              {/* Import Mode: Append or Replace */}
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium">Chế độ nhập:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="APPEND"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="accent-indigo-500"
                  />
                  <span>Thêm mới vào danh sách (Append)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer ml-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="REPLACE"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                    className="accent-indigo-500"
                  />
                  <span className="text-amber-300">Ghi đè toàn bộ (Replace)</span>
                </label>
              </div>
            </div>

            {/* Scrollable Preview Table */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Mã Tag</th>
                    <th className="py-2.5 px-3">Tên Thiết Bị</th>
                    <th className="py-2.5 px-3">Phân Loại</th>
                    <th className="py-2.5 px-3">Vị Trí Phòng</th>
                    <th className="py-2.5 px-3 font-mono">Tọa Độ CAD (X, Y mm)</th>
                    <th className="py-2.5 px-3">Hãng SX & Model</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-200">
                  {parsedPreview.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-900/60">
                      <td className="py-2 px-3 font-bold font-mono text-indigo-300">{item.assetTag}</td>
                      <td className="py-2 px-3 font-medium text-white max-w-xs truncate">{item.assetName}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                          {item.assetType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{item.room}</td>
                      <td className="py-2 px-3 font-mono text-sky-400">
                        X={item.cadCoordinates.x.toLocaleString()}, Y={item.cadCoordinates.y.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {item.manufacturer} - {item.model}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Đóng
          </button>

          {parsedPreview.length > 0 && (
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận Nhập {parsedPreview.length} Thiết Bị Vào Hệ Thống</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
