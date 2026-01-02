import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Trophy, User, LayoutDashboard, Users, Github, Instagram, Linkedin, Save, RefreshCw, Star, Plus, Hash } from 'lucide-react';

function App() {
  const [view, setView] = useState('dashboard'); // dashboard, profile, leagues
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    name: "New Bro",
    bio: "LeetCode Enthusiast",
    pfp: "https://api.dicebear.com/7.x/avataaars/svg?seed=LeetBro",
    github: "",
    insta: "",
    linkedin: ""
  });

  // League States
  const [leagueName, setLeagueName] = useState("");
  const [searchLeague, setSearchLeague] = useState("");
  const [myLeagues, setMyLeagues] = useState([]);

  // --- 1. Load Data on Mount ---
  useEffect(() => {
    // Sync Global Leaderboard
    const q = query(collection(db, "members"), orderBy("totalPoints", "desc"));
    const unsubMembers = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load Profile from DB
    const loadProfile = async () => {
      const docRef = doc(db, "profiles", "me");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setProfile(docSnap.data());
    };
    loadProfile();

    // Sync Leagues I belong to
    const leagueQuery = query(collection(db, "leagues"));
    const unsubLeagues = onSnapshot(leagueQuery, (snapshot) => {
      const allLeagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allLeagues.filter(l => l.members.includes(profile.name));
      setMyLeagues(filtered);
    });

    return () => {
      unsubMembers();
      unsubLeagues();
    };
  }, [profile.name]);

  // --- 2. Profile Actions ---
  const saveProfile = async () => {
    try {
      await setDoc(doc(db, "profiles", "me"), profile);
      alert("Profile updated successfully!");
    } catch (e) { alert("Error saving profile"); }
  };

  // --- 3. League Actions ---
  const createLeague = async (e) => {
    e.preventDefault();
    if (!leagueName) return;
    const cleanName = leagueName.trim();
    try {
      await setDoc(doc(db, "leagues", cleanName), {
        name: cleanName,
        creator: profile.name,
        members: [profile.name],
        createdAt: new Date()
      });
      setLeagueName("");
      alert(`League "${cleanName}" created!`);
    } catch (err) { alert("Error creating league"); }
  };

  const joinLeague = async (e) => {
    e.preventDefault();
    const cleanSearch = searchLeague.trim();
    const leagueRef = doc(db, "leagues", cleanSearch);
    const leagueSnap = await getDoc(leagueRef);

    if (leagueSnap.exists()) {
      const data = leagueSnap.data();
      if (!data.members.includes(profile.name)) {
        await updateDoc(leagueRef, {
          members: [...data.members, profile.name]
        });
        alert(`Joined ${cleanSearch}!`);
      } else { alert("Already a member!"); }
      setSearchLeague("");
    } else { alert("League not found!"); }
  };

  // --- 4. LeetCode Sync Logic ---
  const syncUser = async (targetUsername) => {
    setLoading(true);
    try {
      const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${targetUsername}`);
      const stats = await res.json();
      if (stats.status === "success") {
        const points = (stats.easySolved * 1) + (stats.mediumSolved * 2) + (stats.hardSolved * 5);
        const memberDoc = members.find(m => m.username === targetUsername);
        if (memberDoc) {
          await updateDoc(doc(db, "members", memberDoc.id), {
            easy: stats.easySolved, medium: stats.mediumSolved, hard: stats.hardSolved, totalPoints: points
          });
        } else {
          await addDoc(collection(db, "members"), {
            username: targetUsername, easy: stats.easySolved, medium: stats.mediumSolved, hard: stats.hardSolved, totalPoints: points
          });
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex">
      
      {/* SIDE NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800 p-4 flex justify-around md:top-0 md:left-0 md:w-24 md:h-full md:flex-col md:border-t-0 md:border-r md:justify-start md:pt-10 md:gap-8 z-50">
        <button onClick={() => setView('dashboard')} className={`p-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-white'}`}><LayoutDashboard /></button>
        <button onClick={() => setView('leagues')} className={`p-3 rounded-2xl transition-all ${view === 'leagues' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-white'}`}><Users /></button>
        <button onClick={() => setView('profile')} className={`p-3 rounded-2xl transition-all ${view === 'profile' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-white'}`}><User /></button>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-24 p-6 md:p-12 pb-32">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-black tracking-tighter italic text-yellow-500">LEETBRO</h1>
          <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
            <img src={profile.pfp} className="w-8 h-8 rounded-full" alt="avatar" />
            <span className="font-bold text-sm hidden sm:inline">{profile.name}</span>
          </div>
        </header>

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-500" /> Leaderboard</h2>
              <button onClick={() => members.forEach(m => syncUser(m.username))} className="text-xs flex items-center gap-2 text-slate-400 hover:text-white transition">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Scores
              </button>
            </div>
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-slate-800">
                    <th className="p-6">Rank</th>
                    <th className="p-6">Coder</th>
                    <th className="p-6 text-center">E/M/H</th>
                    <th className="p-6 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {members.map((m, i) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-6 font-mono text-slate-500">{i === 0 ? "👑" : `#${i + 1}`}</td>
                      <td className="p-6 font-bold group-hover:text-yellow-500 transition-colors">{m.username}</td>
                      <td className="p-6 text-center text-sm font-medium">
                        <span className="text-green-500">{m.easy}</span><span className="mx-1 text-slate-700">/</span>
                        <span className="text-yellow-500">{m.medium}</span><span className="mx-1 text-slate-700">/</span>
                        <span className="text-red-500">{m.hard}</span>
                      </td>
                      <td className="p-6 text-right font-black text-xl text-yellow-500">{m.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROFILE VIEW */}
        {view === 'profile' && (
          <div className="max-w-2xl mx-auto bg-slate-900 p-10 rounded-[3rem] border border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center mb-10">
              <div className="relative group mb-6">
                <img src={profile.pfp} className="w-32 h-32 rounded-full border-4 border-yellow-500 shadow-2xl shadow-yellow-500/20" alt="pfp" />
              </div>
              <input className="text-3xl font-black bg-transparent border-b-2 border-slate-800 text-center w-full mb-4 outline-none focus:border-yellow-500 transition-colors" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
              <textarea className="bg-transparent text-slate-400 text-center w-full outline-none resize-none h-12" value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} />
            </div>
            
            <div className="space-y-4 mb-10">
              <label className="text-xs uppercase tracking-widest text-slate-500 font-bold">Social Links</label>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-slate-800 focus-within:border-yellow-500 transition-colors">
                <Github size={20} className="text-slate-500" />
                <input className="bg-transparent flex-1 outline-none text-sm" placeholder="Github URL" value={profile.github} onChange={(e) => setProfile({...profile, github: e.target.value})} />
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-slate-800 focus-within:border-yellow-500 transition-colors">
                <Instagram size={20} className="text-slate-500" />
                <input className="bg-transparent flex-1 outline-none text-sm" placeholder="Instagram URL" value={profile.insta} onChange={(e) => setProfile({...profile, insta: e.target.value})} />
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-slate-800 focus-within:border-yellow-500 transition-colors">
                <Linkedin size={20} className="text-slate-500" />
                <input className="bg-transparent flex-1 outline-none text-sm" placeholder="LinkedIn URL" value={profile.linkedin} onChange={(e) => setProfile({...profile, linkedin: e.target.value})} />
              </div>
            </div>

            <button onClick={saveProfile} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95">
              <Save size={20} /> SAVE PROFILE
            </button>
          </div>
        )}

        {/* LEAGUES VIEW */}
        {view === 'leagues' && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="text-yellow-500" />
                  <h3 className="text-xl font-bold">New League</h3>
                </div>
                <form onSubmit={createLeague} className="flex gap-2">
                  <input className="bg-black/40 border border-slate-700 p-3 rounded-xl flex-1 outline-none focus:border-yellow-500" placeholder="League Name" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} />
                  <button className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition">Create</button>
                </form>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <Hash className="text-blue-500" />
                  <h3 className="text-xl font-bold">Join League</h3>
                </div>
                <form onSubmit={joinLeague} className="flex gap-2">
                  <input className="bg-black/40 border border-slate-700 p-3 rounded-xl flex-1 outline-none focus:border-blue-500" placeholder="League Name" value={searchLeague} onChange={(e) => setSearchLeague(e.target.value)} />
                  <button className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition">Join</button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold">My Active Leagues</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myLeagues.map(l => (
                  <div key={l.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center group hover:border-yellow-500/50 transition-colors">
                    <div>
                      <h4 className="text-lg font-bold text-yellow-500">{l.name}</h4>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{l.members.length} Members</p>
                    </div>
                    <button onClick={() => setView('dashboard')} className="p-2 rounded-full bg-slate-800 text-slate-400 group-hover:bg-yellow-500 group-hover:text-black transition-all"><Trophy size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;