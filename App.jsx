import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Users, Settings, Package, BarChart3, DollarSign, 
  PieChart, Activity, Plus, Trash2, ChevronLeft, Menu, 
  Calculator, Briefcase, Save, Zap, Target, ArrowUpRight,
  ShieldCheck, Percent, Layers, Gauge, Thermometer, Landmark, 
  FileText, ReceiptText, Wallet, Info, Clock, ShoppingCart, 
  Lightbulb, Megaphone, Boxes, Scale, HelpCircle, ArrowRightLeft,
  CheckCircle2, AlertTriangle, TrendingDown, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart as RePie, Cell, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart as BChart, Bar
} from 'recharts';

// --- INTEGRACIÓN FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE ---
// Reemplaza estos valores con los que obtengas en tu consola de Firebase
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const FIREBASE_DOC_ID = "main_model_v10";

// --- UTILIDADES DE SEGURIDAD MATEMÁTICA ---
const safe = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

const formatUSD = (val) => new Intl.NumberFormat('en-US', { 
  style: 'currency', currency: 'USD', maximumFractionDigits: 0 
}).format(val);

// --- COMPONENTE DE INFORMACIÓN (ⓘ) ---
const InfoTooltip = ({ text }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <HelpCircle size={14} className="text-indigo-400/50 hover:text-indigo-400 cursor-help transition-all" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-[11px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed font-medium">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// --- MOTOR FINANCIERO PROFESIONAL ---
const runFinancialEngine = (p) => {
  const months = [];
  const sMult = p.scenario === 'optimistic' ? 1.25 : p.scenario === 'pessimistic' ? 0.75 : 1;
  const mDepr = p.assets.reduce((a, b) => a + (safe(b.value) / (safe(b.life || 1) * 12)), 0);
  const mFixedBase = p.fixedCosts.reduce((a, b) => a + safe(b.amount), 0);
  
  // Promedios Ponderados de Productos
  const avgCost = p.products.length > 0 ? p.products.reduce((acc, x) => acc + safe(x.cost), 0) / p.products.length : 0;
  const avgMargin = p.products.length > 0 ? p.products.reduce((acc, x) => acc + safe(x.margin), 0) / p.products.length : 0;
  const avgPrice = avgCost * (1 + avgMargin / 100);

  let units = safe(p.initialUnitsTotal);
  let equity = safe(p.investment) - safe(p.loanAmount);
  let cumCash = -equity;
  let loanBal = safe(p.loanAmount);
  let retainedEarnings = 0;
  let accDepr = 0;
  let revHist = Array(15).fill(0);
  let payback = null;

  for (let i = 1; i <= 12; i++) {
    const inf = Math.pow(1 + (safe(p.inflationRate)/100), i);
    const season = p.seasonality[i-1] || 1;
    const mUnits = units * season * sMult;
    
    const price = avgPrice * inf;
    const costU = avgCost * inf;
    const rev = mUnits * price;
    const cogs = mUnits * costU;

    // Impuestos y Comisiones
    const iibb = rev * (safe(p.iibbRate)/100);
    const fees = rev * (safe(p.gatewayFee)/100);
    const mkt = (mUnits * (safe(p.salesGrowth)/100)) * safe(p.cacCost) * inf;
    const mFixed = mFixedBase * inf;

    // Nómina con SAC
    const cStaff = p.staff.reduce((acc, s) => {
      const base = (safe(s.basic) + safe(s.additional)) * inf;
      const patr = safe(s.employerTaxesRate) / 100;
      const sac = (i === 6 || i === 12) ? (base * 0.5) : 0;
      return acc + (base + sac) * (1 + patr);
    }, 0);

    const ebitda = rev - cogs - cStaff - mFixed - iibb - fees - mkt;
    
    // Servicio de Deuda (Francés simplificado)
    const mInt = loanBal * (safe(p.loanRate)/100/12);
    const capRepay = (i <= safe(p.loanTerm)) ? (safe(p.loanAmount)/safe(p.loanTerm)) : 0;
    loanBal = Math.max(0, loanBal - capRepay);

    const ebt = ebitda - mDepr - mInt;
    const tax = ebt > 0 ? ebt * (safe(p.taxRate)/100) : 0;
    const net = ebt - tax;

    // Ajuste de Caja (DSO)
    revHist[i] = rev;
    const collected = safe(p.collectionDays) >= 30 ? (revHist[i-1] || 0) : rev;
    
    // Inversión Stock Mes Siguiente
    const nextUnits = units * (1 + (safe(p.salesGrowth)/100)) * (p.seasonality[i] || 1) * sMult;
    const targetInv = nextUnits * costU * safe(p.safetyStockMonths);
    const currInv = mUnits * costU * safe(p.safetyStockMonths);
    const stockInv = targetInv - currInv;

    const cf = net + mDepr - capRepay - stockInv - (rev - collected);
    cumCash += cf;
    accDepr += mDepr;
    retainedEarnings += net;

    if (cumCash >= 0 && payback === null) payback = i;

    months.push({
      m: `Mes ${i}`,
      rev, ebitda, net, cf, cumCash,
      debt: loanBal,
      equity: equity + retainedEarnings,
      assets: { cash: cumCash, inv: targetInv, fixed: safe(p.investment) - accDepr },
      debtService: mInt + capRepay
    });

    units *= (1 + (safe(p.salesGrowth) / 100));
  }

  // VAN y TIR
  const r = (safe(p.discountRate)/100/12);
  const flows = months.map(m => m.cf);
  const terminal = r > 0 ? (flows[11] * 12) : 0; // Valor de salida
  
  return {
    months,
    van: months[11]?.cumCash + terminal,
    avgPrice,
    avgCost,
    totalEbitda: months.reduce((a,b)=>a+b.ebitda,0),
    totalRev: months.reduce((a,b)=>a+b.rev,0),
    mFixedTotal: mFixedBase + (p.staff.reduce((acc, s) => acc + (safe(s.basic)+safe(s.additional))*(1+safe(s.employerTaxesRate)/100), 0)),
    payback,
    terminal,
    equity
  };
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('config');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scenario, setScenario] = useState('base');
  const [user, setUser] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  // --- ESTADOS DE DATOS ---
  const [investment, setInvestment] = useState(0);
  const [discountRate, setDiscountRate] = useState(15);
  const [inflationRate, setInflationRate] = useState(0);
  const [taxRate, setTaxRate] = useState(30);
  const [ivaRate, setIvaRate] = useState(21);
  const [iibbRate, setIibbRate] = useState(3.5);
  const [gatewayFee, setGatewayFee] = useState(5);
  const [safetyStockMonths, setSafetyStockMonths] = useState(1);
  const [collectionDays, setCollectionDays] = useState(0);
  const [cacCost, setCacCost] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanRate, setLoanRate] = useState(45);
  const [loanTerm, setLoanTerm] = useState(12);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [initialUnitsTotal, setInitialUnitsTotal] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);
  const [seasonality, setSeasonality] = useState(Array(12).fill(1));

  // --- FIREBASE LOGIC ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await loadRemoteData(u.uid);
      } else {
        await signInAnonymously(auth);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadRemoteData = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'business', FIREBASE_DOC_ID));
      if (snap.exists()) {
        const d = snap.data();
        setInvestment(d.investment || 0); setDiscountRate(d.discountRate || 0);
        setInflationRate(d.inflationRate || 0); setTaxRate(d.taxRate || 0);
        setIvaRate(d.ivaRate || 0); setIibbRate(d.iibbRate || 0);
        setGatewayFee(d.gatewayFee || 0); setSafetyStockMonths(d.safetyStockMonths || 0);
        setCollectionDays(d.collectionDays || 0); setCacCost(d.cacCost || 0);
        setLoanAmount(d.loanAmount || 0); setLoanRate(d.loanRate || 0);
        setLoanTerm(d.loanTerm || 0); setProducts(d.products || []);
        setStaff(d.staff || []); setFixedCosts(d.fixedCosts || []);
        setAssets(d.assets || []); setInitialUnitsTotal(d.initialUnitsTotal || 0);
        setSalesGrowth(d.salesGrowth || 0); setSeasonality(d.seasonality || Array(12).fill(1));
      }
    } catch (e) { console.error("Firebase Load Error:", e); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('Guardando...');
    try {
      await setDoc(doc(db, 'users', user.uid, 'business', FIREBASE_DOC_ID), {
        investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate,
        gatewayFee, safetyStockMonths, collectionDays, cacCost, loanAmount,
        loanRate, loanTerm, products, staff, fixedCosts, assets,
        initialUnitsTotal, salesGrowth, seasonality
      });
      setSaveStatus('¡Guardado!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) { setSaveStatus('Error'); }
  };

  // --- CALCULOS SEGUROS ---
  const results = useMemo(() => runFinancialEngine({
    investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee,
    safetyStockMonths, collectionDays, cacCost, loanAmount, loanRate, loanTerm,
    products, staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario
  }), [investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee, safetyStockMonths, collectionDays, cacCost, loanAmount, loanRate, loanTerm, products, staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario]);

  const dailyGoalUnits = Math.ceil((results.mFixedTotal / (results.avgPrice - results.avgCost || 1)) / 22);
  const dscr = (results.totalEbitda / 12) / (loanAmount > 0 ? results.months[0].debtService : 1);

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
      <p className="text-slate-500 font-bold animate-pulse">Iniciando Motor Estratégico...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`transition-all duration-300 bg-slate-900 border-r border-slate-800 p-4 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          {isSidebarOpen && <div className="flex items-center gap-2 font-black text-xl text-indigo-400"><Scale size={22}/> MASTER STRAT</div>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 mx-auto">
            {isSidebarOpen ? <ChevronLeft size={20}/> : <Menu size={20}/>}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <button onClick={()=>setActiveTab('config')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={18}/>{isSidebarOpen && <span>Modelo Base</span>}</button>
          <button onClick={()=>setActiveTab('strategy')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'strategy' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Zap size={18}/>{isSidebarOpen && <span>Impuestos y Caja</span>}</button>
          <button onClick={()=>setActiveTab('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShoppingCart size={18}/>{isSidebarOpen && <span>Catálogo</span>}</button>
          <button onClick={()=>setActiveTab('staff')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={18}/>{isSidebarOpen && <span>Nómina</span>}</button>
          <button onClick={()=>setActiveTab('goals')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'goals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Target size={18}/>{isSidebarOpen && <span>Panel Operativo</span>}</button>
          <button onClick={()=>setActiveTab('flow')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'flow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Activity size={18}/>{isSidebarOpen && <span>Cash Flow</span>}</button>
          <button onClick={()=>setActiveTab('analysis')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'analysis' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Gauge size={18}/>{isSidebarOpen && <span>Rentabilidad</span>}</button>
        </nav>

        <div className="pt-6 border-t border-slate-800">
          {isSidebarOpen && (
            <div className="mb-4 px-2">
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Escenario</label>
              <select value={scenario} onChange={e=>setScenario(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer">
                <option value="base">🟢 Escenario Base</option>
                <option value="optimistic">🚀 Optimista</option>
                <option value="pessimistic">📉 Pesimista</option>
              </select>
            </div>
          )}
          <button onClick={handleSave} className="w-full flex justify-center items-center gap-2 bg-indigo-600 py-3 rounded-2xl text-xs font-black shadow-lg">
            <Save size={16} className={saveStatus.includes('...') ? 'animate-spin' : ''}/>
            {isSidebarOpen && (saveStatus || 'SINCRONIZAR')}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        
        {/* TAB 1: CONFIG BASE */}
        {activeTab === 'config' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header><h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Configuración Maestra</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                <h3 className="text-indigo-400 font-black text-[10px] uppercase flex items-center gap-2"><DollarSign size={14}/> Capital <InfoTooltip text="Monto total necesario para iniciar: maquinaria, stock inicial y local." /></h3>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Inversión ($)</label>
                  <input type="number" value={investment} onChange={e=>setInvestment(safe(e.target.value))} className="w-full bg-transparent border-none text-2xl font-mono outline-none p-0" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Préstamo ($)</label>
                  <input type="number" value={loanAmount} onChange={e=>setLoanAmount(safe(e.target.value))} className="w-full bg-transparent border-none text-xl font-mono outline-none p-0 text-indigo-400" />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                <h3 className="text-orange-400 font-black text-[10px] uppercase flex items-center gap-2"><Thermometer size={14}/> Entorno Macro</h3>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Inflación Mensual (%) <InfoTooltip text="Ajusta automáticamente todos los precios y costos cada mes." /></label>
                  <input type="number" value={inflationRate} onChange={e=>setInflationRate(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none p-0" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Ventas M1 (Unid.)</label>
                  <input type="number" value={initialUnitsTotal} onChange={e=>setInitialUnitsTotal(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none p-0 text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-4">
                 <div className="flex justify-between items-center mb-2 font-bold text-[10px] text-purple-400 uppercase tracking-widest">
                  <span>Gastos Fijos</span>
                  <button onClick={()=>setFixedCosts([...fixedCosts, {id: Date.now(), amount: 0}])} className="p-1 hover:bg-slate-800 rounded-lg"><Plus size={16}/></button>
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {fixedCosts.map(c => (
                    <div key={c.id} className="flex gap-2 group bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <input placeholder="Gasto" className="flex-1 bg-transparent text-[10px] outline-none" value={c.concept} onChange={e=>setFixedCosts(fixedCosts.map(x=>x.id===c.id?{...x, concept: e.target.value}:x))} />
                      <input type="number" className="w-16 bg-transparent text-[10px] font-mono text-right outline-none" value={c.amount} onChange={e=>setFixedCosts(fixedCosts.map(x=>x.id===c.id?{...x, amount: safe(e.target.value)}:x))} />
                      <button onClick={()=>setFixedCosts(fixedCosts.filter(x=>x.id!==c.id))} className="text-slate-700 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABS: PANEL OPERATIVO */}
        {activeTab === 'goals' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-20">
             <header><h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Centro de Control Diario</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Meta Diaria (Unid)</p>
                   <h3 className="text-5xl font-black text-indigo-400 font-mono">{dailyGoalUnits}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-black uppercase">Unidades a vender hoy</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Facturación Hoy</p>
                   <h3 className="text-3xl font-black text-white font-mono">{formatUSD(dailyGoalRev)}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-black uppercase">Ingreso mínimo diario</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Bancabilidad (DSCR)</p>
                   <h3 className={`text-4xl font-black ${dscr >= 1.2 ? 'text-emerald-400' : 'text-red-400'} font-mono`}>{dscr.toFixed(2)}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-black uppercase">Score de cobertura de deuda</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Punto Equilibrio</p>
                   <h3 className="text-3xl font-black text-white font-mono">{Math.ceil(monthlyBreakEvenUnits)} <span className="text-xs text-slate-600">U.</span></h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-black uppercase">Ventas mensuales mínimas</p>
                </div>
             </div>

             <div className="bg-slate-900 p-10 rounded-[48px] border border-slate-800">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex gap-2 items-center"><CheckCircle2 size={16} className="text-indigo-400"/> Diagnóstico Ejecutivo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-sm text-slate-400 font-bold uppercase tracking-tighter">Margen de Seguridad</span>
                         <span className="text-xl font-mono font-black text-emerald-400">+{Math.round((initialUnitsTotal / monthlyBreakEvenUnits - 1) * 100 || 0)}%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-sm text-slate-400 font-bold uppercase tracking-tighter">Costo Fijo Total</span>
                         <span className="text-xl font-mono font-black text-red-400">{formatUSD(results.mFixedTotal)}</span>
                      </div>
                   </div>
                   <div className="bg-indigo-600/10 p-8 rounded-[32px] border border-indigo-600/20">
                      <h5 className="font-black text-xs text-indigo-400 uppercase mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Riesgo de Liquidez</h5>
                      <p className="text-xs text-indigo-200/80 leading-relaxed italic">
                         {dscr < 1.1 ? "Alerta: Tu flujo apenas cubre la deuda. Cualquier caída en ventas afectará tu historial bancario." : "Solidez: Generas excedentes sustanciales tras pagar intereses y capital del préstamo."}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB: FLOW */}
        {activeTab === 'flow' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 pb-20">
            <header className="flex justify-between items-center"><h2 className="text-3xl font-black italic">Estado de Situación de Caja</h2></header>
            <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-800/80 border-b border-slate-700">
                    <tr><th className="px-8 py-5 font-black uppercase text-slate-500">Línea del Estado</th>{results.months.map((p, i) => <th key={i} className="px-4 py-5 text-right font-mono text-indigo-400 min-w-[110px]">{p.m}</th>)}</tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-white/5 transition-colors"><td className="px-8 py-4 font-bold text-slate-300">Ingresos Totales</td>{results.months.map((p, i) => <td key={i} className="px-4 py-4 text-right font-mono">{formatUSD(p.rev)}</td>)}</tr>
                    <tr className="bg-indigo-500/5"><td className="px-8 py-4 font-black text-indigo-300 uppercase tracking-tighter">EBITDA</td>{results.months.map((p, i) => <td key={i} className="px-4 py-4 text-right font-mono font-bold">{formatUSD(p.ebitda)}</td>)}</tr>
                    <tr className="bg-slate-950 font-black"><td className="px-8 py-6 text-white text-base">CASH FLOW NETO</td>{results.months.map((p, i) => <td key={i} className="px-4 py-6 text-right font-mono text-xl text-blue-400 tracking-tighter">{formatUSD(p.cf)}</td>)}</tr>
                 </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: STRATEGY */}
        {activeTab === 'strategy' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in">
             <header><h2 className="text-3xl font-black italic">Estrategia Macroeconómica</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 space-y-6 shadow-2xl">
                   <h3 className="text-emerald-400 font-black text-[10px] uppercase flex gap-2"><ShieldCheck size={16}/> Carga Fiscal <InfoTooltip text="IVA e Ingresos Brutos afectan tu caja directamente sobre la venta bruta." /></h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                         <label className="text-[10px] text-slate-500 font-bold uppercase">IVA (%)</label>
                         <input type="number" value={ivaRate} onChange={e=>setIvaRate(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none" />
                      </div>
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                         <label className="text-[10px] text-slate-500 font-bold uppercase">IIBB (%)</label>
                         <input type="number" value={iibbRate} onChange={e=>setIibbRate(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none" />
                      </div>
                   </div>
                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Comisión Tarjetas (%)</label>
                      <input type="number" value={gatewayFee} onChange={e=>setGatewayFee(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none text-red-400" />
                   </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 space-y-6 shadow-2xl">
                   <h3 className="text-blue-400 font-black text-[10px] uppercase flex gap-2"><Boxes size={16}/> Ciclo de Liquidez</h3>
                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Stock de Seguridad (Meses) <InfoTooltip text="Dinero inmovilizado. Si marcas 1, pre-compras todo el mes siguiente hoy." /></label>
                      <input type="number" value={safetyStockMonths} onChange={e=>setSafetyStockMonths(safe(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none" />
                   </div>
                   <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Días de Cobro</label>
                      <select value={collectionDays} onChange={e=>setCollectionDays(safe(e.target.value))} className="w-full bg-transparent text-xl font-bold outline-none cursor-pointer text-indigo-400">
                         <option value="0">Contado</option>
                         <option value="30">A 30 Días</option>
                      </select>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-20">
             <header className="flex justify-between items-end">
              <div><h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Catálogo de Productos</h2></div>
              <button onClick={()=>setProducts([...products, {id: Date.now(), name: 'Producto', cost: 0, margin: 30}])} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg">+ PRODUCTO</button>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-slate-900 rounded-[32px] border border-slate-800 p-6 shadow-2xl group">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3 font-black text-lg"><ShoppingCart className="text-indigo-400"/><input className="bg-transparent outline-none" value={p.name} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x, name:e.target.value}:x))} /></div>
                      <button onClick={()=>setProducts(products.filter(x=>x.id!==p.id))} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Costo Unit.</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm" value={p.cost} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x, cost:safe(e.target.value)}:x))} /></div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Margen %</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm text-emerald-400" value={p.margin} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x, margin:safe(e.target.value)}:x))} /></div>
                   </div>
                   <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Precio Venta Sugerido:</span><span className="text-xl font-black font-mono text-white">{formatUSD(safe(p.cost)*(1+safe(p.margin)/100))}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: STAFF */}
        {activeTab === 'staff' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in pb-20">
            <header className="flex justify-between items-end"><div><h2 className="text-3xl font-black italic">Gestión de Nómina</h2><p className="text-slate-500">Recibos detallados con SAC automático.</p></div><button onClick={()=>setStaff([...staff, {id: Date.now(), role: 'Cargo', basic: 0, additional: 0, employerTaxesRate: 25}])} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg">+ STAFF</button></header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {staff.map(s => (
                <div key={s.id} className="bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl p-6">
                   <div className="flex justify-between items-center mb-6 font-bold text-lg"><div className="flex items-center gap-3"><ReceiptText className="text-indigo-400"/><input className="bg-transparent outline-none" value={s.role} onChange={e=>setStaff(staff.map(x=>x.id===s.id?{...x, role:e.target.value}:x))} /></div><button onClick={()=>setStaff(staff.filter(x=>x.id!==s.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={18}/></button></div>
                   <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Básico</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm" value={s.basic} onChange={e=>setStaff(staff.map(x=>x.id===s.id?{...x, basic:safe(e.target.value)}:x))} /></div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Adic.</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm" value={s.additional} onChange={e=>setStaff(staff.map(x=>x.id===s.id?{...x, additional:safe(e.target.value)}:x))} /></div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Patr. %</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm" value={s.employerTaxesRate} onChange={e=>setStaff(staff.map(x=>x.id===s.id?{...x, employerTaxesRate:safe(e.target.value)}:x))} /></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-20">
            <header><h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Resultado Estratégico</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="bg-slate-900 p-10 rounded-[48px] border border-slate-800 shadow-2xl flex flex-col items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 text-center italic">Salud de la Inversión</h4>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { s: 'Rentabilidad', v: Math.min(100, (results.totalEbitda/results.totalRev)*200) || 0 },
                        { s: 'Bancabilidad', v: Math.min(100, dscr * 50) || 0 },
                        { s: 'VAN/VAN+', v: results.van > 0 ? 95 : 20 },
                        { s: 'Liquidez M1', v: (12 - (results.payback || 12)) * 8.3 }
                      ]}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="s" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <Radar name="Biz" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-slate-900 p-10 rounded-[40px] border-2 border-indigo-500/20 shadow-xl group overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950/20">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Valor Actual Neto (VAN)</p>
                    <h3 className={`text-5xl font-black ${results.van >= 0 ? 'text-white' : 'text-red-400'}`}>{formatUSD(results.van)}</h3>
                    <p className="text-[10px] text-slate-500 mt-4 font-medium italic">Valoración total incluyendo terminal perpetuo.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 text-center"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">TIR Est.</p><h4 className="text-3xl font-black text-emerald-400 font-mono">{safe(results.tir).toFixed(1)}%</h4></div>
                    <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 text-center"><p className="text-[10px] font-black text-slate-500 uppercase mb-2">Recupero</p><h4 className="text-3xl font-black text-white font-mono">{results.payback || 'N/A'} M</h4></div>
                  </div>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

