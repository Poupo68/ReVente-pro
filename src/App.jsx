import React from "react";
import { useState, useEffect, useRef, useMemo, createContext, useContext, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════════════════
   ReVente Pro v4 — Supabase Backend
   Données partagées en temps réel entre admin et employés
   ═══════════════════════════════════════════════════════════════════════ */

// ─── SUPABASE CLIENT ────────────────────────────────────────────────────
const supabase = createClient(
  "https://iceiekmgjlynqedjdvue.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZWlla21namx5bnFlZGpkdnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTQ1MzYsImV4cCI6MjA5MTU3MDUzNn0.aWQptcRr4pnyD7WlNAg4GOWEPwvEBx6_2lXtjC0UAjI"
);

// ─── THEME ──────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
function useTheme() { return useContext(ThemeCtx); }
function useT() { const { dark } = useTheme(); return (d, l) => dark ? d : l; }

// ─── CONSTANTS ──────────────────────────────────────────────────────────
const CONDITIONS = ["Neuf", "Très bon état", "Bon état", "État correct", "À rénover"];
const ADMIN_CODE = "admin2026";
const WINNER_GIFS = [
  "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif",
  "https://media.giphy.com/media/3ohzAu2U1tOafteBa0/giphy.gif",
];
const CONFETTI_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

const REGLEMENT_TEXT = `RÈGLEMENT DE VENTE INTERNE — CESSION DE MATÉRIEL D'OCCASION AUX SALARIÉS

PRÉAMBULE
La société [NOM DE L'ENTREPRISE], ci-après « l'Entreprise », organise la cession de matériel d'occasion à ses salariés via « ReVente Pro ».

ARTICLE 1 — OBJET
Cession par enchères internes de biens mobiliers d'occasion.

ARTICLE 2 — ÉLIGIBILITÉ
Réservé aux salariés en contrat actif. Authentification obligatoire.

ARTICLE 3 — CLAUSE « VENDU EN L'ÉTAT »
3.1. Matériel d'occasion. Fiche descriptive fournie.
3.2. Vendu « en l'état ».
3.3. L'Acquéreur reconnaît la nature d'occasion.
3.4. L'Entreprise décline toute responsabilité pour défauts non apparents.

ARTICLE 4 — GARANTIES
4.1. Aucune garantie commerciale.
4.2. Garanties légales applicables (conformité 12 mois, vices cachés).

ARTICLE 5 — ENCHÈRES
5.1. Prix de réserve minimum.
5.2. Attribution au dernier enchérisseur. Notification par email.
5.3. Engagement ferme et définitif.

ARTICLE 6 — PAIEMENT
6.1. Paiement par virement, carte ou prélèvement sur salaire.
6.2. Retrait sous 10 jours ouvrables.
6.3. Transfert de propriété au retrait.

ARTICLE 7 — RESPONSABILITÉ
7.1. Après retrait, décharge totale de l'Entreprise.

ARTICLE 8 — DONNÉES PERSONNELLES
Traitement RGPD. Conservation 3 ans.

⚠️ Ébauche à valider par un conseil juridique.`;

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
  print: (c,s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
};

// ─── SUPABASE DATA HOOK ─────────────────────────────────────────────────
function useSupabase() {
  const [items, setItems] = useState([]);
  const [bids, setBids] = useState([]);
  const [categories, setCategories] = useState([]);
  const [signataires, setSignataires] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [companyName, setCompanyNameState] = useState("Mon Entreprise");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [itemsR, bidsR, catsR, sigsR, usersR, salesR, settR] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("bids").select("*").order("created_at", { ascending: true }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("signatures").select("*").order("signed_at", { ascending: false }),
      supabase.from("connected_users").select("*"),
      supabase.from("sales").select("*").order("paid_at", { ascending: false }),
      supabase.from("settings").select("*").eq("key", "company_name").single(),
    ]);
    if (itemsR.data) setItems(itemsR.data);
    if (bidsR.data) setBids(bidsR.data);
    if (catsR.data) setCategories(catsR.data.map(c => c.name));
    if (sigsR.data) setSignataires(sigsR.data);
    if (usersR.data) setConnectedUsers(usersR.data);
    if (salesR.data) setSales(salesR.data);
    if (settR.data) setCompanyNameState(settR.data.value);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); const iv = setInterval(fetchAll, 5000); return () => clearInterval(iv); }, [fetchAll]);

  // Merge bids into items
  const itemsWithBids = useMemo(() => items.map(it => ({
    ...it, bids: bids.filter(b => b.item_id === it.id).map(b => ({
      id: b.id, amount: Number(b.amount), employee: { firstName: b.bidder_first_name, lastName: b.bidder_last_name }, createdAt: b.created_at
    })),
    currentPrice: Math.max(Number(it.current_price), ...bids.filter(b => b.item_id === it.id).map(b => Number(b.amount)), 0),
    reservePrice: Number(it.reserve_price), endDate: it.end_date, startDate: it.start_date,
  })), [items, bids]);

  const addItem = async (it) => {
    await supabase.from("items").insert({ title: it.title, description: it.description, category: it.category, condition: it.condition, reserve_price: it.reservePrice, current_price: it.reservePrice, end_date: it.endDate, photos: it.photos, status: "ACTIVE" });
    fetchAll();
  };
  const updateItem = async (it) => {
    await supabase.from("items").update({ title: it.title, description: it.description, category: it.category, condition: it.condition, reserve_price: it.reservePrice, photos: it.photos }).eq("id", it.id);
    fetchAll();
  };
  const deleteItem = async (id) => { await supabase.from("items").delete().eq("id", id); fetchAll(); };

  const placeBid = async (itemId, amount, user) => {
    await supabase.from("bids").insert({ item_id: itemId, amount, bidder_first_name: user.firstName, bidder_last_name: user.lastName.charAt(0) + "." });
    await supabase.from("items").update({ current_price: amount }).eq("id", itemId);
    fetchAll();
  };

  const addCategory = async (name) => { await supabase.from("categories").insert({ name }); fetchAll(); };
  const removeCategory = async (name) => { await supabase.from("categories").delete().eq("name", name); fetchAll(); };

  const setCompanyName = async (name) => { await supabase.from("settings").update({ value: name }).eq("key", "company_name"); setCompanyNameState(name); };

  const signRules = async (firstName, lastName) => {
    await supabase.from("signatures").upsert({ first_name: firstName, last_name: lastName, signed_at: new Date().toISOString() }, { onConflict: "first_name,last_name" });
    fetchAll();
  };
  const hasSignedRules = async (firstName, lastName) => {
    const { data } = await supabase.from("signatures").select("signed_at").eq("first_name", firstName).eq("last_name", lastName).single();
    return data ? data.signed_at : null;
  };

  const connectUser = async (user) => {
    await supabase.from("connected_users").upsert({ first_name: user.firstName, last_name: user.lastName, connected_at: new Date().toISOString(), last_seen: new Date().toISOString() }, { onConflict: "first_name,last_name" });
    fetchAll();
  };
  const disconnectUser = async (user) => {
    await supabase.from("connected_users").delete().eq("first_name", user.firstName).eq("last_name", user.lastName);
    fetchAll();
  };
  const heartbeat = async (user) => {
    await supabase.from("connected_users").update({ last_seen: new Date().toISOString() }).eq("first_name", user.firstName).eq("last_name", user.lastName);
  };

  const addSale = async (sale) => {
    await supabase.from("sales").insert({ item_id: sale.itemId, item_title: sale.title, item_description: sale.description, item_condition: sale.condition, item_category: sale.category, buyer_name: sale.buyerName, amount: sale.amount, rules_accepted_at: sale.rulesAcceptedAt });
    fetchAll();
  };

  return { items: itemsWithBids, categories, signataires, connectedUsers, sales, companyName, loading, addItem, updateItem, deleteItem, placeBid, addCategory, removeCategory, setCompanyName, signRules, hasSignedRules, connectUser, disconnectUser, heartbeat, addSale, refresh: fetchAll };
}

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────
function Countdown({ endDate }) {
  const [t, setT] = useState(timeLeft(endDate));
  useEffect(() => { const iv = setInterval(() => setT(timeLeft(endDate)), 1000); return () => clearInterval(iv); }, [endDate]);
  return <span className={`font-mono text-sm tracking-wide ${t.ended ? "text-red-500" : t.urgent ? "text-amber-600" : "text-emerald-600"}`}>{t.ended ? "⏹ Terminée" : `⏱ ${t.text}`}</span>;
}
function CatBadge({ cat }) { return <span className="text-[11px] px-2.5 py-1 rounded-full border bg-indigo-50 text-indigo-600 border-indigo-200">{cat}</span>; }
function CondBadge({ cond }) {
  const m = { "Neuf": "text-emerald-600", "Très bon état": "text-emerald-600", "Bon état": "text-blue-600", "État correct": "text-amber-600", "À rénover": "text-red-500" };
  return <span className={`text-xs ${m[cond] || "text-slate-500"}`}>● {cond}</span>;
}

// ─── CONFETTI ───────────────────────────────────────────────────────────
function Confetti() {
  const ref = useRef(null);
  useEffect(() => { const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); c.width = c.offsetWidth; c.height = c.offsetHeight; const ps = Array.from({ length: 120 }, () => ({ x: Math.random()*c.width, y: Math.random()*c.height-c.height, w: 5+Math.random()*7, h: 3+Math.random()*5, color: CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)], vx: (Math.random()-0.5)*4, vy: 2+Math.random()*5, rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.3 })); let raf; function draw() { ctx.clearRect(0,0,c.width,c.height); ps.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vy+=0.04; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); }); if(ps.some(p=>p.y<c.height+30)) raf=requestAnimationFrame(draw); } draw(); return () => cancelAnimationFrame(raf); }, []);
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/><Confetti/>
      <div className={`relative z-20 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-3xl p-8 max-w-lg w-full text-center`} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center mb-4">{Ic.trophy("#f59e0b",52)}</div>
        <h2 className={`text-3xl font-black ${tc("text-white","text-slate-900")} mb-2`}>FÉLICITATIONS !</h2>
        <p className={tc("text-gray-300","text-slate-600")}><span className="text-indigo-500 font-semibold">{winner.name}</span>, vous avez remporté :</p>
        <p className={`text-xl font-bold ${tc("text-white","text-slate-900")} mb-5`}>{winner.title} — {euro(winner.amount)}</p>
        <div className={`rounded-2xl overflow-hidden border ${tc("border-gray-700","border-slate-200")} mb-5 mx-auto max-w-xs`}><img src={gif} alt="" className="w-full h-48 object-cover" onError={e=>{e.target.style.display="none"}}/></div>
        <div className={`flex items-center justify-center gap-2 text-sm mb-5 ${emailSent ? "text-emerald-500" : "text-slate-400"}`}>{Ic.mail(emailSent?"#10b981":"#94a3b8",16)}{emailSent ? "Email envoyé !" : <span className="animate-pulse">Envoi...</span>}</div>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className={`px-6 py-3 rounded-xl font-medium ${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")}`}>Plus tard</button>
          <button onClick={()=>{onClose();onPay(winner);}} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2">{Ic.card("#fff",16)} Payer</button>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ──────────────────────────────────────────────────────
function PaymentModal({ payment, onClose, onConfirm }) {
  const tc = useT();
  const [cardNum, setCardNum] = useState(""); const [expiry, setExpiry] = useState(""); const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false); const [done, setDone] = useState(false);
  const pay = () => { if (cardNum.length<16||expiry.length<4||cvc.length<3) return; setProcessing(true); setTimeout(() => { setProcessing(false); setDone(true); setTimeout(() => onConfirm(payment), 1500); }, 2000); };
  const inp = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 transition-colors`;
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 max-w-md w-full`}>
        <div className="flex items-center justify-between mb-6"><h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>Paiement</h2><button onClick={onClose}>{Ic.x()}</button></div>
        {done ? <div className="text-center py-8"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">{Ic.check("#10b981",32)}</div><p className={`text-lg font-semibold ${tc("text-white","text-slate-900")}`}>Paiement confirmé !</p></div> : <>
          <div className={`${tc("bg-gray-800","bg-indigo-50")} rounded-xl p-4 mb-6`}><p className="text-sm text-slate-500">Article : <span className={`font-medium ${tc("text-white","text-slate-900")}`}>{payment.title}</span></p><p className={`text-2xl font-bold ${tc("text-white","text-slate-900")} mt-1`}>{euro(payment.amount)}</p></div>
          <div className="space-y-4">
            <div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Numéro de carte</label><input value={cardNum} onChange={e=>setCardNum(e.target.value.replace(/\D/g,"").slice(0,16))} placeholder="4242 4242 4242 4242" className={inp}/></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Expiration</label><input value={expiry} onChange={e=>setExpiry(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="MM/AA" className={inp}/></div><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">CVC</label><input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,3))} placeholder="123" className={inp}/></div></div>
          </div>
          <button onClick={pay} disabled={processing} className={`w-full mt-6 font-semibold py-3.5 rounded-xl transition-all ${processing?"bg-indigo-400 cursor-wait":"bg-indigo-600 hover:bg-indigo-500"} text-white`}>{processing?"Traitement...":euro(payment.amount)}</button>
          <p className="text-center text-[10px] mt-3 text-slate-400">🔒 Simulation sécurisée</p>
        </>}
      </div>
    </div>
  );
}

// ─── CONTRACT MODAL ─────────────────────────────────────────────────────
function ContractModal({ contract, onClose, companyName }) {
  const tc = useT(); const cn = companyName;
  const printContract = () => { const w = window.open("","","width=800,height=600"); w.document.write(`<html><head><title>Contrat de vente</title><style>body{font-family:sans-serif;padding:40px;font-size:14px;line-height:1.6}h1{font-size:18px}</style></head><body><h1>CONTRAT DE VENTE — ${cn}</h1><pre>${contractText}</pre></body></html>`); w.document.close(); w.print(); };
  const contractText = `Vendeur : ${cn}\nAcquéreur : ${contract.buyer_name}\n\nArticle : ${contract.item_title}\nDescription : ${contract.item_description||""}\nÉtat : ${contract.item_condition||""}\n\nPrix : ${euro(Number(contract.amount))}\nPayé le : ${fmtDate(contract.paid_at)}\n\nVendu « EN L'ÉTAT ».\nGaranties légales applicables.\nRèglement accepté le : ${contract.rules_accepted_at ? fmtDate(contract.rules_accepted_at) : "N/A"}`;
  return (
    <div className="fixed inset-0 z-[997] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6"><h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} flex items-center gap-2`}>{Ic.file(null,18)} Contrat</h2><div className="flex gap-2"><button onClick={printContract} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">{Ic.print("#fff",14)} Imprimer</button><button onClick={onClose}>{Ic.x()}</button></div></div>
        <div className={`${tc("bg-gray-800","bg-slate-50")} rounded-xl p-6 text-sm leading-relaxed ${tc("text-gray-300","text-slate-600")} whitespace-pre-line`}>{contractText}</div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ──────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  const tc = useT();
  return (<div className="fixed inset-0 z-[99] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/><div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-sm w-full`}><p className={`${tc("text-white","text-slate-900")} text-center mb-6`}>{message}</p><div className="flex gap-3"><button onClick={onCancel} className={`flex-1 ${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")} py-2.5 rounded-xl`}>Annuler</button><button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl">Supprimer</button></div></div></div>);
}

// ─── ITEM FORM ──────────────────────────────────────────────────────────
function ItemForm({ item, onSave, onCancel, categories }) {
  const tc = useT(); const isEdit = !!item;
  const [form, setForm] = useState({ title: item?.title||"", description: item?.description||"", category: item?.category||categories[0]||"", condition: item?.condition||CONDITIONS[2], reservePrice: item?.reservePrice?.toString()||item?.reserve_price?.toString()||"", durationHours: "72", photos: item?.photos||[] });
  const [error, setError] = useState(""); const fileRef = useRef(null);
  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setError(""); };
  const handlePhotos = async(e) => { const files = Array.from(e.target.files); if(files.length+form.photos.length>6) return setError("Max 6 photos."); const ps = []; for(const f of files){ if(f.size>5*1024*1024) return setError("Max 5Mo."); ps.push(await fileToBase64(f)); } set("photos",[...form.photos,...ps]); if(fileRef.current) fileRef.current.value=""; };
  const save = () => {
    if(!form.title.trim()) return setError("Titre obligatoire."); if(!form.description.trim()) return setError("Description obligatoire.");
    const price = parseFloat(form.reservePrice); if(isNaN(price)||price<=0) return setError("Prix invalide.");
    if(!isEdit){ const h=parseFloat(form.durationHours); if(isNaN(h)||h<1) return setError("Durée min 1h."); }
    if(form.photos.length===0) return setError("Ajoutez une photo.");
    onSave({ id: item?.id, title: form.title.trim(), description: form.description.trim(), category: form.category, condition: form.condition, reservePrice: price, endDate: isEdit?item.endDate||item.end_date:new Date(Date.now()+parseFloat(form.durationHours)*3600000).toISOString(), photos: form.photos });
  };
  const inp = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400`;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}/>
      <div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 sm:p-8 w-full max-w-2xl my-8`}>
        <div className="flex items-center justify-between mb-6"><h2 className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>{isEdit?"Modifier":"Nouvel article"}</h2><button onClick={onCancel}>{Ic.x()}</button></div>
        <div className="space-y-5">
          <div><label className="text-[10px] uppercase tracking-wider block mb-2 text-slate-500">Photos *</label><div className="flex flex-wrap gap-3">{form.photos.map((p,i)=>(<div key={i} className={`relative w-20 h-20 rounded-xl overflow-hidden border ${tc("border-gray-700","border-slate-200")} group flex items-center justify-center ${tc("bg-gray-800","bg-slate-50")}`}>{p.startsWith("emoji:")?<span className="text-3xl">{p.replace("emoji:","")}</span>:<img src={p} alt="" className="w-full h-full object-cover"/>}<button onClick={()=>set("photos",form.photos.filter((_,j)=>j!==i))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">{Ic.trash("#ef4444",18)}</button></div>))}{form.photos.length<6&&<button onClick={()=>fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 flex flex-col items-center justify-center">{Ic.cam(null,22)}<span className="text-[9px] mt-1">Ajouter</span></button>}</div><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos}/></div>
          <div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Titre *</label><input value={form.title} onChange={e=>set("title",e.target.value)} className={inp}/></div>
          <div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Description *</label><textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3} className={`${inp} resize-none`}/></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Catégorie</label><select value={form.category} onChange={e=>set("category",e.target.value)} className={inp}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">État</label><select value={form.condition} onChange={e=>set("condition",e.target.value)} className={inp}>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Prix réserve €</label><input type="number" value={form.reservePrice} onChange={e=>set("reservePrice",e.target.value)} className={inp}/></div>{!isEdit&&<div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Durée (h)</label><input type="number" value={form.durationHours} onChange={e=>set("durationHours",e.target.value)} className={inp}/></div>}</div>
          {error&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2"><button onClick={onCancel} className={`flex-1 ${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")} py-3 rounded-xl font-medium`}>Annuler</button><button onClick={save} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold">{isEdit?"Enregistrer":"Publier"}</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── ITEM CARD ──────────────────────────────────────────────────────────
function ItemCard({ item, onClick }) {
  const tc = useT(); const p0 = item.photos?.[0]||""; const isE = p0.startsWith("emoji:"); const hasI = p0.startsWith("data:"); const ended = timeLeft(item.endDate).ended;
  return (
    <button onClick={()=>onClick(item)} className={`group text-left ${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg focus:outline-none ${ended?"opacity-60":""}`}>
      <div className={`relative h-44 ${tc("bg-gray-800","bg-slate-100")} overflow-hidden`}>
        {hasI?<img src={p0} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>:isE?<div className="w-full h-full flex items-center justify-center"><span className="text-6xl">{p0.replace("emoji:","")}</span></div>:<div className="w-full h-full flex items-center justify-center">{Ic.cam("#94a3b8",48)}</div>}
        <div className="absolute top-3 left-3"><CatBadge cat={item.category}/></div>
        <div className={`absolute bottom-3 right-3 ${tc("bg-black/70","bg-white/90")} backdrop-blur-sm rounded-lg px-3 py-1.5`}><Countdown endDate={item.endDate}/></div>
        {ended&&<div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">TERMINÉE</span></div>}
      </div>
      <div className="p-5"><h3 className={`${tc("text-white","text-slate-900")} font-semibold text-sm mb-1 line-clamp-1`}>{item.title}</h3><CondBadge cond={item.condition}/><div className="mt-4 flex items-end justify-between"><div><div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Enchère actuelle</div><div className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>{euro(item.currentPrice)}</div></div><div className="text-xs text-slate-400">{item.bids?.length||0} enchère{(item.bids?.length||0)!==1?"s":""}</div></div></div>
    </button>
  );
}

// ─── ITEM DETAIL ────────────────────────────────────────────────────────
function ItemDetail({ item, onBack, user, onBid, onWin }) {
  const tc = useT(); const [bidAmount, setBidAmount] = useState(""); const [bidStatus, setBidStatus] = useState(null); const [photoIdx, setPhotoIdx] = useState(0);
  const ended = timeLeft(item.endDate).ended; const bids = item.bids||[]; const minBid = item.currentPrice+(item.currentPrice<100?5:item.currentPrice<1000?10:50);
  const p0 = item.photos?.[0]||""; const isE = p0.startsWith("emoji:"); const hasI = p0.startsWith("data:"); const lastBid = bids.length>0?bids[bids.length-1]:null;
  const handleBid = async() => { if(ended) return; const amt = parseFloat(bidAmount); if(isNaN(amt)||amt<minBid) return setBidStatus({t:"err",m:`Min. ${euro(minBid)}`}); await onBid(item.id,amt); setBidAmount(""); setBidStatus({t:"ok",m:`${euro(amt)} enregistrée !`}); setTimeout(()=>setBidStatus(null),4000); };
  const inp = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400`;
  return (
    <div>
      <button onClick={onBack} className={`flex items-center gap-2 ${tc("text-gray-400","text-slate-500")} mb-6 group`}><span className="group-hover:-translate-x-1 transition-transform">{Ic.back()}</span> Retour</button>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-5">
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl overflow-hidden`}>
            <div className={`h-72 sm:h-96 ${tc("bg-gray-800","bg-slate-100")} flex items-center justify-center`}>{hasI?<img src={item.photos[photoIdx]||p0} alt="" className="w-full h-full object-contain"/>:isE?<span className="text-8xl">{p0.replace("emoji:","")}</span>:<span>{Ic.cam("#94a3b8",64)}</span>}</div>
            {item.photos?.length>1&&hasI&&<div className="flex gap-2 p-3 overflow-x-auto">{item.photos.filter(p=>p.startsWith("data:")).map((p,i)=><button key={i} onClick={()=>setPhotoIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${i===photoIdx?"border-indigo-500":"border-transparent"}`}><img src={p} alt="" className="w-full h-full object-cover"/></button>)}</div>}
          </div>
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}><h2 className={`font-semibold ${tc("text-white","text-slate-900")} mb-3 flex items-center gap-2`}>{Ic.doc(null,16)} Descriptif</h2><p className={`${tc("text-gray-300","text-slate-600")} text-sm whitespace-pre-line`}>{item.description}</p></div>
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-2"><CatBadge cat={item.category}/><CondBadge cond={item.condition}/></div>
            <h1 className={`text-xl font-bold ${tc("text-white","text-slate-900")} mt-3`}>{item.title}</h1>
            <div className={`mt-5 ${tc("bg-indigo-950/30 border-indigo-800/30","bg-indigo-50 border-indigo-200")} border rounded-xl p-5`}>
              <div className="flex justify-between items-center"><div><div className="text-[10px] text-indigo-500 uppercase tracking-wider font-medium">Enchère actuelle</div><div className={`text-3xl font-bold ${tc("text-white","text-slate-900")} mt-1`}>{euro(item.currentPrice)}</div></div><div className="text-right"><div className="text-[10px] text-slate-400">Réserve</div><div className="text-sm text-slate-500">{euro(item.reservePrice)}</div></div></div>
              <div className={`mt-4 pt-3 border-t ${tc("border-indigo-800/20","border-indigo-100")}`}><Countdown endDate={item.endDate}/></div>
            </div>
            {!ended?<div className="mt-5"><label className="text-[10px] uppercase tracking-wider block mb-2 text-slate-500">Enchère min. {euro(minBid)}</label><div className="flex gap-2"><input type="number" value={bidAmount} onChange={e=>setBidAmount(e.target.value)} placeholder={minBid.toString()} onKeyDown={e=>e.key==="Enter"&&handleBid()} className={`flex-1 text-lg ${inp}`}/><button onClick={handleBid} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 rounded-xl active:scale-95">Enchérir</button></div>{bidStatus&&<div className={`mt-3 p-3 rounded-xl text-sm ${bidStatus.t==="ok"?"bg-emerald-50 border border-emerald-200 text-emerald-600":"bg-red-50 border border-red-200 text-red-600"}`}>{bidStatus.t==="ok"?"✓":"✕"} {bidStatus.m}</div>}</div>
            :<div className={`mt-5 p-4 rounded-xl ${tc("bg-gray-800","bg-slate-50")} text-center`}>{lastBid?<><p className="text-amber-600 font-semibold mb-1">Remportée par</p><p className={`text-lg font-bold ${tc("text-white","text-slate-900")}`}>{lastBid.employee.firstName} {lastBid.employee.lastName}</p><p className="text-indigo-500 font-semibold">{euro(lastBid.amount)}</p></>:<p className="text-slate-500">Non vendu.</p>}</div>}
          </div>
          <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}>
            <h3 className={`text-sm font-semibold ${tc("text-white","text-slate-900")} mb-4 flex items-center gap-2`}>{Ic.clock(null,16)} Historique ({bids.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">{bids.length===0?<p className="text-slate-400 text-sm text-center py-6">Soyez le premier !</p>:[...bids].reverse().map((bid,i)=><div key={bid.id} className={`flex items-center justify-between p-3 rounded-xl text-sm ${i===0?"bg-indigo-50 border border-indigo-200":"bg-slate-50"}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i===0?"bg-indigo-600 text-white":"bg-slate-200 text-slate-600"}`}>{bid.employee.firstName.charAt(0)}{bid.employee.lastName.charAt(0)}</div><div><div className={tc("text-white","text-slate-900")}>{bid.employee.firstName} {bid.employee.lastName}</div><div className="text-[11px] text-slate-400">{fmtDate(bid.createdAt)}</div></div></div><div className={`font-semibold ${i===0?"text-indigo-500":"text-slate-600"}`}>{euro(bid.amount)}</div></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────
function AdminDash({ db, onShowForm, onEditItem }) {
  const tc = useT(); const [delTarget, setDelTarget] = useState(null); const [tab, setTab] = useState("articles"); const [contract, setContract] = useState(null);
  const [showCatManager, setShowCatManager] = useState(false); const [showCompanyEdit, setShowCompanyEdit] = useState(false);
  const [newCat, setNewCat] = useState(""); const [companyInput, setCompanyInput] = useState(db.companyName);
  const items = db.items; const active = items.filter(i=>!timeLeft(i.endDate).ended).length;
  const totalBids = items.reduce((s,i)=>s+(i.bids?.length||0),0);
  const tabBtn = (id,label,icon) => <button onClick={()=>setTab(id)} className={`text-sm px-4 py-2 rounded-xl border flex items-center gap-1.5 ${tab===id?"bg-indigo-600 border-indigo-600 text-white":tc("bg-gray-800 border-gray-700 text-gray-300","bg-white border-slate-200 text-slate-600")}`}>{icon}{label}</button>;
  const inp = `w-full ${tc("bg-gray-800 border-gray-700 text-white","bg-slate-50 border-slate-200 text-slate-900")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400`;
  return (
    <div>
      {delTarget&&<ConfirmModal message={`Supprimer « ${delTarget.title} » ?`} onConfirm={()=>{db.deleteItem(delTarget.id);setDelTarget(null);}} onCancel={()=>setDelTarget(null)}/>}
      {contract&&<ContractModal contract={contract} onClose={()=>setContract(null)} companyName={db.companyName}/>}
      {showCompanyEdit&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowCompanyEdit(false)}/><div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-md w-full`}><h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} mb-4`}>Nom entreprise</h2><input value={companyInput} onChange={e=>setCompanyInput(e.target.value)} className={inp}/><div className="flex gap-3 mt-5"><button onClick={()=>setShowCompanyEdit(false)} className={`flex-1 ${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")} py-2.5 rounded-xl`}>Annuler</button><button onClick={()=>{db.setCompanyName(companyInput);setShowCompanyEdit(false);}} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl">Enregistrer</button></div></div></div>}
      {showCatManager&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowCatManager(false)}/><div className={`relative z-10 ${tc("bg-gray-900 border-gray-700","bg-white border-slate-200")} border rounded-2xl p-6 max-w-md w-full`}><h2 className={`text-lg font-bold ${tc("text-white","text-slate-900")} mb-4`}>Familles</h2><div className="space-y-2 mb-4 max-h-60 overflow-y-auto">{db.categories.map(c=><div key={c} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}><span className={tc("text-white","text-slate-900")}>{c}</span><button onClick={()=>db.removeCategory(c)} className="text-red-500">{Ic.trash(null,14)}</button></div>)}</div><div className="flex gap-2"><input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&newCat.trim()&&(db.addCategory(newCat.trim()),setNewCat(""))} placeholder="Nouvelle famille..." className={inp}/><button onClick={()=>{if(newCat.trim()){db.addCategory(newCat.trim());setNewCat("");}}} className="bg-indigo-600 text-white px-4 rounded-xl">{Ic.plus("#fff",18)}</button></div><button onClick={()=>setShowCatManager(false)} className="w-full mt-4 bg-slate-100 text-slate-600 py-2 rounded-xl">Fermer</button></div></div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div><h2 className={`text-2xl font-bold ${tc("text-white","text-slate-900")}`}>Administration</h2></div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/><span className="text-sm font-medium text-emerald-600">{db.connectedUsers.length} en ligne</span></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">{[{l:"Articles",v:items.length,i:"📦"},{l:"Actives",v:active,i:"🔥"},{l:"Enchères",v:totalBids,i:"🏷️"},{l:"Ventes",v:db.sales.length,i:"💰"}].map(k=><div key={k.l} className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-5`}><div className="text-2xl mb-2">{k.i}</div><div className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>{k.v}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{k.l}</div></div>)}</div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
        {tabBtn("articles","Articles",Ic.doc(null,14))}{tabBtn("bids","Enchères",Ic.clock(null,14))}{tabBtn("users","Connectés",Ic.users(null,14))}{tabBtn("signatures","Signatures",Ic.check(null,14))}{tabBtn("sales","Ventes",Ic.card(null,14))}
        <button onClick={()=>setShowCatManager(true)} className={`text-sm px-4 py-2 rounded-xl border flex items-center gap-1.5 ${tc("bg-gray-800 border-gray-700 text-gray-300","bg-white border-slate-200 text-slate-600")}`}>{Ic.folder(null,14)} Familles</button>
        <button onClick={()=>{setCompanyInput(db.companyName);setShowCompanyEdit(true);}} className={`text-sm px-4 py-2 rounded-xl border flex items-center gap-1.5 ${tc("bg-gray-800 border-gray-700 text-gray-300","bg-white border-slate-200 text-slate-600")}`}>{Ic.building(null,14)} {db.companyName}</button>
        <button onClick={onShowForm} className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white flex items-center gap-1.5">{Ic.plus("#fff",14)} Article</button>
      </div>

      {tab==="articles"&&(items.length===0?<div className={`text-center py-20 ${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl`}><p className="text-5xl mb-4">📭</p><p className="text-slate-500">Aucun article.</p></div>:<div className="space-y-3">{items.map(item=>{const ended=timeLeft(item.endDate).ended;const p0=item.photos?.[0]||"";return(<div key={item.id} className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${ended?"opacity-60":""}`}><div className={`w-14 h-14 rounded-xl overflow-hidden ${tc("bg-gray-800","bg-slate-100")} flex-shrink-0 flex items-center justify-center`}>{p0.startsWith("data:")?<img src={p0} alt="" className="w-full h-full object-cover"/>:p0.startsWith("emoji:")?<span className="text-2xl">{p0.replace("emoji:","")}</span>:<span>{Ic.cam("#94a3b8",18)}</span>}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1 flex-wrap"><span className={`${tc("text-white","text-slate-900")} font-medium text-sm truncate`}>{item.title}</span><CatBadge cat={item.category}/></div><div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap"><span>{euro(item.reservePrice)}</span><span className={`font-medium ${tc("text-white","text-slate-900")}`}>{euro(item.currentPrice)}</span><span>{item.bids?.length||0} ench.</span><Countdown endDate={item.endDate}/></div></div><div className="flex gap-2 flex-shrink-0"><button onClick={()=>onEditItem(item)} className={`${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")} p-2.5 rounded-xl`}>{Ic.edit()}</button><button onClick={()=>setDelTarget(item)} className={`${tc("bg-gray-800 text-gray-300","bg-slate-100 text-slate-600")} hover:text-red-500 p-2.5 rounded-xl`}>{Ic.trash()}</button></div></div>);})}</div>)}
      {tab==="bids"&&<div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}><h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4`}>Progression des enchères par article</h3>{items.filter(i=>i.bids?.length>0).length===0?<p className="text-slate-400">Aucune enchère.</p>:<div className="space-y-4">{items.filter(i=>i.bids?.length>0).map(it=><div key={it.id} className={`${tc("bg-gray-800","bg-slate-50")} rounded-xl p-4`}><div className="flex items-center justify-between mb-2"><span className={`font-medium ${tc("text-white","text-slate-900")}`}>{it.title}</span><span className="text-indigo-500 font-semibold">{euro(it.currentPrice)}</span></div><div className="flex items-center gap-2 mb-2"><div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${Math.min(100,((it.currentPrice-it.reservePrice)/it.reservePrice)*100+10)}%`}}/></div><span className="text-xs text-slate-400">{it.bids.length} ench.</span></div><div className="space-y-1">{it.bids.slice(-3).reverse().map(b=><div key={b.id} className="flex justify-between text-xs text-slate-500"><span>{b.employee.firstName} {b.employee.lastName}</span><span>{euro(b.amount)}</span></div>)}</div></div>)}</div>}</div>}
      {tab==="users"&&<div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}><h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4`}>Connectés ({db.connectedUsers.length})</h3>{db.connectedUsers.length===0?<p className="text-slate-400">Personne.</p>:<div className="space-y-2">{db.connectedUsers.map((u,i)=><div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}><div className="w-2 h-2 bg-emerald-500 rounded-full"/><div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.first_name.charAt(0)}{u.last_name.charAt(0)}</div><div><div className={tc("text-white","text-slate-900")}>{u.first_name} {u.last_name}</div><div className="text-xs text-slate-400">{fmtDate(u.connected_at)}</div></div></div>)}</div>}</div>}
      {tab==="signatures"&&<div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}><div className="flex items-center justify-between mb-4"><h3 className={`font-semibold ${tc("text-white","text-slate-900")}`}>Signatures ({db.signataires.length})</h3><button onClick={()=>{const w=window.open("","","width=800,height=600");w.document.write(`<html><head><title>Signatures</title><style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h1>Règlements signés — ${db.companyName}</h1><table><tr><th>Prénom</th><th>Nom</th><th>Date</th></tr>${db.signataires.map(s=>`<tr><td>${s.first_name}</td><td>${s.last_name}</td><td>${fmtDate(s.signed_at)}</td></tr>`).join("")}</table></body></html>`);w.document.close();w.print();}} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">{Ic.print("#fff",14)} Imprimer</button></div>{db.signataires.length===0?<p className="text-slate-400">Aucune signature.</p>:<div className="space-y-2">{db.signataires.map((s,i)=><div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{s.first_name.charAt(0)}{s.last_name.charAt(0)}</div><span className={tc("text-white","text-slate-900")}>{s.first_name} {s.last_name}</span></div><span className="text-xs text-slate-400">{fmtDate(s.signed_at)}</span></div>)}</div>}</div>}
      {tab==="sales"&&<div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-6`}><h3 className={`font-semibold ${tc("text-white","text-slate-900")} mb-4`}>Ventes ({db.sales.length})</h3>{db.sales.length===0?<p className="text-slate-400">Aucune vente.</p>:<div className="space-y-2">{db.sales.map((s,i)=><div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tc("bg-gray-800","bg-slate-50")}`}><div><div className={tc("text-white","text-slate-900")}>{s.item_title}</div><div className="text-xs text-slate-400">{s.buyer_name} — {fmtDate(s.paid_at)}</div></div><div className="flex items-center gap-3"><span className="text-indigo-500 font-semibold">{euro(Number(s.amount))}</span><button onClick={()=>setContract(s)} className="text-indigo-500">{Ic.eye(null,16)}</button></div></div>)}</div>}</div>}
    </div>
  );
}

// ─── LOGIN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const tc = useT(); const { dark, toggle } = useTheme();
  const [mode, setMode] = useState("employee"); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [adminCode, setAdminCode] = useState(""); const [error, setError] = useState("");
  const submit = () => { if(mode==="employee"){ if(!firstName.trim()||!lastName.trim()) return setError("Champs obligatoires."); onLogin({firstName:firstName.trim(),lastName:lastName.trim(),isAdmin:false}); } else { if(adminCode!==ADMIN_CODE) return setError("Code invalide."); onLogin({firstName:"Admin",lastName:"",isAdmin:true}); }};
  const inp = `w-full ${tc("bg-gray-800 border-gray-700 text-white placeholder-gray-600","bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")} border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400`;
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${tc("bg-gray-950","bg-slate-50")}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10"><div className="inline-flex items-center gap-3 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">{Ic.bolt("#fff",26)}</div><span className={`text-2xl font-bold ${tc("text-white","text-slate-900")}`}>ReVente Pro</span></div><p className="text-slate-500">Enchères internes</p></div>
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl p-8`}>
          <div className={`flex rounded-xl p-1 mb-6 ${tc("bg-gray-800","bg-slate-100")}`}><button onClick={()=>{setMode("employee");setError("");}} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode==="employee"?"bg-indigo-600 text-white shadow":"text-slate-500"}`}>Collaborateur</button><button onClick={()=>{setMode("admin");setError("");}} className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode==="admin"?"bg-indigo-600 text-white shadow":"text-slate-500"}`}>Admin</button></div>
          {mode==="employee"?<div className="space-y-4"><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Prénom</label><input value={firstName} onChange={e=>{setFirstName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submit()} className={inp}/></div><div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Nom</label><input value={lastName} onChange={e=>{setLastName(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submit()} className={inp}/></div></div>
          :<div><label className="text-[10px] uppercase tracking-wider block mb-1.5 text-slate-500">Code admin</label><input type="password" value={adminCode} onChange={e=>{setAdminCode(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&submit()} className={inp}/></div>}
          {error&&<div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
          <button onClick={submit} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl">Se connecter</button>
        </div>
        <div className="flex justify-center mt-6"><button onClick={toggle} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${tc("bg-gray-800 text-gray-400","bg-white border border-slate-200 text-slate-500")}`}>{dark?Ic.sun(null,16):Ic.moon(null,16)}{dark?"Clair":"Sombre"}</button></div>
      </div>
    </div>
  );
}

// ─── RULES ──────────────────────────────────────────────────────────────
function RulesScreen({ onAccept, user, companyName }) {
  const tc = useT(); const [scrolled, setScrolled] = useState(false); const [checked, setChecked] = useState(false); const ref = useRef(null);
  const rules = REGLEMENT_TEXT.replace(/\[NOM DE L'ENTREPRISE\]/g, companyName);
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${tc("bg-gray-950","bg-slate-50")}`}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8"><div className="inline-flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center">{Ic.check("#fff",22)}</div><span className={`text-xl font-bold ${tc("text-white","text-slate-900")}`}>Règlement</span></div><p className="text-slate-500">{user.firstName}, lisez et acceptez</p></div>
        <div className={`${tc("bg-gray-900 border-gray-800","bg-white border-slate-200")} border rounded-2xl overflow-hidden`}>
          <div ref={ref} onScroll={()=>{const el=ref.current;if(el&&el.scrollHeight-el.scrollTop-el.clientHeight<50) setScrolled(true);}} className={`p-6 max-h-80 overflow-y-auto text-sm leading-relaxed whitespace-pre-line ${tc("text-gray-300","text-slate-600")}`} style={{scrollbarWidth:"thin"}}>{rules}</div>
          <div className={`p-6 border-t ${tc("border-gray-800 bg-gray-950","border-slate-200 bg-slate-50")}`}>
            {!scrolled&&<p className="text-amber-600 text-xs mb-4 flex items-center gap-1.5">{Ic.down(null,16)} Défiler pour débloquer</p>}
            <label className={`flex items-start gap-3 cursor-pointer ${!scrolled?"opacity-40 pointer-events-none":""}`}><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 rounded text-indigo-600 focus:ring-indigo-400"/><span className={`text-sm ${tc("text-gray-300","text-slate-600")}`}>Je, <strong>{user.firstName} {user.lastName}</strong>, accepte le règlement.</span></label>
            <button onClick={onAccept} disabled={!checked} className={`w-full mt-5 font-semibold py-3.5 rounded-xl ${checked?"bg-indigo-600 hover:bg-indigo-500 text-white":"bg-slate-200 text-slate-400 cursor-not-allowed"}`}>Valider</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// APP
// ═════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);
  const [rulesOk, setRulesOk] = useState(false);
  const [rulesAcceptedAt, setRulesAcceptedAt] = useState(null);
  const db = useSupabase();

  const [selItem, setSelItem] = useState(null);
  const [selCat, setSelCat] = useState("Tous");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [winner, setWinner] = useState(null);
  const [payment, setPayment] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => { if(user&&!user.isAdmin){ const iv = setInterval(()=>db.heartbeat(user),30000); return()=>clearInterval(iv); }}, [user]);

  const handleLogin = async(u) => {
    setUser(u);
    if(u.isAdmin){ setRulesOk(true); } else {
      await db.connectUser(u);
      const signed = await db.hasSignedRules(u.firstName, u.lastName);
      if(signed){ setRulesOk(true); setRulesAcceptedAt(signed); }
    }
  };
  const handleLogout = async() => { if(user&&!user.isAdmin) await db.disconnectUser(user); setUser(null); setRulesOk(false); setRulesAcceptedAt(null); setSelItem(null); setShowForm(false); setEditItem(null); setWinner(null); setPayment(null); setContract(null); };
  const handleRulesAccept = async() => { const now = new Date().toISOString(); setRulesOk(true); setRulesAcceptedAt(now); await db.signRules(user.firstName, user.lastName); };
  const handleBid = async(itemId, amount) => { await db.placeBid(itemId, amount, user); };
  const handlePayment = async(w) => { await db.addSale({ itemId:w.itemId, title:w.title, description:w.description, condition:w.condition, category:w.category, buyerName:w.name, amount:w.amount, rulesAcceptedAt }); setPayment(null); };
  const handleSaveItem = async(it) => { if(it.id&&db.items.find(x=>x.id===it.id)) await db.updateItem(it); else await db.addItem(it); setShowForm(false); setEditItem(null); };

  const themeVal = { dark, toggle:()=>setDark(d=>!d) };

  if(db.loading) return <ThemeCtx.Provider value={themeVal}><div className={`min-h-screen flex items-center justify-center ${dark?"bg-gray-950":"bg-slate-50"}`}><div className="text-center"><div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">{Ic.bolt("#fff",26)}</div><p className="text-slate-500">Chargement...</p></div></div></ThemeCtx.Provider>;
  if(!user) return <ThemeCtx.Provider value={themeVal}><LoginScreen onLogin={handleLogin}/></ThemeCtx.Provider>;
  if(!rulesOk&&!user.isAdmin) return <ThemeCtx.Provider value={themeVal}><RulesScreen onAccept={handleRulesAccept} user={user} companyName={db.companyName}/></ThemeCtx.Provider>;

  const filtered = db.items.filter(it=>{ const mc=selCat==="Tous"||it.category===selCat; const ms=!search||it.title.toLowerCase().includes(search.toLowerCase()); return mc&&ms; });
  const isAdmin = user.isAdmin;
  const currentItem = selItem ? db.items.find(i=>i.id===selItem.id) : null;

  return (
    <ThemeCtx.Provider value={themeVal}>
      <div className={`min-h-screen ${dark?"text-white":"text-slate-800"}`} style={{background:dark?"#0a0a0f":"#f8fafc"}}>
        {winner&&<WinnerModal winner={winner} onClose={()=>setWinner(null)} onPay={w=>{setWinner(null);setPayment(w);}}/>}
        {payment&&<PaymentModal payment={payment} onClose={()=>setPayment(null)} onConfirm={handlePayment}/>}
        {contract&&<ContractModal contract={contract} onClose={()=>setContract(null)} companyName={db.companyName}/>}
        {showForm&&<ItemForm item={editItem} onSave={handleSaveItem} onCancel={()=>{setShowForm(false);setEditItem(null);}} categories={db.categories}/>}

        <header className={`border-b ${dark?"border-gray-800 bg-gray-950/80":"border-slate-200 bg-white/80"} backdrop-blur-sm sticky top-0 z-40`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={()=>setSelItem(null)}><div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">{Ic.bolt("#fff",18)}</div><span className={`text-base font-bold hidden sm:block ${dark?"text-white":"text-slate-900"}`}>ReVente Pro</span>{db.companyName!=="Mon Entreprise"&&<span className="text-xs hidden sm:block text-slate-400">— {db.companyName}</span>}{isAdmin&&<span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full ml-1">ADMIN</span>}</div>
            <div className="flex items-center gap-2"><button onClick={themeVal.toggle} className={`p-2 rounded-lg ${dark?"text-gray-400":"text-slate-400"}`}>{dark?Ic.sun(null,16):Ic.moon(null,16)}</button><div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{user.firstName.charAt(0)}{user.lastName?.charAt(0)||"A"}</div><span className="text-xs hidden sm:block text-slate-500">{user.firstName}</span><button onClick={handleLogout} className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-900">Déco</button></div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {isAdmin ? <AdminDash db={db} onShowForm={()=>{setEditItem(null);setShowForm(true);}} onEditItem={it=>{setEditItem(it);setShowForm(true);}}/> 
          : currentItem ? <ItemDetail item={currentItem} onBack={()=>setSelItem(null)} user={user} onBid={handleBid} onWin={setWinner}/>
          : <div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"><div><h1 className={`text-2xl sm:text-3xl font-bold ${dark?"text-white":"text-slate-900"}`}>Enchères en cours</h1><p className="text-sm mt-1 text-slate-500">{filtered.length} article{filtered.length!==1?"s":""}</p></div><div className="relative w-full sm:w-64"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{Ic.search()}</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className={`w-full ${dark?"bg-gray-900 border-gray-800 text-white":"bg-white border-slate-200 text-slate-900"} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400`}/></div></div>
              <div className="flex gap-2 mb-8 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>{["Tous",...db.categories].map(cat=><button key={cat} onClick={()=>setSelCat(cat)} className={`whitespace-nowrap text-sm px-4 py-2 rounded-xl border ${selCat===cat?"bg-indigo-600 border-indigo-600 text-white":dark?"bg-gray-900 border-gray-800 text-gray-400":"bg-white border-slate-200 text-slate-500"}`}>{cat}</button>)}</div>
              {filtered.length===0?<div className={`text-center py-20 ${dark?"bg-gray-900 border-gray-800":"bg-white border-slate-200"} border rounded-2xl`}><p className="text-5xl mb-4">📭</p><p className="text-slate-500">Aucun article.</p></div>
              :<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(it=><ItemCard key={it.id} item={it} onClick={setSelItem}/>)}</div>}
              {db.sales.filter(s=>s.buyer_name===`${user.firstName} ${user.lastName}`).length>0&&<div className="mt-12"><h2 className={`text-lg font-bold ${dark?"text-white":"text-slate-900"} mb-4`}>Mes achats</h2><div className="space-y-3">{db.sales.filter(s=>s.buyer_name===`${user.firstName} ${user.lastName}`).map(s=><div key={s.id} className={`${dark?"bg-gray-900 border-gray-800":"bg-white border-slate-200"} border rounded-xl p-4 flex items-center justify-between`}><div><div className={dark?"text-white":"text-slate-900"}>{s.item_title}</div><div className="text-xs text-slate-400">Payé le {fmtDate(s.paid_at)}</div></div><div className="flex items-center gap-3"><span className="text-indigo-500 font-semibold">{euro(Number(s.amount))}</span><button onClick={()=>setContract(s)} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">{Ic.file("#fff",12)} Contrat</button></div></div>)}</div></div>}
            </div>}
        </main>
        <footer className={`border-t ${dark?"border-gray-800":"border-slate-200"} mt-16`}><div className={`max-w-7xl mx-auto px-4 sm:px-6 py-5 text-center text-[11px] text-slate-400`}>© 2026 ReVente Pro{db.companyName!=="Mon Entreprise"?` — ${db.companyName}`:""} — Matériel vendu en l'état</div></footer>
      </div>
    </ThemeCtx.Provider>
  );
}

