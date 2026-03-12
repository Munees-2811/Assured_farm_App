import { useState, useEffect, useRef } from "react";

// ─── Firebase SDK (loaded via CDN) ────────────────────────────────────────────
// We use the compat (global) builds loaded in a useEffect so we don't need
// a bundler. All Firebase calls are wrapped in the DB helper below.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzRTrTb0ans-ObFJHarj9EhXtZYsK1148",
  authDomain: "assuredfarmapp.firebaseapp.com",
  databaseURL: "https://assuredfarmapp-default-rtdb.firebaseio.com",
  projectId: "assuredfarmapp",
  storageBucket: "assuredfarmapp.firebasestorage.app",
  messagingSenderId: "569146038693",
  appId: "1:569146038693:web:49fc74f27e3cd2a018704c",
  measurementId: "G-3FT6YEZYQV",
};

// ─── Firebase loader ──────────────────────────────────────────────────────────
let _db = null;
let _firebaseReady = false;
let _firebaseReadyCallbacks = [];

function onFirebaseReady(cb) {
  if (_firebaseReady) { cb(_db); return; }
  _firebaseReadyCallbacks.push(cb);
}

function loadFirebase() {
  if (_firebaseReady) return;
  const scripts = [
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js",
  ];
  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      loaded++;
      if (loaded === scripts.length) {
        try {
          const app = window.firebase.apps.length
            ? window.firebase.app()
            : window.firebase.initializeApp(FIREBASE_CONFIG);
          _db = window.firebase.database(app);
          _firebaseReady = true;
          _firebaseReadyCallbacks.forEach(cb => cb(_db));
          _firebaseReadyCallbacks = [];
        } catch (e) { console.error("Firebase init error:", e); }
      }
    };
    document.head.appendChild(s);
  });
}

// ─── DB helper wrapping Firebase Realtime Database ────────────────────────────
const DB = {
  // Read a collection (returns array) — resolves null after 3s if Firebase isn't ready
  async get(collection) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(null), 3000);
      onFirebaseReady(db => {
        clearTimeout(timer);
        db.ref(collection).once("value")
          .then(snap => {
            const val = snap.val();
            if (!val) { resolve(null); return; }
            if (Array.isArray(val)) { resolve(val); return; }
            if (typeof val === "object") { resolve(Object.values(val)); return; }
            resolve(val);
          })
          .catch(() => resolve(null));
      });
    });
  },

  // Write entire collection (array → object map keyed by item.id)
  async set(collection, data) {
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 5000);
      onFirebaseReady(db => {
        clearTimeout(timer);
        let payload = data;
        if (Array.isArray(data)) {
          payload = {};
          data.forEach(item => { if (item?.id) payload[item.id] = item; });
        }
        db.ref(collection).set(payload)
          .then(() => resolve(true))
          .catch(e => { console.error("DB.set error:", e); resolve(false); });
      });
    });
  },

  // Subscribe to live updates on a collection
  subscribe(collection, callback) {
    let ref = null;
    onFirebaseReady(db => {
      ref = db.ref(collection);
      ref.on("value", snap => {
        const val = snap.val();
        if (!val) { callback(null); return; }
        if (Array.isArray(val)) { callback(val); return; }
        if (typeof val === "object") { callback(Object.values(val)); return; }
        callback(val);
      });
    });
    // Return unsubscribe function
    return () => { if (ref) ref.off("value"); };
  },

  // Seed initial data only if collection is empty
  async seedIfEmpty(collection, seedData) {
    const existing = await this.get(collection);
    if (!existing || (Array.isArray(existing) && existing.length === 0)) {
      await this.set(collection, seedData);
    }
  },
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", role: "user",   name: "Alice Johnson", email: "alice@mail.com",  password: "alice123",  avatar: "AJ", phone: "+1-555-0101", joined: "2024-01-15" },
  { id: "u2", role: "former", name: "Robert Patel",  email: "robert@mail.com", password: "robert123", avatar: "RP", phone: "+91-98400-11223", joined: "2024-02-20", company: "Patel Farms & Co.", location: "Nashik, Maharashtra" },
  { id: "u3", role: "user",   name: "Maria Lopez",   email: "maria@mail.com",  password: "maria123",  avatar: "ML", phone: "+91-98400-33445", joined: "2024-03-10" },
  { id: "u4", role: "former", name: "James Thornton",email: "james@mail.com",  password: "james123",  avatar: "JT", phone: "+91-97300-55667", joined: "2024-01-05", company: "Thornton Organics", location: "Coimbatore, Tamil Nadu" },
];

const SEED_PRODUCTS = [
  { id: "p1", formerId: "u2", title: "Premium Organic Wheat", category: "Grains", price: 240, unit: "per ton", stock: 50, description: "High-quality organic wheat, pesticide-free, grown in rich soil. Perfect for bakeries and food manufacturers.", image: "🌾", tags: ["organic", "bulk"], createdAt: "2024-03-01", status: "available" },
  { id: "p2", formerId: "u4", title: "Fresh Tomatoes (Grade A)", category: "Vegetables", price: 85, unit: "per 100kg", stock: 200, description: "Sun-ripened grade-A tomatoes, harvested fresh from Thornton Organics. Ideal for restaurants and retailers.", image: "🍅", tags: ["fresh", "Grade A"], createdAt: "2024-03-10", status: "available" },
  { id: "p3", formerId: "u2", title: "Basmati Rice (Long Grain)", category: "Grains", price: 320, unit: "per ton", stock: 30, description: "Aromatic long-grain basmati rice, sourced from premium farmland. Consistent quality, bulk pricing available.", image: "🌾", tags: ["premium", "bulk"], createdAt: "2024-03-15", status: "available" },
  { id: "p4", formerId: "u4", title: "Raw Honey (Wildflower)", category: "Natural Products", price: 18, unit: "per kg", stock: 500, description: "Pure unprocessed wildflower honey. Rich in natural antioxidants. Lab-tested and certified organic.", image: "🍯", tags: ["organic", "certified"], createdAt: "2024-03-20", status: "available" },
  { id: "p5", formerId: "u2", title: "Yellow Corn (Non-GMO)", category: "Grains", price: 180, unit: "per ton", stock: 80, description: "Non-GMO yellow corn for feed and food production. Harvested and dried, ready for delivery.", image: "🌽", tags: ["non-GMO", "bulk"], createdAt: "2024-04-01", status: "available" },
  { id: "p6", formerId: "u4", title: "Fresh Spinach Bundle", category: "Vegetables", price: 12, unit: "per kg", stock: 150, description: "Freshly cut spinach, rich in iron and vitamins. Delivered within 24 hours of harvest.", image: "🥬", tags: ["fresh", "daily harvest"], createdAt: "2024-04-05", status: "available" },
];

const SEED_CONTRACTS = [
  { id: "c1", title: "Premium Organic Wheat — Purchase Agreement", formerId: "u2", userId: "u1", productId: "p1", status: "signed", type: "Purchase", value: 2400, qty: 10, unit: "ton", startDate: "2024-03-05", endDate: "2024-06-05", createdAt: "2024-03-04", signedAt: "2024-03-05", description: "Purchase agreement for 10 tons of Premium Organic Wheat from Patel Farms & Co.", clauses: ["Delivery within 7 business days", "Payment on delivery", "Quality inspection right upon receipt", "Refund policy: 48hrs for quality dispute"], userSigned: true, formerSigned: true },
  { id: "c2", title: "Raw Honey — Bulk Purchase Agreement", formerId: "u4", userId: "u3", productId: "p4", status: "pending_user", type: "Purchase", value: 1800, qty: 100, unit: "kg", startDate: "2024-04-10", endDate: "2024-07-10", createdAt: "2024-04-09", description: "Purchase agreement for 100 kg of Raw Wildflower Honey from Thornton Organics.", clauses: ["Cold-chain delivery required", "Lab certificate included", "Payment within 15 days of delivery", "Minimum 6-month shelf life guaranteed"], userSigned: false, formerSigned: true },
];

const SEED_ORDERS = [
  { id: "o1", productId: "p1", userId: "u1", formerId: "u2", qty: 10, total: 2400, status: "delivered", contractId: "c1", createdAt: "2024-03-04" },
  { id: "o2", productId: "p4", userId: "u3", formerId: "u4", qty: 100, total: 1800, status: "processing", contractId: "c2", createdAt: "2024-04-09" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
const STATUS_META = {
  draft:         { label: "Draft",           color: "#94a3b8", bg: "rgba(148,163,184,.15)" },
  pending_user:  { label: "Awaiting User",   color: "#f59e0b", bg: "rgba(245,158,11,.15)" },
  pending_former:{ label: "Awaiting Former", color: "#8b5cf6", bg: "rgba(139,92,246,.15)" },
  active:        { label: "Active",          color: "#10b981", bg: "rgba(16,185,129,.15)" },
  signed:        { label: "Signed",          color: "#3b82f6", bg: "rgba(59,130,246,.15)" },
  expired:       { label: "Expired",         color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  cancelled:     { label: "Cancelled",       color: "#6b7280", bg: "rgba(107,114,128,.15)" },
};
const ORDER_STATUS = {
  pending:    { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  processing: { label: "Processing", color: "#8b5cf6", bg: "rgba(139,92,246,.12)" },
  shipped:    { label: "Shipped",    color: "#3b82f6", bg: "rgba(59,130,246,.12)" },
  delivered:  { label: "Delivered",  color: "#10b981", bg: "rgba(16,185,129,.12)" },
  cancelled:  { label: "Cancelled",  color: "#6b7280", bg: "rgba(107,114,128,.12)" },
};
const CATEGORIES = ["All", "Grains", "Vegetables", "Fruits", "Natural Products", "Dairy", "Livestock", "Other"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#0f1923;--ink2:#2d3f50;--muted:#64748b;--line:rgba(15,25,35,.1);
  --gold:#c9a84c;--gold2:#e8c96e;--cream:#faf8f4;--white:#fff;
  --green:#16a34a;--green2:#22c55e;--green-bg:rgba(22,163,74,.08);
  --danger:#ef4444;--success:#10b981;--info:#3b82f6;--warn:#f59e0b;
  --r:12px;--sh:0 4px 24px rgba(15,25,35,.08);--sh2:0 12px 48px rgba(15,25,35,.14);
}
body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--ink)}
h1,h2,h3,h4{font-family:'Playfair Display',serif}

/* AUTH */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a1a0d 0%,#0f2d14 50%,#0a1a0d 100%);position:relative;overflow:hidden}
.auth-bg-ring{position:absolute;border-radius:50%;border:1px solid rgba(34,197,94,.1);pointer-events:none}
.auth-card{background:var(--white);border-radius:20px;padding:44px;width:460px;max-width:95vw;box-shadow:var(--sh2);position:relative;z-index:2}
.auth-logo{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.auth-logo-seal{width:46px;height:46px;background:linear-gradient(135deg,var(--green),var(--green2));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
.auth-logo-text{font-family:'Playfair Display',serif;font-size:20px;color:var(--ink);line-height:1.1}
.auth-logo-text span{display:block;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
.auth-tabs{display:flex;background:var(--cream);border-radius:10px;padding:4px;margin-bottom:24px}
.auth-tab{flex:1;padding:10px;text-align:center;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:var(--muted);transition:all .2s}
.auth-tab.active{background:var(--white);color:var(--ink);box-shadow:0 2px 8px rgba(15,25,35,.1)}

/* FORMS */
.field{margin-bottom:16px}
.field label{display:block;font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:6px;letter-spacing:.02em}
.field input,.field select,.field textarea{width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:var(--r);font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);background:var(--cream);transition:border-color .2s,box-shadow .2s;outline:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(22,163,74,.12);background:var(--white)}
.field textarea{resize:vertical;min-height:80px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:7px;padding:11px 20px;border-radius:var(--r);border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;transition:all .2s;white-space:nowrap}
.btn-green{background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;box-shadow:0 4px 14px rgba(22,163,74,.35)}
.btn-green:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.45)}
.btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--ink);box-shadow:0 4px 14px rgba(201,168,76,.35)}
.btn-gold:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,168,76,.45)}
.btn-dark{background:var(--ink);color:#fff}
.btn-dark:hover{background:var(--ink2);transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--muted);border:1.5px solid var(--line)}
.btn-ghost:hover{border-color:var(--green);color:var(--green)}
.btn-danger{background:rgba(239,68,68,.1);color:var(--danger);border:1.5px solid rgba(239,68,68,.2)}
.btn-danger:hover{background:var(--danger);color:#fff}
.btn-success{background:rgba(16,185,129,.1);color:var(--success);border:1.5px solid rgba(16,185,129,.25)}
.btn-success:hover{background:var(--success);color:#fff}
.btn-full{width:100%;justify-content:center}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important}
.err-msg{color:var(--danger);font-size:13px;margin-top:10px;padding:10px 14px;background:rgba(239,68,68,.07);border-radius:8px;border-left:3px solid var(--danger)}

/* LAYOUT */
.app{display:flex;min-height:100vh}
.sidebar{width:256px;background:#0a1a0d;color:#fff;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0}
.sidebar-header{padding:24px 20px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
.sidebar-logo{display:flex;align-items:center;gap:10px}
.sidebar-logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--green),var(--green2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.sidebar-logo-text{font-family:'Playfair Display',serif;font-size:16px;line-height:1.2}
.sidebar-logo-text span{display:block;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:rgba(255,255,255,.35);letter-spacing:.06em;text-transform:uppercase}
.sidebar-user{padding:14px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.07)}
.avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--green2));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
.avatar.gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--ink)}
.sidebar-user-info{flex:1;min-width:0}
.sidebar-user-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-user-role{font-size:11px;color:rgba(255,255,255,.4);text-transform:capitalize}
.sidebar-nav{flex:1;padding:12px 0}
.nav-section{padding:5px 20px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-top:8px}
.nav-item{display:flex;align-items:center;gap:11px;padding:10px 20px;cursor:pointer;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.55);transition:all .17s;border-left:3px solid transparent}
.nav-item:hover{color:#fff;background:rgba(255,255,255,.05)}
.nav-item.active{color:var(--green2);background:rgba(34,197,94,.1);border-left-color:var(--green2)}
.nav-badge{margin-left:auto;background:var(--green);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px}
.nav-badge.red{background:var(--danger)}
.sidebar-footer{padding:14px 20px;border-top:1px solid rgba(255,255,255,.07)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{background:var(--white);border-bottom:1px solid var(--line);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;box-shadow:0 1px 0 var(--line)}
.topbar-title{font-family:'Playfair Display',serif;font-size:20px;color:var(--ink)}
.topbar-actions{display:flex;align-items:center;gap:10px}
.content{padding:28px;flex:1}

/* CARDS */
.card{background:var(--white);border-radius:16px;box-shadow:var(--sh);border:1px solid var(--line)}
.card-header{padding:20px 24px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}
.card-body{padding:20px 24px}

/* STATS */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{background:var(--white);border-radius:14px;padding:20px 22px;box-shadow:var(--sh);border:1px solid var(--line);position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:-16px;right:-16px;width:70px;height:70px;border-radius:50%;opacity:.08}
.stat-card:nth-child(1)::before{background:var(--green)}
.stat-card:nth-child(2)::before{background:var(--gold)}
.stat-card:nth-child(3)::before{background:var(--info)}
.stat-card:nth-child(4)::before{background:var(--warn)}
.stat-icon{font-size:20px;margin-bottom:10px}
.stat-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--ink);line-height:1;margin-bottom:3px}
.stat-label{font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.05em}

/* MARKETPLACE */
.market-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}
.product-card{background:var(--white);border-radius:16px;border:1.5px solid var(--line);transition:all .22s;overflow:hidden;display:flex;flex-direction:column}
.product-card:hover{border-color:var(--green);box-shadow:0 8px 32px rgba(22,163,74,.12);transform:translateY(-2px)}
.product-img{height:120px;display:flex;align-items:center;justify-content:center;font-size:52px;background:linear-gradient(135deg,var(--green-bg),rgba(34,197,94,.04))}
.product-body{padding:16px 18px;flex:1;display:flex;flex-direction:column}
.product-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);margin-bottom:6px;line-height:1.3}
.product-desc{font-size:13px;color:var(--muted);line-height:1.55;flex:1;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.product-price{font-size:20px;font-family:'Playfair Display',serif;font-weight:700;color:var(--green);margin-bottom:4px}
.product-unit{font-size:12px;color:var(--muted)}
.product-footer{padding:14px 18px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px}
.product-tags{display:flex;gap:6px;flex-wrap:wrap}
.tag{display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;background:var(--green-bg);color:var(--green);border:1px solid rgba(22,163,74,.15)}
.tag.grey{background:var(--cream);color:var(--muted);border-color:var(--line)}
.stock-badge{font-size:12px;color:var(--muted);font-weight:500}
.stock-badge.low{color:var(--danger)}

/* FORMER PRODUCT CARD */
.product-manage-card{background:var(--white);border-radius:14px;border:1.5px solid var(--line);overflow:hidden;transition:all .18s}
.product-manage-card:hover{border-color:var(--gold);box-shadow:0 6px 24px rgba(201,168,76,.1)}
.product-manage-header{display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid var(--line)}
.product-manage-emoji{width:52px;height:52px;background:var(--green-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.product-manage-body{padding:14px 18px}
.product-manage-footer{padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end}

/* CONTRACT LIST */
.contract-card{background:var(--white);border-radius:14px;padding:20px 22px;border:1.5px solid var(--line);transition:all .2s;cursor:pointer}
.contract-card:hover{border-color:var(--gold);box-shadow:0 6px 28px rgba(201,168,76,.1);transform:translateY(-1px)}
.contract-title{font-family:'Playfair Display',serif;font-size:16px;color:var(--ink);font-weight:600;line-height:1.3;flex:1}

/* BADGES */
.status-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.03em;white-space:nowrap;flex-shrink:0}

/* TABLE */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:9px 14px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);background:var(--cream)}
td{padding:13px 14px;font-size:14px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(22,163,74,.03)}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(10,26,13,.65);z-index:100;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
.modal{background:var(--white);border-radius:20px;width:560px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:var(--sh2)}
.modal-header{padding:22px 26px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--white);z-index:1}
.modal-body{padding:22px 26px}
.modal-footer{padding:14px 26px 22px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--line)}
.close-btn{width:30px;height:30px;border-radius:8px;border:1.5px solid var(--line);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--muted)}
.close-btn:hover{background:var(--cream)}

/* PROFILE */
.profile-hero{background:linear-gradient(135deg,#0a1a0d 0%,#0f2d14 100%);border-radius:16px;padding:28px;color:#fff;display:flex;align-items:center;gap:22px;margin-bottom:22px}
.profile-ava{width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--green),var(--green2));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;border:3px solid rgba(255,255,255,.2);flex-shrink:0}
.profile-ava.gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--ink)}
.profile-name{font-family:'Playfair Display',serif;font-size:24px;margin-bottom:4px}

/* MISC */
.info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}
.info-row:last-child{border-bottom:none}
.info-row .k{color:var(--muted);font-weight:500}
.info-row .v{color:var(--ink);font-weight:600}
.divider{height:1px;background:var(--line);margin:18px 0}
.empty-state{text-align:center;padding:56px 20px;color:var(--muted)}
.empty-state .icon{font-size:46px;margin-bottom:14px;opacity:.4}
.empty-state h3{font-size:17px;color:var(--ink2);margin-bottom:7px}
.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
.filter-chip{padding:7px 14px;border-radius:20px;border:1.5px solid var(--line);background:var(--white);cursor:pointer;font-size:13px;font-weight:500;color:var(--muted);transition:all .17s}
.filter-chip.active{border-color:var(--green);color:var(--green);background:var(--green-bg)}
.search-bar{flex:1;min-width:180px;padding:9px 16px;border-radius:20px;border:1.5px solid var(--line);font-family:'DM Sans',sans-serif;font-size:14px;background:var(--white);outline:none}
.search-bar:focus{border-color:var(--green)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-section{background:var(--white);border-radius:14px;padding:24px;border:1px solid var(--line);margin-bottom:18px}
.clause-row{display:flex;gap:8px;margin-bottom:8px}
.clause-row input{flex:1;padding:9px 13px;border:1.5px solid var(--line);border-radius:var(--r);font-family:'DM Sans',sans-serif;font-size:14px;background:var(--cream);outline:none}
.clause-row input:focus{border-color:var(--green);background:var(--white)}
.qty-row{display:flex;align-items:center;gap:10px;background:var(--cream);border-radius:10px;padding:10px 14px;margin-bottom:14px}
.qty-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--line);background:var(--white);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--green);transition:all .15s}
.qty-btn:hover{background:var(--green);color:#fff;border-color:var(--green)}
.qty-val{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;min-width:40px;text-align:center}
.cart-badge{position:relative;display:inline-flex}
.cart-count{position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;font-size:10px;font-weight:700;width:17px;height:17px;border-radius:50%;display:flex;align-items:center;justify-content:center}

/* TOAST */
.toast-wrap{position:fixed;bottom:24px;right:24px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{background:var(--ink);color:#fff;padding:13px 18px;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:9px;box-shadow:var(--sh2);animation:slideIn .3s ease;max-width:320px}
.toast.success{border-left:4px solid var(--success)}
.toast.error{border-left:4px solid var(--danger)}
.toast.info{border-left:4px solid var(--info)}
@keyframes slideIn{from{transform:translateX(36px);opacity:0}to{transform:translateX(0);opacity:1}}
.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}
`;

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
let _toastId = 0, _toastSet = null;
const pushToast = (msg, type = "info") => { if (_toastSet) _toastSet(p => [...p, { id: ++_toastId, msg, type }]); };
function Toasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _toastSet = setToasts; }, []);
  useEffect(() => { if (!toasts.length) return; const t = setTimeout(() => setToasts(p => p.slice(1)), 3200); return () => clearTimeout(t); }, [toasts]);
  return <div className="toast-wrap">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"} {t.msg}</div>)}</div>;
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
const StatusBadge = ({ status, map = STATUS_META }) => {
  const m = map[status] || { label: status, color: "#94a3b8", bg: "rgba(148,163,184,.15)" };
  return <span className="status-badge" style={{ color: m.color, background: m.bg }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block" }} />{m.label}</span>;
};

// ═════════════════════════════════════════════════════════════════════════════
// AUTH PAGE
// ═════════════════════════════════════════════════════════════════════════════
function AuthPage({ onLogin, users, saveUsers }) {
  const [tab, setTab] = useState("user");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", phone: "", location: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr(""); setLoading(true);

    try {
      if (mode === "login") {
        // Use local users state first (already loaded), fall back to Firebase fetch
        let allUsers = users && users.length > 0 ? users : await DB.get("users");
        if (!allUsers || allUsers.length === 0) allUsers = SEED_USERS;

        const email = form.email.trim().toLowerCase();
        const u = allUsers.find(u =>
          u.email?.toLowerCase() === email &&
          u.password === form.password &&
          u.role === tab
        );

        if (!u) {
          const emailExists = allUsers.find(u => u.email?.toLowerCase() === email);
          if (!emailExists) {
            setErr("No account found with this email address.");
          } else {
            const roleMatch = allUsers.find(u => u.email?.toLowerCase() === email && u.password === form.password);
            if (roleMatch) {
              setErr(`Wrong role selected. This account is a "${roleMatch.role}". Please switch the tab above.`);
            } else {
              setErr("Incorrect password. Please try again.");
            }
          }
          setLoading(false); return;
        }
        onLogin(u);

      } else {
        // Register
        if (!form.name.trim()) { setErr("Please enter your full name."); setLoading(false); return; }
        if (!form.email.trim()) { setErr("Please enter your email address."); setLoading(false); return; }
        if (!form.password || form.password.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
        if (tab === "former" && !form.phone.trim()) { setErr("Phone number is required for farmers."); setLoading(false); return; }
        if (tab === "former" && !form.location.trim()) { setErr("Location is required for farmers."); setLoading(false); return; }

        // Use local users state first
        let allUsers = users && users.length > 0 ? users : (await DB.get("users") || []);
        if (!allUsers || allUsers.length === 0) allUsers = SEED_USERS;
        const email = form.email.trim().toLowerCase();
        if (allUsers.find(u => u.email?.toLowerCase() === email)) {
          setErr("An account with this email already exists. Please sign in.");
          setLoading(false); return;
        }

        const initials = form.name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const newUser = {
          id: "u" + Date.now(),
          role: tab,
          name: form.name.trim(),
          email: email,
          password: form.password,
          avatar: initials,
          phone: form.phone?.trim() || "",
          joined: new Date().toISOString().slice(0, 10),
          ...(tab === "former" ? {
            company: form.company?.trim() || "",
            location: form.location?.trim() || "",
          } : {}),
        };

        await saveUsers([...allUsers, newUser]);
        pushToast("Account created! Please sign in.", "success");
        setForm({ name: "", email: "", password: "", company: "", phone: "", location: "" });
        setMode("login"); setErr(""); setLoading(false); return;
      }
    } catch (e) {
      setErr("Connection error. Please check your internet and try again.");
      console.error("Auth error:", e);
    }

    setLoading(false);
  };

  // Allow Enter key to submit
  const handleKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>
      {[280, 480, 680, 880].map(s => <div key={s} className="auth-bg-ring" style={{ width: s, height: s, top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />)}
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-seal">🌿</div>
          <div className="auth-logo-text">Assured<span>Agri Contract & Market</span></div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "var(--cream)", borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, transition: "all .2s",
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "var(--ink)" : "var(--muted)",
                boxShadow: mode === m ? "0 2px 8px rgba(15,25,35,.1)" : "none",
              }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>
          {mode === "login" ? "Welcome back. Sign in to your account." : "Create your account to get started."}
        </p>

        {/* Role tabs */}
        <div className="auth-tabs" style={{ marginBottom: 20 }}>
          {["user", "former"].map(r => (
            <button key={r} className={`auth-tab${tab === r ? " active" : ""}`} onClick={() => { setTab(r); setErr(""); }}>
              {r === "user" ? "🛒 Buyer (User)" : "🌾 Farmer (Former)"}
            </button>
          ))}
        </div>

        {/* Form fields */}
        {mode === "register" && (
          <div className="field">
            <label>Full Name *</label>
            <input value={form.name} onChange={e => sf("name", e.target.value)} onKeyDown={handleKey} placeholder="Your full name" autoFocus />
          </div>
        )}

        <div className="field">
          <label>Email Address *</label>
          <input type="email" value={form.email} onChange={e => sf("email", e.target.value)} onKeyDown={handleKey} placeholder="you@example.com" autoFocus={mode === "login"} />
        </div>

        <div className="field">
          <label>Password *</label>
          <input type="password" value={form.password} onChange={e => sf("password", e.target.value)} onKeyDown={handleKey} placeholder={mode === "register" ? "Minimum 6 characters" : "••••••••"} />
        </div>

        {mode === "register" && tab === "former" && (
          <>
            <div className="field">
              <label>Farm / Company Name</label>
              <input value={form.company} onChange={e => sf("company", e.target.value)} onKeyDown={handleKey} placeholder="Your farm or company name" />
            </div>
            <div className="field">
              <label>Phone Number *</label>
              <input value={form.phone} onChange={e => sf("phone", e.target.value)} onKeyDown={handleKey} placeholder="+91-XXXXX-XXXXX" />
            </div>
            <div className="field">
              <label>Location (City, State) *</label>
              <input value={form.location} onChange={e => sf("location", e.target.value)} onKeyDown={handleKey} placeholder="e.g. Coimbatore, Tamil Nadu" />
            </div>
          </>
        )}

        {/* Error message */}
        {err && (
          <div style={{ padding: "11px 14px", background: "rgba(239,68,68,.08)", border: "1.5px solid rgba(239,68,68,.25)", borderRadius: 10, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 9 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 500, lineHeight: 1.5 }}>{err}</span>
          </div>
        )}

        {/* Submit button */}
        <button className="btn btn-green btn-full" onClick={submit} disabled={loading}
          style={{ height: 46, fontSize: 15, marginTop: 4, position: "relative" }}>
          {loading
            ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                {mode === "login" ? "Signing in…" : "Creating account…"}
              </span>
            : mode === "login" ? "Sign In →" : "Create Account →"
          }
        </button>

        {/* Demo credentials */}
        {mode === "login" && (
          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--cream)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>Demo Accounts</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { role: "Buyer",  email: "alice@mail.com",  pass: "alice123",  tab: "user" },
                { role: "Farmer", email: "robert@mail.com", pass: "robert123", tab: "former" },
              ].map(d => (
                <button key={d.email} onClick={() => { setForm(p => ({ ...p, email: d.email, password: d.pass })); setTab(d.tab); setErr(""); }}
                  style={{ padding: "8px 10px", background: "#fff", border: "1.5px solid var(--line)", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--green)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line)"}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 2 }}>{d.role}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{d.email}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, textAlign: "center" }}>Click a card to auto-fill credentials</div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Toasts />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═════════════════════════════════════════════════════════════════════════════
function Sidebar({ user, page, setPage, contracts, orders, cart }) {
  const pendingContracts = contracts.filter(c =>
    (user.role === "user" && c.userId === user.id && c.status === "pending_user") ||
    (user.role === "former" && c.formerId === user.id && c.status === "pending_former")
  ).length;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const nav = user.role === "former"
    ? [
        { sec: "Overview" },
        { id: "dashboard", icon: "◈", label: "Dashboard" },
        { sec: "Market" },
        { id: "my-products", icon: "🌾", label: "My Products" },
        { id: "post-product", icon: "✚", label: "Post Product" },
        { id: "orders", icon: "📦", label: "Orders Received", badge: orders.filter(o => o.formerId === user.id && o.status === "pending").length },
        { sec: "Contracts" },
        { id: "contracts", icon: "📄", label: "Contracts", badge: pendingContracts },
        { id: "create-contract", icon: "➕", label: "Create Contract" },
        { sec: "Account" },
        { id: "users", icon: "👥", label: "Buyers" },
        { id: "profile", icon: "⚙", label: "Profile" },
      ]
    : [
        { sec: "Overview" },
        { id: "dashboard", icon: "◈", label: "Dashboard" },
        { sec: "Shop" },
        { id: "marketplace", icon: "🛒", label: "Marketplace" },
        { id: "cart", icon: "🛍", label: "My Cart", badge: cartCount, badgeRed: false },
        { id: "my-orders", icon: "📦", label: "My Orders" },
        { sec: "Contracts" },
        { id: "contracts", icon: "📄", label: "My Contracts", badge: pendingContracts },
        { sec: "Account" },
        { id: "profile", icon: "⚙", label: "Profile" },
      ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌿</div>
          <div className="sidebar-logo-text">Assured<span>Agri Market</span></div>
        </div>
      </div>
      <div className="sidebar-user">
        <div className={`avatar${user.role === "former" ? " gold" : ""}`}>{user.avatar}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user.name}</div>
          <div className="sidebar-user-role">{user.role === "former" ? "🌾 Farmer" : "🛒 Buyer"}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item, i) => item.sec
          ? <div key={i} className="nav-section">{item.sec}</div>
          : (
            <div key={item.id} className={`nav-item${page === item.id ? " active" : ""}`} onClick={() => setPage(item.id)}>
              <span>{item.icon}</span>{item.label}
              {item.badge > 0 && <span className={`nav-badge${item.badgeRed ? " red" : ""}`}>{item.badge}</span>}
            </div>
          )
        )}
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>{user.role === "former" ? "Farmer / Former" : "Buyer / User"}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function Dashboard({ user, contracts, products, orders, setPage }) {
  const isFormer = user.role === "former";
  const myContracts = contracts.filter(c => isFormer ? c.formerId === user.id : c.userId === user.id);
  const myProducts = products.filter(p => p.formerId === user.id);
  const myOrders = orders.filter(o => isFormer ? o.formerId === user.id : o.userId === user.id);
  const revenue = myOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);

  const stats = isFormer
    ? [
        { icon: "🌾", val: myProducts.length, label: "Listed Products" },
        { icon: "📦", val: myOrders.length, label: "Total Orders" },
        { icon: "📄", val: myContracts.filter(c => ["signed", "active"].includes(c.status)).length, label: "Active Contracts" },
        { icon: "💰", val: fmt(revenue), label: "Revenue Delivered", small: true },
      ]
    : [
        { icon: "🛒", val: myOrders.length, label: "Total Orders" },
        { icon: "✅", val: myOrders.filter(o => o.status === "delivered").length, label: "Delivered" },
        { icon: "📄", val: myContracts.filter(c => ["signed", "active"].includes(c.status)).length, label: "Active Contracts" },
        { icon: "💰", val: fmt(myOrders.reduce((s, o) => s + o.total, 0)), label: "Total Spent", small: true },
      ];

  const recentOrders = [...myOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  return (
    <div>
      <div className="stat-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val" style={s.small ? { fontSize: 18 } : {}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {!isFormer && (
        <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg,#0a1a0d,#0f2d14)", border: "none" }}>
          <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#fff", marginBottom: 6 }}>Browse Fresh Products</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.55)" }}>Shop directly from certified farmers with contract assurance.</div>
            </div>
            <button className="btn btn-green" onClick={() => setPage("marketplace")}>Shop Now →</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 17 }}>Recent Orders</h3>
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={() => setPage(isFormer ? "orders" : "my-orders")}>View All →</button>
        </div>
        <div style={{ padding: "6px 0" }}>
          {recentOrders.length === 0
            ? <div className="empty-state" style={{ padding: "28px 20px" }}><div className="icon">📭</div><h3>No orders yet</h3></div>
            : recentOrders.map(o => {
              const prod = products.find(p => p.id === o.productId);
              return (
                <div key={o.id} style={{ padding: "13px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 26 }}>{prod?.image || "📦"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{prod?.title || "Product"}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>Qty: {o.qty} {prod?.unit?.replace("per ", "")} · {fmtDate(o.createdAt)}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(o.total)}</div>
                  <StatusBadge status={o.status} map={ORDER_STATUS} />
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MARKETPLACE (User view — browse & buy)
// ═════════════════════════════════════════════════════════════════════════════
function Marketplace({ user, products, users, cart, setCart, orders, setOrders, contracts, setContracts, setPage }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [buyModal, setBuyModal] = useState(null); // product
  const [qty, setQty] = useState(1);
  const [confirmModal, setConfirmModal] = useState(null);

  const farmers = users.filter(u => u.role === "former");
  const visible = products.filter(p => {
    if (p.status !== "available") return false;
    if (cat !== "All" && p.category !== cat) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openBuy = (p) => { setBuyModal(p); setQty(1); };

  const addToCart = () => {
    const existing = cart.find(i => i.productId === buyModal.id);
    if (existing) {
      setCart(cart.map(i => i.productId === buyModal.id ? { ...i, qty: i.qty + qty } : i));
    } else {
      setCart([...cart, { productId: buyModal.id, qty, price: buyModal.price }]);
    }
    pushToast(`${buyModal.title} added to cart!`, "success");
    setBuyModal(null);
  };

  const buyNow = () => {
    setConfirmModal({ product: buyModal, qty, total: buyModal.price * qty });
    setBuyModal(null);
  };

  const confirmPurchase = async () => {
    const { product, qty: q, total } = confirmModal;
    const farmer = users.find(u => u.id === product.formerId);
    const orderId = "o" + Date.now();
    const contractId = "c" + Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    const newOrder = { id: orderId, productId: product.id, userId: user.id, formerId: product.formerId, qty: q, total, status: "pending", contractId, createdAt: today };
    const newContract = {
      id: contractId, title: `${product.title} — Purchase Agreement`, formerId: product.formerId,
      userId: user.id, productId: product.id, status: "pending_user", type: "Purchase",
      value: total, qty: q, unit: product.unit, startDate: today, endDate,
      createdAt: today, description: `Purchase agreement for ${q} ${product.unit} of ${product.title} from ${farmer?.company || farmer?.name}.`,
      clauses: ["Delivery within 7 business days of contract signing", "Payment confirmed at order placement", "Quality inspection right upon receipt", "Dispute resolution within 48 hours of delivery", "Product meets certified standards as listed"],
      userSigned: false, formerSigned: true, signedAt: null,
    };

    const updatedOrders = [...orders, newOrder];
    const updatedContracts = [...contracts, newContract];
    setOrders(updatedOrders);
    setContracts(updatedContracts);
    await DB.set("orders", updatedOrders);
    await DB.set("contracts", updatedContracts);
    setConfirmModal(null);
    pushToast("Order placed! A contract has been generated — please sign it.", "success");
    setPage("contracts");
  };

  return (
    <div>
      <div className="filter-bar">
        <input className="search-bar" placeholder="🔍  Search products, categories…" value={search} onChange={e => setSearch(e.target.value)} />
        {CATEGORIES.map(c => <button key={c} className={`filter-chip${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
        <div className="cart-badge" onClick={() => setPage("cart")} style={{ cursor: "pointer" }}>
          <button className="btn btn-ghost" style={{ gap: 6 }}>🛍 Cart {cart.length > 0 && <span style={{ background: "var(--danger)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{cart.reduce((s, i) => s + i.qty, 0)}</span>}</button>
        </div>
      </div>

      {visible.length === 0
        ? <div className="empty-state"><div className="icon">🌾</div><h3>No products found</h3><p>Try adjusting your filters.</p></div>
        : (
          <div className="market-grid">
            {visible.map(p => {
              const farmer = users.find(u => u.id === p.formerId);
              const inCart = cart.find(i => i.productId === p.id);
              return (
                <div key={p.id} className="product-card">
                  <div className="product-img" style={{ padding: 0, overflow: "hidden" }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ fontSize: 52 }}>{p.image}</span>
                    }
                  </div>
                  <div className="product-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span className="tag grey">{p.category}</span>
                      {p.tags?.map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                    <div className="product-title">{p.title}</div>
                    <div className="product-desc">{p.description}</div>
                    <div className="product-price">{fmt(p.price)}</div>
                    <div className="product-unit">{p.unit} · {p.stock} units available</div>
                  </div>
                  <div className="product-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                      <div className={`avatar${farmer?.role === "former" ? " gold" : ""}`} style={{ width: 22, height: 22, fontSize: 9 }}>{farmer?.avatar}</div>
                      <span style={{ fontWeight: 600 }}>{farmer?.company || farmer?.name}</span>
                      {farmer?.location && <span style={{ color: "var(--muted)" }}>· 📍 {farmer.location}</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {farmer?.phone && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>📞 {farmer.phone}</span>}
                      {inCart && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, alignSelf: "center" }}>✓ In Cart ({inCart.qty})</span>}
                      <button className="btn btn-green" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => openBuy(p)}>Buy</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Buy Modal */}
      {buyModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {buyModal.imageUrl
                  ? <img src={buyModal.imageUrl} alt={buyModal.title} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  : <span style={{ fontSize: 32 }}>{buyModal.image}</span>
                }
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18 }}>{buyModal.title}</h3>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{fmt(buyModal.price)} {buyModal.unit}</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setBuyModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 16, lineHeight: 1.65 }}>{buyModal.description}</p>
              {(() => { const farmer = users.find(u => u.id === buyModal.formerId); return farmer ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--cream)", borderRadius: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <div className="avatar gold" style={{ width: 32, height: 32, fontSize: 12 }}>{farmer.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{farmer.name}{farmer.company ? ` · ${farmer.company}` : ""}</div>
                    <div style={{ display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
                      {farmer.phone && <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>📞 {farmer.phone}</span>}
                      {farmer.location && <span style={{ fontSize: 12, color: "var(--muted)" }}>📍 {farmer.location}</span>}
                    </div>
                  </div>
                </div>
              ) : null; })()}
              <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink2)" }}>Select Quantity:</div>
              <div className="qty-row">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <div className="qty-val">{qty}</div>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(buyModal.stock, q + 1))}>+</button>
                <div style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>{buyModal.unit}</div>
                <div style={{ marginLeft: "auto", fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{fmt(buyModal.price * qty)}</div>
              </div>
              <div style={{ padding: 14, background: "rgba(22,163,74,.06)", borderRadius: 10, border: "1px solid rgba(22,163,74,.15)", fontSize: 13, color: "var(--ink2)" }}>
                <strong>📋 Contract Assurance:</strong> A purchase agreement will be auto-generated when you proceed. You'll sign it digitally before delivery begins.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setBuyModal(null)}>Cancel</button>
              <button className="btn btn-ghost" onClick={addToCart}>🛍 Add to Cart</button>
              <button className="btn btn-green" onClick={buyNow}>Buy Now →</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Purchase Modal */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontFamily: "'Playfair Display',serif" }}>Confirm Purchase</h3>
              <button className="close-btn" onClick={() => setConfirmModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, background: "var(--cream)", borderRadius: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 40 }}>{confirmModal.product.image}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{confirmModal.product.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Qty: {confirmModal.qty} {confirmModal.product.unit}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{fmt(confirmModal.total)}</div>
                </div>
              </div>
              <div style={{ padding: 14, background: "rgba(22,163,74,.07)", borderRadius: 10, border: "1px solid rgba(22,163,74,.18)", fontSize: 14, lineHeight: 1.7 }}>
                ✅ A <strong>Purchase Agreement contract</strong> will be automatically created and sent to you for signature. Your order begins processing after both parties sign.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn btn-green" onClick={confirmPurchase}>✓ Confirm & Place Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CART
// ═════════════════════════════════════════════════════════════════════════════
function Cart({ user, cart, setCart, products, orders, setOrders, contracts, setContracts, setPage }) {
  const [loading, setLoading] = useState(false);
  const items = cart.map(i => ({ ...i, product: products.find(p => p.id === i.productId) })).filter(i => i.product);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const remove = (pid) => setCart(cart.filter(i => i.productId !== pid));
  const updateQty = (pid, qty) => {
    if (qty < 1) { remove(pid); return; }
    setCart(cart.map(i => i.productId === pid ? { ...i, qty } : i));
  };

  const checkout = async () => {
    if (!items.length) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const newOrders = [], newContracts = [];
    for (const item of items) {
      const orderId = "o" + Date.now() + Math.random();
      const contractId = "c" + Date.now() + Math.random();
      const farmer = products.find(p => p.id === item.productId);
      newOrders.push({ id: orderId, productId: item.productId, userId: user.id, formerId: item.product.formerId, qty: item.qty, total: item.price * item.qty, status: "pending", contractId, createdAt: today });
      newContracts.push({ id: contractId, title: `${item.product.title} — Purchase Agreement`, formerId: item.product.formerId, userId: user.id, productId: item.productId, status: "pending_user", type: "Purchase", value: item.price * item.qty, qty: item.qty, unit: item.product.unit, startDate: today, endDate, createdAt: today, description: `Purchase agreement for ${item.qty} ${item.product.unit} of ${item.product.title}.`, clauses: ["Delivery within 7 business days", "Payment at order placement", "Quality inspection on receipt", "48hr dispute window after delivery"], userSigned: false, formerSigned: true, signedAt: null });
    }
    const updatedOrders = [...orders, ...newOrders];
    const updatedContracts = [...contracts, ...newContracts];
    setOrders(updatedOrders); setContracts(updatedContracts);
    await DB.set("orders", updatedOrders); await DB.set("contracts", updatedContracts);
    setCart([]);
    setLoading(false);
    pushToast(`${items.length} order(s) placed! Sign your contracts to proceed.`, "success");
    setPage("contracts");
  };

  return (
    <div>
      {items.length === 0
        ? <div className="empty-state"><div className="icon">🛍</div><h3>Your cart is empty</h3><p style={{ marginBottom: 16 }}>Browse the marketplace to add products.</p><button className="btn btn-green" onClick={() => setPage("marketplace")}>Browse Products</button></div>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
            <div>
              {items.map(item => (
                <div key={item.productId} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 38 }}>{item.product.image}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.product.title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>{fmt(item.price)} {item.product.unit}</div>
                    </div>
                    <div className="qty-row" style={{ margin: 0, padding: "6px 10px" }}>
                      <button className="qty-btn" style={{ width: 26, height: 26 }} onClick={() => updateQty(item.productId, item.qty - 1)}>−</button>
                      <div className="qty-val" style={{ fontSize: 16, minWidth: 28 }}>{item.qty}</div>
                      <button className="qty-btn" style={{ width: 26, height: 26 }} onClick={() => updateQty(item.productId, item.qty + 1)}>+</button>
                    </div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "var(--green)", minWidth: 80, textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
                    <button className="btn btn-danger" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => remove(item.productId)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ position: "sticky", top: 76 }}>
              <div className="card-body">
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, marginBottom: 16 }}>Order Summary</div>
                {items.map(item => (
                  <div key={item.productId} className="info-row">
                    <span className="k" style={{ fontSize: 13 }}>{item.product.title} ×{item.qty}</span>
                    <span className="v" style={{ fontSize: 13 }}>{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                  <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{fmt(total)}</span>
                </div>
                <div style={{ padding: 12, background: "rgba(22,163,74,.07)", borderRadius: 8, fontSize: 12, color: "var(--ink2)", marginBottom: 14, lineHeight: 1.6 }}>
                  📋 Contracts will be auto-generated for each item. Sign them to start delivery.
                </div>
                <button className="btn btn-green btn-full" onClick={checkout} disabled={loading}>{loading ? "Processing…" : `Checkout (${items.length} item${items.length > 1 ? "s" : ""})`}</button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ORDERS (shared — filtered by role)
// ═════════════════════════════════════════════════════════════════════════════
function OrdersPage({ user, orders, products, users, contracts, setPage, setSelectedContract }) {
  const [filter, setFilter] = useState("all");
  const mine = orders.filter(o => user.role === "former" ? o.formerId === user.id : o.userId === user.id);
  const filtered = filter === "all" ? mine : mine.filter(o => o.status === filter);
  const statuses = ["all", ...new Set(mine.map(o => o.status))];

  return (
    <div>
      <div className="filter-bar">
        {statuses.map(s => <button key={s} className={`filter-chip${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>{s === "all" ? "All" : ORDER_STATUS[s]?.label || s}</button>)}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>{user.role === "former" ? "Buyer" : "Farmer"}</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th>Contract</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No orders found.</td></tr>
                : filtered.map(o => {
                  const prod = products.find(p => p.id === o.productId);
                  const other = users.find(u => u.id === (user.role === "former" ? o.userId : o.formerId));
                  const contract = contracts.find(c => c.id === o.contractId);
                  return (
                    <tr key={o.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{prod?.image || "📦"}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{prod?.title || "—"}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{prod?.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{other?.avatar}</div>
                          <span style={{ fontSize: 13 }}>{other?.name || "—"}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.qty} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>{prod?.unit?.replace("per ", "")}</span></td>
                      <td style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--green)" }}>{fmt(o.total)}</td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{fmtDate(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} map={ORDER_STATUS} /></td>
                      <td>
                        {contract
                          ? <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => { setSelectedContract(contract); setPage("contracts"); }}>📄 View</button>
                          : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MY PRODUCTS (Former)
// ═════════════════════════════════════════════════════════════════════════════
function MyProducts({ user, products, setPage, orders }) {
  const mine = products.filter(p => p.formerId === user.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <button className="btn btn-green" onClick={() => setPage("post-product")}>✚ Post New Product</button>
      </div>
      {mine.length === 0
        ? <div className="empty-state"><div className="icon">🌾</div><h3>No products yet</h3><p style={{ marginBottom: 14 }}>Start posting your farm products for buyers to find.</p><button className="btn btn-green" onClick={() => setPage("post-product")}>Post First Product</button></div>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {mine.map(p => {
              const productOrders = orders.filter(o => o.productId === p.id);
              const revenue = productOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
              return (
                <div key={p.id} className="product-manage-card">
                  <div className="product-manage-header">
                  <div className="product-manage-emoji" style={{ padding: 0, overflow: "hidden" }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
                      : <span style={{ fontSize: 26 }}>{p.image}</span>
                    }
                  </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, marginBottom: 3 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.category} · {fmt(p.price)} {p.unit}</div>
                    </div>
                    <StatusBadge status={p.status === "available" ? "active" : "cancelled"} />
                  </div>
                  <div className="product-manage-body">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                      {[["Orders", productOrders.length], ["Stock", p.stock], ["Revenue", fmt(revenue)]].map(([k, v]) => (
                        <div key={k} style={{ padding: "8px 6px", background: "var(--cream)", borderRadius: 8 }}>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16 }}>{v}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="product-manage-footer">
                    <div style={{ fontSize: 12, color: "var(--muted)", flex: 1, alignSelf: "center" }}>Posted {fmtDate(p.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// POST PRODUCT (Former)
// ═════════════════════════════════════════════════════════════════════════════
function PostProduct({ user, products, setProducts, onBack, setPage }) {
  const EMOJIS = { Grains: "🌾", Vegetables: "🥦", Fruits: "🍎", "Natural Products": "🍯", Dairy: "🥛", Livestock: "🐄", Other: "📦" };
  const [form, setForm] = useState({ title: "", category: "Grains", price: "", unit: "per kg", stock: "", description: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // base64 string
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) { pushToast("Please upload a valid image file.", "error"); return; }
    if (file.size > 3 * 1024 * 1024) { pushToast("Image must be under 3MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const save = async () => {
    if (!form.title || !form.price || !form.stock) { pushToast("Fill all required fields.", "error"); return; }
    setSaving(true);
    const np = {
      id: "p" + Date.now(), formerId: user.id, ...form,
      price: parseFloat(form.price), stock: parseInt(form.stock),
      image: EMOJIS[form.category] || "📦",
      imageUrl: imagePreview || null,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      createdAt: new Date().toISOString().slice(0, 10), status: "available",
    };
    const updated = [...products, np];
    setProducts(updated);
    await DB.set("products", updated);
    pushToast("Product posted to marketplace!", "success");
    setSaving(false); onBack();
  };

  const profileComplete = user.phone && user.location;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>Post New Product</h2>
      </div>

      {/* ── FARMER CONTACT CARD ── */}
      <div style={{ background: profileComplete ? "linear-gradient(135deg,#0a1a0d,#0f2d14)" : "linear-gradient(135deg,#1a0a0a,#2d0f0f)", borderRadius: 16, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div className="profile-ava gold" style={{ width: 56, height: 56, fontSize: 20 }}>{user.avatar}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: "#fff", marginBottom: 4 }}>{user.name}</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {user.company && <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)", display: "flex", alignItems: "center", gap: 5 }}>🏢 {user.company}</span>}
            {user.phone
              ? <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 5 }}>📞 {user.phone}</span>
              : <span style={{ fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 5 }}>📞 Phone not set</span>
            }
            {user.location
              ? <span style={{ fontSize: 13, color: "rgba(255,255,255,.7)", display: "flex", alignItems: "center", gap: 5 }}>📍 {user.location}</span>
              : <span style={{ fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 5 }}>📍 Location not set</span>
            }
          </div>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", textAlign: "right" }}>
          {profileComplete
            ? <span style={{ color: "var(--green2)", fontWeight: 600 }}>✓ Contact info visible to buyers</span>
            : <span style={{ color: "#f59e0b", fontWeight: 600 }}>⚠ Complete your profile to show contact info</span>
          }
        </div>
      </div>

      {!profileComplete && (
        <div style={{ padding: "14px 18px", background: "rgba(245,158,11,.08)", border: "1.5px solid rgba(245,158,11,.3)", borderRadius: 12, marginBottom: 20, fontSize: 14, color: "var(--ink2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong>Your phone number and location are missing.</strong> Buyers need this to contact you and arrange delivery.
            <span style={{ color: "var(--green)", fontWeight: 600, cursor: "pointer", marginLeft: 8 }} onClick={() => setPage("profile")}>→ Update in Profile</span>
          </div>
        </div>
      )}

      <div className="form-section">
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, marginBottom: 18 }}>🌾 Product Information</div>

        {/* ── IMAGE UPLOAD ── */}
        <div className="field" style={{ marginBottom: 22 }}>
          <label>Product Photo</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("prod-img-input").click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--green)" : imagePreview ? "var(--green)" : "var(--line)"}`,
              borderRadius: 14,
              background: dragOver ? "var(--green-bg)" : imagePreview ? "transparent" : "var(--cream)",
              cursor: "pointer",
              transition: "all .2s",
              overflow: "hidden",
              position: "relative",
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {imagePreview ? (
              <div style={{ width: "100%", position: "relative" }}>
                <img src={imagePreview} alt="Product" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block", borderRadius: 12 }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s", borderRadius: 12 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <div style={{ background: "rgba(0,0,0,.55)", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, backdropFilter: "blur(4px)" }}>📷 Change Photo</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setImagePreview(null); }}
                  style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,.55)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, backdropFilter: "blur(4px)" }}
                >✕</button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>📷</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink2)", marginBottom: 6 }}>Upload Product Photo</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Drag & drop or click to browse</div>
                <span style={{ display: "inline-block", padding: "7px 16px", borderRadius: 8, background: "var(--white)", border: "1.5px solid var(--line)", fontSize: 13, fontWeight: 600, color: "var(--ink2)" }}>Choose File</span>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>JPG, PNG, WEBP · Max 3MB</div>
              </div>
            )}
          </div>
          <input
            id="prod-img-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => { if (e.target.files[0]) handleImageFile(e.target.files[0]); }}
          />
        </div>

        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Product Title *</label>
            <input value={form.title} onChange={e => sf("title", e.target.value)} placeholder="e.g. Premium Organic Wheat" />
          </div>
          <div className="field">
            <label>Category *</label>
            <select value={form.category} onChange={e => sf("category", e.target.value)}>
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Unit</label>
            <select value={form.unit} onChange={e => sf("unit", e.target.value)}>
              {["per kg", "per ton", "per 100kg", "per unit", "per litre", "per dozen", "per bag"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Price (₹ INR) *</label>
            <input type="number" value={form.price} onChange={e => sf("price", e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label>Available Stock *</label>
            <input type="number" value={form.stock} onChange={e => sf("stock", e.target.value)} placeholder="Quantity available" />
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => sf("description", e.target.value)} placeholder="Describe quality, sourcing, certifications, delivery details…" />
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => sf("tags", e.target.value)} placeholder="e.g. organic, bulk, certified, fresh" />
          </div>
        </div>
        <div style={{ padding: 14, background: "var(--green-bg)", borderRadius: 10, border: "1px solid rgba(22,163,74,.15)", fontSize: 13, color: "var(--ink2)" }}>
          📋 When a buyer purchases this product, a <strong>Purchase Agreement contract</strong> will be automatically generated and sent to both parties for digital signature.
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onBack}>Discard</button>
        <button className="btn btn-green" onClick={save} disabled={saving}>{saving ? "Posting…" : "🌾 Post to Marketplace"}</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTRACTS PAGE
// ═════════════════════════════════════════════════════════════════════════════
function ContractsPage({ user, contracts, products, users, selectedContract, setSelectedContract }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const mine = contracts.filter(c => user.role === "user" ? c.userId === user.id : c.formerId === user.id);
  const filtered = mine.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const statuses = ["all", ...new Set(mine.map(c => c.status))];

  if (selectedContract) return null; // handled in parent

  return (
    <div>
      <div className="filter-bar">
        <input className="search-bar" placeholder="🔍  Search contracts…" value={search} onChange={e => setSearch(e.target.value)} />
        {statuses.map(s => <button key={s} className={`filter-chip${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>{s === "all" ? "All" : STATUS_META[s]?.label || s}</button>)}
      </div>
      {filtered.length === 0
        ? <div className="empty-state"><div className="icon">📭</div><h3>No contracts found</h3></div>
        : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map(c => {
              const other = users.find(u => u.id === (user.role === "user" ? c.formerId : c.userId));
              const prod = products.find(p => p.id === c.productId);
              return (
                <div key={c.id} className="contract-card" onClick={() => setSelectedContract(c)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    {prod && <span style={{ fontSize: 28, flexShrink: 0 }}>{prod.image}</span>}
                    <div style={{ flex: 1 }}>
                      <div className="contract-title">{c.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Created {fmtDate(c.createdAt)}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>💰 {fmt(c.value)}</span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>📅 {fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                    <span className="tag grey">{c.type}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                      <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>{other?.avatar}</div>
                      {user.role === "user" ? "Farmer" : "Buyer"}: {other?.name}
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 12 }}>
                      <span style={{ color: c.formerSigned ? "var(--success)" : "var(--warn)" }}>{c.formerSigned ? "✓" : "○"} Farmer</span>
                      <span style={{ color: c.userSigned ? "var(--success)" : "var(--warn)" }}>{c.userSigned ? "✓" : "○"} Buyer</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTRACT DETAIL
// ═════════════════════════════════════════════════════════════════════════════
function ContractDetail({ contract, user, users, products, onBack, onUpdate }) {
  const [showSign, setShowSign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const former = users.find(u => u.id === contract.formerId);
  const userParty = users.find(u => u.id === contract.userId);
  const prod = products.find(p => p.id === contract.productId);
  const canSign = !["cancelled", "expired"].includes(contract.status) &&
    ((user.role === "user" && contract.userId === user.id && !contract.userSigned) ||
     (user.role === "former" && contract.formerId === user.id && !contract.formerSigned));

  const handleSign = async () => {
    const u = { ...contract };
    if (user.role === "user") u.userSigned = true; else u.formerSigned = true;
    if (u.userSigned && u.formerSigned) { u.status = "signed"; u.signedAt = new Date().toISOString().slice(0, 10); }
    else if (u.formerSigned) u.status = "pending_user";
    else u.status = "pending_former";
    await onUpdate(u);
    pushToast("Contract signed successfully! 🎉", "success");
    setShowSign(false);
  };

  const handleCancel = async () => {
    await onUpdate({ ...contract, status: "cancelled" });
    pushToast("Contract cancelled.", "info");
    setShowCancel(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {prod && <span style={{ fontSize: 28 }}>{prod.image}</span>}
            <div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20 }}>{contract.title}</h2>
              <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                <StatusBadge status={contract.status} />
                <span className="tag grey">{contract.type}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Created {fmtDate(contract.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canSign && <button className="btn btn-success" onClick={() => setShowSign(true)}>✍ Sign Contract</button>}
          {user.role === "former" && !["cancelled", "expired"].includes(contract.status) && <button className="btn btn-danger" onClick={() => setShowCancel(true)}>✕ Cancel</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div>
          <div className="form-section">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>Description</div>
            <p style={{ fontSize: 15, color: "var(--ink2)", lineHeight: 1.7 }}>{contract.description || "No description."}</p>
          </div>
          <div className="form-section">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Contract Clauses</div>
            <ul style={{ listStyle: "none" }}>
              {(contract.clauses || []).map((cl, i) => (
                <li key={i} style={{ padding: "10px 14px", background: "var(--cream)", borderRadius: 8, marginBottom: 8, display: "flex", gap: 10, fontSize: 14, color: "var(--ink2)" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>§</span>{cl}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-body">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Details</div>
              {[["Value", fmt(contract.value)], ["Quantity", contract.qty ? `${contract.qty} ${contract.unit}` : "—"], ["Type", contract.type], ["Start", fmtDate(contract.startDate)], ["End", fmtDate(contract.endDate)], ["Signed", fmtDate(contract.signedAt)]].map(([k, v]) => (
                <div key={k} className="info-row"><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>Parties & Signatures</div>
              {[{ label: "Farmer (Former)", person: former, signed: contract.formerSigned }, { label: "Buyer (User)", person: userParty, signed: contract.userSigned }].map(({ label, person, signed }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 7 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div className={`avatar${person?.role === "former" ? " gold" : ""}`}>{person?.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{person?.name}</div>
                      {person?.company && <div style={{ fontSize: 12, color: "var(--muted)" }}>🏢 {person.company}</div>}
                      {person?.phone && <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 2 }}>📞 {person.phone}</div>}
                      {person?.location && <div style={{ fontSize: 12, color: "var(--muted)" }}>📍 {person.location}</div>}
                      {!person?.phone && !person?.company && <div style={{ fontSize: 12, color: "var(--muted)" }}>{person?.email}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: signed ? "var(--success)" : "var(--warn)", fontWeight: 700 }}>{signed ? "✓ Signed" : "○ Pending"}</span>
                  </div>
                  <div className="divider" style={{ margin: "10px 0" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showSign && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontFamily: "'Playfair Display',serif" }}>Sign Contract</h3><button className="close-btn" onClick={() => setShowSign(false)}>✕</button></div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: "var(--ink2)", marginBottom: 18, lineHeight: 1.7 }}>By signing, you confirm you agree to all terms in <strong>"{contract.title}"</strong>.</p>
              <div style={{ padding: 18, background: "var(--cream)", borderRadius: 12, border: "2px dashed var(--green)", textAlign: "center" }}>
                <div style={{ fontFamily: "cursive", fontSize: 30, color: "var(--green)", padding: "6px 0" }}>{user.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSign(false)}>Cancel</button>
              <button className="btn btn-green" onClick={handleSign}>✍ Confirm Signature</button>
            </div>
          </div>
        </div>
      )}
      {showCancel && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3 style={{ fontFamily: "'Playfair Display',serif" }}>Cancel Contract</h3><button className="close-btn" onClick={() => setShowCancel(false)}>✕</button></div>
            <div className="modal-body"><p style={{ fontSize: 15, color: "var(--ink2)" }}>Are you sure? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCancel(false)}>Keep</button>
              <button className="btn btn-danger" onClick={handleCancel}>Cancel Contract</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CREATE CONTRACT (Former — manual)
// ═════════════════════════════════════════════════════════════════════════════
function CreateContract({ user, users, contracts, setContracts, onBack }) {
  const [form, setForm] = useState({ title: "", type: "Service", userId: "", value: "", startDate: "", endDate: "", description: "", clauses: [""] });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const buyers = users.filter(u => u.role === "user");

  const save = async () => {
    if (!form.title || !form.userId || !form.value || !form.startDate || !form.endDate) { pushToast("Fill all required fields.", "error"); return; }
    setSaving(true);
    const nc = { id: "c" + Date.now(), ...form, value: parseFloat(form.value), formerId: user.id, status: "pending_user", createdAt: new Date().toISOString().slice(0, 10), clauses: form.clauses.filter(c => c.trim()), userSigned: false, formerSigned: true, signedAt: null };
    const updated = [...contracts, nc];
    setContracts(updated);
    await DB.set("contracts", updated);
    pushToast("Contract created and sent!", "success");
    setSaving(false); onBack();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22 }}>Create Manual Contract</h2>
      </div>
      <div className="form-section">
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, marginBottom: 18 }}>📋 Contract Details</div>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1/-1" }}><label>Title *</label><input value={form.title} onChange={e => sf("title", e.target.value)} placeholder="Contract title" /></div>
          <div className="field"><label>Type</label><select value={form.type} onChange={e => sf("type", e.target.value)}>{["Service", "Purchase", "Employment", "Lease", "Consulting", "NDA", "Partnership", "Other"].map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label>Assign to Buyer *</label><select value={form.userId} onChange={e => sf("userId", e.target.value)}><option value="">— Select Buyer —</option>{buyers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>
          <div className="field"><label>Value (₹ INR) *</label><input type="number" value={form.value} onChange={e => sf("value", e.target.value)} placeholder="0.00" /></div>
          <div className="field"><label>Start Date *</label><input type="date" value={form.startDate} onChange={e => sf("startDate", e.target.value)} /></div>
          <div className="field"><label>End Date *</label><input type="date" value={form.endDate} onChange={e => sf("endDate", e.target.value)} /></div>
          <div className="field" style={{ gridColumn: "1/-1" }}><label>Description</label><textarea value={form.description} onChange={e => sf("description", e.target.value)} placeholder="Describe the contract scope…" /></div>
        </div>
      </div>
      <div className="form-section">
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, marginBottom: 14 }}>§ Clauses</div>
        {form.clauses.map((cl, i) => (
          <div key={i} className="clause-row">
            <input value={cl} onChange={e => sf("clauses", form.clauses.map((c, j) => j === i ? e.target.value : c))} placeholder={`Clause ${i + 1}`} />
            {form.clauses.length > 1 && <button className="btn btn-ghost" style={{ padding: "7px 12px" }} onClick={() => sf("clauses", form.clauses.filter((_, j) => j !== i))}>✕</button>}
          </div>
        ))}
        <button className="btn btn-ghost mt-2" onClick={() => sf("clauses", [...form.clauses, ""])}>+ Add Clause</button>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onBack}>Discard</button>
        <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? "Creating…" : "✚ Create & Send"}</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BUYERS PAGE (Former)
// ═════════════════════════════════════════════════════════════════════════════
function BuyersPage({ users, contracts, orders }) {
  const buyers = users.filter(u => u.role === "user");
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18 }}>Registered Buyers</h3>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{buyers.length} buyers</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Buyer</th><th>Email</th><th>Orders</th><th>Contracts</th><th>Total Spent</th><th>Joined</th></tr></thead>
          <tbody>
            {buyers.map(u => {
              const uo = orders.filter(o => o.userId === u.id);
              const uc = contracts.filter(c => c.userId === u.id);
              return (
                <tr key={u.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{u.avatar}</div><strong>{u.name}</strong></div></td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{u.email}</td>
                  <td><strong>{uo.length}</strong></td>
                  <td><strong>{uc.length}</strong></td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(uo.reduce((s, o) => s + o.total, 0))}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{fmtDate(u.joined)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═════════════════════════════════════════════════════════════════════════════
function ProfilePage({ user, contracts, orders, products, onLogout, onUpdateUser }) {
  const mine = contracts.filter(c => user.role === "user" ? c.userId === user.id : c.formerId === user.id);
  const myOrders = orders.filter(o => user.role === "former" ? o.formerId === user.id : o.userId === user.id);
  const isFormer = user.role === "former";

  const [form, setForm] = useState({
    phone: user.phone || "",
    website: user.website || "",
    location: user.location || "",
    company: user.company || "",
  });
  const [saving, setSaving] = useState(false);
  const [avatarImg, setAvatarImg] = useState(user.avatarImg || null);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setSaving(true);
    await onUpdateUser({ ...user, ...form });
    pushToast("Profile saved!", "success");
    setSaving(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { pushToast("Image must be under 2MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = ev.target.result;
      setAvatarImg(img);
      await onUpdateUser({ ...user, avatarImg: img });
      pushToast("Profile photo updated!", "success");
    };
    reader.readAsDataURL(file);
  };

  const activeContracts = mine.filter(c => c.status === "signed" || c.status === "active").length;
  const delivered = myOrders.filter(o => o.status === "delivered").length;

  return (
    <div style={{ background: "#f0faf4", minHeight: "100%", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .pp3-wrap { background: #f0faf4; min-height: 100%; }

        /* Top purple bar */
        .pp3-topbar {
          background: #16a34a;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 22px 18px;
        }
        .pp3-topbar-title {
          font-size: 18px; font-weight: 700; color: #fff;
          font-family: 'DM Sans', sans-serif;
        }
        .pp3-gear {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(255,255,255,0.18); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; font-size: 16px;
          transition: background .15s;
        }
        .pp3-gear:hover { background: rgba(255,255,255,0.28); }

        /* White hero card */
        .pp3-hero {
          background: #fff;
          margin: 0 0 16px 0;
          padding: 32px 24px 28px;
          display: flex; flex-direction: column; align-items: center;
          border-radius: 0 0 24px 24px;
          box-shadow: 0 4px 20px rgba(22,163,74,0.08);
        }

        /* Avatar */
        .pp3-ava-wrap {
          position: relative; margin-bottom: 16px;
        }
        .pp3-ava {
          width: 90px; height: 90px; border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #4ade80);
          display: flex; align-items: center; justify-content: center;
          font-size: 34px; font-weight: 800; color: #fff;
          overflow: hidden; cursor: pointer;
          border: 3px solid #d1fae5;
          box-shadow: 0 4px 18px rgba(22,163,74,0.22);
        }
        .pp3-cam-btn {
          position: absolute; bottom: 2px; right: 2px;
          width: 26px; height: 26px; border-radius: 50%;
          background: #16a34a; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* Name */
        .pp3-name {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: #1a1a2e;
          margin-bottom: 6px; text-align: center;
        }
        .pp3-role-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: #16a34a; color: #fff;
          border-radius: 20px; padding: 5px 14px;
          font-size: 13px; font-weight: 600;
          margin-bottom: 8px;
        }
        .pp3-joined {
          font-size: 12px; color: #9ca3af;
        }

        /* Stats row */
        .pp3-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 12px; padding: 0 16px 16px;
        }
        .pp3-stat-card {
          background: #fff; border-radius: 16px;
          padding: 16px 8px; text-align: center;
          box-shadow: 0 2px 10px rgba(22,163,74,0.07);
        }
        .pp3-stat-icon { font-size: 22px; margin-bottom: 6px; }
        .pp3-stat-num {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 1;
          margin-bottom: 4px;
        }
        .pp3-stat-label {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .05em; color: #9ca3af;
        }

        /* Form section */
        .pp3-section {
          background: #fff; border-radius: 20px;
          margin: 0 16px 16px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(22,163,74,0.07);
        }
        .pp3-section-label {
          padding: 16px 20px 8px;
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: #9ca3af;
        }

        /* Field row */
        .pp3-field {
          padding: 0 20px 16px;
        }
        .pp3-field-label {
          font-size: 11px; color: #9ca3af; font-weight: 600;
          letter-spacing: .04em; margin-bottom: 6px;
          text-transform: uppercase;
        }
        .pp3-field-row {
          display: flex; align-items: center;
          background: #f0faf4; border-radius: 12px;
          border: 1.5px solid #d1fae5;
          padding: 12px 14px; gap: 10px;
          transition: border-color .15s, box-shadow .15s;
        }
        .pp3-field-row:focus-within {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
          background: #fff;
        }
        .pp3-field-input {
          flex: 1; border: none; outline: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 500; color: #1f2937;
          min-width: 0;
        }
        .pp3-field-input:disabled { color: #6b7280; cursor: not-allowed; }
        .pp3-field-input::placeholder { color: #6ee7b7; }
        .pp3-field-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pp3-field-icon.purple { background: #16a34a; }
        .pp3-field-icon.green  { background: #16a34a; }
        .pp3-field-icon.grey   { background: #e5e7eb; }

        /* Save button */
        .pp3-save {
          display: block; width: calc(100% - 32px);
          margin: 0 16px 12px;
          padding: 16px;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          color: #fff; border: none; border-radius: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700; cursor: pointer;
          box-shadow: 0 6px 20px rgba(22,163,74,0.3);
          transition: all .18s;
        }
        .pp3-save:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(22,163,74,0.4); }
        .pp3-save:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        /* Sign out */
        .pp3-logout {
          display: block; width: calc(100% - 32px);
          margin: 0 16px 28px;
          padding: 14px;
          background: #fff; color: #ef4444;
          border: 1.5px solid rgba(239,68,68,0.25);
          border-radius: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all .15s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .pp3-logout:hover { background: rgba(239,68,68,0.06); border-color: #ef4444; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="pp3-topbar">
        <span className="pp3-topbar-title">Your Profile</span>
        <button className="pp3-gear" onClick={saveProfile} disabled={saving} title="Save profile">
          ⚙
        </button>
      </div>

      {/* ── HERO CARD ── */}
      <div className="pp3-hero">
        {/* Avatar */}
        <div className="pp3-ava-wrap">
          <label htmlFor="pp3-ava-input" style={{ cursor: "pointer" }}>
            <div className="pp3-ava">
              {avatarImg || user.avatarImg
                ? <img src={avatarImg || user.avatarImg} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span>{user.avatar}</span>
              }
            </div>
            <div className="pp3-cam-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </label>
          <input id="pp3-ava-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
        </div>

        {/* Name */}
        <div className="pp3-name">{user.name}</div>

        {/* Role pill */}
        <div className="pp3-role-pill">
          {isFormer ? "🌾 Farmer / Former" : "🛒 Buyer / User"}
        </div>

        {/* Joined */}
        <div className="pp3-joined">
          Since {user.joined ? new Date(user.joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="pp3-stats">
        {[
          { icon: "🛒", num: myOrders.length,    label: isFormer ? "Orders\nReceived" : "Orders\nPlaced" },
          { icon: "✅", num: delivered,           label: "Delivered" },
          { icon: "📄", num: mine.length,         label: "Contracts" },
          { icon: "🤝", num: activeContracts,     label: "Active\nContracts" },
        ].map((s, i) => (
          <div key={i} className="pp3-stat-card">
            <div className="pp3-stat-icon">{s.icon}</div>
            <div className="pp3-stat-num">{s.num}</div>
            <div className="pp3-stat-label" style={{ whiteSpace: "pre-line" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CONTACT FIELDS ── */}
      <div className="pp3-section">
        <div className="pp3-section-label">Contact Details</div>

        {/* Email */}
        <div className="pp3-field">
          <div className="pp3-field-label">Email Address</div>
          <div className="pp3-field-row">
            <div className="pp3-field-icon grey">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <input className="pp3-field-input" value={user.email} disabled />
          </div>
        </div>

        {/* Phone */}
        <div className="pp3-field">
          <div className="pp3-field-label">Phone</div>
          <div className="pp3-field-row">
            <div className="pp3-field-icon green">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <input className="pp3-field-input" value={form.phone} onChange={e => sf("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </div>
        </div>

        {/* Website — farmers only */}
        {isFormer && (
          <div className="pp3-field">
            <div className="pp3-field-label">Website</div>
            <div className="pp3-field-row">
              <div className="pp3-field-icon purple">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <input className="pp3-field-input" value={form.website} onChange={e => sf("website", e.target.value)} placeholder="www.yourfarm.com" />
            </div>
          </div>
        )}

        {/* Password */}
        <div className="pp3-field">
          <div className="pp3-field-label">Password</div>
          <div className="pp3-field-row">
            <div className="pp3-field-icon grey">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input className="pp3-field-input" type="password" value={user.password || "••••••••"} disabled />
          </div>
        </div>

        {/* Location — farmers only */}
        {isFormer && (
          <div className="pp3-field">
            <div className="pp3-field-label">Location</div>
            <div className="pp3-field-row">
              <div className="pp3-field-icon purple">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <input className="pp3-field-input" value={form.location} onChange={e => sf("location", e.target.value)} placeholder="City, State" />
            </div>
          </div>
        )}

        {/* Farm/Company — farmers only */}
        {isFormer && (
          <div className="pp3-field">
            <div className="pp3-field-label">Farm / Company</div>
            <div className="pp3-field-row">
              <div className="pp3-field-icon purple">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <input className="pp3-field-input" value={form.company} onChange={e => sf("company", e.target.value)} placeholder="Your farm or company" />
            </div>
          </div>
        )}
      </div>

      {/* ── SAVE BUTTON ── */}
      <button className="pp3-save" onClick={saveProfile} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </button>

      {/* ── SIGN OUT ── */}
      <button className="pp3-logout" onClick={onLogout}>
        ↪ Sign Out
      </button>
    </div>
  );
}
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [selectedContract, setSelectedContract] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [fbError, setFbError] = useState(null);
  const unsubs = useRef([]);
  const loadedRef = useRef(false);

  // ── Boot: load Firebase, seed data, subscribe to live collections ──
  useEffect(() => {
    loadFirebase();

    const setup = async () => {
      try {
        // Seed collections if empty on first run
        await Promise.all([
          DB.seedIfEmpty("users",     SEED_USERS),
          DB.seedIfEmpty("products",  SEED_PRODUCTS),
          DB.seedIfEmpty("contracts", SEED_CONTRACTS),
          DB.seedIfEmpty("orders",    SEED_ORDERS),
        ]);

        // Subscribe to live real-time updates
        unsubs.current.push(
          DB.subscribe("users",     d => { if (d) setUsers(d); }),
          DB.subscribe("products",  d => { if (d) setProducts(d); }),
          DB.subscribe("contracts", d => {
            if (d) {
              setContracts(d);
              // Keep selectedContract in sync so ContractDetail never gets stale props
              setSelectedContract(prev => {
                if (!prev) return prev;
                const fresh = d.find(c => c.id === prev.id);
                return fresh || prev;
              });
            }
          }),
          DB.subscribe("orders",    d => { if (d) setOrders(d); }),
        );

        loadedRef.current = true;
        setLoaded(true);
      } catch (e) {
        console.error("Firebase setup error:", e);
        setFbError(e.message);
        // Fallback to seed data so app still works
        setUsers(SEED_USERS);
        setProducts(SEED_PRODUCTS);
        setContracts(SEED_CONTRACTS);
        setOrders(SEED_ORDERS);
        loadedRef.current = true;
        setLoaded(true);
      }
    };

    // Wait for Firebase scripts to load then setup
    onFirebaseReady(() => setup());
    // Timeout fallback in case scripts fail to load
    const t = setTimeout(() => {
      if (!loadedRef.current) {
        setUsers(SEED_USERS); setProducts(SEED_PRODUCTS);
        setContracts(SEED_CONTRACTS); setOrders(SEED_ORDERS);
        loadedRef.current = true;
        setLoaded(true);
      }
    }, 8000);

    return () => {
      clearTimeout(t);
      unsubs.current.forEach(fn => fn && fn());
    };
  }, []);

  // Keep currentUser in sync with live users data
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const fresh = users.find(u => u.id === currentUser.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentUser)) {
        setCurrentUser(fresh);
      }
    }
  }, [users]);

  const saveUsers = (u) => {
    setUsers(u);
    DB.set("users", u); // fire-and-forget, don't await
  };

  const handleUpdateUser = async (updated) => {
    const newUsers = users.map(u => u.id === updated.id ? updated : u);
    setUsers(newUsers);
    setCurrentUser(updated);
    await DB.set("users", newUsers);
  };

  const handleContractUpdate = async (updated) => {
    const nc = contracts.map(c => c.id === updated.id ? updated : c);
    setContracts(nc);
    setSelectedContract(updated); // update immediately so ContractDetail re-renders
    await DB.set("contracts", nc);
  };

  const navTo = (p) => { setPage(p); if (p !== "contracts") setSelectedContract(null); };

  const TITLES = { dashboard: "Dashboard", marketplace: "Marketplace", cart: "My Cart", "my-orders": "My Orders", orders: "Orders Received", contracts: "Contracts", "create-contract": "Create Contract", "my-products": "My Products", "post-product": "Post Product", users: "Buyers", profile: "Profile" };

  // ── Loading screen ──
  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#071a09", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ marginBottom: 24, fontSize: 40 }}>🌿</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#86efac", marginBottom: 12 }}>Assured Agri</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: `pulse 1.2s ${i*0.2}s infinite`, opacity: 0.8 }} />
        ))}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>Connecting to Firebase…</div>
      {fbError && <div style={{ marginTop: 12, fontSize: 12, color: "#f87171", maxWidth: 320, textAlign: "center" }}>⚠ {fbError}</div>}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.4);opacity:1} }`}</style>
    </div>
  );

  if (!currentUser) return <AuthPage onLogin={u => { setCurrentUser(u); setPage("dashboard"); }} users={users} saveUsers={saveUsers} />;

  const logout = () => { setCurrentUser(null); setPage("dashboard"); setSelectedContract(null); setCart([]); };

  return (
    <div className="app">
      <style>{CSS}</style>
      <Sidebar user={currentUser} page={page} setPage={navTo} contracts={contracts} orders={orders} cart={cart} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{TITLES[page] || "Assured"}</div>
          <div className="topbar-actions">
            {/* Firebase live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(34,197,94,.1)", borderRadius: 20, border: "1px solid rgba(34,197,94,.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Firebase Live</span>
            </div>
            {currentUser.role === "user" && (
              <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => navTo("cart")}>
                🛍 {cart.reduce((s, i) => s + i.qty, 0) > 0 && <span style={{ background: "var(--danger)", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, marginLeft: -2 }}>{cart.reduce((s, i) => s + i.qty, 0)}</span>}
              </button>
            )}
            <div className={`avatar${currentUser.role === "former" ? " gold" : ""}`} style={{ width: 30, height: 30, fontSize: 11 }}>{currentUser.avatar}</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{currentUser.name}</span>
          </div>
        </div>
        <div className="content">
          {page === "dashboard" && <Dashboard user={currentUser} contracts={contracts} products={products} orders={orders} setPage={navTo} />}
          {page === "marketplace" && <Marketplace user={currentUser} products={products} users={users} cart={cart} setCart={setCart} orders={orders} setOrders={setOrders} contracts={contracts} setContracts={setContracts} setPage={navTo} />}
          {page === "cart" && <Cart user={currentUser} cart={cart} setCart={setCart} products={products} orders={orders} setOrders={setOrders} contracts={contracts} setContracts={setContracts} setPage={navTo} />}
          {page === "my-orders" && <OrdersPage user={currentUser} orders={orders} products={products} users={users} contracts={contracts} setPage={navTo} setSelectedContract={setSelectedContract} />}
          {page === "orders" && <OrdersPage user={currentUser} orders={orders} products={products} users={users} contracts={contracts} setPage={navTo} setSelectedContract={setSelectedContract} />}
          {page === "my-products" && <MyProducts user={currentUser} products={products} orders={orders} setPage={navTo} />}
          {page === "post-product" && <PostProduct user={currentUser} products={products} setProducts={setProducts} onBack={() => navTo("my-products")} setPage={navTo} />}
          {page === "contracts" && !selectedContract && <ContractsPage user={currentUser} contracts={contracts} products={products} users={users} selectedContract={selectedContract} setSelectedContract={setSelectedContract} />}
          {page === "contracts" && selectedContract && <ContractDetail contract={selectedContract} user={currentUser} users={users} products={products} onBack={() => setSelectedContract(null)} onUpdate={handleContractUpdate} />}
          {page === "create-contract" && <CreateContract user={currentUser} users={users} contracts={contracts} setContracts={setContracts} onBack={() => navTo("contracts")} />}
          {page === "users" && <BuyersPage users={users} contracts={contracts} orders={orders} />}
          {page === "profile" && (<div style={{ margin: "-28px", minHeight: "calc(100vh - 60px)", background: "#f0faf4" }}><ProfilePage user={currentUser} contracts={contracts} orders={orders} products={products} onLogout={logout} onUpdateUser={handleUpdateUser} /></div>)}
        </div>
      </div>
      <Toasts />
    </div>
  );
}

