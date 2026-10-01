"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ASSET_CATEGORY, CAPITALISATION_THRESHOLD } from "@/lib/types";
import type { Settings } from "@/lib/types";
import { Avatar, Button, CategoryChip, Field, Select, Toggle } from "@/components/ui/primitives";
import { CloseButton, Modal } from "@/components/ui/overlay";
import { T } from "@/components/ui/motion";
import { php } from "@/lib/format";
import { PermissionDenied } from "./permission-denied";
import { useShell, type SettingsTab } from "./shell-context";

const NAV: { group: string; items: SettingsTab[] }[] = [
  { group: "Account", items: ["Profile", "Preferences", "Notifications", "Security"] },
  { group: "Organization", items: ["General", "Asset categories", "Members & roles"] },
];

export function SettingsModal() {
  const { settingsTab, openSettings } = useShell();
  const close = () => openSettings(null);
  const { state, dispatch, toast, me } = useStore();
  const router = useRouter();
  const [draft, setDraft] = useState<Settings>(state.settings);
  const [saving, setSaving] = useState(false);
  const [lastOpen, setLastOpen] = useState<SettingsTab | null>(null);
  if (settingsTab !== lastOpen) { setLastOpen(settingsTab); if (settingsTab && !lastOpen) setDraft(state.settings); }

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.settings);
  const tab = settingsTab ?? "Profile";
  const restricted = tab === "Security" || tab === "Members & roles" || (state.role === "custodian" && (tab === "General" || tab === "Asset categories"));

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      dispatch({ type: "settings", patch: draft });
      setSaving(false);
      toast({ title: tab === "Notifications" ? "Preferences saved" : "Changes saved", body: `${tab} settings updated`, tone: "good" });
    }, 650);
  };

  return (
    <Modal open={settingsTab !== null} onClose={close} label="Settings" className="w-[1150px] h-[832px] flex overflow-hidden">
      <nav className="w-[263px] shrink-0 border-r border-line bg-[#fbfcfd] flex flex-col px-5 pt-6 pb-5">
        <h2 className="text-[20px] font-semibold mb-4">Settings</h2>
        {NAV.map((g) => (
          <div key={g.group} className="mb-5">
            <p className="t-l1 text-ink-2 mb-2">{g.group}</p>
            {g.items.map((it) => (
              <button key={it} onClick={() => openSettings(it)}
                className={cn("relative w-full text-left h-[38px] px-2.5 rounded-lg t-b2 cursor-pointer transition-colors duration-[120ms]",
                  tab === it ? "text-brand-600 font-medium" : "text-ink hover:bg-tint")}>
                {tab === it && <motion.span layoutId="settings-nav" transition={T.spring} className="absolute inset-0 rounded-lg bg-brand-100/70" />}
                <span className="relative">{it}</span>
              </button>
            ))}
          </div>
        ))}
        <div className="mt-auto card-flat flex items-center gap-3 p-3">
          <Avatar src={me.avatar} name={me.name} size={32} />
          <div className="min-w-0">
            <p className="t-b2s truncate">{me.name}</p>
            <button className="text-[12px] text-brand-600 hover:underline cursor-pointer" onClick={() => { close(); dispatch({ type: "logout" }); router.replace("/login"); }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center px-7 h-[70px] border-b border-line shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h3 key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.state} className="text-[20px] font-semibold">{tab}</motion.h3>
          </AnimatePresence>
          <CloseButton onClick={close} className="ml-auto" />
        </header>
        <div className="flex-1 overflow-y-auto scroll-slim px-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T.swap} className="py-6">
              {restricted ? <div className="pt-16"><PermissionDenied what={tab} compact /></div>
                : tab === "Profile" ? <ProfileTab draft={draft} setDraft={setDraft} />
                : tab === "General" ? <GeneralTab draft={draft} setDraft={setDraft} />
                : tab === "Notifications" ? <NotifTab draft={draft} setDraft={setDraft} />
                : tab === "Asset categories" ? <CategoriesTab />
                : <PreferencesTab />}
            </motion.div>
          </AnimatePresence>
        </div>
        {!restricted && (
          <footer className="flex items-center gap-3 px-7 h-[72px] border-t border-line shrink-0">
            <AnimatePresence>{dirty && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 t-b3 text-warn-text"><span className="size-1.5 rounded-full bg-warn-solid" />Unsaved changes</motion.span>}</AnimatePresence>
            <Button className="ml-auto" variant="outline" onClick={() => { setDraft(state.settings); close(); }}>Cancel</Button>
            <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>{tab === "Notifications" ? "Save preferences" : "Save changes"}</Button>
          </footer>
        )}
      </div>
    </Modal>
  );
}

type TabProps = { draft: Settings; setDraft: (s: Settings) => void };

function Row({ title, sub, children, last }: { title: string; sub?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("flex items-center gap-6 py-4", !last && "border-b border-line")}>
      <div className="flex-1"><p className="t-b2s">{title}</p>{sub && <p className="t-b3 text-ink-2 mt-0.5">{sub}</p>}</div>
      {children}
    </div>
  );
}

function ProfileTab({ draft, setDraft }: TabProps) {
  const { me, toast } = useStore();
  const p = draft.profile;
  const set = (k: keyof Settings["profile"]) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, profile: { ...p, [k]: e.target.value } });
  return (
    <div className="space-y-7">
      <section>
        <p className="text-[16px] font-medium">Photo</p>
        <p className="t-b3 text-ink-2">Shown on your custodian record and in the audit log.</p>
        <div className="flex items-center gap-4 mt-4">
          <Avatar src={me.avatar} name={me.name} size={64} />
          <Button onClick={() => toast({ title: "Photo upload is mocked in the prototype" })}>Change photo</Button>
          <Button variant="ghost">Remove</Button>
        </div>
      </section>
      <section>
        <p className="text-[16px] font-medium mb-3">Personal information</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Full name" value={p.name} onChange={set("name")} />
          <Field label="Work email" value={p.email} onChange={set("email")} />
          <Field label="Employee ID" value={me.id} readOnly />
          <Field label="Office" value={p.office} onChange={set("office")} />
          <Field label="Position" value={p.position} onChange={set("position")} />
          <Field label="Service / Division" value={p.division} onChange={set("division")} />
        </div>
      </section>
      <section>
        <p className="text-[16px] font-medium">Login</p>
        <Row title="Password" sub="Last changed Jan 12, 2026"><Button onClick={() => toast({ title: "Password reset email sent", tone: "good" })}>Change password</Button></Row>
        <Row title="Two-factor authentication" sub="Required for property custodians"><Toggle on={draft.twoFactor} onChange={(v) => setDraft({ ...draft, twoFactor: v })} label="Two-factor authentication" /></Row>
        <Row title="Active sessions" sub="Chrome on macOS • Safari on iPhone" last><Button onClick={() => toast({ title: "Signed out of 1 other session", tone: "good" })}>Sign out others</Button></Row>
      </section>
    </div>
  );
}

function GeneralTab({ draft, setDraft }: TabProps) {
  return (
    <div className="space-y-7">
      <section>
        <p className="text-[16px] font-medium">Agency</p>
        <p className="t-b3 text-ink-2 mb-4">These values appear on printed labels, PAR/ICS forms and exports.</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Agency name" defaultValue="Department of Science and Technology" />
          <Field label="Currency" defaultValue="Philippine Peso (₱)" />
          <Field label="Short name" defaultValue="DOST" />
          <Field label="Date format" defaultValue="Month D, YYYY  —  March 14, 2026" />
          <Field label="Primary office" defaultValue="DOST Central Office, Bicutan, Taguig" />
          <Field label="Fiscal year starts" defaultValue="January" />
        </div>
      </section>
      <section>
        <p className="text-[16px] font-medium">Asset rules</p>
        <Row title="Asset ID format" sub="DOST-YYYY-NNNN, assigned on registration"><Field className="w-[200px]" value="DOST-YYYY-NNNN" readOnly /></Row>
        <Row title="Depreciation method" sub="Applied monthly to every capital asset"><Field className="w-[200px]" defaultValue="Straight-line • 10 years" /></Row>
        <Row title="Capitalisation threshold" sub="Items below this are semi-expendable (ICS) — tracked, not depreciated"><Field className="w-[200px]" defaultValue={php(CAPITALISATION_THRESHOLD)} /></Row>
        <Row title="Require photo on registration" sub="Custodians must upload a photo when adding an asset" last><Toggle on={draft.requirePhoto} onChange={(v) => setDraft({ ...draft, requirePhoto: v })} label="Require photo" /></Row>
      </section>
    </div>
  );
}

function NotifTab({ draft, setDraft }: TabProps) {
  const groups: [string, string[]][] = [
    ["Assets", ["Damage reports", "Transfers", "Warranty expiring", "Repair updates"]],
    ["People & audits", ["Clearance", "Audit reminders"]],
  ];
  const subs: Record<string, string> = {
    "Damage reports": "When an asset you are custodian of is reported damaged", Transfers: "Approvals and completed transfers involving your office",
    "Warranty expiring": "30 days before a warranty lapses", "Repair updates": "Status changes on work orders you opened",
    Clearance: "When a custodian in your office starts clearance", "Audit reminders": "Two weeks before a scheduled physical audit",
  };
  const set = (k: string, ch: "app" | "email", v: boolean) => setDraft({ ...draft, notify: { ...draft.notify, [k]: { ...draft.notify[k], [ch]: v } } });
  return (
    <div>
      <div className="flex justify-end gap-6 t-b3 text-ink-2 pr-1"><span className="w-[38px] text-center">In-app</span><span className="w-[38px] text-center">Email</span></div>
      {groups.map(([g, keys]) => (
        <section key={g} className="mb-4">
          <p className="text-[16px] font-medium mb-1">{g}</p>
          {keys.map((k) => (
            <Row key={k} title={k} sub={subs[k]}>
              <div className="flex gap-6"><Toggle on={draft.notify[k].app} onChange={(v) => set(k, "app", v)} label={`${k} in-app`} /><Toggle on={draft.notify[k].email} onChange={(v) => set(k, "email", v)} label={`${k} email`} /></div>
            </Row>
          ))}
        </section>
      ))}
      <p className="text-[16px] font-medium mb-1">Digest</p>
      <Row title="Daily summary" sub="One email with everything that changed" last>
        <Select className="w-[200px]" value={draft.digest} onChange={(v) => setDraft({ ...draft, digest: v })}
          options={["Weekdays • 8:00 AM", "Every day • 8:00 AM", "Mondays • 8:00 AM", "Off"].map((x) => ({ value: x, label: x }))} />
      </Row>
    </div>
  );
}

function CategoriesTab() {
  const { state } = useStore();
  return (
    <div className="grid grid-cols-2 gap-3">
      {ASSET_CATEGORY.map((c, i) => {
        const items = state.assets.filter((a) => a.category === c);
        return (
          <motion.div key={c} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...T.state, delay: i * 0.04 }} className="card-flat p-4 flex items-center gap-4">
            <CategoryChip category={c} />
            <div className="ml-auto text-right"><p className="t-b2s tnum">{items.length} assets</p><p className="t-b3 text-ink-2 tnum">{php(items.reduce((s, a) => s + a.cost, 0))}</p></div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PreferencesTab() {
  const [density, setDensity] = useState("Comfortable");
  const [motionPref, setMotionPref] = useState(true);
  return (
    <div>
      <Row title="Table density" sub="Rows are 48px comfortable or 40px compact">
        <Select className="w-[200px]" value={density} onChange={setDensity} options={["Comfortable", "Compact"].map((x) => ({ value: x, label: x }))} />
      </Row>
      <Row title="Interface motion" sub="Follows your system's reduced-motion setting when off"><Toggle on={motionPref} onChange={setMotionPref} label="Interface motion" /></Row>
      <Row title="Language" sub="Labels and printed forms" last><Select className="w-[200px]" value="English" onChange={() => {}} options={[{ value: "English", label: "English" }, { value: "Filipino", label: "Filipino" }]} /></Row>
    </div>
  );
}
