import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Send,
  CheckCircle,
  Clock,
  Flame,
  Building2,
  UserRound,
  ClipboardList,
  CalendarDays,
  LogOut,
  Trash2
} from "lucide-react";
import { hasSupabase, supabase } from "./lib/supabaseClient";

const statusOptions = [
  "Researching",
  "LinkedIn Sent",
  "Connected",
  "Follow-Up Sent",
  "Replied",
  "Meeting Booked",
  "Ghosted",
  "Not Interested"
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function heatClass(heat) {
  if (heat === "Hot") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (heat === "Warm") return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
  return "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

const fallbackCompanies = [
  {
    id: "demo-1",
    company: "BorgWarner",
    industry: "Auto Components",
    plants: "80+ sites",
    locations: "US, Germany, Italy",
    stage: "Outreach Active",
    heat: "Hot",
    trigger: "EV expansion / thermal management growth",
    next_action: "Follow up with VP Operations",
    notes: "Strong fit for material handling and line-side logistics."
  },
  {
    id: "demo-2",
    company: "Gentex",
    industry: "Automotive Electronics",
    plants: "10+ sites",
    locations: "Michigan, US",
    stage: "Discovery",
    heat: "Warm",
    trigger: "Automation and manufacturing optimization",
    next_action: "Prepare pilot use case",
    notes: "Good fit for repetitive manufacturing support."
  }
];

const fallbackContacts = [
  {
    id: "demo-c1",
    name: "Andrew Mickus",
    company: "BorgWarner",
    title: "Director Shared Services and Facilities",
    linkedin: "",
    email: "",
    status: "LinkedIn Sent",
    last_touch: todayISO(),
    next_follow_up: addDays(5),
    reply: "No",
    notes: "Potential facilities/ops angle."
  },
  {
    id: "demo-c2",
    name: "Neil Boehm",
    company: "Gentex",
    title: "COO & CTO",
    linkedin: "",
    email: "",
    status: "Connected",
    last_touch: todayISO(),
    next_follow_up: addDays(2),
    reply: "No",
    notes: "Strong senior target."
  }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [companies, setCompanies] = useState(fallbackCompanies);
  const [contacts, setContacts] = useState(fallbackContacts);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasSupabase || !session) return;
    loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);

    const [companiesResult, contactsResult, logsResult] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("outreach_log").select("*").order("created_at", { ascending: false })
    ]);

    if (!companiesResult.error) setCompanies(companiesResult.data || []);
    if (!contactsResult.error) setContacts(contactsResult.data || []);
    if (!logsResult.error) setLogs(logsResult.data || []);

    setLoading(false);
  }

  async function login(event) {
    event.preventDefault();

    if (!hasSupabase) {
      alert("Supabase is not connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
    }
  }

  async function logout() {
    if (hasSupabase) await supabase.auth.signOut();
    setSession(null);
  }

  async function logAction(contact, action) {
    const row = {
      log_date: todayISO(),
      contact: contact.name,
      company: contact.company,
      channel: action.includes("LinkedIn") || action === "Connected" ? "LinkedIn" : "Manual",
      action,
      notes: "Auto-logged from status update."
    };

    if (hasSupabase && session) {
      const { data } = await supabase.from("outreach_log").insert(row).select().single();
      if (data) setLogs((prev) => [data, ...prev]);
    } else {
      setLogs((prev) => [{ id: Date.now(), ...row }, ...prev]);
    }
  }

  async function updateStatus(contactId, newStatus) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    let nextFollowUp = contact.next_follow_up;
    let reply = contact.reply;

    if (newStatus === "LinkedIn Sent") nextFollowUp = addDays(5);
    if (newStatus === "Connected") nextFollowUp = addDays(2);
    if (newStatus === "Follow-Up Sent") nextFollowUp = addDays(7);
    if (newStatus === "Replied" || newStatus === "Meeting Booked") {
      nextFollowUp = null;
      reply = "Yes";
    }

    const updates = {
      status: newStatus,
      last_touch: todayISO(),
      next_follow_up: nextFollowUp,
      reply
    };

    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, ...updates } : c))
    );

    if (hasSupabase && session) {
      await supabase.from("contacts").update(updates).eq("id", contactId);
    }

    await logAction(contact, newStatus);
  }

  async function updateContactField(id, field, value) {
    setContacts((prev) =>
      prev.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact))
    );

    if (hasSupabase && session) {
      await supabase.from("contacts").update({ [field]: value }).eq("id", id);
    }
  }

  async function updateCompanyField(id, field, value) {
    setCompanies((prev) =>
      prev.map((company) => (company.id === id ? { ...company, [field]: value } : company))
    );

    if (hasSupabase && session) {
      await supabase.from("companies").update({ [field]: value }).eq("id", id);
    }
  }

  async function addContact() {
    const row = {
      name: "New Contact",
      company: companies[0]?.company || "",
      title: "Title",
      linkedin: "",
      email: "",
      status: "Researching",
      last_touch: null,
      next_follow_up: null,
      reply: "No",
      notes: ""
    };

    if (hasSupabase && session) {
      const { data } = await supabase.from("contacts").insert(row).select().single();
      if (data) setContacts((prev) => [data, ...prev]);
    } else {
      setContacts((prev) => [{ id: Date.now(), ...row }, ...prev]);
    }
  }

  async function addCompany() {
    const row = {
      company: "New Company",
      industry: "Auto Manufacturer / Supplier",
      plants: "Add plant count",
      locations: "Add locations",
      stage: "Researching",
      heat: "Cold",
      trigger: "Add recent trigger",
      next_action: "Find decision makers",
      notes: "Add fit rationale."
    };

    if (hasSupabase && session) {
      const { data } = await supabase.from("companies").insert(row).select().single();
      if (data) setCompanies((prev) => [data, ...prev]);
    } else {
      setCompanies((prev) => [{ id: Date.now(), ...row }, ...prev]);
    }
  }

  async function deleteContact(id) {
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (hasSupabase && session) {
      await supabase.from("contacts").delete().eq("id", id);
    }
  }

  const filteredContacts = contacts.filter((c) =>
    [c.name, c.company, c.title, c.status, c.notes]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const stats = useMemo(() => {
    return {
      accounts: companies.length,
      contacts: contacts.length,
      outreach: contacts.filter((c) => c.status !== "Researching").length,
      replies: contacts.filter((c) => c.status === "Replied" || c.status === "Meeting Booked").length,
      meetings: contacts.filter((c) => c.status === "Meeting Booked").length,
      due: contacts.filter((c) => c.next_follow_up && c.next_follow_up <= todayISO()).length
    };
  }, [companies, contacts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading CRM...
      </div>
    );
  }

  if (hasSupabase && !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-xl">
          <h1 className="text-2xl font-bold">Foundation GTM CRM</h1>
          <p className="text-slate-400 text-sm mt-2 mb-6">Private internal login for outreach tracking.</p>

          <label className="text-sm text-slate-400">Email</label>
          <input
            className="w-full mt-1 mb-4 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />

          <label className="text-sm text-slate-400">Password</label>
          <input
            className="w-full mt-1 mb-6 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          <button className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-2 font-medium">
            Log In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Foundation GTM Command Center</h1>
            <p className="text-slate-400 text-sm mt-1">
              Shared CRM for LinkedIn outreach into auto manufacturing.
            </p>
          </div>

          {hasSupabase && (
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-sm flex items-center gap-2 w-fit"
            >
              <LogOut size={16} />
              Log Out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Stat icon={<Building2 size={18} />} label="Accounts" value={stats.accounts} />
          <Stat icon={<UserRound size={18} />} label="Contacts" value={stats.contacts} />
          <Stat icon={<Send size={18} />} label="Outreach" value={stats.outreach} />
          <Stat icon={<CheckCircle size={18} />} label="Replies" value={stats.replies} />
          <Stat icon={<CalendarDays size={18} />} label="Meetings" value={stats.meetings} />
          <Stat icon={<Clock size={18} />} label="Due Today" value={stats.due} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-semibold">Contacts Workflow</h2>
                <p className="text-sm text-slate-400">
                  Change status here. The app auto-updates last touch, follow-up date, and outreach log.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={addContact}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2"
                >
                  <Plus size={16} />
                  Contact
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-3 pr-4">Name</th>
                    <th className="text-left py-3 pr-4">Company</th>
                    <th className="text-left py-3 pr-4">Title</th>
                    <th className="text-left py-3 pr-4">Status</th>
                    <th className="text-left py-3 pr-4">Last Touch</th>
                    <th className="text-left py-3 pr-4">Next Follow-Up</th>
                    <th className="text-left py-3 pr-4">LinkedIn</th>
                    <th className="text-left py-3 pr-4"></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-slate-800/70">
                      <td className="py-3 pr-4">
                        <input
                          value={contact.name || ""}
                          onChange={(e) => updateContactField(contact.id, "name", e.target.value)}
                          className="bg-transparent border-b border-slate-700 outline-none w-32"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          value={contact.company || ""}
                          onChange={(e) => updateContactField(contact.id, "company", e.target.value)}
                          className="bg-transparent border-b border-slate-700 outline-none w-36"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          value={contact.title || ""}
                          onChange={(e) => updateContactField(contact.id, "title", e.target.value)}
                          className="bg-transparent border-b border-slate-700 outline-none w-44"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <select
                          value={contact.status || "Researching"}
                          onChange={(e) => updateStatus(contact.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 outline-none"
                        >
                          {statusOptions.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 pr-4 text-slate-300">
                        {contact.last_touch || "—"}
                      </td>

                      <td className="py-3 pr-4 text-slate-300">
                        {contact.next_follow_up || "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <input
                          value={contact.linkedin || ""}
                          onChange={(e) => updateContactField(contact.id, "linkedin", e.target.value)}
                          placeholder="Paste URL"
                          className="bg-transparent border-b border-slate-700 outline-none w-28"
                        />
                      </td>

                      <td className="py-3 pr-4">
                        <button
                          onClick={() => deleteContact(contact.id)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <h2 className="text-xl font-semibold mb-2">Today’s Command Center</h2>
            <p className="text-sm text-slate-400 mb-4">Who needs attention next.</p>

            <div className="space-y-3">
              {contacts.filter((c) => c.next_follow_up && c.next_follow_up <= todayISO()).length === 0 && (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-400">
                  No follow-ups due today.
                </div>
              )}

              {contacts
                .filter((c) => c.next_follow_up && c.next_follow_up <= todayISO())
                .map((c) => (
                  <div key={c.id} className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                    <div className="font-medium">
                      {c.name} — {c.company}
                    </div>
                    <div className="text-sm text-slate-400">Follow up due today.</div>
                  </div>
                ))}

              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="font-semibold text-blue-300 mb-1">
                  Suggested Outreach Angle
                </div>
                <p className="text-sm text-slate-300">
                  For auto manufacturers, lead with labor constraints, flexible deployment,
                  line-side logistics, material handling, and pilot-friendly use cases.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-semibold">Target Accounts</h2>
              <p className="text-sm text-slate-400">
                Company intelligence for auto manufacturers and suppliers.
              </p>
            </div>

            <button
              onClick={addCompany}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <input
                      value={company.company || ""}
                      onChange={(e) => updateCompanyField(company.id, "company", e.target.value)}
                      className="text-lg font-semibold bg-transparent border-b border-slate-700 outline-none w-full"
                    />
                    <input
                      value={company.industry || ""}
                      onChange={(e) => updateCompanyField(company.id, "industry", e.target.value)}
                      className="text-sm text-slate-400 bg-transparent border-b border-slate-800 outline-none mt-1 w-full"
                    />
                  </div>

                  <span className={`px-2 py-1 rounded-full text-xs border ${heatClass(company.heat)}`}>
                    <Flame size={12} className="inline mr-1" />
                    {company.heat || "Cold"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <Info label="Plants" value={company.plants} />
                  <Info label="Locations" value={company.locations} />
                  <Info label="Stage" value={company.stage} />
                  <Info label="Trigger" value={company.trigger} />
                </div>

                <div className="mt-4 rounded-xl bg-slate-900 border border-slate-800 p-3">
                  <div className="text-xs text-slate-500 uppercase mb-1">Next Action</div>
                  <textarea
                    value={company.next_action || ""}
                    onChange={(e) => updateCompanyField(company.id, "next_action", e.target.value)}
                    className="text-sm bg-transparent outline-none w-full resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={18} />
            <h2 className="text-xl font-semibold">Automatic Outreach Log</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="text-left py-3 pr-4">Date</th>
                  <th className="text-left py-3 pr-4">Contact</th>
                  <th className="text-left py-3 pr-4">Company</th>
                  <th className="text-left py-3 pr-4">Channel</th>
                  <th className="text-left py-3 pr-4">Action</th>
                  <th className="text-left py-3 pr-4">Notes</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/70">
                    <td className="py-3 pr-4">{log.log_date || log.created_at?.slice(0, 10)}</td>
                    <td className="py-3 pr-4">{log.contact}</td>
                    <td className="py-3 pr-4">{log.company}</td>
                    <td className="py-3 pr-4">{log.channel}</td>
                    <td className="py-3 pr-4">{log.action}</td>
                    <td className="py-3 pr-4 text-slate-400">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {!hasSupabase && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-100 rounded-xl p-4 text-sm">
          Supabase is not connected yet. The app is running in demo mode.
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-slate-200">{value || "—"}</div>
    </div>
  );
}
