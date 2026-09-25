/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle, X, Check } from 'lucide-react';
import { Asset, QuantityItem } from '../../types';

interface ReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveItem: (id: string) => void;
}

export const ReviewQueueModal: React.FC<ReviewQueueModalProps> = ({
  isOpen,
  onClose,
  onApproveItem
}) => {
  if (!isOpen) return null;

  const reviewItems = [
    {
      id: 'REV-01',
      title: 'Xác nhận tọa độ thiết bị Chiller CH-01',
      type: 'COORDINATE_VERIFICATION',
      location: 'Basement B1 - PR-01',
      details: 'Tọa độ X=18500, Y=31000 mm đã đối chiếu giữa bản vẽ kiến trúc và bản vẽ cơ điện M-02. Cần kỹ sư MEP trưởng ký xác nhận.',
      severity: 'HIGH',
      confidence: '99%'
    },
    {
      id: 'REV-02',
      title: 'Kiểm tra khớp nối cáp tuyến E-TRAY-400',
      type: 'TAKEOFF_QUANTITY',
      location: 'Tầng 1 - Zone A',
      details: 'Khối lượng 34.5m tính từ polyline CAD. Đoạn giao cắt với ống gió cấp AHU có cao độ Z chênh lệch 400mm (An toàn, không va chạm).',
      severity: 'MEDIUM',
      confidence: '97%'
    },
    {
      id: 'REV-03',
      title: 'Phát hiện mã nhãn mác Nameplate mới tại Sảnh Đến',
      type: 'PHOTO_OCR_MATCH',
      location: 'Tầng 1 - Sảnh A',
      details: 'Ảnh hiện trường phát hiện tem thiết bị ES-01 có thông số 0.5m/s phù hợp với hồ sơ thang cuốn Otis 510NPE.',
      severity: 'LOW',
      confidence: '99%'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hàng đợi Phê duyệt QA/QC & Human-in-the-Loop</h3>
              <p className="text-xs text-slate-400">
                Các hạng mục quan trọng đòi hỏi kỹ sư xác nhận trước khi nghiệm thu thanh toán hoặc cập nhật hồ sơ as-built.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {reviewItems.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>{item.title}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {item.id}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.severity === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  Ưu tiên: {item.severity}
                </span>
              </div>

              <div className="text-slate-300 leading-relaxed">{item.details}</div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[11px]">
                <span className="text-slate-400">Vị trí: <span className="text-slate-200">{item.location}</span></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onApproveItem(item.id);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Phê duyệt (Verify)</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
