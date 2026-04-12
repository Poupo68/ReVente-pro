import React from "react";
import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   ReVente Pro v3 — Plateforme B2E complète
   ─ Dark/Light mode
   ─ Séparation Admin / Employé (admin masqué pour les employés)
   ─ Familles (catégories) dynamiques gérées par l'admin
   ─ Registre des règlements signés
   ─ Utilisateurs connectés en temps réel (simulation)
   ─ Paiement en ligne (simulation Stripe-like)
   ─ Contrat de vente auto-généré
   ═══════════════════════════════════════════════════════════════════════ */

// ─── THEME CONTEXT ──────────────────────────────────────────────────────
const ThemeCtx = createContext();
function useTheme() { return useContext(ThemeCtx); }

// Theme classes helper — returns correct classes based on dark/light
function t(dark, light) {
  // This will be evaluated at render time via the hook
  return { dark, light };
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ["Informatique", "Véhicule", "Mobilier", "Téléphonie"];
const CONDITIONS = ["Neuf", "Très bon état", "Bon état", "État correct", "À rénover"];
const ADMIN_CODE = "admin2026";

const WINNER_GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTZ2OWp0ZXR6dHF1YjFkNXRiZWdnMnRsMGR1NjcxZmVoZWV3NXA5ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGgwMmhyNm9rOGR4eTRrZm04Y205cjRhOGI1OW10MWF6ZGVzMXE5eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXFtcGVqMjh0cHR4MzYxdWJhcjZwcjVpeDBhbXh3aDN1NnU2dDdtaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6fJ1BM7R2EBRDnxK/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHU5NjVlMDZnZ2tkcXZyMjBhdzdzYnNyMXlvN2ViYjBjNjV1ZjRnaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohzAu2U1tOafteBa0/giphy.gif",
];
const CONFETTI_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

const REGLEMENT_TEXT = `RÈGLEMENT DE VENTE INTERNE — CESSION DE MATÉRIEL D'OCCASION AUX SALARIÉS

PRÉAMBULE
La société [NOM DE L'ENTREPRISE], ci-après « l'Entreprise », organise la cession de matériel d'occasion à ses salariés via la plateforme « ReVente Pro ».

ARTICLE 1 — OBJET
Cession par enchères internes de biens mobiliers d'occasion de l'Entreprise à ses salariés.

ARTICLE 2 — ÉLIGIBILITÉ
Réservé aux salariés en contrat actif (CDI, CDD, alternance). Authentification obligatoire.

ARTICLE 3 — ÉTAT DU MATÉRIEL — CLAUSE « VENDU EN L'ÉTAT »
3.1. Matériel d'occasion ayant servi professionnellement. Fiche descriptive fournie.
3.2. Vendu « en l'état », tel qu'examiné via fiche et photographies.
3.3. L'Acquéreur reconnaît la nature d'occasion du bien.
3.4. L'Entreprise décline toute responsabilité pour défauts non apparents, usure normale ou inadéquation.

ARTICLE 4 — GARANTIES
4.1. Aucune garantie commerciale. Renonciation à réclamation sur l'état.
4.2. Garanties légales applicables (conformité 12 mois occasion, vices cachés art. 1641-1649 Code civil).

ARTICLE 5 — ENCHÈRES
5.1. Prix de réserve minimum. Enchères ascendantes.
5.2. Attribution au dernier enchérisseur à expiration. Notification par email.
5.3. Engagement ferme et définitif.
5.4. Non-paiement sous 5 jours ouvrables = annulation.

ARTICLE 6 — PAIEMENT ET RETRAIT
6.1. Paiement par virement, carte bancaire ou prélèvement sur salaire.
6.2. Retrait sous 10 jours ouvrables après paiement.
6.3. Transfert de propriété et risques au retrait.

ARTICLE 7 — RESPONSABILITÉ
7.1. Après retrait, décharge totale de l'Entreprise.
7.2. Véhicules : carte grise et assurance obligatoires.
7.3. Informatique : données effacées, aucune licence fournie.

ARTICLE 8 — DONNÉES PERSONNELLES
Traitement RGPD. Conservation 3 ans.

⚠️ Ce règlement est une ébauche à faire valider par un conseil juridique.`;

// ─── UTILS ──────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function timeLeft(end) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return { text: "Terminée", urgent: true, ended: true };
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return { text: `${d}j ${h}h ${m}min`, urgent: false, ended: false };
  if (h > 0) return { text: `${h}h ${m}min ${s}s`, urgent: h < 2, ended: false };
  return { text: `${m}min ${s}s`, urgent: true, ended: false };
}
function euro(n) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n); }
function fmtDate(d) { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)); }
function fmtDateShort(d) { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d)); }
function fileToBase64(f) { return new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); }); }

// ─── ICONS ──────────────────────────────────────────────────────────────
const Ic = {
  bolt: (c,s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  back: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>,
  search: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  clock: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  plus: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  edit: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  cam: (c,s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  x: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  mail: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  trophy: (c,s=24) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20v2"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 19.24 17 20v2"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>,
  down: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  doc: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  sun: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  users: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  card: (c,s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  folder: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  file: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  eye: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  building: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 18h6v4H9z"/></svg>,
};

// ─── THEME-AWARE CLASSES ────────────────────────────────────────────────
function useT() {
  const { dark } = useTheme();
  return (darkCls, lightCls) => dark ? darkCls : lightCls;
}

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────
function Countdown({ endDate }) {
  const [t, setT] = useState(timeLeft(endDate));
  useEffect(() => { const iv = setInterval(() => setT(timeLeft(endDate)), 1000); return () => clearInterval(iv); }, [endDate]);
  return <span className={`font-mono text-sm tracking-wide ${t.ended ? "text-red-500" : t.urgent ? "text-amber-600" : "text-emerald-600"}`}>{t.ended ? "⏹ Terminée" : `⏱ ${t.text}`}</span>;
}

function CatBadge({ cat, categories }) {
  const c = ["indigo", "purple", "amber", "rose", "teal", "orange", "cyan", "pink"];
  const idx = (categories || []).indexOf(cat);
  const col = c[idx >= 0 ? idx % c.length : 0];
  const { dark } = useTheme();
  return <span className={`text-[11px] px-2.5 py-1 rounded-full border ${dark ? `bg-${col}-950 text-${col}-300 border-${col}-800/40` : `bg-${col}-50 text-${col}-600 border-${col}-200`}`}>{cat}</span>;
}

function CondBadge({ cond }) {
  const m = { "Neuf": "text-emerald-600", "Très bon état": "text-emerald-600", "Bon état": "text-blue-600", "État correct": "text-amber-600", "À rénover": "text-red-500" };
  return <span className={`text-xs ${m[cond] || "text-slate-500"}`}>● {cond}</span>;
}

// ─── CONFETTI ───────────────────────────────────────────────────────────
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); c.width = c.offsetWidth; c.height = c.offsetHeight;
    const ps = Array.from({ length: 120 }, () => ({ x: Math.random()*c.width, y: Math.random()*c.height-c.height, w: 5+Math.random()*7, h: 3+Math.random()*5, color: CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)], vx: (Math.random()-0.5)*4, vy: 2+Math.random()*5, rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.3 }));
    let raf; function draw() { ctx.clearRect(0,0,c.width,c.height); ps.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vy+=0.04; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); }); if(ps.some(p=>p.y<c.height+30)) raf=requestAnimationFrame(draw); } draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none z-10"/>;
}

// ─── WINNER MODAL ───────────────────────────────────────────────────────
function WinnerModal({ winner, onClose, onPay }) {
  const gif = useMemo(() => WINNER_GIFS[Math.floor(Math.random()*WINNER_GIFS.length)], []);
  const [emailSent, setEmailSent] = useState(false);
  const tc = useT();
  useEffect(() => { const t = setTimeout(() => setEmailSent(true), 2200); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <Confetti/>
      <div className={`relative z-20 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-3xl p-8 max-w-lg w-full text-center animate-bounceIn`} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center mb-4">{Ic.trophy("#f59e0b",52)}</div>
        <h2 className={`text-3xl font-black ${tc("text-white","text-slate-900")} mb-2`} style={{fontFamily:"'Dela Gothic One',system-ui"}}>FÉLICITATIONS !</h2>
        <p className={tc("text-gray-300","text-slate-600")}><span className="text-indigo-500 font-semibold">{winner.name}</span>, vous avez remporté :</p>
        <p className={`text-xl font-bold ${tc("text-white","text-slate-900")} mb-5`}>{winner.title} — {euro(winner.amount)}</p>
        <div className={`rounded-2xl overflow-hidden border ${tc("border-gray-700 bg-gray-800","border-slate-200 bg-slate-100")} mb-5 mx-auto max-w-xs`}>
          <img src={gif} alt="Celebration!" className="w-full h-48 object-cover" onError={e=>{e.target.style.display="none"}}/>
        </div>
        <div className={`flex items-center justify-center gap-2 text-sm mb-5 transition-all duration-700 ${emailSent ? "text-emerald-500" : tc("text-gray-500","text-slate-400")}`}>
          {Ic.mail(emailSent?"#10b981":"#94a3b8",16)}
          {emailSent ? <span>Email de confirmation envoyé !</span> : <span className="animate-pulse">Envoi...</span>}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className={`px-6 py-3 rounded-xl font-medium ${tc("bg-gray-800 text-gray-300 hover:bg-gray-700","bg-slate-100 text-slate-600 hover:bg-slate-200")} transition-colors`}>Plus tard</button>
          <button onClick={()=>{onClose();onPay(winner);}} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2">
            {Ic.card("#fff",16)} Payer maintenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ──────────────────────────────────────────────────────
function PaymentModal({ payment, onClose, onConfirm }) {
  const tc = useT();
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const pay = () => {
    if (cardNum.length < 16 || expiry.length < 4 || cvc.length < 3) return;
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setDone(true); setTimeout(() => { onConfirm(payment); }, 1500); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 max-w-md w-full animate-fadeIn`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>Paiement sécurisé</h2>
          <button onClick={onClose} className={tc("text-gray-500","text-slate-400")}>{Ic.x()}</button>
        </div>
        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">{Ic.check("#10b981",32)}</div>
            <p className={`text-lg font-semibold ${tc("text-white","text-slate-900")}`}>Paiement confirmé !</p>
            <p className={tc("text-gray-400","text-slate-500")}>Votre contrat de vente est disponible.</p>
          </div>
        ) : (
          <>
            <div className={`${tc("bg-gray-800","bg-indigo-50")} rounded-xl p-4 mb-6`}>
              <p className={`text-sm ${tc("text-gray-400","text-slate-500")}`}>Article : <span className={`font-medium ${tc("text-white","text-slate-900")}`}>{payment.title}</span></p>
              <p className={`text-2xl font-bold ${tc("text-white","text-slate-900")} mt-1`}>{euro(payment.amount)}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Numéro de carte</label>
                <input value={cardNum} onChange={e=>setCardNum(e.target.value.replace(/\D/g,"").slice(0,16))} placeholder="4242 4242 4242 4242"
                  className={`w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Expiration</label>
                  <input value={expiry} onChange={e=>setExpiry(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="MM/AA"
                    className={`w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`}/>
                </div>
                <div>
                  <label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>CVC</label>
                  <input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="123"
                    className={`w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`}/>
                </div>
              </div>
            </div>
            <button onClick={pay} disabled={processing}
              className={`w-full mt-6 font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] ${processing ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-500"} text-white`}>
              {processing ? "Traitement en cours..." : `Payer ${euro(payment.amount)}`}
            </button>
            <p className={`text-center text-[10px] mt-3 ${tc("text-gray-600","text-slate-400")}`}>🔒 Paiement sécurisé — Simulation (aucune donnée réelle transmise)</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SALE CONTRACT ──────────────────────────────────────────────────────
function ContractModal({ contract, onClose, companyName }) {
  const tc = useT();
  const cn = companyName || "Mon Entreprise";
  return (
    <div className="fixed inset-0 z-[997] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-fadeIn`} style={{scrollbarWidth:"thin"}}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} flex items-center gap-2`}>{Ic.file(null,18)} Contrat de vente</h2>
          <button onClick={onClose} className={tc("text-gray-500","text-slate-400")}>{Ic.x()}</button>
        </div>
        <div className={`${tc("bg-gray-800","bg-slate-50")} rounded-xl p-6 text-sm leading-relaxed ${tc("text-gray-300","text-slate-600")} whitespace-pre-line`}>
{`CONTRAT DE VENTE DE MATÉRIEL D'OCCASION
────────────────────────────────────────

ENTRE LES SOUSSIGNÉS :

${cn}, dont le siège social est situé à [ADRESSE],
ci-après dénommée « le Vendeur »,

ET

${contract.buyerName},
salarié(e) de ${cn},
ci-après dénommé(e) « l'Acquéreur »,

IL A ÉTÉ CONVENU CE QUI SUIT :

ARTICLE 1 — OBJET
Le Vendeur cède à l'Acquéreur le bien suivant :
  • Désignation : ${contract.itemTitle}
  • Description : ${contract.itemDescription}
  • État : ${contract.itemCondition}
  • Catégorie : ${contract.itemCategory}

ARTICLE 2 — PRIX
Le prix de vente est fixé à ${euro(contract.amount)}, résultant de l'enchère remportée le ${fmtDate(contract.date)}.
Le paiement a été effectué le ${fmtDate(contract.paidAt)}.

ARTICLE 3 — ÉTAT DU BIEN
Le bien est vendu « EN L'ÉTAT », tel que l'Acquéreur a pu l'examiner.
L'Acquéreur déclare avoir pris connaissance de l'état du bien et l'accepter.

ARTICLE 4 — GARANTIES
Le bien est vendu sans garantie commerciale du Vendeur.
Les garanties légales (conformité 12 mois, vices cachés) restent applicables.

ARTICLE 5 — TRANSFERT DE PROPRIÉTÉ
Le transfert de propriété s'opère au moment du retrait effectif.
À compter du retrait, le Vendeur est déchargé de toute responsabilité.

ARTICLE 6 — RÈGLEMENT INTÉRIEUR
L'Acquéreur a accepté le règlement de vente interne le ${fmtDate(contract.rulesAcceptedAt)}.

Fait en deux exemplaires, le ${fmtDateShort(contract.paidAt)}.`}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl transition-all active:scale-95">Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ──────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  const tc = useT();
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-sm w-full animate-fadeIn`}>
        <p className={`${tc("text-white","text-slate-900")} text-center mb-6`}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 ${tc("bg-gray-800 text-gray-300 hover:bg-gray-700","bg-slate-100 text-slate-600 hover:bg-slate-200")} py-2.5 rounded-xl transition-colors`}>Annuler</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl transition-colors">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM FORM (Admin only) ─────────────────────────────────────────────
function ItemForm({ item, onSave, onCancel, categories }) {
  const tc = useT();
  const isEdit = !!item;
  const [form, setForm] = useState({ title: item?.title||"", description: item?.description||"", category: item?.category||categories[0]||"", condition: item?.condition||CONDITIONS[2], reservePrice: item?.reservePrice?.toString()||"", durationHours: "72", photos: item?.photos||[] });
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setError(""); };

  const handlePhotos = async(e) => {
    const files = Array.from(e.target.files);
    if (files.length+form.photos.length>6) return setError("Maximum 6 photos.");
    const photos = [];
    for(const f of files){ if(f.size>5*1024*1024) return setError("Max 5 Mo/photo."); photos.push(await fileToBase64(f)); }
    set("photos",[...form.photos,...photos]);
    if(fileRef.current) fileRef.current.value="";
  };

  const save = () => {
    if(!form.title.trim()) return setError("Titre obligatoire.");
    if(!form.description.trim()) return setError("Description obligatoire.");
    const price = parseFloat(form.reservePrice);
    if(isNaN(price)||price<=0) return setError("Prix invalide.");
    if(!isEdit){ const h=parseFloat(form.durationHours); if(isNaN(h)||h<1) return setError("Durée min. 1h."); }
    if(form.photos.length===0 || !form.photos.some(p => p.startsWith("data:") || p.startsWith("emoji:"))) return setError("Ajoutez au moins une photo.");
    onSave({ id: item?.id||uid(), title: form.title.trim(), description: form.description.trim(), category: form.category, condition: form.condition, reservePrice: price, currentPrice: isEdit?(item.currentPrice||price):price, startDate: item?.startDate||new Date().toISOString(), endDate: isEdit?item.endDate:new Date(Date.now()+parseFloat(form.durationHours)*3600000).toISOString(), photos: form.photos, bids: item?.bids||[], status: "ACTIVE" });
  };

  const inputCls = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 w-full max-w-2xl my-8 animate-fadeIn`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>{isEdit?"Modifier":"Nouvel article"}</h2>
          <button onClick={onCancel} className={tc("text-gray-500","text-slate-400")}>{Ic.x()}</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className={`text-[10px] uppercase tracking-wider block mb-2 ${tc("text-gray-400","text-slate-500")}`}>Photos (max. 6) *</label>
            <div className="flex flex-wrap gap-3">
              {form.photos.map((p,i)=>(
                <div key={i} className={`relative w-20 h-20 rounded-xl overflow-hidden border ${tc("border-gray-700","border-slate-200")} group flex items-center justify-center ${tc("bg-gray-800","bg-slate-50")}`}>
                  {p.startsWith("emoji:") ? <span className="text-3xl">{p.replace("emoji:","")}</span> : <img src={p} alt="" className="w-full h-full object-cover"/>}
                  <button onClick={()=>set("photos",form.photos.filter((_,j)=>j!==i))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">{Ic.trash("#ef4444",18)}</button>
                </div>
              ))}
              {form.photos.length<6 && (
                <button onClick={()=>fileRef.current?.click()} className={`w-20 h-20 rounded-xl border-2 border-dashed ${tc("border-gray-700 text-gray-500 hover:border-indigo-500 hover:text-indigo-400","border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500")} transition-colors flex flex-col items-center justify-center`}>
                  {Ic.cam(null,22)}<span className="text-[9px] mt-1">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos}/>
          </div>
          <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Titre *</label><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Ex: MacBook Pro 16&quot;" className={inputCls}/></div>
          <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Description *</label><textarea value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Descriptif technique..." rows={4} className={`${inputCls} resize-none`}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Catégorie</label><select value={form.category} onChange={e=>set("category",e.target.value)} className={inputCls}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>État</label><select value={form.condition} onChange={e=>set("condition",e.target.value)} className={inputCls}>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Prix réserve (€) *</label><input type="number" value={form.reservePrice} onChange={e=>set("reservePrice",e.target.value)} placeholder="450" className={inputCls}/></div>
            {!isEdit&&<div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Durée (heures)</label><input type="number" value={form.durationHours} onChange={e=>set("durationHours",e.target.value)} placeholder="72" className={inputCls}/></div>}
          </div>
          {error&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className={`flex-1 ${tc("bg-gray-800 text-gray-300 hover:bg-gray-700","bg-slate-100 text-slate-600 hover:bg-slate-200")} py-3 rounded-xl transition-colors font-medium`}>Annuler</button>
            <button onClick={save} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-all active:scale-[0.98] font-semibold">{isEdit?"Enregistrer":"Publier"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM CARD ──────────────────────────────────────────────────────────
function ItemCard({ item, onClick, categories }) {
  const tc = useT();
  const photo0 = item.photos?.[0]||"";
  const isEmoji = photo0.startsWith("emoji:");
  const hasImg = photo0.startsWith("data:");
  const ended = timeLeft(item.endDate).ended;
  return (
    <button onClick={()=>onClick(item)} className={`group text-left ${tc("bg-gray-900 border-gray-800 hover:border-indigo-700/50","bg-white border-slate-200 hover:border-indigo-300")} border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg focus:outline-none ${ended?"opacity-60":""}`}>
      <div className={`relative h-44 ${tc("bg-gray-800","bg-slate-100")} overflow-hidden`}>
        {hasImg ? <img src={photo0} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : isEmoji ? <div className="w-full h-full flex items-center justify-center"><span className="text-6xl group-hover:scale-110 transition-transform duration-500">{photo0.replace("emoji:","")}</span></div> : <div className="w-full h-full flex items-center justify-center">{Ic.cam("#94a3b8",48)}</div>}
        <div className="absolute top-3 left-3"><CatBadge cat={item.category} categories={categories}/></div>
        <div className={`absolute bottom-3 right-3 ${tc("bg-black/70","bg-white/90")} backdrop-blur-sm rounded-lg px-3 py-1.5`}><Countdown endDate={item.endDate}/></div>
        {ended&&<div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">TERMINÉE</span></div>}
      </div>
      <div className="p-5">
        <h3 className={`${tc("text-white group-hover:text-indigo-400","text-slate-900 group-hover:text-indigo-600")} font-semibold text-sm mb-1 transition-colors line-clamp-1`}>{item.title}</h3>
        <CondBadge cond={item.condition}/>
        <div className="mt-4 flex items-end justify-between">
          <div><div className={`text-[10px] ${tc("text-gray-500","text-slate-400")} uppercase tracking-wider mb-0.5`}>Enchère actuelle</div><div className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>{euro(item.currentPrice)}</div></div>
          <div className={`text-xs ${tc("text-gray-500","text-slate-400")}`}>{item.bids?.length||0} enchère{(item.bids?.length||0)!==1?"s":""}</div>
        </div>
      </div>
    </button>
  );
}

// ─── ITEM DETAIL ────────────────────────────────────────────────────────
function ItemDetail({ item: orig, items, onBack, user, onBid, onWin, categories }) {
  const tc = useT();
  const item = items.find(i=>i.id===orig.id)||orig;
  const [bidAmount, setBidAmount] = useState("");
  const [bidStatus, setBidStatus] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [winShown, setWinShown] = useState(false);
  const ended = timeLeft(item.endDate).ended;
  const bids = item.bids||[];
  const minBid = item.currentPrice+(item.currentPrice<100?5:item.currentPrice<1000?10:50);
  const photo0 = item.photos?.[0]||"";
  const isEmoji = photo0.startsWith("emoji:");
  const hasImg = photo0.startsWith("data:");
  const lastBid = bids.length>0?bids[bids.length-1]:null;

  useEffect(()=>{
    if(ended && lastBid && !winShown){
      const isMe = lastBid.employee?.firstName===user.firstName && lastBid.employee?.lastName===(user.lastName.charAt(0)+".");
      if(isMe){ setWinShown(true); onWin({name:`${user.firstName} ${user.lastName}`,title:item.title,amount:lastBid.amount, itemId:item.id, description:item.description, condition:item.condition, category:item.category}); }
    }
  },[ended,lastBid,winShown]);

  const handleBid = () => {
    if(ended) return;
    const amt = parseFloat(bidAmount);
    if(isNaN(amt)||amt<minBid) return setBidStatus({t:"err",m:`Min. ${euro(minBid)}`});
    const newBid = {id:uid(),amount:amt,employee:{firstName:user.firstName,lastName:user.lastName.charAt(0)+"."},createdAt:new Date().toISOString()};
    onBid(item.id,amt,[...bids,newBid]);
    setBidAmount(""); setBidStatus({t:"ok",m:`Enchère de ${euro(amt)} enregistrée !`});
    setTimeout(()=>setBidStatus(null),4000);
  };

  const quickBids = [minBid, minBid+(item.currentPrice<1000?20:100), minBid+(item.currentPrice<1000?50:250)];
  const inputCls = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className={`flex items-center gap-2 ${tc("text-gray-400 hover:text-white","text-slate-500 hover:text-slate-900")} mb-6 transition-colors group`}>
        <span className="group-hover:-translate-x-1 transition-transform">{Ic.back()}</span> Retour
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-5">
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl overflow-hidden`}>
            <div className={`h-72 sm:h-96 ${tc("bg-gray-800","bg-slate-100")} flex items-center justify-center`}>
              {hasImg ? <img src={item.photos[photoIdx]||item.photos[0]} alt={item.title} className={`w-full h-full object-contain ${tc("bg-black","bg-slate-50")}`}/> : isEmoji ? <span className="text-8xl">{photo0.replace("emoji:","")}</span> : <span>{Ic.cam("#94a3b8",64)}</span>}
            </div>
            {item.photos?.length>1 && hasImg && <div className="flex gap-2 p-3 overflow-x-auto">{item.photos.filter(p=>p.startsWith("data:")).map((p,i)=><button key={i} onClick={()=>setPhotoIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${i===photoIdx?"border-indigo-500":"border-transparent hover:border-slate-300"}`}><img src={p} alt="" className="w-full h-full object-cover"/></button>)}</div>}
          </div>
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
            <h2 className={`text-base font-semibold ${tc("text-white","text-slate-900")} mb-3 flex items-center gap-2`}>{Ic.doc(null,16)} Descriptif</h2>
            <p className={`${tc("text-gray-300","text-slate-600")} leading-relaxed text-sm whitespace-pre-line`}>{item.description}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              {[["Catégorie",item.category],["État",item.condition],["Début",fmtDate(item.startDate)],["Fin",fmtDate(item.endDate)]].map(([l,v])=>(
                <div key={l} className={`${tc("bg-gray-800","bg-slate-50")} rounded-xl p-3`}>
                  <div className={`text-[10px] ${tc("text-gray-500","text-slate-400")} uppercase tracking-wider`}>{l}</div>
                  <div className={`${tc("text-white","text-slate-900")} text-sm mt-0.5`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-2"><CatBadge cat={item.category} categories={categories}/><CondBadge cond={item.condition}/></div>
            <h1 className={`text-xl font-bold ${tc("text-white","text-slate-900")} mt-3`}>{item.title}</h1>
            <div className={`mt-5 ${tc("bg-indigo-950/30 border-indigo-800/30","bg-indigo-50 border-indigo-200")} border rounded-xl p-5`}>
              <div className="flex justify-between items-center">
                <div><div className="text-[10px] text-indigo-500 uppercase tracking-wider font-medium">Enchère actuelle</div><div className={`text-3xl font-bold ${tc("text-white","text-slate-900")} mt-1`}>{euro(item.currentPrice)}</div></div>
                <div className="text-right"><div className={`text-[10px] ${tc("text-gray-500","text-slate-400")}`}>Réserve</div><div className={`text-sm ${tc("text-gray-400","text-slate-500")}`}>{euro(item.reservePrice)}</div></div>
              </div>
              <div className={`mt-4 pt-3 border-t ${tc("border-indigo-800/20","border-indigo-100")}`}><Countdown endDate={item.endDate}/></div>
            </div>
            {!ended ? (
              <div className="mt-5">
                <label className={`text-[10px] uppercase tracking-wider block mb-2 ${tc("text-gray-400","text-slate-500")}`}>Votre enchère (min. {euro(minBid)})</label>
                <div className="flex gap-2">
                  <input type="number" value={bidAmount} onChange={e=>setBidAmount(e.target.value)} placeholder={minBid.toString()} onKeyDown={e=>e.key==="Enter"&&handleBid()} className={`flex-1 text-lg ${inputCls}`}/>
                  <button onClick={handleBid} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 rounded-xl transition-all active:scale-95">Enchérir</button>
                </div>
                <div className="flex gap-2 mt-2">{quickBids.map(q=><button key={q} onClick={()=>setBidAmount(q.toString())} className={`flex-1 ${tc("bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700","bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200")} text-xs py-2 rounded-lg transition-colors border`}>{euro(q)}</button>)}</div>
                {bidStatus&&<div className={`mt-3 p-3 rounded-xl text-sm animate-fadeIn ${bidStatus.t==="ok"?"bg-emerald-50 border border-emerald-200 text-emerald-600":"bg-red-50 border border-red-200 text-red-600"}`}>{bidStatus.t==="ok"?"✓":"✕"} {bidStatus.m}</div>}
              </div>
            ) : (
              <div className={`mt-5 p-4 rounded-xl ${tc("bg-gray-800 border-gray-700","bg-slate-50 border-slate-200")} border text-center`}>
                {lastBid ? (<><p className="text-amber-600 font-semibold mb-1">Remportée par</p><p className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>{lastBid.employee.firstName} {lastBid.employee.lastName}</p><p className="text-indigo-500 font-semibold">{euro(lastBid.amount)}</p></>) : <p className={tc("text-gray-400","text-slate-500")}>Aucune enchère — non vendu.</p>}
              </div>
            )}
          </div>
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
            <h3 className={`text-sm font-semibold ${tc("text-white","text-slate-900")} mb-4 flex items-center gap-2`}>{Ic.clock(null,16)} Historique ({bids.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1" style={{scrollbarWidth:"thin"}}>
              {bids.length===0 ? <p className={`text-sm text-center py-6 ${tc("text-gray-500","text-slate-400")}`}>Soyez le premier !</p>
              : [...bids].reverse().map((bid,i)=>(
                <div key={bid.id} className={`flex items-center justify-between p-3 rounded-xl text-sm ${i===0?`${tc("bg-indigo-950/30 border-indigo-800/30","bg-indigo-50 border-indigo-200")} border`:tc("bg-gray-800/50","bg-slate-50")}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i===0?"bg-indigo-600 text-white":tc("bg-gray-700 text-gray-300","bg-slate-200 text-slate-600")}`}>{bid.employee.firstName.charAt(0)}{bid.employee.lastName.charAt(0)}</div>
                    <div><div className={tc("text-white","text-slate-900")}>{bid.employee.firstName} {bid.employee.lastName}</div><div className={`text-[11px] ${tc("text-gray-500","text-slate-400")}`}>{fmtDate(bid.createdAt)}</div></div>
                  </div>
                  <div className={`font-semibold ${i===0?"text-indigo-500":tc("text-gray-300","text-slate-600")}`}>{euro(bid.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: COMPANY NAME EDITOR ─────────────────────────────────────────
function CompanyEditor({ companyName, onSave, onClose }) {
  const tc = useT();
  const [name, setName] = useState(companyName);
  const inputCls = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-md w-full animate-fadeIn`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} flex items-center gap-2`}>{Ic.building(null,18)} Nom de l'entreprise</h2>
          <button onClick={onClose} className={tc("text-gray-500","text-slate-400")}>{Ic.x()}</button>
        </div>
        <p className={`text-sm mb-4 ${tc("text-gray-400","text-slate-500")}`}>Ce nom apparaîtra dans l'application, le règlement et les contrats de vente.</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom de votre entreprise" className={inputCls}/>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className={`flex-1 ${tc("bg-gray-800 text-gray-300 hover:bg-gray-700","bg-slate-100 text-slate-600 hover:bg-slate-200")} py-2.5 rounded-xl transition-colors`}>Annuler</button>
          <button onClick={()=>{if(name.trim())onSave(name.trim());}} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition-all">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: CATEGORY MANAGER ────────────────────────────────────────────
function CategoryManager({ categories, onChange, onClose }) {
  const tc = useT();
  const [newCat, setNewCat] = useState("");
  const add = () => { if(newCat.trim() && !categories.includes(newCat.trim())){ onChange([...categories,newCat.trim()]); setNewCat(""); }};
  const remove = (c) => onChange(categories.filter(x=>x!==c));
  const inputCls = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-md w-full animate-fadeIn`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} flex items-center gap-2`}>{Ic.folder(null,18)} Familles d'articles</h2>
          <button onClick={onClose} className={tc("text-gray-500","text-slate-400")}>{Ic.x()}</button>
        </div>
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {categories.map(c=>(
            <div key={c} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}>
              <span className={tc("text-white","text-slate-900")}>{c}</span>
              <button onClick={()=>remove(c)} className="text-red-500 hover:text-red-400 transition-colors">{Ic.trash(null,14)}</button>
            </div>
          ))}
          {categories.length===0&&<p className={`text-center text-sm py-4 ${tc("text-gray-500","text-slate-400")}`}>Aucune famille.</p>}
        </div>
        <div className="flex gap-2">
          <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nouvelle famille..." className={inputCls}/>
          <button onClick={add} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-all">{Ic.plus("#fff",18)}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────
function AdminDash({ items, onAdd, onEdit, onDelete, categories, onManageCats, signataires, connectedUsers, sales, onViewContract, companyName, onEditCompany }) {
  const tc = useT();
  const [delTarget, setDelTarget] = useState(null);
  const [tab, setTab] = useState("articles");
  const totalVal = items.reduce((s,i)=>s+i.currentPrice,0);
  const totalBids = items.reduce((s,i)=>s+(i.bids?.length||0),0);
  const active = items.filter(i=>!timeLeft(i.endDate).ended).length;

  const tabBtn = (id,label,icon) => <button onClick={()=>setTab(id)} className={`text-sm px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${tab===id ? "bg-indigo-600 border-indigo-600 text-white" : `${tc("bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700","bg-white border-slate-200 text-slate-600 hover:bg-slate-50")} `}`}>{icon}{label}</button>;

  return (
    <div className="animate-fadeIn">
      {delTarget&&<ConfirmModal message={`Supprimer « ${delTarget.title} » ?`} onConfirm={()=>{onDelete(delTarget.id);setDelTarget(null);}} onCancel={()=>setDelTarget(null)}/>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div><h2 className={`text-2xl font-bold ${tc("text-white","text-slate-900")}`}>Administration</h2><p className={`text-sm mt-1 ${tc("text-gray-400","text-slate-500")}`}>Gestion complète de la plateforme</p></div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${tc("bg-emerald-950/30 border-emerald-800/30","bg-emerald-50 border-emerald-200")} border`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/><span className={`text-sm font-medium ${tc("text-emerald-400","text-emerald-600")}`}>{connectedUsers.length} en ligne</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[{l:"Articles",v:items.length,i:"📦"},{l:"Actives",v:active,i:"🔥"},{l:"Enchères",v:totalBids,i:"🏷️"},{l:"Ventes",v:sales.length,i:"💰"}].map(k=>(
          <div key={k.l} className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-5`}>
            <div className="text-2xl mb-2">{k.i}</div><div className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>{k.v}</div><div className={`text-[10px] ${tc("text-gray-500","text-slate-400")} uppercase tracking-wider mt-1`}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
        {tabBtn("articles","Articles",Ic.doc(null,14))}
        {tabBtn("users","Connectés",Ic.users(null,14))}
        {tabBtn("signatures","Signatures",Ic.check(null,14))}
        {tabBtn("sales","Ventes",Ic.card(null,14))}
        <button onClick={onManageCats} className={`text-sm px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${tc("bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700","bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}`}>{Ic.folder(null,14)} Familles</button>
        <button onClick={onEditCompany} className={`text-sm px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${tc("bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700","bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}`}>{Ic.building(null,14)} {companyName}</button>
        <button onClick={onAdd} className="text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5">{Ic.plus("#fff",14)} Article</button>
      </div>

      {/* Tab content */}
      {tab==="articles" && (
        items.length===0 ? (
          <div className={`text-center py-20 ${tc("bg-gray-900/50 border-gray-800","bg-white border-slate-200")} border rounded-2xl`}>
            <div className="text-5xl mb-4">📭</div><p className={tc("text-gray-400","text-slate-500")}>Aucun article.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item=>{const ended=timeLeft(item.endDate).ended;const p0=item.photos?.[0]||"";const hasImg=p0.startsWith("data:");const isEmoji=p0.startsWith("emoji:");return(
              <div key={item.id} className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${ended?"opacity-60":""}`}>
                <div className={`w-14 h-14 rounded-xl overflow-hidden ${tc("bg-gray-800","bg-slate-100")} flex-shrink-0 flex items-center justify-center`}>{hasImg?<img src={p0} alt="" className="w-full h-full object-cover"/>:isEmoji?<span className="text-2xl">{p0.replace("emoji:","")}</span>:<span>{Ic.cam("#94a3b8",18)}</span>}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap"><span className={`${tc("text-white","text-slate-900")} font-medium text-sm truncate`}>{item.title}</span><CatBadge cat={item.category} categories={categories}/></div>
                  <div className={`flex items-center gap-3 text-xs ${tc("text-gray-400","text-slate-500")} flex-wrap`}><span>Rés: {euro(item.reservePrice)}</span><span>Act: <span className={`font-medium ${tc("text-white","text-slate-900")}`}>{euro(item.currentPrice)}</span></span><span>{item.bids?.length||0} ench.</span><Countdown endDate={item.endDate}/></div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>onEdit(item)} className={`${tc("bg-gray-800 hover:bg-gray-700 text-gray-300","bg-slate-100 hover:bg-slate-200 text-slate-600")} p-2.5 rounded-xl transition-colors`}>{Ic.edit()}</button>
                  <button onClick={()=>setDelTarget(item)} className={`${tc("bg-gray-800 hover:bg-red-900/50 text-gray-300","bg-slate-100 hover:bg-red-50 text-slate-600")} hover:text-red-500 p-2.5 rounded-xl transition-colors`}>{Ic.trash()}</button>
                </div>
              </div>
            );})}
          </div>
        )
      )}

      {tab==="users" && (
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
          <h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4 flex items-center gap-2`}>{Ic.users(null,16)} Utilisateurs connectés ({connectedUsers.length})</h3>
          {connectedUsers.length===0 ? <p className={tc("text-gray-500","text-slate-400")}>Personne n'est connecté.</p> : (
            <div className="space-y-2">{connectedUsers.map((u,i)=>(
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"/><div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.firstName.charAt(0)}{u.lastName.charAt(0)}</div>
                <div><div className={tc("text-white","text-slate-900")}>{u.firstName} {u.lastName}</div><div className={`text-xs ${tc("text-gray-500","text-slate-400")}`}>Connecté depuis {fmtDate(u.connectedAt)}</div></div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {tab==="signatures" && (
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
          <h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4 flex items-center gap-2`}>{Ic.check(null,16)} Règlements signés ({signataires.length})</h3>
          {signataires.length===0 ? <p className={tc("text-gray-500","text-slate-400")}>Aucune signature.</p> : (
            <div className="space-y-2">{signataires.map((s,i)=>(
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}>
                <div className="flex items-center gap-3"><div className={`w-8 h-8 ${tc("bg-gray-700","bg-slate-200")} rounded-full flex items-center justify-center text-xs font-bold ${tc("text-gray-300","text-slate-600")}`}>{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div><span className={tc("text-white","text-slate-900")}>{s.firstName} {s.lastName}</span></div>
                <span className={`text-xs ${tc("text-gray-500","text-slate-400")}`}>{fmtDate(s.signedAt)}</span>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {tab==="sales" && (
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
          <h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4 flex items-center gap-2`}>{Ic.card(null,16)} Ventes réalisées ({sales.length})</h3>
          {sales.length===0 ? <p className={tc("text-gray-500","text-slate-400")}>Aucune vente.</p> : (
            <div className="space-y-2">{sales.map((s,i)=>(
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}>
                <div><div className={tc("text-white","text-slate-900")}>{s.itemTitle}</div><div className={`text-xs ${tc("text-gray-500","text-slate-400")}`}>Acheteur : {s.buyerName} — {fmtDate(s.paidAt)}</div></div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-500 font-semibold">{euro(s.amount)}</span>
                  <button onClick={()=>onViewContract(s)} className="text-indigo-500 hover:text-indigo-400 transition-colors">{Ic.eye(null,16)}</button>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LOGIN SCREEN ───────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const tc = useT();
  const { dark, toggle } = useTheme();
  const [mode, setMode] = useState("employee"); // employee | admin
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if(mode==="employee"){
      if(!firstName.trim()||!lastName.trim()) return setError("Nom et prénom obligatoires.");
      onLogin({firstName:firstName.trim(),lastName:lastName.trim(),isAdmin:false});
    } else {
      if(adminCode!==ADMIN_CODE) return setError("Code administrateur invalide.");
      onLogin({firstName:"Admin",lastName:"",isAdmin:true});
    }
  };

  const inputCls = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${tc("bg-gray-950","bg-slate-50")}`}>
      <div className="w-full max-w-md animate-fadeIn">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">{Ic.bolt("#fff",26)}</div>
            <span className={`text-2xl font-bold tracking-tight ${tc("text-white","text-slate-900")}`} style={{fontFamily:"'DM Sans',system-ui"}}>ReVente Pro</span>
          </div>
          <p className={tc("text-gray-400","text-slate-500")}>Enchères internes — Accès collaborateurs</p>
        </div>

        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-8`}>
          {/* Mode toggle */}
          <div className={`flex rounded-xl p-1 mb-6 ${tc("bg-gray-800","bg-slate-100")}`}>
            <button onClick={()=>{setMode("employee");setError("");}} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode==="employee"?"bg-indigo-600 text-white shadow":"text-slate-500"}`}>Collaborateur</button>
            <button onClick={()=>{setMode("admin");setError("");}} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode==="admin"?"bg-indigo-600 text-white shadow":"text-slate-500"}`}>Administrateur</button>
          </div>

          {mode==="employee" ? (
            <div className="space-y-4">
              <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Prénom</label><input value={firstName} onChange={e=>{setFirstName(e.target.value);setError("");}} placeholder="Jean" onKeyDown={e=>e.key==="Enter"&&submit()} className={inputCls}/></div>
              <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Nom</label><input value={lastName} onChange={e=>{setLastName(e.target.value);setError("");}} placeholder="Dupont" onKeyDown={e=>e.key==="Enter"&&submit()} className={inputCls}/></div>
            </div>
          ) : (
            <div><label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${tc("text-gray-400","text-slate-500")}`}>Code administrateur</label><input type="password" value={adminCode} onChange={e=>{setAdminCode(e.target.value);setError("");}} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} className={inputCls}/></div>
          )}

          {error&&<div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <button onClick={submit} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]">Se connecter</button>
        </div>

        {/* Theme toggle on login */}
        <div className="flex justify-center mt-6">
          <button onClick={toggle} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${tc("bg-gray-800 text-gray-400 hover:text-white","bg-white border border-slate-200 text-slate-500 hover:text-slate-900")} transition-colors`}>
            {dark?Ic.sun(null,16):Ic.moon(null,16)}<span>{dark?"Mode clair":"Mode sombre"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RULES SCREEN ───────────────────────────────────────────────────────
function RulesScreen({ onAccept, user, companyName }) {
  const tc = useT();
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const ref = useRef(null);
  const onScroll = () => { const el=ref.current; if(el&&el.scrollHeight-el.scrollTop-el.clientHeight<50) setScrolled(true); };
  const rulesWithCompany = REGLEMENT_TEXT.replace(/\[NOM DE L'ENTREPRISE\]/g, companyName || "Mon Entreprise");
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${tc("bg-gray-950","bg-slate-50")}`}>
      <div className="w-full max-w-2xl animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center">{Ic.check("#fff",22)}</div>
            <span className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>Règlement de vente</span>
          </div>
          <p className={tc("text-gray-400","text-slate-500")}>Lisez et acceptez avant de participer, {user.firstName}</p>
        </div>
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl overflow-hidden`}>
          <div ref={ref} onScroll={onScroll} className={`p-6 max-h-80 overflow-y-auto text-sm leading-relaxed whitespace-pre-line ${tc("text-gray-300","text-slate-600")}`} style={{scrollbarWidth:"thin"}}>{rulesWithCompany}</div>
          <div className={`p-6 border-t ${tc("border-gray-800 bg-gray-950","border-slate-200 bg-slate-50")}`}>
            {!scrolled&&<p className="text-amber-600 text-xs mb-4 flex items-center gap-1.5">{Ic.down(null,16)} Faites défiler pour débloquer</p>}
            <label className={`flex items-start gap-3 cursor-pointer ${!scrolled?"opacity-40 pointer-events-none":""}`}>
              <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"/>
              <span className={`text-sm ${tc("text-gray-300","text-slate-600")}`}>Je, <strong>{user.firstName} {user.lastName}</strong>, reconnais avoir lu et accepté le règlement.</span>
            </label>
            <button onClick={onAccept} disabled={!checked} className={`w-full mt-5 font-semibold py-3.5 rounded-xl transition-all ${checked?"bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]":"bg-slate-200 text-slate-400 cursor-not-allowed"}`}>Valider et accéder aux enchères</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   APP PRINCIPALE
   ═════════════════════════════════════════════════════════════════════════ */
// ── Shared global store that survives user switches ──
const _initItems = () => {
  const now = Date.now();
  return [
    { id:"demo-1", title:"MacBook Pro 16\" 2022", description:"MacBook Pro 16 pouces, puce M1 Pro, 16 Go RAM, 512 Go SSD. Batterie 87%. Quelques micro-rayures sur le capot. Chargeur MagSafe inclus.", category:"Informatique", condition:"Bon état", reservePrice:450, currentPrice:520, startDate:new Date(now-86400000*2).toISOString(), endDate:new Date(now+86400000*2).toISOString(), photos:["emoji:💻"], bids:[{id:"b1",amount:480,employee:{firstName:"Marie",lastName:"D."},createdAt:new Date(now-7200000).toISOString()},{id:"b2",amount:520,employee:{firstName:"Lucas",lastName:"M."},createdAt:new Date(now-3600000).toISOString()}], status:"ACTIVE" },
    { id:"demo-2", title:"Renault Clio V 2020", description:"Véhicule de fonction, 1.0 TCe 100ch. 67 432 km. Gris titanium. Révision complète. CT OK.", category:"Véhicule", condition:"Bon état", reservePrice:8500, currentPrice:9200, startDate:new Date(now-86400000).toISOString(), endDate:new Date(now+86400000*4).toISOString(), photos:["emoji:🚗"], bids:[{id:"b3",amount:8800,employee:{firstName:"Pierre",lastName:"L."},createdAt:new Date(now-36000000).toISOString()},{id:"b4",amount:9200,employee:{firstName:"Camille",lastName:"B."},createdAt:new Date(now-14400000).toISOString()}], status:"ACTIVE" },
    { id:"demo-3", title:"Bureau assis-debout IKEA Bekant", description:"Bureau réglable électrique, plateau blanc 160x80cm. Mécanisme parfait. Traces d'usure sur le plateau.", category:"Mobilier", condition:"État correct", reservePrice:120, currentPrice:155, startDate:new Date(now-86400000*3).toISOString(), endDate:new Date(now+86400000).toISOString(), photos:["emoji:🪑"], bids:[{id:"b5",amount:140,employee:{firstName:"Emma",lastName:"V."},createdAt:new Date(now-28800000).toISOString()},{id:"b6",amount:155,employee:{firstName:"Hugo",lastName:"G."},createdAt:new Date(now-10800000).toISOString()}], status:"ACTIVE" },
    { id:"demo-4", title:"Écran Dell UltraSharp 27\" 4K", description:"Dell U2720Q, 27 pouces, 4K UHD, USB-C 90W. Dalle IPS 99% sRGB. Câbles fournis.", category:"Informatique", condition:"Très bon état", reservePrice:180, currentPrice:210, startDate:new Date(now-86400000).toISOString(), endDate:new Date(now+86400000*5).toISOString(), photos:["emoji:🖥️"], bids:[{id:"b7",amount:210,employee:{firstName:"Julie",lastName:"C."},createdAt:new Date(now-3600000).toISOString()}], status:"ACTIVE" },
    { id:"demo-5", title:"iPhone 13 Pro 128 Go", description:"iPhone 13 Pro graphite. Écran très bon état. Batterie 82%. Boîte + câble Lightning.", category:"Téléphonie", condition:"Bon état", reservePrice:280, currentPrice:280, startDate:new Date(now).toISOString(), endDate:new Date(now+86400000*7).toISOString(), photos:["emoji:📱"], bids:[], status:"ACTIVE" },
    { id:"demo-6", title:"Chaise Herman Miller Aeron", description:"Taille B. Accoudoirs 4D, PostureFit SL. Tissu pellicle graphite.", category:"Mobilier", condition:"Bon état", reservePrice:350, currentPrice:420, startDate:new Date(now-86400000*4).toISOString(), endDate:new Date(now+86400000*1.5).toISOString(), photos:["emoji:💺"], bids:[{id:"b8",amount:380,employee:{firstName:"Thomas",lastName:"F."},createdAt:new Date(now-43200000).toISOString()},{id:"b9",amount:420,employee:{firstName:"Clara",lastName:"N."},createdAt:new Date(now-10800000).toISOString()}], status:"ACTIVE" },
    { id:"demo-7", title:"Imprimante HP LaserJet Pro", description:"HP LaserJet Pro M404dn. Recto-verso auto. ~12 000 pages. Toner 40%.", category:"Informatique", condition:"État correct", reservePrice:80, currentPrice:95, startDate:new Date(now-86400000*2).toISOString(), endDate:new Date(now+86400000*3).toISOString(), photos:["emoji:🖨️"], bids:[{id:"b10",amount:95,employee:{firstName:"Antoine",lastName:"P."},createdAt:new Date(now-18000000).toISOString()}], status:"ACTIVE" },
    { id:"demo-8", title:"Peugeot 308 SW 2019", description:"Break 1.5 BlueHDi 130ch. 98 200 km. Blanc nacré. Toit pano. GPS. CT OK.", category:"Véhicule", condition:"Bon état", reservePrice:12000, currentPrice:12800, startDate:new Date(now-86400000).toISOString(), endDate:new Date(now+86400000*6).toISOString(), photos:["emoji:🚙"], bids:[{id:"b11",amount:12500,employee:{firstName:"Sophie",lastName:"R."},createdAt:new Date(now-28800000).toISOString()},{id:"b12",amount:12800,employee:{firstName:"Nicolas",lastName:"H."},createdAt:new Date(now-7200000).toISOString()}], status:"ACTIVE" },
    { id:"demo-9", title:"Samsung Galaxy Tab S7", description:"128 Go Wi-Fi. S Pen + clavier Book Cover. 11 pouces 120Hz.", category:"Téléphonie", condition:"Très bon état", reservePrice:200, currentPrice:200, startDate:new Date(now).toISOString(), endDate:new Date(now+86400000*5).toISOString(), photos:["emoji:📲"], bids:[], status:"ACTIVE" },
    { id:"demo-10", title:"Lot de 4 chaises de réunion", description:"4 chaises empilables Steelcase, tissu gris, piètement chromé.", category:"Mobilier", condition:"Bon état", reservePrice:60, currentPrice:75, startDate:new Date(now-86400000*2).toISOString(), endDate:new Date(now+86400000*2).toISOString(), photos:["emoji:🪑"], bids:[{id:"b13",amount:75,employee:{firstName:"Léa",lastName:"T."},createdAt:new Date(now-14400000).toISOString()}], status:"ACTIVE" },
  ];
};

// Global store on window so data survives user login/logout switches
if (!window.__rvp) {
  window.__rvp = {
    items: _initItems(),
    categories: [...DEFAULT_CATEGORIES],
    companyName: "Mon Entreprise",
    signataires: [],
    connectedUsers: [],
    sales: [],
    rulesAccepted: {}, // keyed by "firstName lastName"
  };
}

export default function App() {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark(d=>!d);

  // User session state (resets on logout)
  const [user, setUser] = useState(null);
  const [rulesOk, setRulesOk] = useState(false);
  const [rulesAcceptedAt, setRulesAcceptedAt] = useState(null);

  // Shared data state (synced with window.__rvp so it persists across logins)
  const g = window.__rvp;
  const [companyName, setCompanyName] = useState(g.companyName);
  const [items, setItems] = useState(g.items);
  const [categories, setCategories] = useState(g.categories);
  const [signataires, setSignataires] = useState(g.signataires);
  const [connectedUsers, setConnectedUsers] = useState(g.connectedUsers);
  const [sales, setSales] = useState(g.sales);

  // Sync every state change back to the global store
  useEffect(()=>{ g.items = items; },[items]);
  useEffect(()=>{ g.categories = categories; },[categories]);
  useEffect(()=>{ g.companyName = companyName; },[companyName]);
  useEffect(()=>{ g.signataires = signataires; },[signataires]);
  useEffect(()=>{ g.connectedUsers = connectedUsers; },[connectedUsers]);
  useEffect(()=>{ g.sales = sales; },[sales]);

  // UI state
  const [selItem, setSelItem] = useState(null);
  const [selCat, setSelCat] = useState("Tous");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showCompanyEdit, setShowCompanyEdit] = useState(false);
  const [winner, setWinner] = useState(null);
  const [payment, setPayment] = useState(null);
  const [contract, setContract] = useState(null);

  // Track connected users
  useEffect(()=>{
    if(user && !user.isAdmin){
      setConnectedUsers(prev=>{
        if(prev.find(u=>u.firstName===user.firstName&&u.lastName===user.lastName)) return prev;
        return[...prev,{...user,connectedAt:new Date().toISOString()}];
      });
    }
  },[user]);

  const handleLogin = (u) => {
    setUser(u);
    if(u.isAdmin){
      setRulesOk(true);
    } else {
      // Check if this user already accepted rules
      const key = `${u.firstName} ${u.lastName}`;
      if(g.rulesAccepted[key]){
        setRulesOk(true);
        setRulesAcceptedAt(g.rulesAccepted[key]);
      }
    }
  };

  const handleLogout = () => {
    // Remove from connected users
    if(user && !user.isAdmin){
      setConnectedUsers(prev=>prev.filter(u=>!(u.firstName===user.firstName&&u.lastName===user.lastName)));
    }
    setUser(null);
    setRulesOk(false);
    setRulesAcceptedAt(null);
    setSelItem(null);
    setShowForm(false);
    setEditItem(null);
    setWinner(null);
    setPayment(null);
    setContract(null);
  };

  const handleRulesAccept = () => {
    const now = new Date().toISOString();
    setRulesOk(true);
    setRulesAcceptedAt(now);
    const key = `${user.firstName} ${user.lastName}`;
    g.rulesAccepted[key] = now;
    setSignataires(prev=>[...prev,{firstName:user.firstName,lastName:user.lastName,signedAt:now}]);
  };

  const addItem = (it) => { setItems(p=>[...p,it]); setShowForm(false); setEditItem(null); };
  const updateItem = (it) => { setItems(p=>p.map(x=>x.id===it.id?{...x,...it}:x)); setShowForm(false); setEditItem(null); };
  const deleteItem = (id) => setItems(p=>p.filter(x=>x.id!==id));
  const handleBid = (id,amt,bids) => setItems(p=>p.map(x=>x.id===id?{...x,currentPrice:amt,bids}:x));

  const handlePayment = (w) => {
    const sale = { id:uid(), itemId:w.itemId, itemTitle:w.title, itemDescription:w.description, itemCondition:w.condition, itemCategory:w.category, buyerName:w.name, amount:w.amount, paidAt:new Date().toISOString(), date:new Date().toISOString(), rulesAcceptedAt: rulesAcceptedAt||new Date().toISOString() };
    setSales(prev=>[...prev,sale]);
    setPayment(null);
  };

  const themeVal = { dark, toggle };

  if(!user) return <ThemeCtx.Provider value={themeVal}><LoginScreen onLogin={handleLogin}/></ThemeCtx.Provider>;
  if(!rulesOk && !user.isAdmin) return <ThemeCtx.Provider value={themeVal}><RulesScreen onAccept={handleRulesAccept} user={user} companyName={companyName}/></ThemeCtx.Provider>;

  const filtered = items.filter(it=>{
    const mc = selCat==="Tous"||it.category===selCat;
    const ms = !search||it.title.toLowerCase().includes(search.toLowerCase())||it.description.toLowerCase().includes(search.toLowerCase());
    return mc&&ms;
  });

  const isAdmin = user.isAdmin;

  return (
    <ThemeCtx.Provider value={themeVal}>
      <div className={`min-h-screen ${dark?"text-white":"text-slate-800"}`} style={{background:dark?"#0a0a0f":"#f8fafc"}}>


        {winner&&<WinnerModal winner={winner} onClose={()=>setWinner(null)} onPay={(w)=>{setWinner(null);setPayment(w);}}/>}
        {payment&&<PaymentModal payment={payment} onClose={()=>setPayment(null)} onConfirm={handlePayment}/>}
        {contract&&<ContractModal contract={contract} onClose={()=>setContract(null)} companyName={companyName}/>}
        {showForm&&<ItemForm item={editItem} onSave={editItem?updateItem:addItem} onCancel={()=>{setShowForm(false);setEditItem(null);}} categories={categories}/>}
        {showCatManager&&<CategoryManager categories={categories} onChange={setCategories} onClose={()=>setShowCatManager(false)}/>}
        {showCompanyEdit&&<CompanyEditor companyName={companyName} onSave={(n)=>{setCompanyName(n);setShowCompanyEdit(false);}} onClose={()=>setShowCompanyEdit(false)}/>}

        {/* Header */}
        <header className={`border-b ${dark?"border-gray-800 bg-gray-950/80":"border-slate-200 bg-white/80"} backdrop-blur-sm sticky top-0 z-40`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>setSelItem(null)}>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">{Ic.bolt("#fff",18)}</div>
              <span className={`text-base font-bold tracking-tight hidden sm:block ${dark?"text-white":"text-slate-900"}`}>ReVente Pro</span>
              {companyName && companyName !== "Mon Entreprise" && <span className={`text-xs hidden sm:block ${dark?"text-gray-500":"text-slate-400"}`}>— {companyName}</span>}
              {isAdmin&&<span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium ml-1">ADMIN</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className={`p-2 rounded-lg transition-colors ${dark?"text-gray-400 hover:text-white hover:bg-gray-800":"text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}>
                {dark?Ic.sun(null,16):Ic.moon(null,16)}
              </button>
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{user.firstName.charAt(0)}{user.lastName?.charAt(0)||"A"}</div>
              <span className={`text-xs hidden sm:block ${dark?"text-gray-300":"text-slate-600"}`}>{user.firstName}</span>
              <button onClick={handleLogout} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${dark?"text-gray-500 hover:text-white hover:bg-gray-800":"text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}>Déconnexion</button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {isAdmin ? (
            <AdminDash items={items} onAdd={()=>{setEditItem(null);setShowForm(true);}} onEdit={it=>{setEditItem(it);setShowForm(true);}} onDelete={deleteItem} categories={categories} onManageCats={()=>setShowCatManager(true)} signataires={signataires} connectedUsers={connectedUsers} sales={sales} onViewContract={s=>setContract(s)} companyName={companyName} onEditCompany={()=>setShowCompanyEdit(true)}/>
          ) : selItem ? (
            <ItemDetail item={selItem} items={items} onBack={()=>setSelItem(null)} user={user} onBid={handleBid} onWin={setWinner} categories={categories}/>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div><h1 className={`text-2xl sm:text-3xl font-bold ${dark?"text-white":"text-slate-900"}`}>Enchères en cours</h1><p className={`text-sm mt-1 ${dark?"text-gray-400":"text-slate-500"}`}>{filtered.length} article{filtered.length!==1?"s":""}</p></div>
                <div className="relative w-full sm:w-64">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark?"text-gray-500":"text-slate-400"}`}>{Ic.search()}</span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
                    className={`w-full ${dark?"bg-gray-900 border-gray-800 text-white placeholder-gray-600":"bg-white border-slate-200 text-slate-900 placeholder-slate-400"} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors`}/>
                </div>
              </div>
              <div className="flex gap-2 mb-8 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                {["Tous",...categories].map(cat=>(
                  <button key={cat} onClick={()=>setSelCat(cat)} className={`whitespace-nowrap text-sm px-4 py-2 rounded-xl border transition-all ${selCat===cat?"bg-indigo-600 border-indigo-600 text-white":dark?"bg-gray-900 border-gray-800 text-gray-400 hover:text-white":"bg-white border-slate-200 text-slate-500 hover:text-slate-900"}`}>{cat}</button>
                ))}
              </div>
              {filtered.length===0 ? (
                <div className={`text-center py-20 ${dark?"bg-gray-900/50 border-gray-800":"bg-white border-slate-200"} border rounded-2xl`}>
                  <div className="text-5xl mb-4">{items.length===0?"📭":"🔍"}</div><p className={dark?"text-gray-400":"text-slate-500"}>{items.length===0?"Aucun article disponible.":"Aucun résultat."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(it=><ItemCard key={it.id} item={it} onClick={setSelItem} categories={categories}/>)}</div>
              )}

              {/* My purchases */}
              {sales.filter(s=>s.buyerName===`${user.firstName} ${user.lastName}`).length>0 && (
                <div className="mt-12">
                  <h2 className={`text-lg font-bold ${dark?"text-white":"text-slate-900"} mb-4`}>Mes achats</h2>
                  <div className="space-y-3">
                    {sales.filter(s=>s.buyerName===`${user.firstName} ${user.lastName}`).map(s=>(
                      <div key={s.id} className={`${dark?"bg-gray-900 border-gray-800":"bg-white border-slate-200"} border rounded-xl p-4 flex items-center justify-between`}>
                        <div><div className={dark?"text-white":"text-slate-900"}>{s.itemTitle}</div><div className={`text-xs ${dark?"text-gray-500":"text-slate-400"}`}>Payé le {fmtDate(s.paidAt)}</div></div>
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-500 font-semibold">{euro(s.amount)}</span>
                          <button onClick={()=>setContract(s)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">{Ic.file("#fff",12)} Contrat</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className={`border-t ${dark?"border-gray-800":"border-slate-200"} mt-16`}>
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] ${dark?"text-gray-600":"text-slate-400"}`}>
            <span>© 2026 ReVente Pro{companyName && companyName !== "Mon Entreprise" ? ` — ${companyName}` : ""}</span>
            <span>Matériel vendu en l'état — Collaborateurs uniquement</span>
          </div>
        </footer>


      </div>
    </ThemeCtx.Provider>
  );
}
