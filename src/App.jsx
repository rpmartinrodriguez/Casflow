import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Users, Settings, Package, BarChart3, DollarSign, 
  PieChart, Activity, Plus, Trash2, ChevronLeft, Menu, 
  Calculator, Briefcase, Save, Zap, Target, ArrowUpRight,
  ShieldCheck, Percent, Layers, Gauge, Thermometer, Landmark, 
  FileText, ReceiptText, Wallet, Info, Clock, ShoppingCart, 
  Lightbulb, Megaphone, Boxes, Scale, HelpCircle, ArrowRightLeft,
  CalendarDays, CheckCircle2, AlertTriangle, TrendingDown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart as RePie, Cell, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart as BChart, Bar, ComposedChart
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- CONFIGURACIÓN FIREBASE (Credenciales proporcionadas) ---
const firebaseConfig = {
  apiKey: "AIzaSyBpIUJfaVxDBZZo14ph26fZ--2L5Tfm1NI",
  authDomain: "cash-flow-4aac7.firebaseapp.com",
  projectId: "cash-flow-4aac7",
  storageBucket: "cash-flow-4aac7.firebasestorage.app",
  messagingSenderId: "561130385612",
  appId: "1:561130385612:web:20028060976a759eab9269"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fin-strategist-v10';

// --- UTILIDADES ---
const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) || !isFinite(n) ? 0 : n;
};

const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'USD', 
  maximumFractionDigits: 0 
}).format(val);

// --- COMPONENTE TOOLTIP INFO (ⓘ) ---
const InfoIcon = ({ text }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <HelpCircle size={14} className="text-indigo-400/60 hover:text-indigo-400 cursor-help transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl border border-slate-700 leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

// --- MOTOR FINANCIERO CORE ---
const runGlobalProjection = (params, forcedScenario = null) => {
  const {
    investment, discountRate, inflationRate, taxRate, 
    staff, fixedCosts, assets, products, initialUnitsTotal, 
    salesGrowth, scenario, loanAmount, loanRate, loanTerm,
    seasonality, ivaRate, iibbRate, gatewayFee, safetyStockMonths, cacCost, collectionDays
  } = params;

  const activeScenario = forcedScenario || scenario;
  const sMult = activeScenario === 'optimistic' ? 1.25 : activeScenario === 'pessimistic' ? 0.75 : 1;
  
  const months = [];
  const monthlyDepr = assets.reduce((a, b) => a + (safeNum(b.value) / (safeNum(b.life || 1) * 12)), 0);
  const totalFixedCostsInit = fixedCosts.reduce((a, b) => a + safeNum(b.amount), 0);
  
  const avgCost = products.length > 0 ? products.reduce((acc, p) => acc + safeNum(p.cost), 0) / products.length : 0;
  const avgMargin = products.length > 0 ? products.reduce((acc, p) => acc + safeNum(p.margin), 0) / products.length : 0;
  const avgPrice = avgCost * (1 + avgMargin/100);

  let units = safeNum(initialUnitsTotal);
  let equity = safeNum(investment) - safeNum(loanAmount);
  let cumulativeCash = -equity;
  let loanBalance = safeNum(loanAmount);
  let accumulatedDepr = 0;
  let retainedEarnings = 0;
  let revenueHistory = Array(14).fill(0);
  let paybackMonth = null;

  for (let m = 1; m <= 12; m++) {
    const infMult = Math.pow(1 + (safeNum(inflationRate)/100), m);
    const monthSeasonality = seasonality[m-1] || 1;
    const mUnits = units * monthSeasonality * sMult;
    
    const price = avgPrice * infMult;
    const unitCost = avgCost * infMult;
    const grossRev = mUnits * price;
    const totalCOGS = mUnits * unitCost;

    const iibb = grossRev * (safeNum(iibbRate)/100);
    const gateway = grossRev * (safeNum(gatewayFee)/100);
    const mkt = (mUnits * (safeNum(salesGrowth)/100)) * safeNum(cacCost) * infMult;
    const mFixed = totalFixedCostsInit * infMult;

    const cStaff = staff.reduce((acc, s) => {
      const base = (safeNum(s.basic) + safeNum(s.additional)) * infMult;
      const taxP = safeNum(s.employerTaxesRate) / 100;
      const sac = (m === 6 || m === 12) ? (base * 0.5) : 0;
      return acc + (base + sac) * (1 + taxP);
    }, 0);

    const ebitda = grossRev - totalCOGS - cStaff - mFixed - iibb - gateway - mkt;
    
    const mRate = (safeNum(loanRate)/100/12);
    const interest = loanBalance > 0 ? loanBalance * mRate : 0;
    const capitalRepay = (m <= safeNum(loanTerm)) ? (safeNum(loanAmount)/safeNum(loanTerm)) : 0;
    loanBalance = Math.max(0, loanBalance - capitalRepay);

    const ebt = ebitda - monthlyDepr - interest;
    const taxProfit = ebt > 0 ? ebt * (safeNum(taxRate)/100) : 0;
    const netIncome = ebt - taxProfit;

    // Caja Real (DSO Adjustment)
    revenueHistory[m] = grossRev;
    const actualCash = safeNum(collectionDays) >= 30 ? (revenueHistory[m-1] || 0) : grossRev;
    
    // Inversión en Stock para mes siguiente
    const nextUnits = units * (1 + (safeNum(salesGrowth)/100)) * (seasonality[m] || 1) * sMult;
    const targetInv = nextUnits * unitCost * safeNum(safetyStockMonths);
    const currInv = mUnits * unitCost * safeNum(safetyStockMonths);
    const invInv = targetInv - currInv;

    const cf = netIncome + monthlyDepr - capitalRepay - invInv - (grossRev - actualCash);
    cumulativeCash += cf;
    accumulatedDepr += monthlyDepr;
    retainedEarnings += netIncome;

    if (cumulativeCash >= 0 && paybackMonth === null) paybackMonth = m;

    months.push({
      m: `M${m}`,
      revenue: grossRev,
      ebitda,
      netIncome,
      interest,
      capitalRepay,
      cf,
      cumCash: cumulativeCash,
      equity: equity + retainedEarnings,
      debt: loanBalance,
      assets: { cash: cumulativeCash, inventory: targetInv, fixed: safeNum(investment) - accumulatedDepr },
      units: mUnits
    });

    units *= (1 + (safeNum(salesGrowth) / 100));
  }

  const r = (safeNum(discountRate) / 100 / 12);
  const g = (safeNum(salesGrowth) / 100);
  const flows = months.map(m => m.cf);
  const terminal = r > g ? (flows[11] * (1 + g)) / (r - g) : flows[11] * 12;
  
  // TIR Simplificada para la demo
  const tirAnual = investment > 0 ? (retainedEarnings / investment) * 100 : 0;

  return {
    months,
    van: months[11].cumCash + terminal * 0.5,
    totalEbitda: months.reduce((a,b)=>a+b.ebitda, 0),
    totalRev: months.reduce((a,b)=>a+b.revenue, 0),
    avgPrice,
    avgCost,
    payback: paybackMonth,
    tir: tirAnual,
    monthlyFixedCosts: totalFixedCostsInit + (staff.reduce((acc, s) => acc + (safeNum(s.basic)+safeNum(s.additional)) * (1+safeNum(s.employerTaxesRate)/100), 0))
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scenario, setScenario] = useState('base');
  const [user, setUser] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const goodwillMultiple = 3;

  // --- ESTADO BASES ---
  const [investment, setInvestment] = useState(50000);
  const [discountRate, setDiscountRate] = useState(15);
  const [inflationRate, setInflationRate] = useState(5);
  const [taxRate, setTaxRate] = useState(30);
  const [ivaRate, setIvaRate] = useState(21);
  const [iibbRate, setIibbRate] = useState(3.5);
  const [gatewayFee, setGatewayFee] = useState(5);
  const [safetyStockMonths, setSafetyStockMonths] = useState(1);
  const [cacCost, setCacCost] = useState(50);
  const [collectionDays, setCollectionDays] = useState(0);
  const [loanAmount, setLoanAmount] = useState(10000);
  const [loanRate, setLoanRate] = useState(45);
  const [loanTerm, setLoanTerm] = useState(12);
  const [products, setProducts] = useState([
    { id: 1, name: 'Producto A', cost: 100, margin: 40 },
    { id: 2, name: 'Servicio B', cost: 50, margin: 150 }
  ]);
  const [staff, setStaff] = useState([
    { id: 1, role: 'Gerente', basic: 2000, additional: 500, employerTaxesRate: 25 },
    { id: 2, role: 'Ventas', basic: 1000, additional: 200, employerTaxesRate: 25 }
  ]);
  const [fixedCosts, setFixedCosts] = useState([
    { id: 1, concept: 'Alquiler', amount: 1500 },
    { id: 2, concept: 'Software / SaaS', amount: 300 }
  ]);
  const [assets, setAssets] = useState([
    { id: 1, name: 'Maquinaria', value: 20000, life: 5 }
  ]);
  const [initialUnitsTotal, setInitialUnitsTotal] = useState(500);
  const [salesGrowth, setSalesGrowth] = useState(3);
  const [seasonality, setSeasonality] = useState(Array(12).fill(1));

  // --- FIREBASE LOGIC ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar datos del usuario
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'model', 'v10');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          setInvestment(d.investment ?? 50000);
          setDiscountRate(d.discountRate ?? 15);
          setInflationRate(d.inflationRate ?? 5);
          setTaxRate(d.taxRate ?? 30);
          setIvaRate(d.ivaRate ?? 21);
          setIibbRate(d.iibbRate ?? 3.5);
          setGatewayFee(d.gatewayFee ?? 5);
          setSafetyStockMonths(d.safetyStockMonths ?? 1);
          setCollectionDays(d.collectionDays ?? 0);
          setCacCost(d.cacCost ?? 50);
          setLoanAmount(d.loanAmount ?? 10000);
          setLoanRate(d.loanRate ?? 45);
          setLoanTerm(d.loanTerm ?? 12);
          setProducts(d.products || []);
          setStaff(d.staff || []);
          setFixedCosts(d.fixedCosts || []);
          setAssets(d.assets || []);
          setInitialUnitsTotal(d.initialUnitsTotal ?? 500);
          setSalesGrowth(d.salesGrowth ?? 3);
          setSeasonality(d.seasonality || Array(12).fill(1));
        }
      } catch (e) {
        console.error("Error loading data:", e);
      }
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus('Guardando...');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'model', 'v10'), {
        investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee,
        safetyStockMonths, collectionDays, cacCost, loanAmount, loanRate, loanTerm, products, 
        staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality,
        lastUpdated: new Date().toISOString()
      });
      setSaveStatus('¡Hecho!');
    } catch (e) {
      setSaveStatus('Error');
      console.error(e);
    }
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // --- CALCULOS ---
  const params = useMemo(() => ({ 
    investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee, 
    safetyStockMonths, cacCost, loanAmount, loanRate, loanTerm, products, staff, 
    fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario, collectionDays 
  }), [investment, discountRate, inflationRate, taxRate, ivaRate, iibbRate, gatewayFee, safetyStockMonths, cacCost, loanAmount, loanRate, loanTerm, products, staff, fixedCosts, assets, initialUnitsTotal, salesGrowth, seasonality, scenario, collectionDays]);
  
  const res = useMemo(() => runGlobalProjection(params), [params]);

  // RATIOS Y METAS
  const marginPerUnit = res.avgPrice - res.avgCost;
  const monthlyBreakEvenUnits = marginPerUnit > 0 ? res.monthlyFixedCosts / marginPerUnit : 0;
  const dailyGoalUnits = Math.ceil(monthlyBreakEvenUnits / 22);
  const dailyGoalRev = dailyGoalUnits * res.avgPrice;

  // DSCR (Debt Service Coverage Ratio)
  const avgMonthlyEbitda = res.totalEbitda / 12;
  const avgMonthlyDebtService = (loanAmount > 0) ? (res.months[0].interest + res.months[0].capitalRepay) : 1;
  const dscr = avgMonthlyEbitda / (avgMonthlyDebtService || 1);

  const NavItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'
      }`}
    >
      <Icon size={18} />
      {isSidebarOpen && <span className="text-sm font-bold">{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`transition-all duration-300 bg-slate-900 border-r border-slate-800 p-4 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 font-black text-xl text-indigo-400 tracking-tighter">
              <Scale size={22}/> MASTER STRAT
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 mx-auto">
            {isSidebarOpen ? <ChevronLeft size={20}/> : <Menu size={20}/>}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
          <NavItem id="config" icon={Settings} label="Modelo Base" />
          <NavItem id="strategy" icon={Zap} label="Impuestos y Caja" />
          <NavItem id="products" icon={ShoppingCart} label="Catálogo" />
          <NavItem id="staff" icon={Users} label="Nómina / SAC" />
          <NavItem id="goals" icon={Target} label="Panel Operativo" />
          <NavItem id="flow" icon={Activity} label="Cash Flow" />
          <NavItem id="balance" icon={Scale} label="Balance" />
          <NavItem id="analysis" icon={Gauge} label="Rentabilidad" />
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <button 
            onClick={handleSave} 
            disabled={!user}
            className={`w-full flex justify-center items-center gap-2 bg-indigo-600 py-3 rounded-2xl text-xs font-black shadow-lg transition-transform active:scale-95 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save size={16} className={saveStatus.includes('...') ? 'animate-spin' : ''}/>
            {isSidebarOpen && (saveStatus || 'SINCRONIZAR')}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative bg-slate-950">
        
        {/* TAB 1: MODELO BASE */}
        {activeTab === 'config' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
              <h2 className="text-3xl font-black italic underline decoration-indigo-500 underline-offset-8">Variables de Inversión</h2>
              <p className="text-slate-500 mt-4 text-sm font-medium">Define el capital inicial y los costos fijos proyectados.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                <h3 className="text-indigo-400 font-black text-[10px] uppercase flex items-center gap-2">
                  <DollarSign size={14}/> Capital Total <InfoIcon text="Inversión inicial requerida para arrancar." />
                </h3>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Inversión ($)</label>
                  <input type="number" value={investment} onChange={e => setInvestment(safeNum(e.target.value))} className="w-full bg-transparent border-none text-2xl font-mono focus:ring-0 outline-none p-0" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Préstamo ($)</label>
                  <input type="number" value={loanAmount} onChange={e => setLoanAmount(safeNum(e.target.value))} className="w-full bg-transparent border-none text-xl font-mono focus:ring-0 outline-none p-0 text-indigo-400" />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                <h3 className="text-orange-400 font-black text-[10px] uppercase flex items-center gap-2"><Thermometer size={14}/> Entorno Macro</h3>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Inflación Mensual (%)</label>
                  <input type="number" value={inflationRate} onChange={e => setInflationRate(safeNum(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none p-0" />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Tasa Descuento (%)</label>
                  <input type="number" value={discountRate} onChange={e => setDiscountRate(safeNum(e.target.value))} className="w-full bg-transparent text-xl font-mono outline-none p-0" />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl space-y-6">
                 <div className="flex justify-between items-center mb-2 font-bold text-[10px] text-purple-400 uppercase">
                  <span>Gastos Fijos Detallados</span>
                  <button onClick={() => setFixedCosts([...fixedCosts, {id: Date.now(), concept: 'Nuevo Gasto', amount: 0}])} className="p-1 hover:bg-slate-800 rounded-lg"><Plus size={16}/></button>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {fixedCosts.map(c => (
                    <div key={c.id} className="flex gap-2 group bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <input placeholder="Concepto..." className="flex-1 bg-transparent text-[10px] outline-none" value={c.concept} onChange={e => setFixedCosts(fixedCosts.map(x => x.id === c.id ? {...x, concept: e.target.value} : x))} />
                      <input type="number" className="w-16 bg-transparent text-[10px] font-mono text-right outline-none" value={c.amount} onChange={e => setFixedCosts(fixedCosts.map(x => x.id === c.id ? {...x, amount: safeNum(e.target.value)} : x))} />
                      <button onClick={() => setFixedCosts(fixedCosts.filter(x => x.id !== c.id))} className="text-slate-700 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PANEL OPERATIVO */}
        {activeTab === 'goals' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
             <header><h2 className="text-3xl font-black italic">Métricas de Control Diario</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Meta Diaria (Unid)</p>
                   <h3 className="text-4xl font-black text-indigo-400">{dailyGoalUnits}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Unidades a vender / día hábil</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Caja Diaria Eq.</p>
                   <h3 className="text-3xl font-black text-white">{formatCurrency(dailyGoalRev)}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Facturación mínima diaria</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Margen Unit. Prom.</p>
                   <h3 className="text-3xl font-black text-emerald-400">{formatCurrency(marginPerUnit)}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Ganancia bruta por venta</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Health Ratio (DSCR)</p>
                   <h3 className={`text-3xl font-black ${dscr >= 1.2 ? 'text-emerald-400' : 'text-red-400'}`}>{dscr.toFixed(2)}</h3>
                   <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Cobertura de Deuda</p>
                </div>
             </div>

             <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex gap-2 items-center"><CheckCircle2 size={16} className="text-emerald-400"/> Diagnóstico del Analista</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                         <span className="text-xs text-slate-400 font-bold">Punto de Equilibrio (Mensual)</span>
                         <span className="text-sm font-mono font-black">{Math.ceil(monthlyBreakEvenUnits)} Unid.</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                         <span className="text-xs text-slate-400 font-bold">Costo Adquisición (CAC)</span>
                         <span className="text-sm font-mono font-black">{formatCurrency(cacCost)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                         <span className="text-xs text-slate-400 font-bold">Costo Fijo + Nómina</span>
                         <span className="text-sm font-mono font-black text-red-400">{formatCurrency(res.monthlyFixedCosts)}</span>
                      </div>
                   </div>
                   <div className="bg-indigo-600/10 p-6 rounded-3xl border border-indigo-600/20">
                      <h5 className="font-black text-xs text-indigo-400 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Alerta de Riesgo</h5>
                      <p className="text-xs text-indigo-200/80 leading-relaxed italic">
                         {dscr < 1.1 ? "Riesgo de Liquidez: El EBITDA apenas cubre la deuda. Optimiza márgenes." : "Solvencia Óptima: El negocio genera flujo suficiente para expansión."}
                         <br/><br/>
                         El CAC actual de {formatCurrency(cacCost)} representa el {((cacCost / marginPerUnit) * 100).toFixed(0)}% del margen unitario.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB: RENTABILIDAD */}
        {activeTab === 'analysis' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            <header><h2 className="text-3xl font-black italic underline decoration-indigo-500">Rendimiento Financiero</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-900 p-10 rounded-[48px] border border-slate-800 shadow-2xl flex flex-col items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 italic text-center">Salud del Negocio 360</h4>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { s: 'Márgenes', v: Math.min(100, (res.totalEbitda/res.totalRev)*200) || 0 },
                        { s: 'TIR/Retorno', v: Math.min(100, res.tir) || 0 },
                        { s: 'Bancabilidad', v: Math.min(100, dscr * 50) || 0 },
                        { s: 'VAN', v: res.van > 0 ? 100 : 30 },
                        { s: 'Liquidez', v: (12 - (res.payback || 12)) * 8.3 }
                      ]}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="s" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <Radar name="BIZ" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl group overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Valor Actual Neto (VAN)</p>
                    <h3 className={`text-5xl font-black ${res.van >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(res.van)}</h3>
                    <p className="text-[10px] text-slate-500 mt-4 font-medium italic">Estimación de valor presente del flujo de caja.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 shadow-lg">
                       <p className="text-[10px] font-black text-slate-500 uppercase mb-2">TIR Est.</p>
                       <h4 className="text-3xl font-black text-emerald-400 font-mono">{res.tir.toFixed(1)}%</h4>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 shadow-lg">
                       <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Payback (Mes)</p>
                       <h4 className="text-3xl font-black text-white font-mono">{res.payback || 'N/A'}</h4>
                    </div>
                  </div>
                  <div className="bg-indigo-600 p-10 rounded-[40px] shadow-2xl shadow-indigo-600/20 flex justify-between items-center">
                     <div>
                        <p className="text-[10px] font-black text-indigo-100 uppercase">Valor de Salida (x{goodwillMultiple})</p>
                        <h4 className="text-4xl font-black text-white font-mono">{formatCurrency(res.totalEbitda * goodwillMultiple)}</h4>
                     </div>
                     <Layers className="text-white opacity-20" size={48} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* OTROS TABS (Simplificados para brevedad del ejecutable) */}
        {activeTab === 'flow' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <h2 className="text-3xl font-black italic">Estado de Resultados Mensual</h2>
              <div className="flex gap-2">
                 {['pessimistic', 'base', 'optimistic'].map(s => (
                   <button key={s} onClick={()=>setScenario(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${scenario === s ? 'bg-indigo-600' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>{s}</button>
                 ))}
              </div>
            </header>
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-x-auto shadow-2xl custom-scrollbar">
              <table className="w-full text-left text-[11px] min-w-[1000px]">
                 <thead className="bg-slate-800">
                    <tr><th className="px-8 py-5 font-black uppercase text-slate-500">Línea</th>{res.months.map((p, i) => <th key={i} className="px-4 py-5 text-right font-mono text-indigo-400">{p.m}</th>)}</tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-white/5"><td className="px-8 py-4 font-bold text-slate-300">Ventas Totales</td>{res.months.map((p, i) => <td key={i} className="px-4 py-4 text-right font-mono text-emerald-400">{formatCurrency(p.revenue)}</td>)}</tr>
                    <tr className="bg-indigo-500/5"><td className="px-8 py-4 font-black text-indigo-300 uppercase italic">EBITDA</td>{res.months.map((p, i) => <td key={i} className="px-4 py-4 text-right font-mono font-bold">{formatCurrency(p.ebitda)}</td>)}</tr>
                    <tr className="bg-slate-950 font-black"><td className="px-8 py-6 text-white text-base">CASH FLOW NETO</td>{res.months.map((p, i) => <td key={i} className="px-4 py-6 text-right font-mono text-lg text-blue-400 font-black">{formatCurrency(p.cf)}</td>)}</tr>
                 </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
             <header className="flex justify-between items-end">
              <div><h2 className="text-3xl font-black italic">Catálogo de Productos</h2><p className="text-slate-500 font-medium">Margen real de contribución unitaria.</p></div>
              <button onClick={() => setProducts([...products, {id: Date.now(), name: 'Nuevo Producto', cost: 0, margin: 30}])} className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg">+ PRODUCTO</button>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-slate-900 rounded-[32px] border border-slate-800 p-6 shadow-2xl">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3"><ShoppingCart className="text-indigo-400"/><input className="bg-transparent font-black outline-none" value={p.name} onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, name: e.target.value} : x))} /></div>
                      <button onClick={() => setProducts(products.filter(x => x.id !== p.id))} className="text-slate-700 hover:text-red-500"><Trash2 size={18}/></button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Costo Unit.</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm" value={p.cost} onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, cost: safeNum(e.target.value)} : x))} /></div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800"><label className="text-[9px] text-slate-500 block uppercase font-bold">Margen %</label><input type="number" className="w-full bg-transparent font-mono outline-none text-sm text-emerald-400" value={p.margin} onChange={e => setProducts(products.map(x => x.id === p.id ? {...x, margin: safeNum(e.target.value)} : x))} /></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

