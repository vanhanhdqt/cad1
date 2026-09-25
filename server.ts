/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize GoogleGenAI SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// System Prompt for CAD/MEP & Digital Twin
const CAD_MEP_SYSTEM_INSTRUCTION = `Bạn là Principal CAD/MEP Automation Architect, BIM/CAD Engineer, Computer Vision Engineer, Quantity Surveyor và Facility Management (FM/CMMS) Lead.
Nhiệm vụ của bạn là hỗ trợ kỹ sư và ban quản lý dự án bóc tách khối lượng (BOQ), phân tích bản vẽ CAD/PDF/BIM, định vị thiết bị trên mặt bằng (tọa độ CAD, hệ VN2000, grid, tầng, phòng), nhận diện thiết bị từ ảnh hiện trường (nameplate OCR, QR, context) và liên kết Google Workspace (Drive, Sheets, Docs, Gmail, Calendar).
Quy tắc tối thượng:
1. TRACEABILITY & SOURCE OF TRUTH: Mọi số liệu đo bóc và thông số kỹ thuật phải dẫn chiếu nguồn (bản vẽ, revision, layer, handle CAD, datasheet).
2. Tuyệt đối không suy diễn kích thước nếu đã có dữ liệu hình học vector.
3. Nếu thông tin chưa đủ chứng cứ: Đánh dấu rõ "NEED_REVIEW".
4. Luôn phản hồi bằng tiếng Việt chuẩn mực, chi tiết, chuyên môn kỹ thuật cao, kèm bảng biểu hoặc danh sách có cấu trúc.`;

/**
 * 1. Gemini Multi-Turn Chat
 */
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, model = 'gemini-3.5-flash', systemInstruction } = req.body;

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || m.content || '' }]
    }));

    const response = await ai.models.generateContent({
      model: model, // 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'
      contents,
      config: {
        systemInstruction: systemInstruction || CAD_MEP_SYSTEM_INSTRUCTION
      }
    });

    const text = response.text || '';
    res.json({ text });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi gọi Gemini Chat' });
  }
});

/**
 * 2. Gemini High Thinking Mode (ThinkingLevel.HIGH with gemini-3.1-pro-preview)
 */
app.post('/api/gemini/thinking-analysis', async (req, res) => {
  try {
    const { prompt } = req.body;

    // Must use gemini-3.1-pro-preview and thinkingLevel: 'HIGH'. Do NOT set maxOutputTokens!
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: CAD_MEP_SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: 'HIGH' as any
        }
      }
    });

    res.json({
      text: response.text || '',
      model: 'gemini-3.1-pro-preview',
      mode: 'THINKING_LEVEL_HIGH'
    });
  } catch (error: any) {
    console.error('Thinking Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi phân tích suy luận chuyên sâu' });
  }
});

/**
 * 3. Text-to-Speech (TTS) with gemini-3.8-flash-tts
 */
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voice = 'Puck' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Nội dung text không được rỗng' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: text.slice(0, 1500) }]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice } // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Không nhận được dữ liệu âm thanh từ gemini-3.8-flash-tts' });
    }

    res.json({
      audioData: base64Audio,
      mimeType: 'audio/wav',
      sampleRate: 24000
    });
  } catch (error: any) {
    console.error('TTS API Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi tổng hợp giọng nói' });
  }
});

/**
 * 4. Google Maps Grounding with gemini-3.5-flash
 */
app.post('/api/gemini/maps-grounding', async (req, res) => {
  try {
    const { query } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: query,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });

    res.json({
      text: response.text || '',
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null
    });
  } catch (error: any) {
    console.error('Maps Grounding Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi tra cứu Google Maps Grounding' });
  }
});

/**
 * 5. Video Analysis with gemini-3.1-pro-preview
 */
app.post('/api/gemini/video-analyze', async (req, res) => {
  try {
    const { videoBase64, mimeType = 'video/mp4', prompt } = req.body;

    if (!videoBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu video' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType
              }
            },
            {
              text: prompt || 'Phân tích video khảo sát hiện trường công trình MEP. Liệt kê các thiết bị xuất hiện, tình trạng hoạt động, biển hiệu nameplate, các dấu hiệu cảnh báo và mốc thời gian (timestamps) xuất hiện.'
            }
          ]
        }
      ],
      config: {
        systemInstruction: CAD_MEP_SYSTEM_INSTRUCTION
      }
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Video Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi phân tích video' });
  }
});

/**
 * 6. Photo & Nameplate Vision Analysis
 */
app.post('/api/gemini/vision-extract', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', prompt } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            },
            {
              text: prompt || `Phân tích ảnh hiện trường thiết bị MEP. Trích xuất:
1. Toàn bộ chữ trên nhãn mác (Nameplate OCR): Mã thiết bị (Tag), Model, Serial, Hãng sản xuất, Điện áp, Công suất, Lưu lượng, Cột áp.
2. Mã QR hoặc Barcode nếu nhìn thấy.
3. Loại thiết bị (Tủ điện, Bơm, AHU, Chiller, Thang máy, Van...).
4. Đánh giá ngữ cảnh phòng/không gian xung quanh.
Trả về dạng văn bản rõ ràng có định dạng Markdown.`
            }
          ]
        }
      ]
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Vision Extract Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi nhận diện ảnh hiện trường' });
  }
});

/**
 * 7. AI CAD / PDF Drawing Analysis & Proposals Engine
 * Detects and proposes locations for electrical panels, plant rooms, escalators, elevators, toilets, pump rooms.
 */
app.post('/api/gemini/analyze-drawing', async (req, res) => {
  try {
    const { drawingName, drawingType, fileBase64, mimeType = 'application/pdf', floorInfo, contextPrompt } = req.body;

    const promptText = `Bạn là Chuyên gia CAD/MEP & BIM cao cấp cho nhà ga hàng không quốc tế (ví dụ Tân Sơn Nhất).
Hãy phân tích bản vẽ ${drawingName || 'Mặt bằng kỹ thuật'} (${drawingType || 'CAD/PDF'}).
Nhiệm vụ: Nhận diện, xác định vị trí và đề xuất danh mục các hạng mục trọng yếu sau:
1. TỦ ĐIỆN: Tủ phân phối tổng MDB, tủ phân phối nhánh DB, tủ điện chiếu sáng, tủ UPS.
2. PHÒNG MÁY: Phòng điều hòa không khí AHU, phòng Chiller, phòng máy biến áp, phòng máy phát điện dự phòng.
3. THANG CUỐN (Escalators): Thang cuốn sảnh đi, sảnh đến, hành lang chuyển tiếp.
4. THANG MÁY (Elevators): Thang máy quan sát hành khách, thang máy kỹ thuật/hàng hóa, thang máy cứu hộ PCCC.
5. NHÀ VỆ SINH (Restrooms / WC): Khu WC Nam, WC Nữ, WC Người khuyết tật, phòng thay tã em bé.
6. PHÒNG BƠM (Pump Rooms): Trạm bơm chữa cháy cứu hỏa PCCC (Diesel/Điện), trạm bơm cấp nước sinh hoạt, bơm nước ngưng.

Thông tin bối cảnh công trình: ${floorInfo || 'Nhà ga Quốc tế T2/T3 Tân Sơn Nhất'}
Yêu cầu bổ sung: ${contextPrompt || 'Tối ưu hóa vị trí theo luồng hành khách và tiêu chuẩn kỹ thuật hàng không ICAO/TCVN.'}

Hãy trả về phân tích chuyên môn chi tiết kèm dữ liệu JSON có cấu trúc rõ ràng dạng:
\`\`\`json
{
  "summary": "Tóm tắt kết quả phân tích bản vẽ...",
  "proposals": [
    {
      "category": "TỦ ĐIỆN" | "PHÒNG MÁY" | "THANG CUỐN" | "THANG MÁY" | "NHÀ VỆ SINH" | "PHÒNG BƠM",
      "tag": "MDB-A01",
      "name": "Tủ phân phối điện hạ thế tổng MDB-A01",
      "system": "ELECTRICAL" | "HVAC" | "FIRE_PROTECTION" | "PLUMBING" | "ARCHITECTURE",
      "floor": "Tầng 1 (Level 1)",
      "zone": "Zone A - Cánh Đông",
      "room": "E-101 - Phòng Điện Hạ Thế",
      "cadCoordinates": { "x": 15500, "y": 19500, "z": 0, "units": "mm" },
      "areaSqm": 84.5,
      "confidence": 0.98,
      "reason": "Gần trục tải trung tâm và thuận tiện tuyến cáp vào trạm biến áp",
      "status": "PROPOSED"
    }
  ]
}
\`\`\``;

    const parts: any[] = [];
    if (fileBase64) {
      parts.push({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType
        }
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      config: {
        systemInstruction: CAD_MEP_SYSTEM_INSTRUCTION
      }
    });

    const responseText = response.text || '';
    
    // Extract JSON if embedded
    let parsedData: any = null;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        parsedData = JSON.parse(responseText);
      }
    } catch (e) {
      console.log('Could not parse strict JSON from drawing analysis, returning raw text');
    }

    res.json({
      text: responseText,
      data: parsedData
    });
  } catch (error: any) {
    console.error('Drawing Analysis Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi phân tích bản vẽ CAD/PDF' });
  }
});

/**
 * 8. Live Gemini Field Conversation & Automatic Log Extraction
 * Converses with field engineers and extracts structured inspection logs for auto-syncing to Google Sheets.
 */
app.post('/api/gemini/live-field-extract', async (req, res) => {
  try {
    const { speechInput, engineerName, conversationHistory = [] } = req.body;

    if (!speechInput) {
      return res.status(400).json({ error: 'Nội dung giọng nói / tin nhắn rỗng' });
    }

    const systemPrompt = `Bạn là Trợ lý AI Kỹ thuật Hiện trường (Live CAD/MEP Assistant) kết nối trực tiếp với kỹ sư tại công trình (ví dụ Nhà ga Tân Sơn Nhất).
Kỹ sư đang đi kiểm tra hiện trường và nói chuyện với bạn bằng giọng nói (Live Voice).
Nhiệm vụ của bạn:
1. Đưa ra phản hồi kỹ thuật súc tích, tự nhiên để chuyển thành giọng nói (Voice TTS) cho kỹ sư nghe trực tiếp (không dài dòng).
2. Tự động trích xuất các thông tin kiểm định để lưu vào Google Sheets.
Phân loại thiết bị thuộc 1 trong 6 nhóm: TỦ ĐIỆN, PHÒNG MÁY, THANG CUỐN, THANG MÁY, NHÀ VỆ SINH, PHÒNG BƠM.

Hãy trả về phản hồi theo định dạng JSON:
\`\`\`json
{
  "voiceReply": "Câu phản hồi ngắn gọn, chuyên nghiệp, xác nhận đã ghi log và đưa ra lời khuyên kỹ thuật nếu cần...",
  "logRecord": {
    "equipment": "Tên thiết bị hoặc phòng",
    "assetTag": "Mã Tag nếu có (ví dụ: MDB-A01, AHU-02, ES-01, FP-01, WC-A01)",
    "category": "TỦ ĐIỆN" | "PHÒNG MÁY" | "THANG CUỐN" | "THANG MÁY" | "NHÀ VỆ SINH" | "PHÒNG BƠM",
    "location": "Vị trí phòng / tầng",
    "readings": "Các thông số đo kiểm, nhiệt độ, áp suất, dòng điện, độ rung nếu kỹ sư đề cập",
    "condition": "BÌNH THƯỜNG" | "CẦN BẢO TRÌ" | "SỰ CỐ KHẨN CẤP",
    "actionRequired": "Hành động đề xuất xử lý",
    "priority": "CAO" | "TRUNG BÌNH" | "THẤP"
  }
}
\`\`\``;

    const contents = [
      ...conversationHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text || m.content }]
      })),
      {
        role: 'user',
        parts: [{ text: `Kỹ sư ${engineerName || 'Hiện trường'} vừa nói: "${speechInput}"` }]
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const responseText = response.text || '';
    let parsed: any = null;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        parsed = JSON.parse(responseText);
      }
    } catch (e) {
      parsed = {
        voiceReply: responseText,
        logRecord: {
          equipment: 'Thiết bị hiện trường',
          assetTag: 'AST-LOG',
          category: 'PHÒNG MÁY',
          location: 'Khu vực kỹ thuật',
          readings: speechInput,
          condition: 'BÌNH THƯỜNG',
          actionRequired: 'Tiếp tục theo dõi vận hành',
          priority: 'TRUNG BÌNH'
        }
      };
    }

    res.json({
      text: responseText,
      voiceReply: parsed?.voiceReply || 'Đã ghi nhận thông tin kiểm tra hiện trường.',
      logRecord: parsed?.logRecord || null
    });
  } catch (error: any) {
    console.error('Live Field Extract Error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý hội thoại hiện trường' });
  }
});

// Setup Vite middleware in dev mode or static files in production
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CAD/MEP Digital Twin Server listening on port ${PORT}`);
  });
};

startServer();
