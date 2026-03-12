import { useState, ReactNode } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { BookOpen, Calculator, Globe, HeartPulse, Leaf, Microscope, Palette, Landmark, Briefcase, GraduationCap, Scale, Users, Activity, Building2, MonitorPlay, MessageSquare, Languages, ScrollText, ChevronRight, Loader2, Target, AlertCircle, MapPin, X, Info, Code2, Compass, LayoutGrid, ListTree, School } from 'lucide-react';
import type { Scores, Recommendation } from './types';

const ACADEMIC_FIELDS = [
  { name: '資訊學群', icon: MonitorPlay },
  { name: '工程學群', icon: Calculator },
  { name: '數理化學群', icon: Microscope },
  { name: '醫藥衛生學群', icon: HeartPulse },
  { name: '生命科學學群', icon: Leaf },
  { name: '生物資源學群', icon: Leaf },
  { name: '地球環境學群', icon: Globe },
  { name: '建築與設計學群', icon: Building2 },
  { name: '藝術學群', icon: Palette },
  { name: '社會與心理學群', icon: Users },
  { name: '大眾傳播學群', icon: MessageSquare },
  { name: '外語學群', icon: Languages },
  { name: '文史哲學群', icon: ScrollText },
  { name: '教育學群', icon: GraduationCap },
  { name: '法政學群', icon: Scale },
  { name: '管理學群', icon: Briefcase },
  { name: '財經學群', icon: Landmark },
  { name: '遊憩與運動學群', icon: Activity },
];

const REGIONS = [
  { id: 'north', name: '北部 (基北北桃竹苗)' },
  { id: 'central', name: '中部 (中彰投雲)' },
  { id: 'south', name: '南部 (嘉南高屏)' },
  { id: 'east', name: '東部 (宜花東)' },
  { id: 'islands', name: '離島 (澎金馬)' },
];

const SUBJECTS = [
  { id: 'chinese', label: '國文', color: 'bg-[#F2EFE9] text-[#7A6B5D] border-[#E5DFD3]' },
  { id: 'english', label: '英文', color: 'bg-[#E9F0F2] text-[#5D707A] border-[#D3E2E5]' },
  { id: 'mathA', label: '數學A', color: 'bg-[#EAF2E9] text-[#5D7A62] border-[#D5E5D3]' },
  { id: 'mathB', label: '數學B', color: 'bg-[#E9F2EF] text-[#5D7A73] border-[#D3E5DE]' },
  { id: 'social', label: '社會', color: 'bg-[#F2EBE9] text-[#7A625D] border-[#E5D7D3]' },
  { id: 'science', label: '自然', color: 'bg-[#EFE9F2] text-[#6B5D7A] border-[#DFD3E5]' },
] as const;

export default function App() {
  const [scores, setScores] = useState<Scores>({
    chinese: 10,
    english: 10,
    mathA: 10,
    mathB: 10,
    social: 10,
    science: 10,
    apcsConcept: 0,
    apcsPractice: 0,
  });
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<'risk' | 'type' | 'university'>('risk');

  const handleScoreChange = (subject: keyof Scores, value: number) => {
    const max = subject.startsWith('apcs') ? 5 : 15;
    setScores((prev) => ({ ...prev, [subject]: Math.min(max, Math.max(0, value)) }));
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const handleAnalyze = async () => {
    if (selectedFields.length === 0) {
      setError('請至少選擇一個有興趣的學群！');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults([]);
    setSelectedRec(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        你是一位專業的台灣大學升學輔導專家（類似 ColleGo! 平台）。
        請根據台灣近年（如112、113、114學年度）的學測五標（頂、前、均、後、底標）百分比與各科難易度波動，進行「精準」的落點分析。
        
        【學生資料】
        學測成績（滿分15級分）：
        國文：${scores.chinese} | 英文：${scores.english} | 數學A：${scores.mathA} | 數學B：${scores.mathB} | 社會：${scores.social} | 自然：${scores.science}
        
        APCS 成績（0代表未考，滿分5級分）：
        觀念題：${scores.apcsConcept} | 實作題：${scores.apcsPractice}
        
        有興趣的學群：${selectedFields.join('、')}
        偏好地區：${selectedRegions.length > 0 ? selectedRegions.join('、') : '不限地區（全台皆可）'}
        
        【任務要求】
        1. 請務必生成「至少 15 到 20 個」校系推薦！這非常重要，請給出大量且多樣化的選擇。
        2. 推薦名單必須包含「一般大學」與「科技大學（科大）」，比例大約 2:1 或 1:1，並涵蓋學生所選的多個學群。
        3. 若 APCS 成績大於 0，請務必優先推薦有採計 APCS 的資訊類相關校系（APCS組）。
        4. 必須包含「夢幻區」（機率 < 50%）、「落點區」（機率 50%~80%）與「安全區」（機率 > 80%），讓他有不同層次的選擇。
        5. 評估機率時，請務必考慮該生成績在歷年五標中的相對位置（百分位數），而非僅看絕對級分。
        6. 提供具體的錄取機率（例如 85%），並說明推薦理由（需提及歷年分數落點或五標分析）。
        7. 校系簡介需精要（約60-80字），並具體列出「核心課程 (coreCourses)」與「未來發展 (futureCareer)」。
        8. 【重要】請確保輸出的 JSON 格式完全合法，所有字串內容必須寫在同一行，絕對不能包含真實的換行符號（若需換行請使用 \\n）。
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                university: { type: Type.STRING, description: "大學名稱，例如：國立臺灣大學、國立臺灣科技大學" },
                department: { type: Type.STRING, description: "科系名稱，例如：資訊工程學系" },
                universityType: { type: Type.STRING, description: "必須是 '一般大學' 或 '科技大學'" },
                probability: { type: Type.NUMBER, description: "錄取機率百分比，0 到 100 之間的整數" },
                reason: { type: Type.STRING, description: "推薦理由，需提及歷年分數落點或五標分析，不可包含換行" },
                riskLevel: { type: Type.STRING, description: "必須是 '安全區', '落點區', 或 '夢幻區' 之一" },
                description: { type: Type.STRING, description: "校系簡介，約60~80字，不可包含換行" },
                coreCourses: { type: Type.STRING, description: "該系的核心課程，列舉3-5個代表性課程，不可包含換行" },
                futureCareer: { type: Type.STRING, description: "該系的未來發展與就業方向，列舉3-5個職業或領域，不可包含換行" }
              },
              required: ["university", "department", "universityType", "probability", "reason", "riskLevel", "description", "coreCourses", "futureCareer"]
            }
          }
        }
      });

      if (response.text) {
        let rawText = response.text.trim();
        // Remove markdown code blocks if present
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        // Replace unescaped newlines within strings to prevent JSON.parse errors
        rawText = rawText.replace(/[\u0000-\u001F]+/g, "");

        const repairJSON = (jsonString: string) => {
          let inString = false;
          let escape = false;
          const stack: string[] = [];
          
          for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            if (inString) {
              if (escape) {
                escape = false;
              } else if (char === '\\') {
                escape = true;
              } else if (char === '"') {
                inString = false;
              }
            } else {
              if (char === '"') {
                inString = true;
              } else if (char === '{') {
                stack.push('}');
              } else if (char === '[') {
                stack.push(']');
              } else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                  stack.pop();
                }
              }
            }
          }
          
          let repaired = jsonString;
          if (escape) repaired = repaired.slice(0, -1);
          if (inString) repaired += '"';
          while (stack.length > 0) repaired += stack.pop();
          return repaired;
        };

        try {
          const parsedResults = JSON.parse(rawText) as Recommendation[];
          parsedResults.sort((a, b) => b.probability - a.probability);
          setResults(parsedResults);
        } catch (parseError) {
          console.warn("JSON parse failed, attempting to repair...", parseError);
          try {
            const repairedText = repairJSON(rawText);
            const parsedResults = JSON.parse(repairedText) as Recommendation[];
            const validResults = parsedResults.filter(r => r && r.university && r.department && r.probability !== undefined);
            validResults.sort((a, b) => b.probability - a.probability);
            setResults(validResults);
          } catch (repairError) {
            console.error("Repair failed:", repairError);
            throw new Error('AI 回應格式不完整，請再試一次。');
          }
        }
      } else {
        throw new Error('無法取得預測結果，請稍後再試。');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '發生錯誤，請檢查網路連線或稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2C2C2A] font-sans selection:bg-[#E5DFD3] selection:text-[#2C2C2A]">
      {/* Header - Editorial Style */}
      <header className="border-b border-[#E5E5DF] bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#2C2C2A] p-2.5 rounded-full">
              <Compass className="w-5 h-5 text-[#F9F8F6]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold tracking-wide text-[#2C2C2A]">學測落點分析導航</h1>
              <p className="text-xs font-medium text-[#8C8C73] tracking-wider uppercase mt-0.5">AI-Powered University Prediction</p>
            </div>
          </div>
          <div className="text-sm text-[#8C8C73] font-medium hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]"></span>
            歷年五標數據校準
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Score Input Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5DF] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#F2EFE9] rounded-full">
                  <BookOpen className="w-5 h-5 text-[#8C8C73]" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#2C2C2A]">學測成績</h2>
              </div>
              
              <div className="space-y-5">
                {SUBJECTS.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between group">
                    <label className="text-[15px] font-medium text-[#5C5C5A] w-16">{sub.label}</label>
                    <div className="flex-1 mx-4">
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={scores[sub.id as keyof Scores]}
                        onChange={(e) => handleScoreChange(sub.id as keyof Scores, parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#E5E5DF] rounded-full appearance-none cursor-pointer accent-[#2C2C2A]"
                      />
                    </div>
                    <div className={`w-12 h-10 flex items-center justify-center rounded-xl border font-mono text-sm font-semibold ${sub.color}`}>
                      {scores[sub.id as keyof Scores]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* APCS Input Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5DF] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#F2EFE9] rounded-full">
                  <Code2 className="w-5 h-5 text-[#8C8C73]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#2C2C2A]">APCS 成績</h2>
                  <p className="text-xs text-[#8C8C73] mt-1">選填，0 代表未考</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between group">
                  <label className="text-[15px] font-medium text-[#5C5C5A] w-16">觀念題</label>
                  <div className="flex-1 mx-4">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={scores.apcsConcept}
                      onChange={(e) => handleScoreChange('apcsConcept', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#E5E5DF] rounded-full appearance-none cursor-pointer accent-[#2C2C2A]"
                    />
                  </div>
                  <div className="w-12 h-10 flex items-center justify-center rounded-xl border border-[#E5E5DF] bg-[#F9F8F6] font-mono text-sm font-semibold text-[#2C2C2A]">
                    {scores.apcsConcept}
                  </div>
                </div>
                <div className="flex items-center justify-between group">
                  <label className="text-[15px] font-medium text-[#5C5C5A] w-16">實作題</label>
                  <div className="flex-1 mx-4">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={scores.apcsPractice}
                      onChange={(e) => handleScoreChange('apcsPractice', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#E5E5DF] rounded-full appearance-none cursor-pointer accent-[#2C2C2A]"
                    />
                  </div>
                  <div className="w-12 h-10 flex items-center justify-center rounded-xl border border-[#E5E5DF] bg-[#F9F8F6] font-mono text-sm font-semibold text-[#2C2C2A]">
                    {scores.apcsPractice}
                  </div>
                </div>
              </div>
            </div>

            {/* Field Selection Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5DF] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#F2EFE9] rounded-full">
                  <GraduationCap className="w-5 h-5 text-[#8C8C73]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#2C2C2A]">興趣學群</h2>
                  <p className="text-xs text-[#8C8C73] mt-1">請選擇您有興趣的領域（可複選）</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {ACADEMIC_FIELDS.map((field) => {
                  const isSelected = selectedFields.includes(field.name);
                  const Icon = field.icon;
                  return (
                    <button
                      key={field.name}
                      onClick={() => toggleField(field.name)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-[#2C2C2A] text-white border-[#2C2C2A] shadow-md' 
                          : 'bg-transparent text-[#5C5C5A] border-[#E5E5DF] hover:border-[#2C2C2A] hover:text-[#2C2C2A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {field.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Region Selection Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5DF] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#F2EFE9] rounded-full">
                  <MapPin className="w-5 h-5 text-[#8C8C73]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#2C2C2A]">偏好地區</h2>
                  <p className="text-xs text-[#8C8C73] mt-1">不選代表全台皆可</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {REGIONS.map((region) => {
                  const isSelected = selectedRegions.includes(region.name);
                  return (
                    <button
                      key={region.id}
                      onClick={() => toggleRegion(region.name)}
                      className={`px-4 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-[#2C2C2A] text-white border-[#2C2C2A] shadow-md' 
                          : 'bg-transparent text-[#5C5C5A] border-[#E5E5DF] hover:border-[#2C2C2A] hover:text-[#2C2C2A]'
                      }`}
                    >
                      {region.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-[#D4A373] hover:bg-[#C29162] text-white rounded-3xl py-5 px-6 font-serif font-bold text-lg shadow-lg shadow-[#D4A373]/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="tracking-widest">分析歷年落點中...</span>
                </>
              ) : (
                <>
                  <span className="tracking-widest">開始精準預測</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            {error && (
              <div className="bg-[#FDF8F6] text-[#D9534F] p-5 rounded-2xl flex items-start gap-3 border border-[#F5E6E6]">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[15px] leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {results.length === 0 && !loading && !error ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-[#8C8C73] bg-white rounded-[2.5rem] border border-[#E5E5DF] p-12 text-center">
                <div className="bg-[#F9F8F6] p-6 rounded-full mb-6 border border-[#E5E5DF]">
                  <Compass className="w-10 h-10 text-[#D1D1C7]" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#2C2C2A] mb-3 tracking-wide">等待分析中</h3>
                <p className="max-w-md text-[15px] leading-relaxed">
                  請在左側輸入您的學測與 APCS 成績，並選擇有興趣的學群與地區。點擊「開始精準預測」按鈕，AI 將為您推薦適合的校系（包含一般大學與科技大學）。
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {results.length > 0 && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E5E5DF] pb-4 gap-4">
                      <div>
                        <h2 className="text-3xl font-serif font-bold tracking-wide text-[#2C2C2A]">推薦校系</h2>
                        <p className="text-sm text-[#8C8C73] mt-2">根據歷年五標與難易度波動分析</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex bg-[#F2EFE9] p-1 rounded-full border border-[#E5E5DF]">
                          <button
                            onClick={() => setGroupBy('risk')}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${groupBy === 'risk' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#8C8C73] hover:text-[#2C2C2A]'}`}
                          >
                            依落點機率
                          </button>
                          <button
                            onClick={() => setGroupBy('type')}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${groupBy === 'type' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#8C8C73] hover:text-[#2C2C2A]'}`}
                          >
                            依大學類型
                          </button>
                          <button
                            onClick={() => setGroupBy('university')}
                            className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${groupBy === 'university' ? 'bg-white text-[#2C2C2A] shadow-sm' : 'text-[#8C8C73] hover:text-[#2C2C2A]'}`}
                          >
                            依學校分類
                          </button>
                        </div>
                        <span className="text-sm font-medium text-[#2C2C2A] bg-[#F2EFE9] px-4 py-1.5 rounded-full border border-[#E5E5DF] hidden md:inline-block">
                          共 {results.length} 個結果
                        </span>
                      </div>
                    </div>

                    <div className="space-y-10">
                      {(() => {
                        const renderCard = (rec: Recommendation, index: number) => {
                          let badgeColor = 'bg-[#F9F8F6] text-[#5C5C5A] border-[#E5E5DF]';
                          let probColor = 'text-[#2C2C2A]';
                          let progressColor = 'bg-[#D1D1C7]';
                          
                          if (rec.riskLevel === '安全區') {
                            badgeColor = 'bg-[#EAF2E9] text-[#5D7A62] border-[#D5E5D3]';
                            probColor = 'text-[#5D7A62]';
                            progressColor = 'bg-[#5D7A62]';
                          } else if (rec.riskLevel === '落點區') {
                            badgeColor = 'bg-[#E9F0F2] text-[#5D707A] border-[#D3E2E5]';
                            probColor = 'text-[#5D707A]';
                            progressColor = 'bg-[#5D707A]';
                          } else if (rec.riskLevel === '夢幻區') {
                            badgeColor = 'bg-[#FDF8F6] text-[#D4A373] border-[#F5E6E6]';
                            probColor = 'text-[#D4A373]';
                            progressColor = 'bg-[#D4A373]';
                          }

                          return (
                            <div 
                              key={`${rec.university}-${rec.department}-${index}`}
                              onClick={() => setSelectedRec(rec)}
                              className="bg-white rounded-3xl p-8 border border-[#E5E5DF] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-400 flex flex-col h-full cursor-pointer group relative overflow-hidden"
                            >
                              <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#F9F8F6] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out"></div>

                              <div className="relative z-10 flex justify-between items-start mb-6">
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <div className="text-[13px] font-medium text-[#8C8C73] tracking-wider uppercase">{rec.university}</div>
                                    {groupBy !== 'type' && (
                                      <span className="text-[10px] bg-[#F2EFE9] text-[#8C8C73] px-2 py-0.5 rounded-full">{rec.universityType}</span>
                                    )}
                                  </div>
                                  <h3 className="text-xl font-serif font-bold text-[#2C2C2A] leading-snug group-hover:text-[#D4A373] transition-colors">{rec.department}</h3>
                                </div>
                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border tracking-widest shrink-0 ${badgeColor}`}>
                                  {rec.riskLevel}
                                </span>
                              </div>
                              
                              <div className="relative z-10 mt-auto pt-6 border-t border-[#F2EFE9]">
                                <div className="flex items-end justify-between mb-3">
                                  <span className="text-[13px] font-medium text-[#8C8C73] tracking-wider">預估錄取機率</span>
                                  <span className={`text-3xl font-serif font-bold tracking-tight ${probColor}`}>
                                    {rec.probability}<span className="text-lg opacity-70">%</span>
                                  </span>
                                </div>
                                
                                <div className="w-full h-1.5 bg-[#F2EFE9] rounded-full overflow-hidden mb-5">
                                  <div 
                                    className={`h-full rounded-full ${progressColor} transition-all duration-1000 ease-out`}
                                    style={{ width: `${rec.probability}%` }}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between text-[14px] text-[#5C5C5A]">
                                  <span className="truncate pr-4 font-medium">{rec.reason.split('，')[0]}...</span>
                                  <span className="flex items-center gap-1.5 text-[#2C2C2A] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                                    <Info className="w-4 h-4" />
                                    閱讀簡介
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        };

                        const renderSection = (title: string, icon: ReactNode, items: Recommendation[]) => (
                          <div key={title} className="space-y-4">
                            <div className="flex items-center gap-2 text-[#2C2C2A]">
                              {icon}
                              <h3 className="text-xl font-bold font-serif">{title}</h3>
                              <span className="text-[12px] font-medium text-[#8C8C73] ml-2 bg-[#E5E5DF] px-2 py-0.5 rounded-full">{items.length}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {items.map((rec, idx) => renderCard(rec, idx))}
                            </div>
                          </div>
                        );

                        if (groupBy === 'risk') {
                          const safe = results.filter(r => r.riskLevel === '安全區');
                          const target = results.filter(r => r.riskLevel === '落點區');
                          const dream = results.filter(r => r.riskLevel === '夢幻區');
                          return (
                            <>
                              {safe.length > 0 && renderSection('安全區 (>80%)', <Target className="w-5 h-5 text-[#5D7A62]" />, safe)}
                              {target.length > 0 && renderSection('落點區 (50~80%)', <Compass className="w-5 h-5 text-[#5D707A]" />, target)}
                              {dream.length > 0 && renderSection('夢幻區 (<50%)', <Activity className="w-5 h-5 text-[#D4A373]" />, dream)}
                            </>
                          );
                        } else if (groupBy === 'type') {
                          const general = results.filter(r => r.universityType === '一般大學');
                          const tech = results.filter(r => r.universityType === '科技大學');
                          return (
                            <>
                              {general.length > 0 && renderSection('一般大學', <School className="w-5 h-5 text-[#2C2C2A]" />, general)}
                              {tech.length > 0 && renderSection('科技大學', <ListTree className="w-5 h-5 text-[#2C2C2A]" />, tech)}
                            </>
                          );
                        } else {
                          // Group by university
                          const grouped = results.reduce((acc, curr) => {
                            if (!acc[curr.university]) acc[curr.university] = [];
                            acc[curr.university].push(curr);
                            return acc;
                          }, {} as Record<string, Recommendation[]>);
                          
                          return Object.entries(grouped).map(([uni, items]) => 
                            renderSection(uni, <Building2 className="w-5 h-5 text-[#2C2C2A]" />, items as Recommendation[])
                          );
                        }
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Detail Modal - Editorial Magazine Style */}
      {selectedRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#2C2C2A]/60 backdrop-blur-md" onClick={() => setSelectedRec(null)}>
          <div 
            className="bg-[#F9F8F6] rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#F9F8F6]/90 backdrop-blur-xl border-b border-[#E5E5DF] px-8 py-6 flex justify-between items-start z-20">
              <div>
                <div className="text-[13px] font-bold text-[#D4A373] mb-2 tracking-widest uppercase flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {selectedRec.university}
                </div>
                <h3 className="text-3xl font-serif font-bold text-[#2C2C2A] leading-tight">{selectedRec.department}</h3>
              </div>
              <button 
                onClick={() => setSelectedRec(null)} 
                className="p-2.5 bg-white hover:bg-[#E5E5DF] border border-[#E5E5DF] rounded-full transition-colors text-[#2C2C2A] shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-10">
              {/* ColleGo Style Description */}
              <div>
                <h4 className="text-[13px] font-bold text-[#8C8C73] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#D4A373]" />
                  ColleGo! 校系簡介
                </h4>
                <p className="text-[#2C2C2A] leading-loose text-[16px] font-medium">
                  {selectedRec.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Core Courses */}
                <div className="bg-white p-6 rounded-3xl border border-[#E5E5DF] shadow-sm">
                  <h4 className="text-[13px] font-bold text-[#8C8C73] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-[#5D7A62]" />
                    核心課程
                  </h4>
                  <p className="text-[#5C5C5A] leading-relaxed text-[15px]">
                    {selectedRec.coreCourses}
                  </p>
                </div>

                {/* Future Career */}
                <div className="bg-white p-6 rounded-3xl border border-[#E5E5DF] shadow-sm">
                  <h4 className="text-[13px] font-bold text-[#8C8C73] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#5D707A]" />
                    未來發展
                  </h4>
                  <p className="text-[#5C5C5A] leading-relaxed text-[15px]">
                    {selectedRec.futureCareer}
                  </p>
                </div>
              </div>

              {/* Stats & Reason Grid */}
              <div className="bg-[#2C2C2A] text-[#F9F8F6] p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
                
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-6">
                    <div className="text-[13px] font-medium text-[#A3A39A] mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      預估機率
                    </div>
                    <div className="text-4xl font-serif font-bold text-white mb-2">
                      {selectedRec.probability}<span className="text-2xl text-[#A3A39A]">%</span>
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full border border-white/20 text-[12px] font-bold tracking-widest">
                      {selectedRec.riskLevel}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="text-[13px] font-medium text-[#A3A39A] mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      五標落點分析理由
                    </div>
                    <p className="text-[#D1D1C7] leading-relaxed text-[15px]">
                      {selectedRec.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
