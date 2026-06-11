import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap";
document.head.appendChild(fontLink);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CONSTANTS & DEFINITIONS ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const RANKS = ["E","D","C","B","A","S","National","Monarch"];
const RANK_COLORS = { E:"#6b7280",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444",National:"#f97316",Monarch:"#e879f9" };
const RANK_THRESHOLDS = [0,20,35,50,65,80,90,95];

// ─── EXPONENTIAL XP CURVE (Level 100 = ~2 years daily play) ──────────────────
const xpToLevel = (L) => Math.floor(800 * Math.pow(L, 2.1));
const totalXPForLevel = (L) => { let t=0; for(let i=1;i<L;i++) t+=xpToLevel(i); return t; };

// ─── CLASS EVOLUTION TREE ────────────────────────────────────────────────────
const CLASS_TREE = {
  "Knowledge Hunter": {
    icon:"📚", color:"#3b82f6",
    evolutions: [
      { name:"Knowledge Hunter", minLevel:1,  icon:"📚", color:"#3b82f6", desc:"Scholar of infinite domains",       bonus:"INT quests give +15% XP" },
      { name:"Scholar Hunter",   minLevel:15, icon:"🔬", color:"#60a5fa", desc:"Seeker of deeper truths",           bonus:"Unlock Research Dungeons" },
      { name:"Sage Hunter",      minLevel:35, icon:"🌌", color:"#818cf8", desc:"Wielder of forbidden knowledge",    bonus:"All stats gain from INT quests" },
      { name:"Monarch of Knowledge", minLevel:60, icon:"👁️", color:"#a78bfa", desc:"Omniscient sovereign",          bonus:"Shadow bonuses doubled" },
    ]
  },
  "Warrior Hunter": {
    icon:"⚔️", color:"#ef4444",
    evolutions: [
      { name:"Warrior Hunter",   minLevel:1,  icon:"⚔️", color:"#ef4444", desc:"Forged through iron discipline",   bonus:"STR quests give +15% XP" },
      { name:"Elite Warrior",    minLevel:15, icon:"🛡️", color:"#f87171", desc:"Hardened beyond ordinary limits",  bonus:"Unlock Raid Dungeons" },
      { name:"Battle Master",    minLevel:35, icon:"⚡", color:"#fb923c", desc:"Commander of battlefield chaos",    bonus:"Boss damage +50%" },
      { name:"Monarch of Strength", minLevel:60, icon:"💀", color:"#fbbf24", desc:"Apex of physical existence",    bonus:"Can solo World Bosses" },
    ]
  },
  "Faith Hunter": {
    icon:"🌙", color:"#a855f7",
    evolutions: [
      { name:"Faith Hunter",     minLevel:1,  icon:"🌙", color:"#a855f7", desc:"Guided by purpose and devotion",   bonus:"FAI quests give +15% XP" },
      { name:"Devout Hunter",    minLevel:15, icon:"☪️", color:"#c084fc", desc:"Vessel of divine discipline",      bonus:"Streak bonuses +25%" },
      { name:"Blessed Hunter",   minLevel:35, icon:"✨", color:"#e879f9", desc:"Walking covenant of strength",     bonus:"Debuffs reduced 50%" },
      { name:"Monarch of Faith", minLevel:60, icon:"🕌", color:"#f0abfc", desc:"Light incarnate",                  bonus:"Immune to rank decay" },
    ]
  },
  "Creator Hunter": {
    icon:"🎨", color:"#f59e0b",
    evolutions: [
      { name:"Creator Hunter",   minLevel:1,  icon:"🎨", color:"#f59e0b", desc:"Builder of worlds and ideas",      bonus:"CHA quests give +15% XP" },
      { name:"Artisan Hunter",   minLevel:15, icon:"🔧", color:"#fbbf24", desc:"Crafter of lasting works",         bonus:"Unlock Creation Quests" },
      { name:"Architect Hunter", minLevel:35, icon:"🏗️", color:"#34d399", desc:"Designer of systems and reality",  bonus:"Daily quests × 1.5 difficulty scale" },
      { name:"Monarch of Creation",minLevel:60,icon:"🌐",color:"#6ee7b7", desc:"God of constructed worlds",       bonus:"Custom dungeon creation" },
    ]
  },
  "Strategist Hunter": {
    icon:"🧠", color:"#22c55e",
    evolutions: [
      { name:"Strategist Hunter",minLevel:1,  icon:"🧠", color:"#22c55e", desc:"Master of systems and leverage",  bonus:"All quests give +10% XP" },
      { name:"Tactician Hunter", minLevel:15, icon:"♟️", color:"#4ade80", desc:"Orchestrator of outcomes",        bonus:"Unlock Chain Quest system" },
      { name:"Commander Hunter", minLevel:35, icon:"🎯", color:"#86efac", desc:"Director of forces",              bonus:"Multi-shadow synergies unlock" },
      { name:"Monarch of Strategy",minLevel:60,icon:"👑",color:"#bbf7d0", desc:"The Unseen Hand",                bonus:"Passive XP from all systems" },
    ]
  },
};

// ─── SHADOW SYSTEM ────────────────────────────────────────────────────────────
const SHADOW_DEFS = {
  hydration:   { name:"Hydration Shadow",   icon:"💧", stat:"END", threshold:7,  passive:"+5% END gains",   powerLevel:1, color:"#38bdf8" },
  prayer:      { name:"Prayer Shadow",      icon:"🤲", stat:"FAI", threshold:7,  passive:"+5% FAI gains",   powerLevel:1, color:"#c084fc" },
  reading:     { name:"Reading Shadow",     icon:"📖", stat:"INT", threshold:7,  passive:"+5% INT gains",   powerLevel:1, color:"#60a5fa" },
  morning:     { name:"Morning Shadow",     icon:"🌅", stat:"END", threshold:14, passive:"+2 END/day",      powerLevel:2, color:"#fbbf24" },
  workout:     { name:"Workout Shadow",     icon:"💪", stat:"STR", threshold:14, passive:"+2 STR/day",      powerLevel:2, color:"#f87171" },
  journaling:  { name:"Reflection Shadow",  icon:"✍️", stat:"CHA", threshold:10, passive:"+5% CHA gains",  powerLevel:1, color:"#34d399" },
  coding:      { name:"Algorithm Shadow",   icon:"💻", stat:"INT", threshold:10, passive:"+1 INT/day",      powerLevel:2, color:"#818cf8" },
  running:     { name:"Endurance Shadow",   icon:"🏃", stat:"END", threshold:21, passive:"LP penalty -50%", powerLevel:3, color:"#22c55e" },
};

// ─── BOSS SYSTEM ──────────────────────────────────────────────────────────────
const WEEKLY_BOSSES = [
  { id:"procrastination", name:"Procrastination Demon",   icon:"😈", hp:500,  phase:["Lethargic Aura","Time Distortion","Final Inertia"], reward:{xp:2000,stat:{END:3,INT:2}}, color:"#6b7280", desc:"Born from every delayed task. Grows stronger the longer it's ignored." },
  { id:"social_anxiety",  name:"Shadow of Silence",       icon:"👤", hp:400,  phase:["Isolation Field","Mind Fog","Whispers of Doubt"],   reward:{xp:1800,stat:{CHA:4,END:2}}, color:"#a855f7", desc:"Feeds on avoided conversations. Weakens when confronted directly." },
  { id:"discipline",      name:"The Comfort Tyrant",      icon:"🛋️", hp:600,  phase:["Warm Chains","False Rest","Permanent Slumber"],    reward:{xp:2500,stat:{END:5,STR:2}}, color:"#f59e0b", desc:"The greatest enemy. Masquerades as reward. Kills potential silently." },
];
const MONTHLY_BOSSES = [
  { id:"chaos",           name:"Entropy of the Void",     icon:"🌀", hp:3000, phase:["Disruption Wave","Time Collapse","Singularity"],   reward:{xp:15000,stat:{STR:8,INT:8,END:8,CHA:8,FAI:8}}, color:"#e879f9", desc:"The monthly reckoning. All must fight. None are guaranteed victory." },
  { id:"shadow_monarch",  name:"Shadow Monarch Trial",    icon:"👁️", hp:5000, phase:["Shadow Army","Realm Collapse","Arise"],            reward:{xp:30000,stat:{STR:15,INT:15,END:15,CHA:15,FAI:15}}, color:"#000", desc:"Face the shadow of your ultimate potential. Available only to Level 25+." },
];

// ─── SKILL TREES ──────────────────────────────────────────────────────────────
const SKILL_TREES = {
  STR: {
    name:"Iron Body Tree", color:"#ef4444",
    skills:[
      { id:"str_1", name:"Iron Skin",        cost:5,  requires:[], desc:"Physical quest XP +10%",         row:0, col:1 },
      { id:"str_2", name:"Berserker",        cost:10, requires:["str_1"], desc:"STR quests give END bonus", row:1, col:0 },
      { id:"str_3", name:"Adamantine",       cost:15, requires:["str_1"], desc:"Reduce physical debuffs",   row:1, col:2 },
      { id:"str_4", name:"Titan's Will",     cost:25, requires:["str_2","str_3"], desc:"STR cap raised to 200", row:2, col:1 },
    ]
  },
  INT: {
    name:"Mind Palace Tree", color:"#3b82f6",
    skills:[
      { id:"int_1", name:"Quick Learner",    cost:5,  requires:[], desc:"INT quest time -10 min",          row:0, col:1 },
      { id:"int_2", name:"Pattern Sight",    cost:10, requires:["int_1"], desc:"DSA quests give +25% XP",   row:1, col:0 },
      { id:"int_3", name:"Mnemonics",        cost:10, requires:["int_1"], desc:"Reading quests stack bonus", row:1, col:2 },
      { id:"int_4", name:"Infinity Library", cost:25, requires:["int_2","int_3"], desc:"INT cap raised to 200", row:2, col:1 },
    ]
  },
  END: {
    name:"Sovereign Endurance", color:"#22c55e",
    skills:[
      { id:"end_1", name:"Second Wind",      cost:5,  requires:[], desc:"Recover LP faster",               row:0, col:1 },
      { id:"end_2", name:"Iron Lungs",       cost:10, requires:["end_1"], desc:"Run quests give +2 STR",    row:1, col:0 },
      { id:"end_3", name:"Undying",          cost:15, requires:["end_1"], desc:"Streak never resets below 3",row:1, col:2 },
      { id:"end_4", name:"Absolute Limit",   cost:25, requires:["end_2","end_3"], desc:"END cap raised to 200", row:2, col:1 },
    ]
  },
  FAI: {
    name:"Covenant Tree", color:"#a855f7",
    skills:[
      { id:"fai_1", name:"Pure Intent",      cost:5,  requires:[], desc:"Prayer quests give CHA bonus",    row:0, col:1 },
      { id:"fai_2", name:"Devotion",         cost:10, requires:["fai_1"], desc:"Streak bonus ×1.5",         row:1, col:0 },
      { id:"fai_3", name:"Faith Shield",     cost:15, requires:["fai_1"], desc:"Rank decay immunity 3d",    row:1, col:2 },
      { id:"fai_4", name:"Covenant Pact",    cost:25, requires:["fai_2","fai_3"], desc:"FAI cap raised to 200", row:2, col:1 },
    ]
  },
  CHA: {
    name:"Silver Tongue Tree", color:"#f59e0b",
    skills:[
      { id:"cha_1", name:"First Impression", cost:5,  requires:[], desc:"CHA quests give INT bonus",        row:0, col:1 },
      { id:"cha_2", name:"Commanding Voice", cost:10, requires:["cha_1"], desc:"Shadow bonuses +10%",       row:1, col:0 },
      { id:"cha_3", name:"Social Radar",     cost:15, requires:["cha_1"], desc:"Boss damage +15% CHA phase", row:1, col:2 },
      { id:"cha_4", name:"Alpha Presence",   cost:25, requires:["cha_2","cha_3"], desc:"CHA cap raised to 200", row:2, col:1 },
    ]
  },
};

// ─── TITLES ───────────────────────────────────────────────────────────────────
const TITLES_DEF = {
  first_awakening:    { name:"First Awakening",         cond:h=>h.level>=1 },
  iron_body:          { name:"Iron Body",                cond:h=>h.stats.STR>=40 },
  algorithm_hunter:   { name:"Algorithm Hunter",         cond:h=>h.stats.INT>=40 },
  disciple:           { name:"Disciple of Discipline",   cond:h=>h.level>=10 },
  scholar:            { name:"Scholar",                  cond:h=>h.stats.INT>=30 },
  consistent_one:     { name:"The Consistent One",       cond:h=>h.streak>=7 },
  dungeon_clearer:    { name:"Dungeon Clearer",           cond:h=>h.dungeonsCleared>=1 },
  phoenix:            { name:"Phoenix",                  cond:h=>h.recoveryCleared>=1 },
  shadow_candidate:   { name:"Shadow Monarch Candidate", cond:h=>h.level>=25 },
  faith_bound:        { name:"Man of Faith",             cond:h=>h.stats.FAI>=35 },
  sovereign:          { name:"Sovereign",                cond:h=>h.level>=50 },
  legendary:          { name:"Legendary",                cond:h=>h.level>=75 },
  arise:              { name:"ARISE",                    cond:h=>h.level>=100 },
  boss_slayer:        { name:"Boss Slayer",              cond:h=>h.bossesDefeated>=3 },
  shadow_army:        { name:"Shadow Army Commander",    cond:h=>h.shadows.length>=5 },
};

// ─── DUNGEONS ─────────────────────────────────────────────────────────────────
const DUNGEONS_DEF = [
  { id:"fitness30",  title:"30-Day Fitness Dungeon",    days:30, category:"STR+END", xp:5000,  rewards:{STR:15,END:10}, title_key:"iron_body",        icon:"🏋️", desc:"30 days of physical conditioning.", difficulty:"B" },
  { id:"dsa100",     title:"100 DSA Problems",          days:0,  category:"INT",     xp:8000,  rewards:{INT:20},        title_key:"algorithm_hunter", icon:"💻", desc:"100 data structure and algorithm problems.", difficulty:"A" },
  { id:"quran30",    title:"Quran Consistency Dungeon", days:30, category:"FAI",     xp:5000,  rewards:{FAI:15},        title_key:"disciple",         icon:"📖", desc:"30 days of Quran reading and reflection.", difficulty:"B" },
  { id:"comms21",    title:"Communication Mastery",     days:21, category:"CHA",     xp:4000,  rewards:{CHA:12},        title_key:"scholar",          icon:"🗣️", desc:"21-day communication challenge.", difficulty:"C" },
  { id:"deepwork30", title:"Deep Work 30-Day",          days:30, category:"INT+END", xp:5500,  rewards:{INT:10,END:8},  title_key:"consistent_one",   icon:"🧘", desc:"30 days of 2-hour deep work sessions.", difficulty:"A" },
  { id:"shadow50",   title:"Shadow Emergence Trial",    days:50, category:"ALL",     xp:20000, rewards:{STR:10,INT:10,END:10,CHA:10,FAI:10}, title_key:"shadow_candidate", icon:"👁️", desc:"The ultimate 50-day multi-stat dungeon. Only for Level 20+.", difficulty:"S", minLevel:20 },
];

// ─── STORY LORE LINES ─────────────────────────────────────────────────────────
const LORE_LINES = [
  "The gates appeared without warning. Ordinary humans began awakening to powers beyond comprehension.",
  "You stood before the System's Gate. Most hunters never return. You stepped inside.",
  "The System does not forgive weakness. But it rewards those who refuse to break.",
  "Every stat point earned is a scar. Every level gained is a resurrection.",
  "The Shadow Monarch watches. You are being evaluated.",
  "Shadows of your former self fall behind you as you advance.",
  "The Guild masters speak your name. Even enemies grow cautious.",
  "You feel the System's weight — not as burden, but as armor.",
];

// ─── QUEST TEMPLATES ─────────────────────────────────────────────────────────
const QUEST_TEMPLATES = [
  { id:"str_gym_1",    title:"Bench Press 3×8",         category:"STR", difficulty:"C", base_xp:200, time:45, gym:true,  stat:{STR:2}, desc:"3 sets of 8 reps at moderate weight.", missionText:"The Iron Trial" },
  { id:"str_home_1",   title:"30 Pushups",               category:"STR", difficulty:"D", base_xp:100, time:15, gym:false, stat:{STR:1}, desc:"30 consecutive pushups.", missionText:"Push the Limit" },
  { id:"str_home_2",   title:"Bodyweight Circuit",       category:"STR", difficulty:"C", base_xp:200, time:30, gym:false, stat:{STR:2,END:1}, desc:"20 squats, 15 pushups, 10 burpees × 3.", missionText:"Body Forge Protocol" },
  { id:"str_gym_2",    title:"Leg Day: Squats & RDL",    category:"STR", difficulty:"B", base_xp:400, time:60, gym:true,  stat:{STR:3,END:1}, desc:"Barbell squats 4×6, RDL 3×10.", missionText:"Foundation of Power" },
  { id:"str_walk",     title:"30-Min Brisk Walk",        category:"STR", difficulty:"E", base_xp:50,  time:30, gym:false, stat:{STR:1,END:1}, desc:"Maintain elevated heart rate.", missionText:"Horizon Scout" },
  { id:"int_read_1",   title:"Read 20 Pages",            category:"INT", difficulty:"D", base_xp:100, time:30, gym:false, stat:{INT:1}, desc:"Non-fiction or skill-building.", missionText:"Knowledge Expedition" },
  { id:"int_code_1",   title:"Solve 2 DSA Problems",     category:"INT", difficulty:"C", base_xp:200, time:60, gym:false, stat:{INT:2}, desc:"LeetCode easy–medium.", missionText:"Algorithm Hunt" },
  { id:"int_course_1", title:"1 Hour Course Progress",   category:"INT", difficulty:"C", base_xp:180, time:60, gym:false, stat:{INT:2}, desc:"Advance through your chosen course.", missionText:"Dungeon of Learning" },
  { id:"int_write_1",  title:"Write a 500-Word Essay",   category:"INT", difficulty:"C", base_xp:190, time:45, gym:false, stat:{INT:1,CHA:1}, desc:"Any topic. Writing = thinking.", missionText:"Codex Entry" },
  { id:"end_jog_1",    title:"Morning 3km Run",          category:"END", difficulty:"C", base_xp:200, time:25, gym:false, stat:{END:2,STR:1}, desc:"Steady comfortable pace.", missionText:"Dawn Patrol" },
  { id:"end_streak_1", title:"Complete All Daily Quests", category:"END", difficulty:"B", base_xp:350, time:0,  gym:false, stat:{END:3}, desc:"Zero skips. Full completion.", missionText:"The Ironclad Day" },
  { id:"end_early",    title:"Wake Before 6 AM",         category:"END", difficulty:"D", base_xp:120, time:0,  gym:false, stat:{END:2}, desc:"Rise early. Discipline rewarded.", missionText:"First Light Protocol" },
  { id:"fai_quran_1",  title:"Read 1 Juz of Quran",      category:"FAI", difficulty:"C", base_xp:200, time:30, gym:false, stat:{FAI:2}, desc:"Read with understanding.", missionText:"Sacred Verse Expedition" },
  { id:"fai_pray_1",   title:"5 Prayers On Time",        category:"FAI", difficulty:"C", base_xp:180, time:0,  gym:false, stat:{FAI:2,END:1}, desc:"All five prayers on time.", missionText:"Covenant Maintained" },
  { id:"fai_reflect",  title:"10-Min Evening Reflection", category:"FAI", difficulty:"D", base_xp:100, time:10, gym:false, stat:{FAI:1}, desc:"Journal or silent reflection.", missionText:"Shadow Self Audit" },
  { id:"cha_journal_1",title:"Write a Journal Entry",    category:"CHA", difficulty:"D", base_xp:100, time:15, gym:false, stat:{CHA:1}, desc:"Document thoughts and goals.", missionText:"Lore Entry" },
  { id:"cha_conv_1",   title:"Meaningful Conversation",  category:"CHA", difficulty:"C", base_xp:160, time:30, gym:false, stat:{CHA:2}, desc:"Deep, intentional conversation.", missionText:"Diplomatic Mission" },
  { id:"cha_speak_1",  title:"Record 2-Min Speech",      category:"CHA", difficulty:"C", base_xp:180, time:15, gym:false, stat:{CHA:2}, desc:"Record yourself. Watch it back.", missionText:"Voice Manifestation" },
];

const RECOVERY_QUESTS = [
  { id:"five_day",    title:"5-Day Consistency Challenge", days:5, xp:500,  desc:"Complete at least 1 quest/day for 5 days." },
  { id:"abyss",       title:"The Abyss Dungeon",           days:7, xp:1200, desc:"7-day intensive across all stat categories." },
  { id:"recalibrate", title:"Focus Recalibration",         days:3, xp:300,  desc:"3 consecutive days without failure." },
  { id:"return",      title:"Hunter's Return",              days:3, xp:400,  desc:"3-day re-entry protocol. Rebuild momentum." },
];

// ─── LIFE POWER SYSTEM ────────────────────────────────────────────────────────
const LP_FACTORS = ["sleep","water","energy","mood","recovery"];
const calcLP = (lp) => {
  const avg = LP_FACTORS.reduce((s,k) => s + (lp[k]||50), 0) / LP_FACTORS.length;
  return Math.round(avg);
};
const lpMultiplier = (lp) => {
  const score = calcLP(lp);
  if (score >= 80) return 1.3;
  if (score >= 60) return 1.1;
  if (score >= 40) return 1.0;
  if (score >= 20) return 0.8;
  return 0.6;
};

// ─── FORMULAS ─────────────────────────────────────────────────────────────────
const calcRank = (score) => { for(let i=RANK_THRESHOLDS.length-1;i>=0;i--) { if(score>=RANK_THRESHOLDS[i]) return RANKS[i]; } return "E"; };
const calcRankScore = (h) => {
  const c = Math.min(h.questCompletionRate7d, 100);
  const m = Math.min(h.momentum*33.3, 100);
  const s = Math.min(h.streak*3, 30);
  const r = Math.min(h.reputation/10, 15);
  const decay = h.rankDecayPenalty || 0;
  return Math.max(0, Math.round(c*0.4 + m*0.25 + s*0.2 + r*0.15 - decay));
};
const calcXP = (quest, h) => {
  const base = quest.base_xp;
  const mom = 0.5 + (h.momentum * 2.5);
  const streak = 1 + Math.min(h.streak * 0.02, 0.5);
  const debuff = h.debuffs.length > 0 ? 0.7 : 1.0;
  const lp = lpMultiplier(h.lifepower);
  const cls = getCurrentClass(h);
  const clsBonus = cls && quest.category === cls.stats?.[0] ? 1.15 : 1.0;
  return Math.floor(base * mom * streak * debuff * lp * clsBonus);
};
const getCurrentClass = (h) => {
  const tree = CLASS_TREE[h.hunterClass];
  if (!tree) return null;
  let current = tree.evolutions[0];
  for (const evo of tree.evolutions) { if (h.level >= evo.minLevel) current = evo; }
  return current;
};
const getStatPoints = (h) => {
  const spent = Object.values(h.unlockedSkills || {}).reduce((s,v) => s + v, 0);
  const earned = Math.floor(h.level * 2.5);
  return earned - spent;
};

// ─── RANK DECAY ────────────────────────────────────────────────────────────────
const applyRankDecay = (h) => {
  const daysSinceActive = h.daysSinceLastActivity || 0;
  if (daysSinceActive < 3) return { ...h, rankDecayPenalty: 0 };
  const penalty = Math.min(Math.floor((daysSinceActive - 2) * 3), 40);
  return { ...h, rankDecayPenalty: penalty };
};

// ─── SHADOW SYSTEM ────────────────────────────────────────────────────────────
const checkShadowUnlocks = (h, completedCategory) => {
  const newShadows = [...(h.shadows || [])];
  const habitStreak = h.habitStreaks || {};
  const catMap = { STR:"workout", INT:"coding", END:"running", FAI:"prayer", CHA:"journaling" };
  const shadowKey = catMap[completedCategory];
  if (!shadowKey) return newShadows;
  habitStreak[shadowKey] = (habitStreak[shadowKey] || 0) + 1;
  const def = SHADOW_DEFS[shadowKey];
  if (def && habitStreak[shadowKey] >= def.threshold && !newShadows.find(s=>s.id===shadowKey)) {
    newShadows.push({ id:shadowKey, ...def, level:1, awakened: new Date().toLocaleDateString() });
  }
  return newShadows;
};

// ─── INITIAL STATE ─────────────────────────────────────────────────────────────
const determineClass = (data) => {
  if (data.spiritualGoals === "high") return "Faith Hunter";
  if (data.fitnessLevel >= 4) return "Warrior Hunter";
  if (data.learningInterests === "creative") return "Creator Hunter";
  if (data.userType === "professional" && data.consistencyScore >= 7) return "Strategist Hunter";
  return "Knowledge Hunter";
};
const makeHunter = (profile) => ({
  name: profile.hunterName || "Hunter",
  hunterClass: profile.hunterClass || "Knowledge Hunter",
  level: 1,
  currentXP: 0,
  xpToNext: xpToLevel(1),
  rank: "E",
  rankScore: 0,
  rankDecayPenalty: 0,
  stats: { STR:10, INT:10, END:10, CHA:10, FAI:10 },
  statPoints: 5,
  momentum: 0.5,
  focus: 50,
  energy: 100,
  reputation: 0,
  streak: 0,
  questCompletionRate7d: 0,
  titles: ["first_awakening"],
  debuffs: [],
  dungeons: [],
  dungeonsCleared: 0,
  recoveryCleared: 0,
  bossesDefeated: 0,
  xpLog: [],
  levelHistory: [{ level:1, date: new Date().toLocaleDateString() }],
  completedQuestIds: [],
  shadows: [],
  habitStreaks: {},
  unlockedSkills: {},
  skillPoints: 0,
  lifepower: { sleep:70, water:60, energy:70, mood:60, recovery:60 },
  season: 1,
  seasonRankScore: 0,
  daysSinceLastActivity: 0,
  currentBoss: null,
  bossDamageDealt: 0,
  loreIndex: 0,
  trustLevel: 1,
  profile,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN APP ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function ARISE() {
  const [screen, setScreen] = useState("splash");
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardData, setOnboardData] = useState({});
  const [hunter, setHunter] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dailyQuests, setDailyQuests] = useState([]);
  const [notification, setNotification] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [titleEarned, setTitleEarned] = useState(null);
  const [shadowAwakened, setShadowAwakened] = useState(null);
  const [selectedDungeon, setSelectedDungeon] = useState(null);
  const [showLPPanel, setShowLPPanel] = useState(false);
  const [activeBoss, setActiveBoss] = useState(null);
  const splashTimer = useRef();

  useEffect(() => { splashTimer.current = setTimeout(()=>setScreen("onboarding"),3500); return ()=>clearTimeout(splashTimer.current); },[]);

  const notify = useCallback((msg,type="info")=>{ setNotification({msg,type}); setTimeout(()=>setNotification(null),3500); },[]);

  const generateDailyQuests = useCallback((h) => {
    const hasGym = h.profile?.hasGym === "true";
    const pool = QUEST_TEMPLATES.filter(q => hasGym ? true : !q.gym);
    const weakStats = Object.entries(h.stats).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
    const cats = ["STR","INT","END","FAI","CHA"];
    const weighted = cats.map(cat => ({
      cat,
      weight: weakStats.includes(cat) ? 3 : 1,
    }));
    const selected = [];
    weighted.forEach(({cat, weight}) => {
      if (selected.length >= 5) return;
      const catPool = pool.filter(q=>q.category===cat||q.category.startsWith(cat));
      if (!catPool.length) return;
      const pick = catPool[Math.floor(Math.random()*catPool.length)];
      selected.push({...pick, status:"active", isHighlighted: weight===3});
    });
    return selected.slice(0,5);
  },[]);

  const initHunter = useCallback((data)=>{
    const cls = determineClass(data);
    const profile = {...data, hunterClass:cls};
    const h = makeHunter(profile);
    const quests = generateDailyQuests(h);
    setHunter(h);
    setDailyQuests(quests);
    setScreen("app");
  },[generateDailyQuests]);

  const completeQuest = useCallback((questId)=>{
    setHunter(prev=>{
      const quest = dailyQuests.find(q=>q.id===questId);
      if(!quest||quest.status!=="active") return prev;
      const gained = calcXP(quest,prev);
      let newXP = prev.currentXP+gained;
      let newLevel = prev.level;
      let newXPToNext = prev.xpToNext;
      let didLevelUp = false;
      while(newXP>=newXPToNext){ newXP-=newXPToNext; newLevel++; newXPToNext=xpToLevel(newLevel); didLevelUp=true; }
      const newStats = {...prev.stats};
      Object.entries(quest.stat||{}).forEach(([k,v])=>{ newStats[k]=(newStats[k]||0)+v; });
      const newShadows = checkShadowUnlocks({...prev,shadows:prev.shadows||[]}, quest.category);
      if(newShadows.length>(prev.shadows||[]).length){
        const newShadow = newShadows[newShadows.length-1];
        setTimeout(()=>setShadowAwakened(newShadow),1000);
      }
      const newHabitStreaks = {...(prev.habitStreaks||{})};
      const catMap={STR:"workout",INT:"coding",END:"running",FAI:"prayer",CHA:"journaling"};
      const sk=catMap[quest.category];
      if(sk) newHabitStreaks[sk]=(newHabitStreaks[sk]||0)+1;
      const newStreak=prev.streak+1;
      const newMomentum=Math.min(3,prev.momentum+0.1);
      const newReputation=prev.reputation+5;
      const rate7d=Math.min(100,prev.questCompletionRate7d+8);
      const skillPts=(prev.skillPoints||0)+(didLevelUp?3:0);
      const h2={
        ...prev, level:newLevel, currentXP:newXP, xpToNext:newXPToNext,
        stats:newStats, streak:newStreak, momentum:newMomentum,
        reputation:newReputation, questCompletionRate7d:rate7d,
        completedQuestIds:[...prev.completedQuestIds,questId],
        shadows:newShadows, habitStreaks:newHabitStreaks,
        skillPoints:skillPts, daysSinceLastActivity:0,
        xpLog:[...prev.xpLog,{quest:quest.title,xp:gained,lp:Math.round(lpMultiplier(prev.lifepower)*100),date:new Date().toLocaleDateString()}],
        levelHistory:didLevelUp?[...prev.levelHistory,{level:newLevel,date:new Date().toLocaleDateString()}]:prev.levelHistory,
        loreIndex:(prev.loreIndex+1)%LORE_LINES.length,
      };
      h2.rankScore=calcRankScore(h2);
      h2.rank=calcRank(h2.rankScore);
      const newTitles=[...h2.titles];
      Object.entries(TITLES_DEF).forEach(([key,def])=>{
        if(!newTitles.includes(key)&&def.cond(h2)){ newTitles.push(key); setTimeout(()=>setTitleEarned(def.name),1200); }
      });
      h2.titles=newTitles;
      if(didLevelUp) setTimeout(()=>setLevelUpData({level:newLevel,class:getCurrentClass(h2)}),600);
      setTimeout(()=>notify(`+${gained} XP ✦ ${quest.missionText||quest.title}`,"success"),100);
      return h2;
    });
    setDailyQuests(prev=>prev.map(q=>q.id===questId?{...q,status:"completed"}:q));
  },[dailyQuests,notify]);

  const enterDungeon = useCallback((dungeon)=>{
    if(hunter && dungeon.minLevel && hunter.level < dungeon.minLevel){ notify(`Level ${dungeon.minLevel} required!`,"error"); return; }
    setHunter(prev=>{
      const existing=prev.dungeons.find(d=>d.id===dungeon.id&&d.status==="active");
      if(existing){ notify("Already active!","warning"); return prev; }
      return {...prev,dungeons:[...prev.dungeons,{...dungeon,daysCompleted:0,status:"active",startDate:new Date().toLocaleDateString()}]};
    });
    notify(`⚔ Entered: ${dungeon.title}`,"info");
    setSelectedDungeon(null);
  },[hunter,notify]);

  const dungeonCheckin = useCallback((dungeonId)=>{
    setHunter(prev=>{
      const newDungeons=prev.dungeons.map(d=>{
        if(d.id!==dungeonId||d.status!=="active") return d;
        const newDays=d.daysCompleted+1;
        if(d.days>0&&newDays>=d.days){
          const newStats={...prev.stats};
          Object.entries(d.rewards||{}).forEach(([k,v])=>{ newStats[k]=(newStats[k]||0)+v; });
          setTimeout(()=>notify(`🏆 DUNGEON CLEARED: ${d.title}!`,"success"),100);
          return {...d,daysCompleted:newDays,status:"completed"};
        }
        return {...d,daysCompleted:newDays};
      });
      return {...prev,dungeons:newDungeons,currentXP:prev.currentXP+200,dungeonsCleared:newDungeons.filter(d=>d.status==="completed").length};
    });
  },[notify]);

  const updateLP = useCallback((key,val)=>{
    setHunter(prev=>({...prev,lifepower:{...prev.lifepower,[key]:val}}));
  },[]);

  const unlockSkill = useCallback((skillId, statKey)=>{
    const tree = SKILL_TREES[statKey];
    const skill = tree?.skills.find(s=>s.id===skillId);
    if(!skill) return;
    const points = getStatPoints(hunter);
    if(points < skill.cost){ notify("Not enough stat points!","error"); return; }
    if(hunter.unlockedSkills[skillId]){ notify("Already unlocked!","warning"); return; }
    const reqsMet = skill.requires.every(r=>hunter.unlockedSkills[r]);
    if(!reqsMet){ notify("Requirements not met!","error"); return; }
    setHunter(prev=>({...prev,unlockedSkills:{...prev.unlockedSkills,[skillId]:skill.cost}}));
    notify(`✦ Skill Unlocked: ${skill.name}`,"success");
  },[hunter,notify]);

  const attackBoss = useCallback((boss, dmg)=>{
    setHunter(prev=>{
      const newDealt=(prev.bossDamageDealt||0)+dmg;
      return {...prev,bossDamageDealt:newDealt,currentXP:prev.currentXP+Math.floor(dmg*0.5)};
    });
    if(boss.hp - (hunter?.bossDamageDealt||0) - dmg <= 0){
      const reward = boss.reward;
      setHunter(prev=>{
        const ns={...prev.stats};
        Object.entries(reward.stat||{}).forEach(([k,v])=>{ ns[k]=(ns[k]||0)+v; });
        return {...prev,stats:ns,currentXP:prev.currentXP+reward.xp,bossesDefeated:(prev.bossesDefeated||0)+1,currentBoss:null,bossDamageDealt:0};
      });
      notify(`👑 BOSS DEFEATED! +${reward.xp} XP!`,"success");
      setActiveBoss(null);
    } else {
      notify(`⚔ Hit for ${dmg} damage!`,"info");
    }
  },[hunter,notify]);

  if(screen==="splash") return <SplashScreen />;
  if(screen==="onboarding") return <Onboarding step={onboardStep} setStep={setOnboardStep} data={onboardData} setData={setOnboardData} onComplete={initHunter} />;
  if(!hunter) return null;

  const lpScore = calcLP(hunter.lifepower);
  const lpMult = lpMultiplier(hunter.lifepower);

  return (
    <div style={{background:"#060810",minHeight:"100vh",fontFamily:"'Rajdhani',sans-serif",color:"#e2e8f0",position:"relative",overflow:"hidden"}}>
      <GridBg />
      {notification && <Notification data={notification} />}
      {levelUpData && <LevelUpOverlay data={levelUpData} onClose={()=>setLevelUpData(null)} />}
      {titleEarned && <TitleEarnedOverlay title={titleEarned} onClose={()=>setTitleEarned(null)} />}
      {shadowAwakened && <ShadowAwakenedOverlay shadow={shadowAwakened} onClose={()=>setShadowAwakened(null)} />}
      {showLPPanel && <LPPanel hunter={hunter} onUpdate={updateLP} onClose={()=>setShowLPPanel(false)} />}
      <TopBar hunter={hunter} lpScore={lpScore} lpMult={lpMult} onLPClick={()=>setShowLPPanel(true)} />
      <div style={{paddingBottom:"80px"}}>
        {activeTab==="dashboard" && <Dashboard hunter={hunter} dailyQuests={dailyQuests} onComplete={completeQuest} onTabChange={setActiveTab} lpMult={lpMult} />}
        {activeTab==="profile"   && <ProfileScreen hunter={hunter} />}
        {activeTab==="quests"    && <QuestsScreen hunter={hunter} dailyQuests={dailyQuests} onComplete={completeQuest} />}
        {activeTab==="dungeons"  && <DungeonsScreen hunter={hunter} selected={selectedDungeon} setSelected={setSelectedDungeon} onEnter={enterDungeon} onCheckin={dungeonCheckin} />}
        {activeTab==="stats"     && <StatsScreen hunter={hunter} />}
        {activeTab==="shadows"   && <ShadowsScreen hunter={hunter} />}
        {activeTab==="skills"    && <SkillsScreen hunter={hunter} onUnlock={unlockSkill} />}
        {activeTab==="bosses"    && <BossesScreen hunter={hunter} activeBoss={activeBoss} setActiveBoss={setActiveBoss} onAttack={attackBoss} />}
      </div>
      <BottomNav active={activeTab} setActive={setActiveTab} hunter={hunter} />
    </div>
  );
}

// ─── GRID BACKGROUND ──────────────────────────────────────────────────────────
function GridBg() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px)`,backgroundSize:"40px 40px"}} />
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"700px",borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.05) 0%,transparent 70%)"}} />
      <div style={{position:"absolute",bottom:"-10%",right:"-10%",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.04) 0%,transparent 70%)"}} />
    </div>
  );
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreen() {
  const [phase, setPhase] = useState(0);
  useEffect(()=>{
    const t=[setTimeout(()=>setPhase(1),400),setTimeout(()=>setPhase(2),1200),setTimeout(()=>setPhase(3),2000),setTimeout(()=>setPhase(4),2800)];
    return ()=>t.forEach(clearTimeout);
  },[]);
  return (
    <div style={{background:"#060810",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",position:"relative",overflow:"hidden"}}>
      <GridBg />
      <div style={{textAlign:"center",zIndex:1}}>
        <div style={{fontSize:"80px",marginBottom:"16px",opacity:phase>=1?1:0,transform:phase>=1?"scale(1)":"scale(0.3)",transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>⚡</div>
        <div style={{fontSize:"clamp(48px,10vw,88px)",fontWeight:900,letterSpacing:"0.2em",color:"#fff",opacity:phase>=2?1:0,transform:phase>=2?"translateY(0)":"translateY(30px)",transition:"all 0.6s ease",textShadow:"0 0 60px rgba(59,130,246,0.9)"}}>ARISE</div>
        <div style={{fontSize:"clamp(10px,1.8vw,13px)",letterSpacing:"0.5em",color:"#3b82f6",marginTop:"8px",opacity:phase>=3?1:0,transition:"opacity 0.5s ease"}}>REAL LIFE SOLO LEVELING SYSTEM V2</div>
        <div style={{marginTop:"12px",fontSize:"11px",letterSpacing:"0.3em",color:"#475569",opacity:phase>=4?1:0,transition:"opacity 0.5s ease"}}>THE SHADOW MONARCH AWAITS</div>
        <div style={{marginTop:"36px",display:"flex",gap:"8px",justifyContent:"center",opacity:phase>=4?1:0,transition:"opacity 0.5s ease 0.2s"}}>
          {[0,1,2,3,4].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#3b82f6",animation:`pulse 1.2s ease-in-out ${i*0.15}s infinite`}} />)}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.7)}50%{opacity:1;transform:scale(1.3)}}`}</style>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
const STEPS = [
  { key:"identity", title:"WHO ARE YOU, HUNTER?", subtitle:"The System evaluates all who enter.",
    fields:[
      {id:"hunterName",label:"Hunter Name",type:"text",placeholder:"Enter your name..."},
      {id:"age",label:"Age",type:"number",placeholder:"Your age"},
      {id:"userType",label:"Current Status",type:"select",options:[{v:"student",l:"Student"},{v:"professional",l:"Working Professional"}]},
      {id:"dailyTime",label:"Available Time Per Day",type:"select",options:[{v:"30",l:"30 minutes"},{v:"60",l:"1 hour"},{v:"120",l:"2 hours"},{v:"180",l:"3+ hours"}]},
    ]
  },
  { key:"physical", title:"PHYSICAL ASSESSMENT", subtitle:"Your body is your first and last weapon.",
    fields:[
      {id:"hasGym",label:"Gym Access",type:"select",options:[{v:"true",l:"Yes, I have gym access"},{v:"false",l:"No gym access"}]},
      {id:"fitnessLevel",label:"Current Fitness Level",type:"range",min:1,max:5,labels:["Sedentary","Low","Average","Active","Athletic"]},
      {id:"budgetTier",label:"Monthly Self-Improvement Budget",type:"select",options:[{v:"none",l:"No budget"},{v:"low",l:"Low (< ₹500/mo)"},{v:"medium",l:"Medium (₹500–2000/mo)"},{v:"high",l:"High (₹2000+/mo)"}]},
    ]
  },
  { key:"intellect", title:"INTELLECTUAL PROFILE", subtitle:"The mind is the greatest dungeon.",
    fields:[
      {id:"learningInterests",label:"Primary Learning Interest",type:"select",options:[{v:"tech",l:"Technology & Coding"},{v:"finance",l:"Finance & Business"},{v:"language",l:"Language & Communication"},{v:"creative",l:"Creative & Arts"},{v:"general",l:"General Knowledge"}]},
      {id:"careerGoal",label:"Career Goal",type:"text",placeholder:"e.g. Software Engineer, Entrepreneur..."},
    ]
  },
  { key:"spirit", title:"SPIRIT & SOCIAL", subtitle:"Inner strength defines the greatest hunters.",
    fields:[
      {id:"spiritualGoals",label:"Faith / Spiritual Goals",type:"select",options:[{v:"none",l:"Not a focus"},{v:"low",l:"Occasional practice"},{v:"medium",l:"Regular practice"},{v:"high",l:"Core part of my life"}]},
      {id:"chaConfidence",label:"Communication Confidence",type:"range",min:1,max:5,labels:["Very shy","Shy","Neutral","Confident","Very confident"]},
    ]
  },
  { key:"discipline", title:"DISCIPLINE ASSESSMENT", subtitle:"Consistency separates hunters from prey.",
    fields:[
      {id:"consistencyScore",label:"Self-Rated Discipline",type:"range",min:1,max:10,labels:["1","5","10"]},
      {id:"biggestChallenge",label:"Biggest Current Challenge",type:"select",options:[{v:"motivation",l:"Lack of motivation"},{v:"time",l:"Not enough time"},{v:"focus",l:"Poor focus"},{v:"consistency",l:"Can't stay consistent"},{v:"direction",l:"No clear direction"}]},
    ]
  },
];

function Onboarding({step,setStep,data,setData,onComplete}){
  const [localData,setLocalData]=useState({});
  const [awakening,setAwakening]=useState(false);
  const curStep=STEPS[step];
  const isLast=step===STEPS.length-1;
  const handleNext=()=>{
    const merged={...data,...localData};
    setData(merged);
    if(isLast){ setAwakening(true); setTimeout(()=>onComplete(merged),3000); }
    else setStep(s=>s+1);
  };
  if(awakening) return <AwakeningScreen data={{...data,...localData}} />;
  return (
    <div style={{background:"#060810",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Rajdhani',sans-serif",position:"relative"}}>
      <GridBg />
      <div style={{width:"100%",maxWidth:"480px",zIndex:1}}>
        <div style={{display:"flex",gap:"5px",marginBottom:"28px"}}>
          {STEPS.map((_,i)=><div key={i} style={{flex:1,height:"3px",borderRadius:"2px",background:i<=step?"#3b82f6":"rgba(255,255,255,0.08)",transition:"background 0.3s"}} />)}
        </div>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:"16px",padding:"28px",backdropFilter:"blur(10px)"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.35em",color:"#3b82f6",marginBottom:"6px",fontFamily:"'Orbitron',monospace"}}>HUNTER EVALUATION — {step+1}/{STEPS.length}</div>
          <div style={{fontSize:"clamp(16px,4vw,24px)",fontWeight:700,letterSpacing:"0.05em",marginBottom:"4px"}}>{curStep.title}</div>
          <div style={{fontSize:"13px",color:"#64748b",marginBottom:"24px"}}>{curStep.subtitle}</div>
          <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
            {curStep.fields.map(field=><FormField key={field.id} field={field} value={localData[field.id]??data[field.id]} onChange={v=>setLocalData(p=>({...p,[field.id]:v}))} />)}
          </div>
          <button onClick={handleNext} style={{width:"100%",marginTop:"24px",padding:"14px",background:"#3b82f6",border:"none",borderRadius:"10px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:700,letterSpacing:"0.15em",cursor:"pointer"}}
            onMouseEnter={e=>e.target.style.background="#2563eb"} onMouseLeave={e=>e.target.style.background="#3b82f6"}
          >{isLast?"COMPLETE EVALUATION →":"CONTINUE →"}</button>
        </div>
      </div>
    </div>
  );
}

function FormField({field,value,onChange}){
  const base={width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"#e2e8f0",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",padding:"10px 12px",outline:"none",boxSizing:"border-box"};
  return (
    <div>
      <div style={{fontSize:"11px",letterSpacing:"0.15em",color:"#64748b",marginBottom:"7px",textTransform:"uppercase"}}>{field.label}</div>
      {field.type==="text"&&<input style={base} type="text" placeholder={field.placeholder} value={value||""} onChange={e=>onChange(e.target.value)} />}
      {field.type==="number"&&<input style={base} type="number" placeholder={field.placeholder} value={value||""} onChange={e=>onChange(Number(e.target.value))} />}
      {field.type==="select"&&<select style={{...base,cursor:"pointer"}} value={value||""} onChange={e=>onChange(e.target.value)}><option value="">Select...</option>{field.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>}
      {field.type==="range"&&<div><input type="range" min={field.min} max={field.max} value={value||field.min} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",accentColor:"#3b82f6"}} /><div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#475569",marginTop:"3px"}}>{field.labels.map((l,i)=><span key={i}>{l}</span>)}</div></div>}
    </div>
  );
}

function AwakeningScreen({data}){
  const cls=determineClass(data);
  const clsDef=CLASS_TREE[cls]?.evolutions[0];
  const [phase,setPhase]=useState(0);
  useEffect(()=>{
    const t=[setTimeout(()=>setPhase(1),400),setTimeout(()=>setPhase(2),1000),setTimeout(()=>setPhase(3),1700),setTimeout(()=>setPhase(4),2300)];
    return ()=>t.forEach(clearTimeout);
  },[]);
  return (
    <div style={{background:"#060810",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",textAlign:"center",padding:"20px",position:"relative"}}>
      <GridBg />
      <div style={{zIndex:1}}>
        <div style={{fontSize:"10px",letterSpacing:"0.5em",color:"#3b82f6",opacity:phase>=1?1:0,transition:"opacity 0.5s"}}>AWAKENING SEQUENCE INITIATED</div>
        <div style={{fontSize:"14px",color:"#475569",marginTop:"8px",letterSpacing:"0.3em",opacity:phase>=1?1:0,transition:"opacity 0.5s 0.2s"}}>HUNTER {(data.hunterName||"UNKNOWN").toUpperCase()} — STAT EVALUATION COMPLETE</div>
        <div style={{fontSize:"90px",margin:"20px 0",opacity:phase>=2?1:0,transform:phase>=2?"scale(1)":"scale(0.2)",transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>{clsDef?.icon}</div>
        <div style={{fontSize:"clamp(18px,4vw,30px)",fontWeight:900,color:clsDef?.color,letterSpacing:"0.1em",opacity:phase>=2?1:0,transition:"opacity 0.5s 0.2s",textShadow:`0 0 30px ${clsDef?.color}88`}}>{cls?.toUpperCase()}</div>
        <div style={{fontSize:"13px",color:"#94a3b8",marginTop:"10px",opacity:phase>=3?1:0,transition:"opacity 0.5s"}}>{clsDef?.desc}</div>
        <div style={{marginTop:"8px",fontSize:"12px",color:"#475569",opacity:phase>=3?1:0,transition:"opacity 0.5s 0.1s"}}>Class evolves as you grow. Your story begins now.</div>
        <div style={{marginTop:"28px",fontSize:"11px",color:"#3b82f6",opacity:phase>=4?1:0,transition:"opacity 0.5s",letterSpacing:"0.4em"}}>ENTERING THE SYSTEM...</div>
      </div>
    </div>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
function TopBar({hunter,lpScore,lpMult,onLPClick}){
  const rankColor=RANK_COLORS[hunter.rank]||"#6b7280";
  const pct=Math.round((hunter.currentXP/hunter.xpToNext)*100);
  const lpColor=lpScore>=70?"#22c55e":lpScore>=40?"#f59e0b":"#ef4444";
  const clsEvo=getCurrentClass(hunter);
  return (
    <div style={{background:"rgba(6,8,16,0.92)",borderBottom:"1px solid rgba(59,130,246,0.15)",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:50}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:900,color:"#3b82f6",letterSpacing:"0.12em"}}>ARISE</div>
      <div style={{flex:1,textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
          <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:700,color:rankColor,padding:"2px 7px",border:`1px solid ${rankColor}44`,borderRadius:"3px"}}>RANK {hunter.rank}</span>
          <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:"#64748b"}}>LV.{hunter.level}</span>
          {clsEvo&&<span style={{fontSize:"9px",color:clsEvo.color,fontFamily:"'Share Tech Mono',monospace",letterSpacing:"0.05em"}}>{clsEvo.name}</span>}
        </div>
        <div style={{marginTop:"4px",height:"3px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)`,borderRadius:"2px",transition:"width 0.6s ease"}} />
        </div>
      </div>
      <button onClick={onLPClick} style={{background:"none",border:`1px solid ${lpColor}44`,borderRadius:"8px",padding:"4px 8px",cursor:"pointer",textAlign:"center"}}>
        <div style={{fontSize:"8px",color:"#475569",letterSpacing:"0.1em",fontFamily:"'Share Tech Mono',monospace"}}>LP</div>
        <div style={{fontSize:"13px",fontWeight:700,color:lpColor,fontFamily:"'Orbitron',monospace"}}>{lpScore}</div>
      </button>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({active,setActive,hunter}){
  const tabs=[
    {id:"dashboard",icon:"⚡",label:"Home"},
    {id:"quests",   icon:"⚔️",label:"Quests"},
    {id:"dungeons", icon:"🏰",label:"Dungeons"},
    {id:"bosses",   icon:"👹",label:"Bosses"},
    {id:"shadows",  icon:"👥",label:"Shadows"},
    {id:"skills",   icon:"🌳",label:"Skills"},
    {id:"stats",    icon:"📊",label:"Stats"},
    {id:"profile",  icon:"👤",label:"Profile"},
  ];
  const points = getStatPoints(hunter);
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(6,8,16,0.96)",borderTop:"1px solid rgba(59,130,246,0.15)",display:"flex",padding:"6px 0 10px",zIndex:50,backdropFilter:"blur(12px)",overflowX:"auto"}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setActive(t.id)} style={{flex:"0 0 auto",minWidth:"50px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",padding:"4px 6px",opacity:active===t.id?1:0.4,transition:"opacity 0.2s",position:"relative"}}>
          <span style={{fontSize:"17px"}}>{t.icon}</span>
          <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"9px",fontWeight:600,color:active===t.id?"#3b82f6":"#64748b",letterSpacing:"0.03em"}}>{t.label}</span>
          {t.id==="skills"&&points>0&&<span style={{position:"absolute",top:"0",right:"4px",width:"8px",height:"8px",borderRadius:"50%",background:"#f59e0b",fontSize:"0"}} />}
        </button>
      ))}
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({hunter,dailyQuests,onComplete,onTabChange,lpMult}){
  const completed=dailyQuests.filter(q=>q.status==="completed").length;
  const rankColor=RANK_COLORS[hunter.rank]||"#6b7280";
  const clsEvo=getCurrentClass(hunter);
  const lore=LORE_LINES[hunter.loreIndex||0];
  const lpMColor=lpMult>=1.2?"#22c55e":lpMult>=1?"#3b82f6":lpMult>=0.8?"#f59e0b":"#ef4444";
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      {/* Lore Banner */}
      <div style={{background:"rgba(59,130,246,0.05)",border:"1px solid rgba(59,130,246,0.12)",borderRadius:"10px",padding:"10px 14px",marginBottom:"12px",borderLeft:"3px solid #3b82f688"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.25em",color:"#3b82f6",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>SYSTEM MESSAGE</div>
        <div style={{fontSize:"12px",color:"#94a3b8",fontStyle:"italic",lineHeight:1.5}}>{lore}</div>
      </div>
      {/* Hunter Card */}
      <div style={{background:"rgba(59,130,246,0.05)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:"14px",padding:"18px",marginBottom:"12px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,fontSize:"100px",opacity:0.04,lineHeight:1,pointerEvents:"none"}}>{clsEvo?.icon}</div>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"0.3em",color:"#3b82f6",fontFamily:"'Orbitron',monospace"}}>HUNTER</div>
            <div style={{fontSize:"clamp(20px,5vw,28px)",fontWeight:700,letterSpacing:"0.04em"}}>{hunter.name}</div>
            <div style={{fontSize:"12px",color:clsEvo?.color,marginTop:"1px"}}>{clsEvo?.name}</div>
            <div style={{fontSize:"10px",color:"#475569",marginTop:"1px"}}>{clsEvo?.bonus}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"32px",fontFamily:"'Orbitron',monospace",fontWeight:900,color:rankColor,textShadow:`0 0 25px ${rankColor}66`}}>{hunter.rank}</div>
            <div style={{fontSize:"9px",color:"#475569",letterSpacing:"0.15em"}}>RANK</div>
            <div style={{fontSize:"11px",color:"#64748b",marginTop:"2px",fontFamily:"'Share Tech Mono',monospace"}}>S{hunter.season||1}</div>
          </div>
        </div>
        {/* XP */}
        <div style={{marginTop:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#475569",marginBottom:"5px",fontFamily:"'Share Tech Mono',monospace"}}>
            <span>LV.{hunter.level} — {hunter.currentXP.toLocaleString()} / {hunter.xpToNext.toLocaleString()} XP</span>
            <span>{Math.round(hunter.currentXP/hunter.xpToNext*100)}%</span>
          </div>
          <div style={{height:"5px",background:"rgba(255,255,255,0.05)",borderRadius:"3px",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${hunter.currentXP/hunter.xpToNext*100}%`,background:"linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)",borderRadius:"3px",transition:"width 0.8s ease",boxShadow:"0 0 8px #3b82f688"}} />
          </div>
        </div>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"6px",marginTop:"14px"}}>
          {Object.entries(hunter.stats).map(([k,v])=>(
            <div key={k} style={{textAlign:"center",background:"rgba(0,0,0,0.2)",borderRadius:"6px",padding:"5px 0"}}>
              <div style={{fontSize:"9px",color:"#475569",letterSpacing:"0.08em"}}>{k}</div>
              <div style={{fontSize:"15px",fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:"#e2e8f0"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Dynamic Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"7px",marginBottom:"12px"}}>
        {[
          {label:"STREAK",value:`${hunter.streak}d`,color:"#f59e0b"},
          {label:"MOM",value:`${hunter.momentum.toFixed(1)}×`,color:hunter.momentum>1.5?"#22c55e":"#3b82f6"},
          {label:"LP",value:`${lpMult.toFixed(1)}×`,color:lpMColor},
          {label:"REP",value:`${hunter.reputation}`,color:"#ec4899"},
        ].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"8px 6px",textAlign:"center"}}>
            <div style={{fontSize:"8px",letterSpacing:"0.15em",color:"#475569"}}>{s.label}</div>
            <div style={{fontSize:"15px",fontWeight:700,fontFamily:"'Share Tech Mono',monospace",color:s.color,marginTop:"2px"}}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Shadows preview */}
      {(hunter.shadows||[]).length>0&&(
        <div style={{background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:"10px",padding:"10px 14px",marginBottom:"12px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#a855f7",fontFamily:"'Orbitron',monospace",marginBottom:"8px"}}>SHADOW ARMY — {hunter.shadows.length}</div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {hunter.shadows.slice(0,4).map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:"4px",background:"rgba(168,85,247,0.1)",borderRadius:"6px",padding:"3px 8px",border:"1px solid rgba(168,85,247,0.2)"}}>
                <span style={{fontSize:"12px"}}>{s.icon}</span>
                <span style={{fontSize:"10px",color:"#c084fc",fontFamily:"'Share Tech Mono',monospace"}}>LV{s.level}</span>
              </div>
            ))}
            {hunter.shadows.length>4&&<span style={{fontSize:"11px",color:"#64748b",padding:"3px 0"}}>+{hunter.shadows.length-4} more</span>}
          </div>
        </div>
      )}
      {/* Daily Quests */}
      <div style={{marginBottom:"12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",letterSpacing:"0.2em",color:"#94a3b8",fontFamily:"'Orbitron',monospace"}}>DAILY MISSIONS</div>
          <div style={{fontSize:"11px",color:"#64748b",fontFamily:"'Share Tech Mono',monospace"}}>{completed}/{dailyQuests.length}</div>
        </div>
        {dailyQuests.slice(0,3).map(q=><QuestCard key={q.id} quest={q} hunter={hunter} onComplete={onComplete} compact />)}
        <button onClick={()=>onTabChange("quests")} style={{width:"100%",padding:"9px",background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.18)",borderRadius:"7px",color:"#3b82f6",fontFamily:"'Rajdhani',sans-serif",fontSize:"12px",fontWeight:600,cursor:"pointer",letterSpacing:"0.1em"}}>VIEW ALL MISSIONS →</button>
      </div>
      {/* Debuffs */}
      {hunter.debuffs.length>0&&(
        <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"10px",padding:"12px",marginBottom:"12px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#ef4444",marginBottom:"6px",fontFamily:"'Orbitron',monospace"}}>⚠ ACTIVE DEBUFFS</div>
          {hunter.debuffs.map((d,i)=><div key={i} style={{fontSize:"12px",color:"#fca5a5"}}>• {d.name}: {d.desc}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── QUEST CARD ───────────────────────────────────────────────────────────────
function QuestCard({quest,hunter,onComplete,compact}){
  const xp=calcXP(quest,hunter);
  const catColor={STR:"#ef4444",INT:"#3b82f6",END:"#22c55e",FAI:"#a855f7",CHA:"#f59e0b"};
  const color=catColor[quest.category]||"#94a3b8";
  const isDone=quest.status==="completed";
  return (
    <div style={{background:isDone?"rgba(34,197,94,0.03)":quest.isHighlighted?"rgba(59,130,246,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${isDone?"rgba(34,197,94,0.2)":quest.isHighlighted?"rgba(59,130,246,0.3)":"rgba(255,255,255,0.06)"}`,borderRadius:"9px",padding:compact?"11px":"14px",marginBottom:"7px",opacity:isDone?0.55:1,transition:"all 0.2s",position:"relative"}}>
      {quest.isHighlighted&&!isDone&&<div style={{position:"absolute",top:"6px",right:"7px",fontSize:"8px",color:"#3b82f6",letterSpacing:"0.1em",fontFamily:"'Orbitron',monospace"}}>PRIORITY</div>}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"3px",flexWrap:"wrap"}}>
            <span style={{fontSize:"9px",fontWeight:700,padding:"2px 5px",borderRadius:"3px",background:`${color}20`,color,letterSpacing:"0.08em"}}>{quest.category}</span>
            <span style={{fontSize:"9px",color:"#475569",letterSpacing:"0.08em"}}>{quest.difficulty}-RANK</span>
            {!compact&&<span style={{fontSize:"9px",color:"#475569"}}>{quest.time>0?`${quest.time}min`:"Any time"}</span>}
          </div>
          <div style={{fontSize:"13px",fontWeight:600,letterSpacing:"0.02em"}}>{quest.title}</div>
          {!compact&&<div style={{fontSize:"11px",color:"#475569",marginTop:"3px",fontStyle:"italic"}}>"{quest.missionText}"</div>}
          {!compact&&<div style={{fontSize:"11px",color:"#64748b",marginTop:"3px"}}>{quest.desc}</div>}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"12px",color:"#3b82f6",whiteSpace:"nowrap"}}>+{xp} XP</div>
          {!isDone&&<button onClick={()=>onComplete(quest.id)} style={{marginTop:"5px",padding:"5px 10px",background:"#3b82f6",border:"none",borderRadius:"5px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}
            onMouseEnter={e=>{e.target.style.background="#2563eb"}} onMouseLeave={e=>{e.target.style.background="#3b82f6"}}>DONE</button>}
          {isDone&&<div style={{fontSize:"10px",color:"#22c55e",marginTop:"4px"}}>✓ CLEARED</div>}
        </div>
      </div>
    </div>
  );
}

// ─── QUESTS SCREEN ────────────────────────────────────────────────────────────
function QuestsScreen({hunter,dailyQuests,onComplete}){
  const lpM=lpMultiplier(hunter.lifepower);
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#3b82f6",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>ACTIVE MISSIONS</div>
      <div style={{fontSize:"20px",fontWeight:700,marginBottom:"14px"}}>Daily Quest Board</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginBottom:"14px"}}>
        {[
          {label:"XP Multiplier",value:`${(0.5+hunter.momentum*2.5).toFixed(2)}×`,color:"#3b82f6"},
          {label:"LP Bonus",value:`${lpM.toFixed(1)}×`,color:lpM>=1?"#22c55e":"#ef4444"},
          {label:"Streak Bonus",value:`+${Math.min(hunter.streak*2,50)}%`,color:"#f59e0b"},
          {label:"Today's XP Cap",value:"∞",color:"#94a3b8"},
        ].map(s=>(
          <div key={s.label} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"11px",color:"#64748b"}}>{s.label}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"14px",fontWeight:700,color:s.color}}>{s.value}</span>
          </div>
        ))}
      </div>
      {dailyQuests.map(q=><QuestCard key={q.id} quest={q} hunter={hunter} onComplete={onComplete} compact={false} />)}
      <div style={{marginTop:"20px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.25em",color:"#f59e0b",fontFamily:"'Orbitron',monospace",marginBottom:"10px"}}>RECOVERY MISSIONS</div>
        {RECOVERY_QUESTS.map(r=>(
          <div key={r.id} style={{background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.18)",borderRadius:"9px",padding:"12px",marginBottom:"7px"}}>
            <div style={{fontSize:"13px",fontWeight:600}}>{r.title}</div>
            <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"3px"}}>{r.desc}</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"11px",color:"#f59e0b",marginTop:"5px"}}>+{r.xp} XP on completion</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DUNGEONS ─────────────────────────────────────────────────────────────────
function DungeonsScreen({hunter,selected,setSelected,onEnter,onCheckin}){
  const activeDungeons=hunter.dungeons.filter(d=>d.status==="active");
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#3b82f6",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>DUNGEON SYSTEM</div>
      <div style={{fontSize:"20px",fontWeight:700,marginBottom:"14px"}}>Enter the Dungeon</div>
      {activeDungeons.length>0&&(
        <div style={{marginBottom:"18px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#22c55e",fontFamily:"'Orbitron',monospace",marginBottom:"8px"}}>ACTIVE DUNGEONS</div>
          {activeDungeons.map(d=>{
            const pct=d.days>0?Math.round((d.daysCompleted/d.days)*100):0;
            return (
              <div key={d.id} style={{background:"rgba(34,197,94,0.04)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:"11px",padding:"14px",marginBottom:"9px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:"18px"}}>{d.icon}</div>
                    <div style={{fontSize:"13px",fontWeight:700,marginTop:"3px"}}>{d.title}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"11px",color:"#22c55e",marginTop:"2px"}}>Day {d.daysCompleted}/{d.days||"∞"}</div>
                  </div>
                  <button onClick={()=>onCheckin(d.id)} style={{padding:"7px 12px",background:"#22c55e",border:"none",borderRadius:"7px",color:"#000",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}>CHECK IN</button>
                </div>
                {d.days>0&&<div style={{marginTop:"8px"}}><div style={{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"2px"}}><div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#16a34a,#22c55e)",borderRadius:"2px",transition:"width 0.5s"}} /></div><div style={{fontSize:"10px",color:"#475569",marginTop:"3px",textAlign:"right"}}>{pct}%</div></div>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"9px"}}>AVAILABLE DUNGEONS</div>
      {DUNGEONS_DEF.map(d=>{
        const alreadyActive=hunter.dungeons.some(hd=>hd.id===d.id&&hd.status==="active");
        const cleared=hunter.dungeons.some(hd=>hd.id===d.id&&hd.status==="completed");
        const locked=d.minLevel&&hunter.level<d.minLevel;
        const diffColors={E:"#6b7280",D:"#22c55e",C:"#3b82f6",B:"#a855f7",A:"#f59e0b",S:"#ef4444"};
        return (
          <div key={d.id} onClick={()=>!alreadyActive&&!locked&&setSelected(d.id===selected?null:d.id)}
            style={{background:selected===d.id?"rgba(59,130,246,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${selected===d.id?"rgba(59,130,246,0.35)":"rgba(255,255,255,0.06)"}`,borderRadius:"11px",padding:"14px",marginBottom:"7px",cursor:alreadyActive||locked?"default":"pointer",transition:"all 0.2s",opacity:cleared||locked?0.5:1}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"24px"}}>{d.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{fontSize:"13px",fontWeight:700}}>{d.title}{cleared&&" ✓"}</div>
                  <span style={{fontSize:"9px",padding:"1px 5px",borderRadius:"3px",background:`${diffColors[d.difficulty]||"#6b7280"}20`,color:diffColors[d.difficulty]||"#6b7280"}}>{d.difficulty}</span>
                </div>
                <div style={{fontSize:"10px",color:"#475569",marginTop:"1px"}}>{d.category} • {d.days>0?`${d.days} days`:"Self-paced"}{locked?` • Requires LV${d.minLevel}`:""}</div>
              </div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"12px",color:"#3b82f6"}}>{d.xp.toLocaleString()} XP</div>
            </div>
            {selected===d.id&&!alreadyActive&&!locked&&(
              <div style={{marginTop:"10px",paddingTop:"10px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:"12px",color:"#94a3b8",marginBottom:"8px"}}>{d.desc}</div>
                <div style={{fontSize:"11px",color:"#475569",marginBottom:"8px"}}>Rewards: {Object.entries(d.rewards).map(([k,v])=>`+${v} ${k}`).join(", ")}</div>
                <button onClick={e=>{e.stopPropagation();onEnter(d);}} style={{padding:"9px 18px",background:"#3b82f6",border:"none",borderRadius:"7px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}>ENTER DUNGEON</button>
              </div>
            )}
            {alreadyActive&&<div style={{marginTop:"6px",fontSize:"10px",color:"#22c55e",letterSpacing:"0.1em"}}>● ACTIVE</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── BOSS SYSTEM ──────────────────────────────────────────────────────────────
function BossesScreen({hunter,activeBoss,setActiveBoss,onAttack}){
  const allBosses=[...WEEKLY_BOSSES,...MONTHLY_BOSSES];
  const bossHp=activeBoss?activeBoss.hp:0;
  const remainingHp=Math.max(0,bossHp-(hunter.bossDamageDealt||0));
  const hpPct=bossHp>0?Math.round((remainingHp/bossHp)*100):100;
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#ef4444",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>BOSS SYSTEM</div>
      <div style={{fontSize:"20px",fontWeight:700,marginBottom:"14px"}}>Boss Encounters</div>
      {activeBoss?(
        <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
          <div style={{textAlign:"center",marginBottom:"16px"}}>
            <div style={{fontSize:"60px",marginBottom:"8px"}}>{activeBoss.icon}</div>
            <div style={{fontSize:"18px",fontWeight:700,color:"#ef4444"}}>{activeBoss.name}</div>
            <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"3px"}}>{activeBoss.desc}</div>
          </div>
          <div style={{marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#64748b",marginBottom:"5px",fontFamily:"'Share Tech Mono',monospace"}}>
              <span>HP: {remainingHp.toLocaleString()} / {bossHp.toLocaleString()}</span>
              <span>{hpPct}%</span>
            </div>
            <div style={{height:"8px",background:"rgba(255,255,255,0.06)",borderRadius:"4px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${hpPct}%`,background:"linear-gradient(90deg,#dc2626,#ef4444)",borderRadius:"4px",transition:"width 0.5s"}} />
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"14px"}}>
            {[
              {label:"Quick Strike",dmg:50,cost:"10 min quest"},
              {label:"Heavy Blow",dmg:150,cost:"30 min quest"},
              {label:"Shadow Strike",dmg:300,cost:"60 min quest"},
            ].map(a=>(
              <button key={a.label} onClick={()=>onAttack(activeBoss,a.dmg)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"8px",padding:"10px 6px",color:"#fca5a5",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif"}}>
                <div style={{fontSize:"12px",fontWeight:600}}>{a.label}</div>
                <div style={{fontSize:"16px",fontWeight:700,color:"#ef4444",fontFamily:"'Share Tech Mono',monospace"}}>-{a.dmg}</div>
                <div style={{fontSize:"9px",color:"#64748b",marginTop:"2px"}}>{a.cost}</div>
              </button>
            ))}
          </div>
          <button onClick={()=>setActiveBoss(null)} style={{width:"100%",padding:"8px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"7px",color:"#64748b",cursor:"pointer",fontSize:"12px",fontFamily:"'Rajdhani',sans-serif"}}>Retreat (lose progress)</button>
        </div>
      ):(
        <div style={{background:"rgba(59,130,246,0.04)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:"10px",padding:"12px 14px",marginBottom:"14px",fontSize:"12px",color:"#64748b"}}>Select a boss to engage. Bosses respawn weekly. Defeat them to earn massive rewards.</div>
      )}
      <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#f59e0b",fontFamily:"'Orbitron',monospace",marginBottom:"9px"}}>WEEKLY BOSSES</div>
      {WEEKLY_BOSSES.map(b=><BossCard key={b.id} boss={b} onEngage={()=>setActiveBoss(b)} active={activeBoss?.id===b.id} defeated={hunter.bossesDefeated>0} />)}
      <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#e879f9",fontFamily:"'Orbitron',monospace",marginBottom:"9px",marginTop:"16px"}}>MONTHLY BOSSES</div>
      {MONTHLY_BOSSES.map(b=>{
        const locked=b.id==="shadow_monarch"&&hunter.level<25;
        return <BossCard key={b.id} boss={b} onEngage={()=>!locked&&setActiveBoss(b)} active={activeBoss?.id===b.id} defeated={false} locked={locked} />;
      })}
    </div>
  );
}
function BossCard({boss,onEngage,active,defeated,locked}){
  return (
    <div style={{background:active?"rgba(239,68,68,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${active?"rgba(239,68,68,0.35)":"rgba(255,255,255,0.06)"}`,borderRadius:"10px",padding:"12px",marginBottom:"7px",opacity:locked?0.4:1}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <span style={{fontSize:"28px"}}>{boss.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"13px",fontWeight:700}}>{boss.name}</div>
          <div style={{fontSize:"10px",color:"#64748b",marginTop:"1px"}}>HP: {boss.hp.toLocaleString()} • Reward: +{boss.reward.xp.toLocaleString()} XP</div>
          {locked&&<div style={{fontSize:"10px",color:"#f59e0b",marginTop:"2px"}}>Requires Level 25</div>}
        </div>
        {!locked&&<button onClick={onEngage} style={{padding:"6px 12px",background:active?"rgba(239,68,68,0.2)":"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"6px",color:"#fca5a5",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,cursor:"pointer",letterSpacing:"0.1em"}}>{active?"ENGAGING":"ENGAGE"}</button>}
      </div>
    </div>
  );
}

// ─── SHADOWS SCREEN ───────────────────────────────────────────────────────────
function ShadowsScreen({hunter}){
  const shadows=hunter.shadows||[];
  const habitStreaks=hunter.habitStreaks||{};
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#a855f7",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>SHADOW ARMY</div>
      <div style={{fontSize:"20px",fontWeight:700,marginBottom:"6px"}}>Shadow Soldiers</div>
      <div style={{fontSize:"12px",color:"#64748b",marginBottom:"14px"}}>Maintain habits to awaken Shadows. Each Shadow provides passive stat bonuses.</div>
      {shadows.length>0&&(
        <>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#a855f7",fontFamily:"'Orbitron',monospace",marginBottom:"9px"}}>AWAKENED SHADOWS — {shadows.length}</div>
          {shadows.map(s=>(
            <div key={s.id} style={{background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:"11px",padding:"14px",marginBottom:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"40px",height:"40px",borderRadius:"50%",background:`${s.color}22`,border:`1px solid ${s.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>{s.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:s.color}}>{s.name}</div>
                  <div style={{fontSize:"10px",color:"#64748b",marginTop:"1px"}}>{s.passive}</div>
                  <div style={{fontSize:"9px",color:"#475569",marginTop:"1px"}}>Awakened: {s.awakened} • Power LV {s.powerLevel}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",fontWeight:700,color:s.color}}>LV{s.level}</div>
                  <div style={{fontSize:"8px",color:"#475569",letterSpacing:"0.1em"}}>SHADOW</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#475569",fontFamily:"'Orbitron',monospace",marginBottom:"9px",marginTop:shadows.length>0?"16px":"0"}}>AVAILABLE SHADOWS</div>
      {Object.entries(SHADOW_DEFS).map(([key,def])=>{
        const awakened=shadows.find(s=>s.id===key);
        const progress=habitStreaks[key]||0;
        const pct=Math.min(100,Math.round((progress/def.threshold)*100));
        if(awakened) return null;
        return (
          <div key={key} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"12px",marginBottom:"7px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <span style={{fontSize:"20px",opacity:0.5}}>{def.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:600,color:"#64748b"}}>{def.name}</div>
                <div style={{fontSize:"10px",color:"#475569"}}>{def.passive} • Requires {def.stat} habit × {def.threshold} days</div>
              </div>
              <div style={{fontSize:"10px",color:"#64748b",fontFamily:"'Share Tech Mono',monospace"}}>{progress}/{def.threshold}</div>
            </div>
            <div style={{height:"3px",background:"rgba(255,255,255,0.05)",borderRadius:"2px"}}><div style={{height:"100%",width:`${pct}%`,background:def.color,borderRadius:"2px",transition:"width 0.5s"}} /></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SKILLS SCREEN ────────────────────────────────────────────────────────────
function SkillsScreen({hunter,onUnlock}){
  const [activeTree,setActiveTree]=useState("STR");
  const points=getStatPoints(hunter);
  const tree=SKILL_TREES[activeTree];
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#22c55e",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>SKILL TREE SYSTEM</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div style={{fontSize:"20px",fontWeight:700}}>Skill Trees</div>
        <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"8px",padding:"4px 10px",fontFamily:"'Share Tech Mono',monospace",fontSize:"12px",color:"#f59e0b"}}>{points} pts available</div>
      </div>
      <div style={{display:"flex",gap:"5px",marginBottom:"16px",overflowX:"auto",paddingBottom:"2px"}}>
        {Object.keys(SKILL_TREES).map(stat=>(
          <button key={stat} onClick={()=>setActiveTree(stat)} style={{flex:"0 0 auto",padding:"6px 12px",background:activeTree===stat?`${SKILL_TREES[stat].color}20`:"rgba(255,255,255,0.03)",border:`1px solid ${activeTree===stat?SKILL_TREES[stat].color:"rgba(255,255,255,0.08)"}`,borderRadius:"7px",color:activeTree===stat?SKILL_TREES[stat].color:"#64748b",fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:700,cursor:"pointer",letterSpacing:"0.08em"}}>{stat}</button>
        ))}
      </div>
      <div style={{fontSize:"12px",color:tree.color,fontFamily:"'Share Tech Mono',monospace",marginBottom:"12px",letterSpacing:"0.1em"}}>{tree.name} — Current {activeTree}: {hunter.stats[activeTree]}</div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {tree.skills.map(skill=>{
          const unlocked=hunter.unlockedSkills[skill.id];
          const reqsMet=skill.requires.every(r=>hunter.unlockedSkills[r]);
          const canUnlock=!unlocked&&reqsMet&&points>=skill.cost;
          return (
            <div key={skill.id} style={{background:unlocked?"rgba(34,197,94,0.06)":reqsMet?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)",border:`1px solid ${unlocked?"rgba(34,197,94,0.25)":reqsMet?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)"}`,borderRadius:"9px",padding:"12px",opacity:!reqsMet&&!unlocked?0.4:1}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <div style={{fontSize:"13px",fontWeight:600,color:unlocked?tree.color:"#e2e8f0"}}>{skill.name}</div>
                    {unlocked&&<span style={{fontSize:"9px",color:"#22c55e"}}>✓ UNLOCKED</span>}
                    {!reqsMet&&!unlocked&&<span style={{fontSize:"9px",color:"#475569"}}>LOCKED</span>}
                  </div>
                  <div style={{fontSize:"11px",color:"#64748b",marginTop:"3px"}}>{skill.desc}</div>
                  {skill.requires.length>0&&<div style={{fontSize:"10px",color:"#475569",marginTop:"2px"}}>Requires: {skill.requires.join(", ")}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"12px",color:"#f59e0b",fontFamily:"'Share Tech Mono',monospace",marginBottom:"4px"}}>{skill.cost} pts</div>
                  {!unlocked&&<button onClick={()=>onUnlock(skill.id,activeTree)} style={{padding:"5px 10px",background:canUnlock?"#22c55e":"rgba(255,255,255,0.04)",border:`1px solid ${canUnlock?"#22c55e":"rgba(255,255,255,0.08)"}`,borderRadius:"5px",color:canUnlock?"#000":"#475569",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,cursor:canUnlock?"pointer":"not-allowed",letterSpacing:"0.1em"}}>UNLOCK</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STATS SCREEN ─────────────────────────────────────────────────────────────
function StatsScreen({hunter}){
  const statColors={STR:"#ef4444",INT:"#3b82f6",END:"#22c55e",CHA:"#f59e0b",FAI:"#a855f7"};
  const statIcons={STR:"💪",INT:"🧠",END:"⚡",CHA:"💬",FAI:"🌙"};
  const maxStat=200;
  const clsEvo=getCurrentClass(hunter);
  const nextEvo=CLASS_TREE[hunter.hunterClass]?.evolutions.find(e=>e.minLevel>hunter.level);
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#3b82f6",fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>HUNTER ANALYTICS</div>
      <div style={{fontSize:"20px",fontWeight:700,marginBottom:"16px"}}>Stat Overview</div>
      {/* Class Evolution */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"16px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"12px"}}>CLASS EVOLUTION PATH</div>
        <div style={{display:"flex",gap:"0",overflowX:"auto",paddingBottom:"4px"}}>
          {CLASS_TREE[hunter.hunterClass]?.evolutions.map((evo,i)=>{
            const reached=hunter.level>=evo.minLevel;
            const isCurrent=clsEvo?.name===evo.name;
            return (
              <div key={i} style={{flex:"0 0 auto",textAlign:"center",padding:"0 8px",position:"relative"}}>
                {i>0&&<div style={{position:"absolute",left:0,top:"16px",width:"16px",height:"1px",background:reached?"#3b82f6":"rgba(255,255,255,0.1)"}} />}
                <div style={{width:"32px",height:"32px",borderRadius:"50%",background:reached?`${evo.color}22`:"rgba(255,255,255,0.03)",border:`1px solid ${reached?evo.color:"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",margin:"0 auto",boxShadow:isCurrent?`0 0 12px ${evo.color}66`:"none"}}>{evo.icon}</div>
                <div style={{fontSize:"9px",color:reached?evo.color:"#475569",marginTop:"4px",maxWidth:"60px",lineHeight:1.2}}>{evo.name.split(" ")[0]}</div>
                <div style={{fontSize:"8px",color:"#475569",marginTop:"1px"}}>LV{evo.minLevel}</div>
              </div>
            );
          })}
        </div>
        {nextEvo&&<div style={{marginTop:"10px",fontSize:"11px",color:"#64748b"}}>{nextEvo.name} evolves at Level {nextEvo.minLevel} — {nextEvo.minLevel-hunter.level} levels away</div>}
      </div>
      {/* Stats */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"16px",marginBottom:"14px"}}>
        {Object.entries(hunter.stats).map(([k,v])=>(
          <div key={k} style={{marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                <span style={{fontSize:"14px"}}>{statIcons[k]}</span>
                <span style={{fontSize:"13px",fontWeight:600}}>{k}</span>
                <span style={{fontSize:"10px",color:"#475569"}}>{({STR:"Strength",INT:"Intelligence",END:"Endurance",CHA:"Charisma",FAI:"Faith"})[k]}</span>
              </div>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"15px",fontWeight:700,color:statColors[k]}}>{v}</span>
            </div>
            <div style={{height:"5px",background:"rgba(255,255,255,0.05)",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(v/maxStat)*100}%`,background:statColors[k],borderRadius:"3px",transition:"width 0.8s ease",boxShadow:`0 0 6px ${statColors[k]}55`}} />
            </div>
          </div>
        ))}
      </div>
      {/* Rank Breakdown */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"16px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"12px"}}>RANK SCORE BREAKDOWN</div>
        {[
          {label:"Quest Completion (40%)",value:Math.round(hunter.questCompletionRate7d*0.4),color:"#3b82f6"},
          {label:"Momentum (25%)",value:Math.round(Math.min(hunter.momentum*33.3,100)*0.25),color:"#22c55e"},
          {label:"Consistency (20%)",value:Math.round(Math.min(hunter.streak*3,30)*0.2*10)/10,color:"#f59e0b"},
          {label:"Reputation (15%)",value:Math.round(Math.min(hunter.reputation/10,15)*0.15*10)/10,color:"#a855f7"},
        ].map(row=>(
          <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
            <div style={{fontSize:"11px",color:"#64748b"}}>{row.label}</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"13px",color:row.color}}>{typeof row.value==="number"?row.value.toFixed(1):row.value}</div>
          </div>
        ))}
        {(hunter.rankDecayPenalty||0)>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}><div style={{fontSize:"11px",color:"#ef4444"}}>Rank Decay Penalty</div><div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"13px",color:"#ef4444"}}>-{hunter.rankDecayPenalty}</div></div>}
        <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:"8px",display:"flex",justifyContent:"space-between"}}>
          <div style={{fontSize:"12px",fontWeight:700}}>Total Rank Score</div>
          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"17px",fontWeight:700,color:RANK_COLORS[hunter.rank]}}>{hunter.rankScore}</div>
        </div>
      </div>
      {/* XP Log */}
      {hunter.xpLog.length>0&&(
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"16px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"12px"}}>RECENT XP LOG</div>
          {hunter.xpLog.slice(-8).reverse().map((log,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<Math.min(7,hunter.xpLog.length-1)?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <div>
                <span style={{fontSize:"12px",color:"#94a3b8"}}>{log.quest}</span>
                {log.lp&&<span style={{fontSize:"9px",color:"#475569",marginLeft:"6px"}}>LP:{log.lp}%</span>}
              </div>
              <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"12px",color:"#3b82f6"}}>+{log.xp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE SCREEN ────────────────────────────────────────────────────────────
function ProfileScreen({hunter}){
  const clsEvo=getCurrentClass(hunter);
  const rankColor=RANK_COLORS[hunter.rank]||"#6b7280";
  const earnedTitles=hunter.titles.map(k=>TITLES_DEF[k]).filter(Boolean);
  const unearnedTitles=Object.entries(TITLES_DEF).filter(([k])=>!hunter.titles.includes(k));
  const totalXP=hunter.xpLog.reduce((s,l)=>s+l.xp,0);
  return (
    <div style={{padding:"14px",maxWidth:"600px",margin:"0 auto"}}>
      <div style={{background:`linear-gradient(135deg,rgba(59,130,246,0.08) 0%,rgba(6,8,16,0.6) 100%)`,border:"1px solid rgba(59,130,246,0.22)",borderRadius:"14px",padding:"20px",marginBottom:"14px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:"140px",opacity:0.04,pointerEvents:"none"}}>{clsEvo?.icon}</div>
        <div style={{width:"60px",height:"60px",borderRadius:"50%",background:`${clsEvo?.color||"#3b82f6"}18`,border:`2px solid ${clsEvo?.color||"#3b82f6"}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",margin:"0 auto 10px"}}>{clsEvo?.icon}</div>
        <div style={{fontSize:"22px",fontWeight:700,letterSpacing:"0.04em"}}>{hunter.name}</div>
        <div style={{fontSize:"12px",color:clsEvo?.color,marginTop:"2px"}}>{clsEvo?.name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:"20px",marginTop:"14px"}}>
          {[{v:hunter.rank,l:"RANK",c:rankColor},{v:hunter.level,l:"LEVEL",c:"#fff"},{v:hunter.streak,l:"STREAK",c:"#f59e0b"},{v:`S${hunter.season||1}`,l:"SEASON",c:"#94a3b8"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:"8px",color:"#475569",letterSpacing:"0.15em"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Titles */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"12px"}}>TITLES — {earnedTitles.length}/{Object.keys(TITLES_DEF).length}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:unearnedTitles.length>0?"10px":0}}>
          {earnedTitles.map((t,i)=><span key={i} style={{padding:"4px 10px",background:"rgba(59,130,246,0.12)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:"999px",fontSize:"11px",fontWeight:600,color:"#93c5fd",letterSpacing:"0.04em"}}>{t.name}</span>)}
        </div>
        {unearnedTitles.length>0&&<>
          <div style={{fontSize:"9px",color:"#334155",letterSpacing:"0.2em",marginBottom:"6px"}}>LOCKED</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {unearnedTitles.slice(0,5).map(([k,t])=><span key={k} style={{padding:"3px 9px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"999px",fontSize:"10px",color:"#334155"}}>🔒 {t.name}</span>)}
          </div>
        </>}
      </div>
      {/* Stats */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"14px"}}>
        <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"#64748b",fontFamily:"'Orbitron',monospace",marginBottom:"12px"}}>HUNTER RECORD</div>
        {[
          {k:"Current Class",v:clsEvo?.name},
          {k:"Total XP Earned",v:totalXP.toLocaleString()},
          {k:"Quests Completed",v:hunter.completedQuestIds.length},
          {k:"Dungeons Cleared",v:hunter.dungeonsCleared},
          {k:"Bosses Defeated",v:hunter.bossesDefeated||0},
          {k:"Shadows Awakened",v:(hunter.shadows||[]).length},
          {k:"Skills Unlocked",v:Object.keys(hunter.unlockedSkills||{}).length},
          {k:"Rank Score",v:`${hunter.rankScore}/100`},
          {k:"Trust Level",v:hunter.trustLevel||1},
        ].map(row=>(
          <div key={row.k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:"12px",color:"#475569"}}>{row.k}</span>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"12px"}}>{row.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LP PANEL ─────────────────────────────────────────────────────────────────
function LPPanel({hunter,onUpdate,onClose}){
  const lpScore=calcLP(hunter.lifepower);
  const mult=lpMultiplier(hunter.lifepower);
  const lpColor=lpScore>=70?"#22c55e":lpScore>=40?"#f59e0b":"#ef4444";
  const labels={sleep:"😴 Sleep Quality",water:"💧 Hydration",energy:"⚡ Energy Level",mood:"😊 Mood",recovery:"🔄 Recovery"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:"480px",background:"#0d1117",border:"1px solid rgba(59,130,246,0.25)",borderRadius:"16px 16px 0 0",padding:"20px",paddingBottom:"30px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"10px",letterSpacing:"0.3em",color:"#64748b",fontFamily:"'Orbitron',monospace"}}>LIFE POWER SYSTEM</div>
            <div style={{fontSize:"18px",fontWeight:700,marginTop:"2px"}}>LP: <span style={{color:lpColor,fontFamily:"'Orbitron',monospace"}}>{lpScore}</span> — <span style={{color:lpColor,fontSize:"14px"}}>{mult.toFixed(1)}× XP</span></div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"8px",padding:"6px 12px",color:"#64748b",cursor:"pointer",fontFamily:"'Rajdhani',sans-serif",fontSize:"12px"}}>CLOSE</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          {LP_FACTORS.map(key=>(
            <div key={key}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#94a3b8",marginBottom:"5px"}}>
                <span>{labels[key]}</span>
                <span style={{fontFamily:"'Share Tech Mono',monospace",color:"#e2e8f0"}}>{hunter.lifepower[key]}</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={hunter.lifepower[key]} onChange={e=>onUpdate(key,Number(e.target.value))} style={{width:"100%",accentColor:lpColor}} />
            </div>
          ))}
        </div>
        <div style={{marginTop:"14px",padding:"10px",background:"rgba(255,255,255,0.03)",borderRadius:"8px",fontSize:"11px",color:"#64748b",textAlign:"center"}}>High LP = up to +30% XP. Low LP = up to -40% XP. Update daily for accuracy.</div>
      </div>
    </div>
  );
}

// ─── OVERLAYS ─────────────────────────────────────────────────────────────────
function LevelUpOverlay({data,onClose}){
  useEffect(()=>{ const t=setTimeout(onClose,4000); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace"}} onClick={onClose}>
      <div style={{textAlign:"center",animation:"lvl 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}>
        <div style={{fontSize:"12px",letterSpacing:"0.5em",color:"#3b82f6",marginBottom:"14px"}}>LEVEL UP</div>
        <div style={{fontSize:"clamp(70px,18vw,110px)",fontWeight:900,color:"#fff",lineHeight:1,textShadow:"0 0 80px rgba(59,130,246,0.9)"}}>{data.level}</div>
        {data.class&&<div style={{fontSize:"14px",color:data.class.color,marginTop:"10px",letterSpacing:"0.1em"}}>{data.class.name}</div>}
        <div style={{fontSize:"12px",color:"#475569",marginTop:"14px",letterSpacing:"0.25em"}}>HUNTER GROWS STRONGER</div>
        <div style={{marginTop:"20px",fontSize:"10px",color:"#334155"}}>tap to continue</div>
      </div>
      <style>{`@keyframes lvl{0%{opacity:0;transform:scale(0.4)}100%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
function TitleEarnedOverlay({title,onClose}){
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace"}} onClick={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"44px",marginBottom:"10px"}}>🏅</div>
        <div style={{fontSize:"10px",letterSpacing:"0.5em",color:"#f59e0b",marginBottom:"6px"}}>NEW TITLE EARNED</div>
        <div style={{fontSize:"clamp(16px,4vw,24px)",fontWeight:700,color:"#fbbf24",textShadow:"0 0 30px rgba(245,158,11,0.6)"}}>{title}</div>
      </div>
    </div>
  );
}
function ShadowAwakenedOverlay({shadow,onClose}){
  useEffect(()=>{ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace"}} onClick={onClose}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"60px",marginBottom:"10px",animation:"shadowrise 0.8s cubic-bezier(0.34,1.56,0.64,1)"}}>{shadow.icon}</div>
        <div style={{fontSize:"10px",letterSpacing:"0.5em",color:"#a855f7",marginBottom:"6px"}}>SHADOW AWAKENED</div>
        <div style={{fontSize:"clamp(16px,4vw,22px)",fontWeight:700,color:shadow.color,textShadow:`0 0 30px ${shadow.color}88`}}>{shadow.name}</div>
        <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"8px"}}>{shadow.passive}</div>
        <div style={{marginTop:"12px",fontSize:"10px",color:"#475569",letterSpacing:"0.2em"}}>ADDED TO YOUR SHADOW ARMY</div>
      </div>
      <style>{`@keyframes shadowrise{0%{opacity:0;transform:scale(0.2) translateY(30px)}100%{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}
function Notification({data}){
  const colors={success:"#22c55e",warning:"#f59e0b",error:"#ef4444",info:"#3b82f6"};
  const c=colors[data.type]||colors.info;
  return (
    <div style={{position:"fixed",top:"68px",left:"50%",transform:"translateX(-50%)",background:"rgba(6,8,16,0.96)",border:`1px solid ${c}44`,borderRadius:"9px",padding:"9px 16px",fontSize:"12px",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,color:c,zIndex:100,whiteSpace:"nowrap",backdropFilter:"blur(12px)",boxShadow:`0 4px 20px ${c}22`,animation:"slideDown 0.3s ease",maxWidth:"90vw",overflow:"hidden",textOverflow:"ellipsis"}}>
      {data.msg}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}
