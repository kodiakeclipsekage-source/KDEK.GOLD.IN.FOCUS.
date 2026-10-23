import { h, invalidate } from "./dom.js";
import { Sparkles, Link } from "./icons.js";
import { Field, Badge } from "./ui.js";
function getAiPrefs() {
  try {
    return (
      JSON.parse(localStorage.getItem("kodiak:ai") || "null") || {
        provider: "local",
        model: "",
        endpoint: "http://127.0.0.1:1234/v1",
      }
    );
  } catch {
    return {
      provider: "local",
      model: "",
      endpoint: "http://127.0.0.1:1234/v1",
    };
  }
}
async function requestAi(prefs, user, table, test = false) {
  const headers = { "Content-Type": "application/json" };
  if (user) headers.Authorization = "Bearer " + (await user.getIdToken());
  const res = await fetch("/api/ai", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...prefs, table, test }),
    signal: AbortSignal.timeout(125e3),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เรียก AI ไม่สำเร็จ");
  return data;
}
let settingsGeneration = 0;
const aiState = {
  prefs: getAiPrefs(),
  config: null,
  testing: false,
  result: "",
};
function setPrefs(value) {
  aiState.prefs = value;
  invalidate();
}
function setConfig(value) {
  aiState.config = value;
  invalidate();
}
function setTesting(value) {
  aiState.testing = value;
  invalidate();
}
function setResult(value) {
  aiState.result = value;
  invalidate();
}
function resetAiSettings() {
  settingsGeneration++;
  Object.assign(aiState, {
    prefs: getAiPrefs(),
    config: null,
    testing: false,
    result: "",
  });
  invalidate();
}
function AiSettings({ user }) {
  const { prefs, config, testing, result } = aiState;
  function update(k, v) {
    const next = { ...prefs, [k]: v };
    if (k === "provider") next.model = "";
    setPrefs(next);
    setResult("");
    localStorage.setItem("kodiak:ai", JSON.stringify(next));
  }
  return h(
    "section",
    { className: "panel" },
    h(
      "div",
      { className: "section-heading" },
      h(
        "div",
        null,
        h("h2", null, h(Sparkles, { size: 19 }), " ผู้ช่วย AI"),
        h(
          "p",
          null,
          "เลือกผู้ให้บริการเองทุกครั้ง ไม่มีการสลับหรือส่งต่ออัตโนมัติ",
        ),
      ),
      h(Badge, { tone: "neutral" }, "เลือกใช้ได้"),
    ),
    h(
      "div",
      { className: "panel-body" },
      h(
        "div",
        { className: "form-grid" },
        h(
          Field,
          { label: "ผู้ให้บริการ AI" },
          h(
            "select",
            {
              value: prefs.provider,
              onChange: (e) => update("provider", e.target.value),
            },
            h("option", { value: "local" }, "Local · LM Studio บนเครื่องนี้"),
            h("option", { value: "gemini" }, "Online · Gemini"),
            h("option", { value: "openai" }, "Online · OpenAI"),
            h("option", { value: "claude" }, "Online · Claude"),
          ),
        ),
        h(
          Field,
          {
            label: "ชื่อโมเดล",
            hint: "กรอก model ID ที่โหลดไว้หรือบัญชีของคุณมีสิทธิ์ใช้",
          },
          h("input", {
            placeholder: "กรอก model ID",
            value: prefs.model,
            onChange: (e) => update("model", e.target.value),
          }),
        ),
        prefs.provider === "local" &&
          h(
            Field,
            { label: "LM Studio endpoint" },
            h("input", {
              value: prefs.endpoint,
              onChange: (e) => update("endpoint", e.target.value),
            }),
          ),
      ),
      h(
        "div",
        { className: "note" },
        prefs.provider === "local"
          ? "ใช้เว็บที่รันบนคอมเดียวกับ LM Studio แล้ว Start Server ใน LM Studio ก่อนทดสอบ localhost บนมือถือหมายถึงมือถือ รุ่นนี้ไม่เชื่อม bridge HTTP จากเว็บที่โฮสต์ HTTPS"
          : "Online AI ต้องเข้าสู่ระบบ Firebase และตั้ง API Key ใน environment ของ backend ปุ่มทดสอบส่งเพียงตารางจำลอง 1 แถวที่ไม่มีข้อมูลจริง",
      ),
      h(
        "div",
        { className: "button-row" },
        h(
          "button",
          {
            className: "button secondary",
            disabled: testing || !prefs.model,
            onClick: async () => {
              const version = settingsGeneration;
              setTesting(true);
              setResult("กำลังทดสอบ…");
              try {
                const r = await requestAi(prefs, user, "", true);
                if (version !== settingsGeneration) return;
                setResult("ทดสอบการสร้างคำตอบและ schema สำเร็จ · " + r.model);
              } catch (e) {
                if (version === settingsGeneration) setResult(e.message);
              } finally {
                if (version === settingsGeneration) setTesting(false);
              }
            },
          },
          h(Link, { size: 16 }),
          testing ? "กำลังทดสอบ…" : "ทดสอบการเชื่อมต่อ",
        ),
        h(
          "span",
          { className: "muted" },
          config
            ? config[prefs.provider]
              ? prefs.provider === "local"
                ? "bridge พร้อมรับคำขอ · ยังต้องทดสอบโมเดล"
                : "ตั้ง key ฝั่ง server แล้ว · ยังต้องทดสอบ"
              : "ยังไม่ตั้งค่า / ปิดใช้งาน"
            : "กำลังตรวจ config…",
        ),
      ),
      result && h("div", { role: "status", className: "note" }, result),
    ),
  );
}
function loadAiConfig() {
  const version = settingsGeneration;
  fetch("/api/config")
    .then((r) => r.json())
    .then((config) => {
      if (version === settingsGeneration) setConfig(config);
    })
    .catch(() => {
      if (version === settingsGeneration) setResult("ติดต่อ backend ไม่ได้");
    });
}
export { AiSettings, getAiPrefs, loadAiConfig, requestAi, resetAiSettings };
