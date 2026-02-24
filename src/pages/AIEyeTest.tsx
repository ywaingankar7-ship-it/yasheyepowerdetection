import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Eye, Activity, CheckCircle2, AlertCircle, Download, Loader2, Scan, Monitor, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import SnellenChart from "../components/SnellenChart";
import { GoogleGenAI } from "@google/genai";

export default function AIEyeTest() {
  const [mode, setMode] = useState<"ai" | "manual" | "history">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("1");
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/customers", {
      headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
    })
    .then(res => res.json())
    .then(data => setCustomers(data));
    
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/eye-tests", {
        headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
      });
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };
  
  // Manual test states
  const [distance, setDistance] = useState(20);
  const [pd, setPd] = useState("63");
  const [leftEyeAcuity, setLeftEyeAcuity] = useState("");
  const [rightEyeAcuity, setRightEyeAcuity] = useState("");
  const [activeEye, setActiveEye] = useState<"left" | "right">("left");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'] },
    multiple: false,
  } as any);

  const handleDiagnose = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // Check for API key selection if platform tools are available
      if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }

      const apiKey = process.env.GEMINI_API_KEY || (process.env as any).API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key not found. Please ensure it is set in the environment or selected via the key dialog.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3.1-pro-preview"; // Using Pro for better medical analysis

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      const prompt = `You are a world-class ophthalmologist and optical expert. 
      Analyze the provided eye image with extreme precision. 
      
      Your task is to provide a comprehensive optical diagnosis and prescription.
      
      REQUIRED FIELDS (Do not return 'N/A', 'None', or '0' if you can provide a clinical estimate):
      1. Refractive Power (OD - Right Eye, OS - Left Eye):
         - Spherical (S): Must include sign (+ for hyperopia, - for myopia). e.g., "-2.50", "+1.75".
         - Cylindrical (C): Must include sign. e.g., "-0.75", "+0.25".
         - Axis (A): Degrees from 0 to 180.
      2. Clinical Observations:
         - Redness: Level (None, Mild, Moderate, Severe).
         - Dryness: Status (Absent, Mild, Chronic).
         - Clarity: Status of the cornea and lens (Clear, Cloudy, Hazy).
      3. Pupillary Distance (PD): Estimate the distance between pupils in mm (e.g., "63mm").
      4. Abnormalities: List any detected conditions (e.g., "Slight Conjunctivitis", "Early Cataract signs", "Healthy").
      5. Confidence Level: 0-100.
      6. Professional Summary: A detailed explanation of the findings and recommended next steps.

      Return ONLY a valid JSON object following this schema:
      {
        "left_eye": { "spherical": string, "cylindrical": string, "axis": number, "redness": string, "dryness": string, "clarity": string },
        "right_eye": { "spherical": string, "cylindrical": string, "axis": number, "redness": string, "dryness": string, "clarity": string },
        "pd": string,
        "abnormalities": string[],
        "confidence_level": number,
        "summary": string
      }`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType: file.type } }
            ]
          }
        ],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.1 // Even lower for maximum consistency
        }
      });

      const results = JSON.parse(response.text || "{}");
      
      // Save results to backend
      await fetch("/api/customers/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify({
          customer_id: customerId,
          results: results
        }),
      });

      setResult(results);
    } catch (err: any) {
      console.error("Diagnosis failed:", err);
      alert(err.message || "Diagnosis failed. Please check your connection and API key.");
    } finally {
      setLoading(false);
    }
  };

  const saveManualTest = async () => {
    if (!leftEyeAcuity || !rightEyeAcuity) return alert("Please complete both eyes");
    setLoading(true);
    
    const manualResults = {
      type: "manual",
      distance: `${distance}ft`,
      pd: `${pd}mm`,
      left_eye: { acuity: leftEyeAcuity },
      right_eye: { acuity: rightEyeAcuity },
      summary: `Manual Snellen Chart test performed at ${distance}ft. PD: ${pd}mm. Left Eye: ${leftEyeAcuity}, Right Eye: ${rightEyeAcuity}.`
    };

    try {
      // We'll reuse the eye_tests table but send a different structure
      // The backend needs to handle this or we just store it as results JSON
      const response = await fetch("/api/customers/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify({
          customer_id: customerId,
          results: manualResults
        }),
      });

      if (response.ok) {
        setResult(manualResults);
      } else {
        alert("Failed to save results");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF() as any;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("VISIONX CLINICAL REPORT", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(result.type === "manual" ? "MANUAL SNELLEN VISION TEST" : "AI-POWERED RETINAL DIAGNOSIS", 20, 32);

    // Metadata
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, 140, 50);
    doc.text(`Time: ${time}`, 140, 55);
    doc.text(`Report ID: VX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 140, 60);

    doc.line(20, 65, 190, 65);

    if (result.type === "manual") {
      doc.setFont("helvetica", "bold");
      doc.text("TEST PARAMETERS", 20, 75);
      doc.setFont("helvetica", "normal");
      doc.text(`Test Distance: ${result.distance} ft`, 20, 82);
      doc.text(`Pupillary Distance (PD): ${result.pd || "N/A"}`, 20, 89);

      // Results Table
      (doc as any).autoTable({
        startY: 100,
        head: [["Eye", "Visual Acuity (Snellen)"]],
        body: [
          ["Left Eye (OS)", result.left_eye?.acuity || "N/A"],
          ["Right Eye (OD)", result.right_eye?.acuity || "N/A"]
        ],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] }
      });
    } else {
      doc.setFont("helvetica", "bold");
      doc.text("DIAGNOSTIC FINDINGS", 20, 75);
      
      const eyeData = [
        ["Parameter", "Left Eye (OS)", "Right Eye (OD)"],
        ["Spherical (S)", result.left_eye?.spherical || "N/A", result.right_eye?.spherical || "N/A"],
        ["Cylindrical (C)", result.left_eye?.cylindrical || "N/A", result.right_eye?.cylindrical || "N/A"],
        ["Axis (A)", result.left_eye?.axis ? `${result.left_eye.axis}°` : "N/A", result.right_eye?.axis ? `${result.right_eye.axis}°` : "N/A"],
        ["Redness", result.left_eye?.redness || "N/A", result.right_eye?.redness || "N/A"],
        ["Clarity", result.left_eye?.clarity || "N/A", result.right_eye?.clarity || "N/A"]
      ];

      (doc as any).autoTable({
        startY: 85,
        head: [eyeData[0]],
        body: eyeData.slice(1),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL SUMMARY", 20, nextY);
      doc.setFont("helvetica", "normal");
      doc.text(`PD: ${result.pd || "N/A"}`, 20, nextY + 10);
      doc.text(`Abnormalities: ${result.abnormalities?.join(", ") || "None detected"}`, 20, nextY + 17);
      doc.text(`AI Confidence: ${result.confidence_level || "N/A"}%`, 20, nextY + 24);
    }

    const finalY = (doc as any).lastAutoTable.finalY + 45;
    doc.setFont("helvetica", "bold");
    doc.text("PROFESSIONAL RECOMMENDATIONS", 20, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const splitSummary = doc.splitTextToSize(result.summary || "No summary provided", 170);
    doc.text(splitSummary, 20, finalY + 10);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Disclaimer: This is an AI-assisted preliminary report. Final clinical diagnosis must be confirmed by a licensed practitioner.", 105, 285, { align: "center" });

    doc.save(result.type === "manual" ? "VX-Manual-Report.pdf" : "VX-AI-Diagnosis.pdf");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eye Diagnosis & Testing</h1>
          <p className="text-slate-400 mt-1">Choose between AI-powered retinal analysis or manual Snellen vision testing.</p>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => { setMode("ai"); setResult(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mode === "ai" ? "gradient-bg text-white shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            AI Diagnosis
          </button>
          <button 
            onClick={() => { setMode("manual"); setResult(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mode === "manual" ? "gradient-bg text-white shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            <Monitor className="w-4 h-4" />
            Manual Test
          </button>
          <button 
            onClick={() => { setMode("history"); setResult(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              mode === "history" ? "gradient-bg text-white shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {mode === "history" ? (
            <div className="glass-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Diagnosis History
                </h3>
                <button 
                  onClick={fetchHistory}
                  className="p-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  <Loader2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((test) => {
                  const res = JSON.parse(test.results);
                  return (
                    <div 
                      key={test.id}
                      onClick={() => setResult(res)}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-sm">{test.customer_name}</p>
                        <p className="text-[10px] text-slate-500">{new Date(test.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Left Eye</p>
                          <p className="text-xs font-mono text-cyan-400">{res.left_eye?.spherical || res.left_eye?.acuity}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Right Eye</p>
                          <p className="text-xs font-mono text-cyan-400">{res.right_eye?.spherical || res.right_eye?.acuity}</p>
                        </div>
                        <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold uppercase group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all">
                          View
                        </div>
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <div className="py-12 text-center opacity-30">
                    <Activity className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">No history found</p>
                  </div>
                )}
              </div>
            </div>
          ) : mode === "ai" ? (
            <div className="glass-card">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Upload Eye Image
              </h3>
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                  isDragActive ? "border-cyan-500 bg-cyan-500/5" : "border-white/10 hover:border-white/20"
                }`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative group">
                    <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-2xl" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <p className="text-white text-sm font-bold">Click to Change</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Drag & drop eye image here</p>
                      <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Select Customer</label>
                    <select 
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="1">Walk-in Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                </div>

                <button 
                  onClick={handleDiagnose}
                  disabled={!file || loading}
                  className="w-full gradient-bg py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Image...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      Start AI Diagnosis
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-cyan-400" />
                  Snellen Vision Test
                </h3>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                  <Ruler className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Distance:</span>
                  <select 
                    value={distance}
                    onChange={(e) => setDistance(parseInt(e.target.value))}
                    className="bg-transparent text-xs font-bold focus:outline-none"
                  >
                    <option value={20}>20 ft (Standard)</option>
                    <option value={10}>10 ft</option>
                    <option value={6}>6 ft</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                <button 
                  onClick={() => setActiveEye("left")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeEye === "left" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Left Eye (OS)
                </button>
                <button 
                  onClick={() => setActiveEye("right")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeEye === "right" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Right Eye (OD)
                </button>
              </div>

              <SnellenChart 
                distance={distance} 
                selectedAcuity={activeEye === "left" ? leftEyeAcuity : rightEyeAcuity}
                onLineSelect={(acuity) => {
                  if (activeEye === "left") setLeftEyeAcuity(acuity);
                  else setRightEyeAcuity(acuity);
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Left Eye Result</p>
                  <p className="text-lg font-black text-cyan-400">{leftEyeAcuity || "--"}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Right Eye Result</p>
                  <p className="text-lg font-black text-cyan-400">{rightEyeAcuity || "--"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pupillary Distance (PD) mm</label>
                <input 
                  type="number"
                  value={pd}
                  onChange={(e) => setPd(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="e.g. 63"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Select Customer</label>
                  <select 
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="1">Walk-in Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={saveManualTest}
                  disabled={!leftEyeAcuity || !rightEyeAcuity || loading}
                  className="w-full gradient-bg py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Save Manual Test Results
                </button>
              </div>
            </div>
          )}

          <div className="glass-card bg-cyan-500/5 border-cyan-500/20">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-400">AI Disclaimer</p>
                <p className="text-xs text-slate-400 mt-1">
                  This AI diagnosis is for preliminary screening only. Please consult a qualified optometrist for a final prescription.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card h-full flex flex-col items-center justify-center text-center p-12 space-y-6"
              >
                <div className="relative">
                  <div className="w-32 h-32 border-4 border-cyan-500/20 rounded-full"></div>
                  <div className="absolute inset-0 w-32 h-32 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <Eye className="absolute inset-0 m-auto w-12 h-12 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Scanning Eye Patterns...</h3>
                  <p className="text-sm text-slate-500">Our AI is analyzing retinal structure and power requirements.</p>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full gradient-bg"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                  />
                </div>
              </motion.div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    {result.type === "manual" ? "Manual Test Results" : "AI Diagnosis Results"}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    result.type === "manual" ? "bg-cyan-400/10 text-cyan-400" : "bg-emerald-400/10 text-emerald-400"
                  }`}>
                    {result.type === "manual" ? `Distance: ${result.distance}` : `Confidence: ${result.confidence_level}%`}
                  </div>
                </div>

                {result.pd && (
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Pupillary Distance (PD)</span>
                    <span className="text-lg font-black text-cyan-400">{result.pd}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Left Eye (OS)</p>
                    <div className="space-y-2">
                      {result.type === "manual" ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Acuity</span>
                          <span className="font-mono font-bold text-cyan-400">{result.left_eye?.acuity}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Spherical (S)</span>
                            <span className="font-mono font-bold text-white">{result.left_eye?.spherical}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cylindrical (C)</span>
                            <span className="font-mono font-bold text-white">{result.left_eye?.cylindrical}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Axis (A)</span>
                            <span className="font-mono font-bold text-white">{result.left_eye?.axis}°</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Redness</span>
                            <span className={`text-[10px] font-bold ${result.left_eye?.redness === 'None' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {result.left_eye?.redness || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Clarity</span>
                            <span className="text-[10px] font-bold text-white">{result.left_eye?.clarity || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Right Eye (OD)</p>
                    <div className="space-y-2">
                      {result.type === "manual" ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Acuity</span>
                          <span className="font-mono font-bold text-cyan-400">{result.right_eye?.acuity}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Spherical (S)</span>
                            <span className="font-mono font-bold text-white">{result.right_eye?.spherical}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cylindrical (C)</span>
                            <span className="font-mono font-bold text-white">{result.right_eye?.cylindrical}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Axis (A)</span>
                            <span className="font-mono font-bold text-white">{result.right_eye?.axis}°</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Redness</span>
                            <span className={`text-[10px] font-bold ${result.right_eye?.redness === 'None' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {result.right_eye?.redness || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Clarity</span>
                            <span className="text-[10px] font-bold text-white">{result.right_eye?.clarity || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {result.type !== "manual" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Dryness</p>
                      <p className="text-sm font-bold">{result.left_eye?.dryness === 'Present' || result.right_eye?.dryness === 'Present' ? 'Detected' : 'Not Detected'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Abnormalities</p>
                      <p className="text-sm font-bold truncate">{result.abnormalities?.join(", ") || "None"}</p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Summary</p>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {result.summary}
                  </p>
                </div>

                <button 
                  onClick={downloadPDF}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Prescription PDF
                </button>
              </motion.div>
            ) : (
              <div className="glass-card h-full flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-50">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                  <Eye className="w-10 h-10 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No Diagnosis Data</h3>
                  <p className="text-sm text-slate-500">Upload an image and start analysis to see results here.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
