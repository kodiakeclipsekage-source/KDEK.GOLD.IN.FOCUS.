import { h, Fragment, invalidate } from "./dom.js";
let generation = 0;
let toastTimer;
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileUp,
  CalendarDays,
  Settings,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Search,
  Download,
  Upload,
  ShieldCheck,
  Database,
  Check,
  Coins,
  Wallet,
  Clock3,
  X,
  Trash2,
  Pencil,
  LogOut,
  Menu,
  TriangleAlert,
  RefreshCw,
  KeyRound,
} from "./icons.js";
import {
  emptyLedger,
  snapshotSchema,
  mergeLedger,
  validateTransaction,
  canonical,
  dec,
  friendlyError,
} from "../shared/schema.js";
import { calculate } from "../shared/calculations.js";
import {
  firebaseConfigured,
  watchAuth,
  login,
  logout,
  loadLedger,
  updateLedger,
} from "./storage.js";
import {
  Field,
  Badge,
  Empty,
  Dialog,
  TransactionFields,
  SnapshotFields,
  TradeTable,
  units,
  now,
  num,
  dayLabel,
  uid,
  freshTransaction,
  freshSnapshot,
} from "./ui.js";
import { AiSettings, loadAiConfig, resetAiSettings } from "./ai.js";
import Importer, { resetImporter } from "./Importer.js";
const pages = [
  ["overview", "ภาพรวม", LayoutDashboard],
  ["transactions", "รายการซื้อ–ขาย", ArrowLeftRight],
  ["import", "นำเข้าเอกสาร", FileUp],
  ["daily", "สรุปรายวัน", CalendarDays],
  ["settings", "ตั้งค่า", Settings],
];
const errorText = (e) =>
  e?.code?.startsWith("auth/")
    ? "เข้าสู่ระบบไม่สำเร็จ (" + e.code + ")"
    : e?.code?.includes("permission")
      ? "ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาตรวจ Firestore Rules"
      : friendlyError(e);
const appState = {
  page: "overview",
  user: null,
  ledger: emptyLedger(),
  ready: false,
  busy: false,
  toast: null,
  editor: null,
  toDelete: null,
  mobile: false,
  prefs: { historyComplete: false, valuations: {} },
  authOpen: false,
  email: "",
  password: "",
  register: false,
};
function setPage(value) {
  appState.page = value;
  invalidate();
}
function setUser(value) {
  appState.user = value;
  invalidate();
}
function setLedger(value) {
  appState.ledger = value;
  invalidate();
}
function setReady(value) {
  appState.ready = value;
  invalidate();
}
function setBusy(value) {
  appState.busy = value;
  invalidate();
}
function setToast(value) {
  appState.toast = value;
  clearTimeout(toastTimer);
  if (value) toastTimer = setTimeout(() => setToast(null), 9e3);
  invalidate();
}
function setEditor(value) {
  appState.editor = value;
  invalidate();
}
function setToDelete(value) {
  appState.toDelete = value;
  invalidate();
}
function setMobile(value) {
  appState.mobile = value;
  invalidate();
}
function setPrefs(value) {
  appState.prefs = value;
  invalidate();
}
function setAuthOpen(value) {
  appState.authOpen = value;
  invalidate();
}
function setEmail(value) {
  appState.email = value;
  invalidate();
}
function setPassword(value) {
  appState.password = value;
  invalidate();
}
function setRegister(value) {
  appState.register = value;
  invalidate();
}
function App() {
  const {
    page,
    user,
    ledger,
    ready,
    busy,
    toast,
    editor,
    toDelete,
    mobile,
    prefs,
    authOpen,
    email,
    password,
    register,
  } = appState;
  const notify = (message, error = false) => setToast({ message, error });
  function savePrefs(next) {
    try {
      localStorage.setItem(
        "kodiak:prefs:" + (user?.uid || "device"),
        JSON.stringify(next),
      );
      setPrefs(next);
    } catch (e) {
      notify(errorText(e), true);
    }
  }
  async function mutate(fn, success) {
    if (!ready || busy) return false;
    const version = generation;
    setBusy(true);
    try {
      const next = await updateLedger(user, fn);
      if (version !== generation) return false;
      setLedger(next);
      notify(success);
      return true;
    } catch (e) {
      if (version === generation)
        setToast({ message: errorText(e), error: true });
      return false;
    } finally {
      if (version === generation) setBusy(false);
    }
  }
  const groups = calculate(ledger, prefs.historyComplete, prefs.valuations);
  const sorted = [...ledger.transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  async function saveEdit(e) {
    e.preventDefault();
    const value = editor.value;
    const errors =
      editor.kind === "snapshot"
        ? snapshotSchema.safeParse(value).success
          ? []
          : ["กรุณาตรวจสรุปรายวัน: ช่องจำเป็น หน่วย และตัวเลข"]
        : validateTransaction(value);
    if (errors.length) return notify(errors.join(" / "), true);
    const kind = editor.kind === "snapshot" ? "snapshots" : "transactions";
    const success = await mutate((current) => {
      const prior = current[kind].find((t) => t.id === value.id);
      if (
        editor.original &&
        (!prior || canonical(prior) !== canonical(editor.original))
      )
        throw new Error("รายการนี้ถูกเปลี่ยนจากที่อื่นแล้ว กรุณาโหลดหน้าใหม่");
      return mergeLedger(
        { ...current, [kind]: current[kind].filter((t) => t.id !== value.id) },
        { ...emptyLedger(), [kind]: [value] },
      ).data;
    }, "บันทึกรายการแล้ว");
    if (success) setEditor(null);
  }
  async function confirmImport(draft, source) {
    return mutate((current) => {
      const result = mergeLedger(current, draft);
      result.data.imports.push({
        id: uid(),
        at: new Date().toISOString(),
        count: result.added,
        duplicates: result.duplicates,
        source,
        status: "confirmed",
      });
      return result.data;
    }, "ยืนยันนำเข้าแล้ว ข้ามรายการซ้ำที่เหมือนเดิมโดยอัตโนมัติ");
  }
  function exportJson() {
    const a = document.createElement("a");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" }),
    );
    a.href = url;
    a.download = "kodiak-ledger-" + now().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  const add = () =>
    setEditor({ kind: "transaction", value: freshTransaction() });
  const go = (p) => {
    if (p !== page) {
      resetImporter();
      resetTransactions();
      resetAiSettings();
      if (p === "settings") loadAiConfig();
    }
    setPage(p);
    setMobile(false);
  };
  return h(
    "div",
    { className: "app-shell" },
    h(
      "aside",
      { className: "sidebar " + (mobile ? "visible" : "") },
      h(
        "a",
        {
          className: "brand",
          href: "#",
          onClick: (e) => {
            e.preventDefault();
            go("overview");
          },
        },
        h("img", {
          className: "brand-mark",
          src: "/brand-badge.webp",
          alt: "KODIAK ECLIPSE KAGE",
          width: "57",
          height: "65",
        }),
        h("div", null, "KODIAK", h("span", null, "GOLD LEDGER")),
      ),
      h("div", { className: "workspace-label" }, "สมุดบันทึกส่วนบุคคล"),
      h(
        "nav",
        null,
        pages.map(([id, title, Icon]) =>
          h(
            "button",
            {
              key: id,
              "aria-current": page === id ? "page" : void 0,
              className: page === id ? "active" : "",
              onClick: () => go(id),
            },
            h(Icon, { size: 19 }),
            title,
            page === id && h("span", { className: "nav-dot" }),
          ),
        ),
      ),
      h(
        "div",
        { className: "sidebar-bottom" },
        h(
          "div",
          { className: "privacy-card" },
          h(ShieldCheck, { size: 22 }),
          h("strong", null, "ข้อมูลของคุณ อยู่กับคุณ"),
          h(
            "p",
            null,
            "เปิด PDF บนอุปกรณ์",
            h("br", null),
            "ตรวจทุกรายการก่อนบันทึก",
          ),
        ),
        h(
          "button",
          {
            className: "account",
            onClick: () => (user ? go("settings") : setAuthOpen(true)),
          },
          h("span", { className: "avatar" }, user ? "K" : "L"),
          h(
            "span",
            null,
            h("strong", null, user ? "บัญชีส่วนบุคคล" : "พื้นที่บนอุปกรณ์"),
            h(
              "small",
              null,
              user ? "Firebase · เข้าสู่ระบบแล้ว" : "เก็บในเบราว์เซอร์นี้",
            ),
          ),
          h(ChevronRight, { size: 15 }),
        ),
      ),
    ),
    h(
      "div",
      { className: "main-shell" },
      h(
        "header",
        { className: "topbar" },
        h(
          "div",
          null,
          h("img", {
            className: "mobile-brand",
            src: "/brand-badge.webp",
            alt: "KODIAK ECLIPSE KAGE",
            width: "40",
            height: "45",
          }),
          h(
            "button",
            {
              className: "icon-button mobile-menu",
              onClick: () => setMobile(!mobile),
              "aria-label": "เมนู",
            },
            h(Menu, { size: 21 }),
          ),
          h(
            "span",
            { className: "breadcrumb" },
            "สมุดบันทึกทองคำ ",
            h(ChevronRight, { size: 13 }),
            " ",
            h("strong", null, pages.find((p) => p[0] === page)[1]),
          ),
        ),
        h(
          "div",
          { className: "topbar-right" },
          h("span", { className: "date-top" }, dayLabel(now())),
          h(
            Badge,
            { tone: user ? "green" : "neutral" },
            h("span", { className: "status-dot" }),
            user ? "Firebase" : "บนอุปกรณ์",
          ),
        ),
      ),
      h(
        "main",
        null,
        h(
          "div",
          { className: "page-heading" },
          h(
            "div",
            null,
            h("div", { className: "eyebrow" }, "YOUR PERSONAL GOLD JOURNAL"),
            h(
              "h1",
              null,
              page === "overview"
                ? "ทุกการลงทุน เริ่มจากความชัดเจน"
                : pages.find((p) => p[0] === page)[1],
            ),
            h(
              "p",
              null,
              {
                overview: "ติดตามทองคำ ต้นทุน และทุกความเคลื่อนไหวในที่เดียว",
                transactions: "บันทึกให้ครบ ตรวจสอบได้ในทุกรายการ",
                import: "จากใบรายงาน สู่สมุดบันทึกของคุณ",
                daily: "ตรวจยอดยกมาและยอดคงเหลือตามเอกสาร",
                settings: "จัดการการเชื่อมต่อและพื้นที่เก็บข้อมูล",
              }[page],
            ),
          ),
          h(
            "div",
            { className: "heading-actions" },
            page === "overview" &&
              h(
                "button",
                { className: "button secondary", onClick: () => go("import") },
                h(Upload, { size: 16 }),
                "นำเข้าเอกสาร",
              ),
            ["overview", "transactions"].includes(page) &&
              h(
                "button",
                {
                  className: "button primary",
                  disabled: !ready || busy,
                  onClick: add,
                },
                h(Plus, { size: 17 }),
                "เพิ่มรายการ",
              ),
            page === "daily" &&
              h(
                "button",
                {
                  className: "button primary",
                  disabled: !ready || busy,
                  onClick: () =>
                    setEditor({ kind: "snapshot", value: freshSnapshot() }),
                },
                h(Plus, { size: 17 }),
                "เพิ่มสรุปรายวัน",
              ),
          ),
        ),
        !ready
          ? h(
              "div",
              { className: "panel loading" },
              h(RefreshCw, { size: 24 }),
              h("h3", null, "กำลังเปิดสมุดบันทึก"),
              h(
                "p",
                null,
                "หากโหลดไม่สำเร็จ ตรวจข้อความแจ้งเตือนและการเชื่อมต่อก่อนลองใหม่",
              ),
              h(
                "button",
                {
                  className: "button secondary",
                  onClick: () => location.reload(),
                },
                "โหลดใหม่",
              ),
            )
          : h(
              Fragment,
              null,
              page === "overview" &&
                h(
                  Fragment,
                  null,
                  h(
                    "section",
                    { className: "overview-banner" },
                    h(
                      "div",
                      null,
                      h(
                        "span",
                        { className: "banner-kicker" },
                        h("span", null),
                        " KODIAK / PERSONAL GOLD LEDGER",
                      ),
                      h(
                        "h2",
                        { lang: "en" },
                        "GOLD.",
                        h("br", null),
                        h("em", null, "IN FOCUS."),
                      ),
                      h(
                        "p",
                        null,
                        ledger.transactions.length
                          ? "ทุกตัวเลขคำนวณจากรายการที่คุณตรวจสอบแล้ว"
                          : "เริ่มต้นด้วยรายการแรก หรือนำเข้าใบรายงาน PDF ของคุณ",
                      ),
                      h(
                        "button",
                        {
                          onClick: () =>
                            go(
                              ledger.transactions.length
                                ? "transactions"
                                : "import",
                            ),
                        },
                        ledger.transactions.length
                          ? "ดูรายการทั้งหมด"
                          : "นำเข้าใบรายงาน",
                        h(ArrowUpRight, { size: 17 }),
                      ),
                    ),
                    h(
                      "div",
                      { className: "ledger-art", "aria-hidden": "true" },
                      h(
                        "span",
                        { className: "ledger-art-index" },
                        "01 / YOUR GOLD JOURNAL",
                      ),
                      h(
                        "div",
                        { className: "ledger-art-symbol" },
                        "Au",
                        h("span", null, "EVERY RECORD. EVERY DETAIL."),
                      ),
                      h(
                        "span",
                        { className: "art-caption" },
                        "KODIAK ECLIPSE KAGE",
                      ),
                    ),
                  ),
                  h(
                    "section",
                    { className: "stat-grid" },
                    h(
                      "div",
                      { className: "stat" },
                      h(
                        "div",
                        { className: "stat-top" },
                        "รายการทั้งหมด",
                        h(ArrowLeftRight, { size: 18 }),
                      ),
                      h(
                        "div",
                        { className: "stat-number" },
                        ledger.transactions.length,
                        h("small", null, "รายการ"),
                      ),
                      h(
                        "span",
                        { className: "stat-note" },
                        "ซื้อ ",
                        ledger.transactions.filter((t) => t.type === "buy")
                          .length,
                        " · ขาย ",
                        ledger.transactions.filter((t) => t.type === "sell")
                          .length,
                      ),
                    ),
                    h(
                      "div",
                      { className: "stat" },
                      h(
                        "div",
                        { className: "stat-top" },
                        "กลุ่มทองที่ติดตาม",
                        h(Coins, { size: 18 }),
                      ),
                      h(
                        "div",
                        { className: "stat-number" },
                        groups.length,
                        h("small", null, "กลุ่ม"),
                      ),
                      h(
                        "span",
                        { className: "stat-note" },
                        "แยกประเภท หน่วย และสกุลเงิน",
                      ),
                    ),
                    h(
                      "div",
                      { className: "stat" },
                      h(
                        "div",
                        { className: "stat-top" },
                        "กำไรที่เกิดขึ้นจริง",
                        h(Wallet, { size: 18 }),
                      ),
                      h(
                        "div",
                        { className: "stat-text" },
                        groups.length &&
                          groups.every((g) => g.realized !== null)
                          ? "ดูตามกลุ่มด้านล่าง"
                          : "ข้อมูลยังไม่เพียงพอ",
                      ),
                      h(
                        "span",
                        { className: "stat-note" },
                        "คำนวณต้นทุนเฉลี่ยถ่วงน้ำหนัก",
                      ),
                    ),
                    h(
                      "div",
                      { className: "stat" },
                      h(
                        "div",
                        { className: "stat-top" },
                        "นำเข้าล่าสุด",
                        h(Clock3, { size: 18 }),
                      ),
                      h(
                        "div",
                        { className: "stat-text" },
                        ledger.imports.length
                          ? dayLabel(ledger.imports.at(-1).at)
                          : "ยังไม่มีการนำเข้า",
                      ),
                      h(
                        "span",
                        { className: "stat-note" },
                        "ตรวจสอบก่อนบันทึกทุกครั้ง",
                      ),
                    ),
                  ),
                  h(
                    "section",
                    { className: "panel" },
                    h(
                      "div",
                      { className: "section-heading" },
                      h(
                        "div",
                        null,
                        h("h2", null, "ทองคำในสมุดบันทึก"),
                        h("p", null, "ยอดคงเหลือและต้นทุน แยกตามกลุ่มของคุณ"),
                      ),
                      h(
                        "span",
                        { className: "subtle-label" },
                        groups.length,
                        " กลุ่ม",
                      ),
                    ),
                    groups.length
                      ? h(
                          "div",
                          { className: "holdings-grid" },
                          groups.map((g) =>
                            h(
                              "div",
                              { className: "holding", key: g.key },
                              h(
                                "div",
                                { className: "holding-title" },
                                h(
                                  "span",
                                  { className: "gold-icon" },
                                  h(Coins, { size: 20 }),
                                ),
                                h(
                                  "div",
                                  null,
                                  h("strong", null, "ทอง ", g.goldType),
                                  h(
                                    "small",
                                    null,
                                    g.provider,
                                    " · ",
                                    g.currency,
                                  ),
                                ),
                                h(Badge, { tone: "neutral" }, units[g.unit]),
                              ),
                              h(
                                "div",
                                { className: "holding-weight" },
                                num(g.quantity, 4),
                                " ",
                                h("span", null, units[g.unit]),
                              ),
                              h(
                                "dl",
                                null,
                                h(
                                  "div",
                                  null,
                                  h("dt", null, "ต้นทุนคงเหลือ"),
                                  h(
                                    "dd",
                                    null,
                                    g.cost === null
                                      ? "ข้อมูลไม่เพียงพอ"
                                      : num(g.cost) + " " + g.currency,
                                  ),
                                ),
                                h(
                                  "div",
                                  null,
                                  h("dt", null, "กำไรที่เกิดขึ้นจริง"),
                                  h(
                                    "dd",
                                    null,
                                    g.realized === null
                                      ? "ข้อมูลไม่เพียงพอ"
                                      : num(g.realized) + " " + g.currency,
                                  ),
                                ),
                                h(
                                  "div",
                                  null,
                                  h("dt", null, "กำไรจากราคาประเมิน"),
                                  h(
                                    "dd",
                                    null,
                                    g.unrealized === null
                                      ? "ยังคำนวณไม่ได้"
                                      : num(g.unrealized) + " " + g.currency,
                                  ),
                                ),
                              ),
                              h(
                                Field,
                                {
                                  label:
                                    "ราคาประเมินต่อ" +
                                    units[g.unit] +
                                    " (" +
                                    g.currency +
                                    ")",
                                },
                                h("input", {
                                  "aria-label": "ราคาประเมิน " + g.goldType,
                                  placeholder: "ระบุราคาเพื่อประเมินมูลค่า",
                                  value: prefs.valuations[g.key] || "",
                                  onChange: (e) => {
                                    const v = e.target.value;
                                    if (!v || dec.safeParse(v).success)
                                      savePrefs({
                                        ...prefs,
                                        valuations: {
                                          ...prefs.valuations,
                                          [g.key]: v,
                                        },
                                      });
                                  },
                                }),
                              ),
                              g.warnings.map((w, i) =>
                                h(
                                  "p",
                                  { key: i, className: "inline-warning" },
                                  h(TriangleAlert, { size: 13 }),
                                  w,
                                ),
                              ),
                            ),
                          ),
                        )
                      : h(
                          Empty,
                          {
                            title: "ยังไม่มีทองคำในสมุดบันทึก",
                            action: h(
                              "button",
                              { className: "text-button", onClick: add },
                              "เพิ่มรายการแรก ",
                              h(ArrowUpRight, { size: 15 }),
                            ),
                          },
                          "เพิ่มรายการซื้อ–ขาย หรือเริ่มจากใบรายงานของคุณ",
                          h("br", null),
                          "ยอดทองและต้นทุนจะปรากฏที่นี่",
                        ),
                  ),
                  h(
                    "section",
                    { className: "panel" },
                    h(
                      "div",
                      { className: "section-heading" },
                      h(
                        "div",
                        null,
                        h("h2", null, "ความเคลื่อนไหวล่าสุด"),
                        h("p", null, "รายละเอียดการซื้อ–ขายที่คุณบันทึกไว้"),
                      ),
                      h(
                        "button",
                        {
                          className: "text-button",
                          onClick: () => go("transactions"),
                        },
                        "ดูทั้งหมด ",
                        h(ChevronRight, { size: 16 }),
                      ),
                    ),
                    sorted.length
                      ? h(TradeTable, {
                          rows: sorted.slice(0, 5),
                          onEdit: (t) =>
                            setEditor({
                              kind: "transaction",
                              value: { ...t },
                              original: t,
                            }),
                        })
                      : h(
                          "div",
                          { className: "compact-empty" },
                          h(ArrowLeftRight, { size: 20 }),
                          h("span", null, "ยังไม่มีรายการซื้อ–ขาย"),
                          h("span", null, "รายการแรกของคุณเริ่มได้ทุกเมื่อ"),
                        ),
                  ),
                  h(
                    "div",
                    { className: "footnote" },
                    h(ShieldCheck, { size: 15 }),
                    " PDF และรหัสผ่านเปิดบนอุปกรณ์ · ข้อมูลบนเครื่องไม่ซิงก์ขึ้น Firebase อัตโนมัติ",
                  ),
                ),
              page === "transactions" &&
                h(Transactions, {
                  ledger,
                  onEdit: (t) =>
                    setEditor({
                      kind: "transaction",
                      value: { ...t },
                      original: t,
                    }),
                  onDelete: (t) =>
                    setToDelete({ kind: "transactions", value: t }),
                  onAdd: add,
                }),
              page === "import" &&
                h(Importer, {
                  key: user?.uid || "device",
                  busy,
                  ledger,
                  user,
                  confirmImport,
                  notify,
                }),
              page === "daily" &&
                h(
                  "section",
                  { className: "panel" },
                  h(
                    "div",
                    { className: "section-heading" },
                    h(
                      "div",
                      null,
                      h("h2", null, "สรุปตามเอกสาร"),
                      h(
                        "p",
                        null,
                        "ยอดปิดเป็นภาพ ณ วันนั้น จึงไม่นำยอดแต่ละวันมาบวกสะสม",
                      ),
                    ),
                    h(
                      Badge,
                      { tone: "amber" },
                      ledger.snapshots.length,
                      " สรุป",
                    ),
                  ),
                  ledger.snapshots.length
                    ? h(
                        "div",
                        { className: "table-scroll" },
                        h(
                          "table",
                          null,
                          h(
                            "thead",
                            null,
                            h(
                              "tr",
                              null,
                              h("th", null, "วันที่"),
                              h("th", null, "ทอง / ผู้ให้บริการ"),
                              h("th", null, "หน่วย / สกุลเงิน"),
                              h("th", { className: "right" }, "ยกมา"),
                              h("th", { className: "right" }, "คงเหลือ"),
                              h("th", { className: "right" }, "ราคาเฉลี่ยปิด"),
                              h("th", null),
                            ),
                          ),
                          h(
                            "tbody",
                            null,
                            [...ledger.snapshots]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((s) =>
                                h(
                                  "tr",
                                  { key: s.id },
                                  h("td", null, dayLabel(s.date)),
                                  h(
                                    "td",
                                    null,
                                    s.goldType,
                                    h("small", null, s.provider),
                                  ),
                                  h(
                                    "td",
                                    null,
                                    units[s.unit],
                                    h("small", null, s.currency),
                                  ),
                                  h(
                                    "td",
                                    { className: "right mono" },
                                    num(s.opening, 4),
                                  ),
                                  h(
                                    "td",
                                    { className: "right mono" },
                                    num(s.closing, 4),
                                  ),
                                  h(
                                    "td",
                                    { className: "right mono" },
                                    num(s.average),
                                  ),
                                  h(
                                    "td",
                                    null,
                                    h(
                                      "div",
                                      { className: "row-actions" },
                                      h(
                                        "button",
                                        {
                                          className: "icon-button",
                                          "aria-label": "แก้ไขสรุป " + s.date,
                                          onClick: () =>
                                            setEditor({
                                              kind: "snapshot",
                                              value: { ...s },
                                              original: s,
                                            }),
                                        },
                                        h(Pencil, { size: 15 }),
                                      ),
                                      h(
                                        "button",
                                        {
                                          className: "icon-button danger",
                                          "aria-label": "ลบสรุป " + s.date,
                                          onClick: () =>
                                            setToDelete({
                                              kind: "snapshots",
                                              value: s,
                                            }),
                                        },
                                        h(Trash2, { size: 15 }),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ),
                        ),
                      )
                    : h(
                        Empty,
                        { icon: CalendarDays, title: "ยังไม่มีสรุปรายวัน" },
                        "เพิ่มยอดยกมาและคงเหลือตามใบรายงาน",
                        h("br", null),
                        "ต้นทุนเฉลี่ยปิดไม่ใช่ต้นทุนเฉลี่ยยกมา",
                      ),
                ),
              page === "settings" &&
                h(
                  Fragment,
                  null,
                  h(
                    "div",
                    { className: "settings-grid" },
                    h(
                      "section",
                      { className: "panel" },
                      h(
                        "div",
                        { className: "section-heading" },
                        h(
                          "div",
                          null,
                          h(
                            "h2",
                            null,
                            h(Database, { size: 19 }),
                            " พื้นที่เก็บข้อมูล",
                          ),
                          h("p", null, "ข้อมูลบนอุปกรณ์และบัญชีแยกออกจากกัน"),
                        ),
                      ),
                      h(
                        "div",
                        { className: "panel-body" },
                        h(
                          "div",
                          { className: "connection-line" },
                          h(
                            "span",
                            { className: "connection-icon" },
                            h(ShieldCheck, { size: 22 }),
                          ),
                          h(
                            "div",
                            null,
                            h(
                              "strong",
                              null,
                              user
                                ? "เข้าสู่ระบบ Firebase แล้ว"
                                : "กำลังใช้พื้นที่บนอุปกรณ์",
                            ),
                            h(
                              "p",
                              null,
                              user
                                ? "อ่านและบันทึกภายใต้ UID ของบัญชีนี้"
                                : "ข้อมูลอยู่ในเบราว์เซอร์นี้ ควรส่งออกสำรองเป็นประจำ",
                            ),
                          ),
                        ),
                        !firebaseConfigured &&
                          h(
                            "div",
                            { className: "note" },
                            "Firebase ยังไม่ตั้งค่า เพิ่ม VITE_FIREBASE_* ใน .env แล้วเริ่ม server ใหม่",
                          ),
                        h(
                          "button",
                          {
                            className: "button secondary",
                            disabled: !firebaseConfigured || busy,
                            onClick: () =>
                              user
                                ? logout().catch((e) =>
                                    notify(errorText(e), true),
                                  )
                                : setAuthOpen(true),
                          },
                          user
                            ? h(LogOut, { size: 16 })
                            : h(KeyRound, { size: 16 }),
                          " ",
                          user ? "ออกจากระบบ" : "เข้าสู่ระบบ / สมัครบัญชี",
                        ),
                      ),
                    ),
                    h(
                      "section",
                      { className: "panel" },
                      h(
                        "div",
                        { className: "section-heading" },
                        h(
                          "div",
                          null,
                          h("h2", null, "สำรองสมุดบันทึก"),
                          h(
                            "p",
                            null,
                            "JSON เวอร์ชัน 1 พร้อมธุรกรรม สรุป และประวัตินำเข้า",
                          ),
                        ),
                      ),
                      h(
                        "div",
                        { className: "panel-body" },
                        h(
                          "p",
                          null,
                          "การนำเข้าจะเพิ่มรายการที่ยังไม่มี และแจ้งเมื่อพบเลขอ้างอิงเดิมที่มีข้อมูลต่างกัน",
                        ),
                        h(
                          "div",
                          { className: "button-row" },
                          h(
                            "button",
                            {
                              className: "button primary",
                              onClick: exportJson,
                            },
                            h(Download, { size: 16 }),
                            "ส่งออก JSON",
                          ),
                          h(
                            "button",
                            {
                              className: "button secondary",
                              onClick: () => go("import"),
                            },
                            h(Upload, { size: 16 }),
                            "นำเข้า JSON",
                          ),
                        ),
                      ),
                    ),
                  ),
                  h(
                    "section",
                    { className: "panel" },
                    h(
                      "div",
                      { className: "section-heading" },
                      h(
                        "div",
                        null,
                        h("h2", null, "ข้อมูลสำหรับการคำนวณ"),
                        h(
                          "p",
                          null,
                          "ใช้ต้นทุนเฉลี่ยถ่วงน้ำหนัก รวมค่าธรรมเนียมซื้อและขาย",
                        ),
                      ),
                    ),
                    h(
                      "div",
                      { className: "panel-body" },
                      h(
                        "label",
                        { className: "checkbox" },
                        h("input", {
                          type: "checkbox",
                          checked: prefs.historyComplete,
                          onChange: (e) =>
                            savePrefs({
                              ...prefs,
                              historyComplete: e.target.checked,
                            }),
                        }),
                        h(
                          "span",
                          null,
                          "ฉันยืนยันว่าบันทึกประวัติตั้งแต่เริ่มลงทุนครบ และเริ่มต้นจากยอดทองศูนย์",
                        ),
                      ),
                      h(
                        "p",
                        { className: "muted" },
                        "หากมีทองยกมา ให้เพิ่มสรุปรายวันพร้อมต้นทุนเฉลี่ยยกมาที่ทราบ ระบบจะไม่ใช้ราคาเฉลี่ยปิดแทนต้นทุนยกมา",
                      ),
                    ),
                  ),
                  h(AiSettings, { user }),
                  h(
                    "section",
                    { className: "panel" },
                    h(
                      "div",
                      { className: "section-heading" },
                      h(
                        "div",
                        null,
                        h("h2", null, "ประวัติการนำเข้า"),
                        h(
                          "p",
                          null,
                          "เก็บเฉพาะเวลา จำนวน และผล ไม่เก็บชื่อไฟล์หรือข้อความเอกสาร",
                        ),
                      ),
                    ),
                    ledger.imports.length
                      ? h(
                          "div",
                          { className: "history-list" },
                          [...ledger.imports]
                            .reverse()
                            .map((history) =>
                              h(
                                "div",
                                { key: history.id },
                                h(FileUp, { size: 17 }),
                                h(
                                  "span",
                                  null,
                                  dayLabel(history.at),
                                  h(
                                    "small",
                                    null,
                                    new Date(history.at).toLocaleTimeString(
                                      "th-TH",
                                      { timeZone: "Asia/Bangkok" },
                                    ),
                                    " · ",
                                    history.source.toUpperCase(),
                                  ),
                                ),
                                h(
                                  "strong",
                                  null,
                                  "เพิ่ม ",
                                  history.count,
                                  " รายการ",
                                ),
                                h(
                                  Badge,
                                  { tone: "neutral" },
                                  "ข้ามซ้ำ ",
                                  history.duplicates,
                                ),
                              ),
                            ),
                        )
                      : h(
                          "div",
                          { className: "compact-empty" },
                          "ยังไม่มีประวัติการนำเข้า",
                        ),
                  ),
                ),
            ),
        h(
          "footer",
          null,
          h("span", null, "KODIAK ", h("b", null, "GOLD LEDGER")),
          h("span", null, "สมุดบันทึกการลงทุนทองคำส่วนบุคคล"),
          h("span", { className: "studio-credit" }, "KDEK STUDIO."),
        ),
      ),
    ),
    toast &&
      h(
        "div",
        {
          role: toast.error ? "alert" : "status",
          className: "toast " + (toast.error ? "error" : ""),
        },
        h(
          "span",
          null,
          toast.error ? h(TriangleAlert, { size: 18 }) : h(Check, { size: 18 }),
        ),
        h("p", null, toast.message),
        h(
          "button",
          {
            className: "icon-button",
            onClick: () => setToast(null),
            "aria-label": "ปิดข้อความ",
          },
          h(X, { size: 16 }),
        ),
      ),
    editor &&
      h(
        Dialog,
        {
          title:
            editor.kind === "snapshot"
              ? "สรุปรายวันตามเอกสาร"
              : editor.original
                ? "แก้ไขรายการ"
                : "เพิ่มรายการซื้อ–ขาย",
          onClose: () => !busy && setEditor(null),
        },
        h(
          "form",
          { onSubmit: saveEdit },
          editor.kind === "snapshot"
            ? h(SnapshotFields, {
                value: editor.value,
                onChange: (value) => setEditor({ ...editor, value }),
              })
            : h(TransactionFields, {
                value: editor.value,
                onChange: (value) => setEditor({ ...editor, value }),
              }),
          h(
            "div",
            { className: "modal-footer" },
            h(
              "button",
              {
                type: "button",
                className: "button secondary",
                disabled: busy,
                onClick: () => setEditor(null),
              },
              "ยกเลิก",
            ),
            h(
              "button",
              { className: "button primary", disabled: busy },
              busy ? "กำลังบันทึก…" : "บันทึกรายการ",
            ),
          ),
        ),
      ),
    toDelete &&
      h(
        Dialog,
        { title: "ยืนยันลบรายการ", onClose: () => !busy && setToDelete(null) },
        h(
          "p",
          null,
          "ลบ ",
          toDelete.value.reference || toDelete.value.date,
          " ออกจากสมุดบันทึกนี้?",
        ),
        h(
          "div",
          { className: "modal-footer" },
          h(
            "button",
            {
              className: "button secondary",
              disabled: busy,
              onClick: () => setToDelete(null),
            },
            "ยกเลิก",
          ),
          h(
            "button",
            {
              className: "button destructive",
              disabled: busy,
              onClick: async () => {
                const ok = await mutate((current) => {
                  const prior = current[toDelete.kind].find(
                    (t) => t.id === toDelete.value.id,
                  );
                  if (!prior || canonical(prior) !== canonical(toDelete.value))
                    throw new Error("ข้อมูลเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่");
                  return {
                    ...current,
                    [toDelete.kind]: current[toDelete.kind].filter(
                      (t) => t.id !== toDelete.value.id,
                    ),
                  };
                }, "ลบรายการแล้ว");
                if (ok) setToDelete(null);
              },
            },
            "ลบรายการ",
          ),
        ),
      ),
    authOpen &&
      h(
        Dialog,
        {
          title: register ? "สร้างบัญชี Firebase" : "เข้าสู่ระบบ Firebase",
          onClose: () => !busy && setAuthOpen(false),
        },
        h(
          "form",
          {
            onSubmit: async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await login(email, password, register);
                setPassword("");
                setAuthOpen(false);
                notify("เข้าสู่ระบบแล้ว กำลังเปิดข้อมูลของบัญชีนี้");
              } catch (e2) {
                notify(errorText(e2), true);
              } finally {
                setBusy(false);
              }
            },
          },
          h(
            "div",
            { className: "note" },
            "ใช้ Email/Password Authentication ของโปรเจกต์ Firebase ที่ตั้งค่าไว้ ข้อมูลบนอุปกรณ์จะไม่ย้ายขึ้นบัญชีอัตโนมัติ",
          ),
          h(
            Field,
            { label: "อีเมล" },
            h("input", {
              autoComplete: "username",
              required: true,
              type: "email",
              value: email,
              onChange: (e) => setEmail(e.target.value),
            }),
          ),
          h(
            Field,
            { label: "รหัสผ่านบัญชี" },
            h("input", {
              required: true,
              autoComplete: register ? "new-password" : "current-password",
              type: "password",
              minLength: "6",
              value: password,
              onChange: (e) => setPassword(e.target.value),
            }),
          ),
          h(
            "div",
            { className: "modal-footer" },
            h(
              "button",
              {
                type: "button",
                className: "text-button",
                onClick: () => setRegister(!register),
              },
              register ? "มีบัญชีแล้ว" : "สมัครบัญชีใหม่",
            ),
            h(
              "button",
              {
                className: "button primary",
                disabled: busy || !firebaseConfigured,
              },
              busy
                ? "กำลังเชื่อมต่อ…"
                : register
                  ? "สร้างบัญชี"
                  : "เข้าสู่ระบบ",
            ),
          ),
        ),
      ),
  );
}
const transactionState = { q: "", type: "all", start: "", end: "" };
function setQ(value) {
  transactionState.q = value;
  invalidate();
}
function setType(value) {
  transactionState.type = value;
  invalidate();
}
function setStart(value) {
  transactionState.start = value;
  invalidate();
}
function setEnd(value) {
  transactionState.end = value;
  invalidate();
}
function resetTransactions() {
  Object.assign(transactionState, { q: "", type: "all", start: "", end: "" });
  invalidate();
}
function Transactions({ ledger, onEdit, onDelete, onAdd }) {
  const { q, type, start, end } = transactionState;
  const rows = [...ledger.transactions]
    .filter(
      (t) =>
        (type === "all" || t.type === type) &&
        (!start || t.date.slice(0, 10) >= start) &&
        (!end || t.date.slice(0, 10) <= end) &&
        [t.reference, t.provider, t.goldType, t.currency].some((v) =>
          v.toLowerCase().includes(q.toLowerCase()),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return h(
    "section",
    { className: "panel" },
    h(
      "div",
      { className: "filter-bar" },
      h(
        "div",
        { className: "search-field" },
        h(Search, { size: 17 }),
        h("input", {
          placeholder: "ค้นหาเลขอ้างอิง ประเภททอง…",
          "aria-label": "ค้นหารายการ",
          value: q,
          onChange: (e) => setQ(e.target.value),
        }),
      ),
      h(
        "select",
        {
          "aria-label": "กรองประเภทรายการ",
          value: type,
          onChange: (e) => setType(e.target.value),
        },
        h("option", { value: "all" }, "รายการทั้งหมด"),
        h("option", { value: "buy" }, "เฉพาะซื้อ"),
        h("option", { value: "sell" }, "เฉพาะขาย"),
      ),
      h(
        "label",
        { className: "date-filter" },
        "ตั้งแต่",
        h("input", {
          "aria-label": "ตั้งแต่วันที่",
          type: "date",
          value: start,
          onChange: (e) => setStart(e.target.value),
        }),
      ),
      h(
        "label",
        { className: "date-filter" },
        "ถึง",
        h("input", {
          "aria-label": "ถึงวันที่",
          type: "date",
          value: end,
          onChange: (e) => setEnd(e.target.value),
        }),
      ),
    ),
    h("div", { className: "result-count" }, "พบ ", rows.length, " รายการ"),
    rows.length
      ? h(TradeTable, { rows, onEdit, onDelete })
      : h(
          Empty,
          {
            icon: ArrowLeftRight,
            title: ledger.transactions.length
              ? "ไม่พบรายการที่ค้นหา"
              : "เริ่มบันทึกการลงทุนของคุณ",
            action:
              !ledger.transactions.length &&
              h(
                "button",
                { className: "button primary", onClick: onAdd },
                h(Plus, { size: 16 }),
                "เพิ่มรายการแรก",
              ),
          },
          "ซื้อหรือขาย บันทึกทุกรายละเอียดไว้ที่เดียว",
        ),
  );
}
function initApp() {
  const unsubscribe = watchAuth((u) => {
    const version = ++generation;
    setReady(false);
    setBusy(false);
    setLedger(emptyLedger());
    setUser(u);
    setEditor(null);
    setToDelete(null);
    setPage("overview");
    resetImporter();
    resetTransactions();
    resetAiSettings();
    setToast(null);
    const key = "kodiak:prefs:" + (u?.uid || "device");
    try {
      setPrefs(
        JSON.parse(localStorage.getItem(key) || "null") || {
          historyComplete: false,
          valuations: {},
        },
      );
    } catch {
      setPrefs({ historyComplete: false, valuations: {} });
    }
    loadLedger(u)
      .then((l) => {
        if (version === generation) {
          setLedger(l);
          setReady(true);
        }
      })
      .catch((e) => {
        if (version === generation)
          setToast({ message: errorText(e), error: true });
      });
  });
  return unsubscribe;
}
export { App, initApp };
