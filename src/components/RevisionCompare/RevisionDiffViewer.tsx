/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GitCompare, ArrowRight, CheckCircle2, Plus, Minus, Move, Layers, AlertCircle, FileText } from 'lucide-react';

interface RevisionDiffViewerProps {
  drawingTitle: string;
}

export const RevisionDiffViewer: React.FC<RevisionDiffViewerProps> = ({ drawingTitle }) => {
  const [baseRev, setBaseRev] = useState('Rev.02');
  const [targetRev, setTargetRev] = useState('Rev.03');

  const diffItems = [
    {
      type: 'QUANTITY_DELTA',
      item: 'Máng cáp điện tôn mạ kẽm E-TRAY-400',
      oldValue: '34.5 m (Rev.02)',
      newValue: '35.5 m (Rev.03)',
      delta: '+1.0 m',
      impact: 'Mở rộng tuyến cáp cấp cho tủ chiếu sáng mới',
      layer: 'E-CABLE-TRAY-400'
    },
    {
      type: 'MOVE',
      item: 'Tủ chiếu sáng DB-LIGHT-01',
      oldValue: 'X=18200, Y=21500',
      newValue: 'X=19000, Y=22000',
      delta: 'Dịch chuyển 943 mm',
      impact: 'Tránh xung đột (Clash) với trục cấp gió tươi AHU',
      layer: 'E-PANEL-DB'
    },
    {
      type: 'SPEC_CHANGE',
      item: 'Bộ xử lý không khí AHU-02',
      oldValue: '25,000 m³/h',
      newValue: '28,000 m³/h',
      delta: '+3,000 m³/h',
      impact: 'Bổ sung tải lạnh khu vực sảnh mở rộng',
      layer: 'M-HVAC-AHU'
    },
    {
      type: 'ADD',
      item: 'Van xả tràn chữa cháy Deluge Valve DV-02',
      oldValue: 'Chưa có',
      newValue: 'Đã bổ sung (Handle: 7E95)',
      delta: '+1 PCS',
      impact: 'Tuân thủ thẩm duyệt thiết kế PCCC bổ sung',
      layer: 'FP-VALVE-DELUGE'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              So sánh Sai khác Phiên bản Bản vẽ (Revision Diff Engine)
            </h2>
            <p className="text-xs text-slate-400">
              Đối chiếu thay đổi giữa các phiên bản thiết kế: dịch chuyển tọa độ, tăng giảm khối lượng, thay đổi thông số.
            </p>
          </div>
        </div>

        {/* Revision Selectors */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-semibold">
            <span>Gốc:</span>
            <select
              value={baseRev}
              onChange={e => setBaseRev(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="Rev.01" className="bg-slate-900">Rev.01</option>
              <option value="Rev.02" className="bg-slate-900">Rev.02</option>
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-purple-400" />

          <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 rounded-lg text-white font-semibold shadow">
            <span>Đích:</span>
            <select
              value={targetRev}
              onChange={e => setTargetRev(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="Rev.02" className="bg-slate-900">Rev.02</option>
              <option value="Rev.03" className="bg-slate-900">Rev.03</option>
            </select>
          </div>
        </div>
      </div>

      {/* Difference Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Chi tiết 4 Biến động giữa {baseRev} và {targetRev}
          </span>
          <span className="text-xs text-indigo-400 font-medium">{drawingTitle}</span>
        </div>

        <div className="divide-y divide-slate-800">
          {diffItems.map((diff, index) => (
            <div key={index} className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-purple-400 shrink-0 mt-0.5">
                  {diff.type === 'MOVE' ? (
                    <Move className="w-4 h-4 text-sky-400" />
                  ) : diff.type === 'QUANTITY_DELTA' ? (
                    <GitCompare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{diff.item}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      {diff.layer}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">{diff.impact}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 self-end md:self-auto font-mono">
                <div className="text-right">
                  <div className="text-slate-500 text-[10px]">{baseRev}</div>
                  <div className="text-slate-400 line-through">{diff.oldValue}</div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600" />

                <div className="text-right">
                  <div className="text-indigo-400 text-[10px] font-bold">{targetRev}</div>
                  <div className="text-emerald-400 font-bold">{diff.newValue}</div>
                </div>

                <div className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                  {diff.delta}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
