// Lucide icon geometry (ISC / MIT). See public/licenses/lucide.txt.
function icon(name, geometry, { size = 24, strokeWidth = 2 } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [k, v] of Object.entries({
    xmlns: ns,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    class: "lucide lucide-" + name,
  }))
    svg.setAttribute(k, v);
  for (const [tag, attrs] of geometry) {
    const child = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs))
      if (k !== "key") child.setAttribute(k, v);
    svg.append(child);
  }
  return svg;
}
const LayoutDashboard = (props) =>
  icon(
    "layout-dashboard",
    [
      [
        "rect",
        { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" },
      ],
      [
        "rect",
        { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" },
      ],
      [
        "rect",
        { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" },
      ],
      [
        "rect",
        { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" },
      ],
    ],
    props,
  );
const ArrowLeftRight = (props) =>
  icon(
    "arrow-left-right",
    [
      ["path", { d: "M8 3 4 7l4 4", key: "9rb6wj" }],
      ["path", { d: "M4 7h16", key: "6tx8e3" }],
      ["path", { d: "m16 21 4-4-4-4", key: "siv7j2" }],
      ["path", { d: "M20 17H4", key: "h6l3hr" }],
    ],
    props,
  );
const FileUp = (props) =>
  icon(
    "file-up",
    [
      [
        "path",
        {
          d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
          key: "1rqfz7",
        },
      ],
      ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
      ["path", { d: "M12 12v6", key: "3ahymv" }],
      ["path", { d: "m15 15-3-3-3 3", key: "15xj92" }],
    ],
    props,
  );
const CalendarDays = (props) =>
  icon(
    "calendar-days",
    [
      ["path", { d: "M8 2v4", key: "1cmpym" }],
      ["path", { d: "M16 2v4", key: "4m81vk" }],
      [
        "rect",
        { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" },
      ],
      ["path", { d: "M3 10h18", key: "8toen8" }],
      ["path", { d: "M8 14h.01", key: "6423bh" }],
      ["path", { d: "M12 14h.01", key: "1etili" }],
      ["path", { d: "M16 14h.01", key: "1gbofw" }],
      ["path", { d: "M8 18h.01", key: "lrp35t" }],
      ["path", { d: "M12 18h.01", key: "mhygvu" }],
      ["path", { d: "M16 18h.01", key: "kzsmim" }],
    ],
    props,
  );
const Settings = (props) =>
  icon(
    "settings",
    [
      [
        "path",
        {
          d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
          key: "1i5ecw",
        },
      ],
      ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
    ],
    props,
  );
const Plus = (props) =>
  icon(
    "plus",
    [
      ["path", { d: "M5 12h14", key: "1ays0h" }],
      ["path", { d: "M12 5v14", key: "s699le" }],
    ],
    props,
  );
const ArrowUpRight = (props) =>
  icon(
    "arrow-up-right",
    [
      ["path", { d: "M7 7h10v10", key: "1tivn9" }],
      ["path", { d: "M7 17 17 7", key: "1vkiza" }],
    ],
    props,
  );
const ChevronRight = (props) =>
  icon(
    "chevron-right",
    [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]],
    props,
  );
const Search = (props) =>
  icon(
    "search",
    [
      ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
      ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
    ],
    props,
  );
const Download = (props) =>
  icon(
    "download",
    [
      ["path", { d: "M12 15V3", key: "m9g1x1" }],
      [
        "path",
        { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" },
      ],
      ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }],
    ],
    props,
  );
const Upload = (props) =>
  icon(
    "upload",
    [
      ["path", { d: "M12 3v12", key: "1x0j5s" }],
      ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
      [
        "path",
        { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" },
      ],
    ],
    props,
  );
const ShieldCheck = (props) =>
  icon(
    "shield-check",
    [
      [
        "path",
        {
          d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
          key: "oel41y",
        },
      ],
      ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
    ],
    props,
  );
const Database = (props) =>
  icon(
    "database",
    [
      ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
      ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
      ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }],
    ],
    props,
  );
const Check = (props) =>
  icon("check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], props);
const Coins = (props) =>
  icon(
    "coins",
    [
      ["circle", { cx: "8", cy: "8", r: "6", key: "3yglwk" }],
      ["path", { d: "M18.09 10.37A6 6 0 1 1 10.34 18", key: "t5s6rm" }],
      ["path", { d: "M7 6h1v4", key: "1obek4" }],
      ["path", { d: "m16.71 13.88.7.71-2.82 2.82", key: "1rbuyh" }],
    ],
    props,
  );
const Wallet = (props) =>
  icon(
    "wallet",
    [
      [
        "path",
        {
          d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
          key: "18etb6",
        },
      ],
      [
        "path",
        { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4", key: "xoc0q4" },
      ],
    ],
    props,
  );
const Clock3 = (props) =>
  icon(
    "clock-3",
    [
      ["path", { d: "M12 6v6h4", key: "135r8i" }],
      ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ],
    props,
  );
const X = (props) =>
  icon(
    "x",
    [
      ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
      ["path", { d: "m6 6 12 12", key: "d8bk6v" }],
    ],
    props,
  );
const Trash2 = (props) =>
  icon(
    "trash-2",
    [
      ["path", { d: "M10 11v6", key: "nco0om" }],
      ["path", { d: "M14 11v6", key: "outv1u" }],
      [
        "path",
        { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" },
      ],
      ["path", { d: "M3 6h18", key: "d0wm0j" }],
      ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }],
    ],
    props,
  );
const Pencil = (props) =>
  icon(
    "pencil",
    [
      [
        "path",
        {
          d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
          key: "1a8usu",
        },
      ],
      ["path", { d: "m15 5 4 4", key: "1mk7zo" }],
    ],
    props,
  );
const LogOut = (props) =>
  icon(
    "log-out",
    [
      ["path", { d: "m16 17 5-5-5-5", key: "1bji2h" }],
      ["path", { d: "M21 12H9", key: "dn1m92" }],
      ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
    ],
    props,
  );
const Menu = (props) =>
  icon(
    "menu",
    [
      ["path", { d: "M4 5h16", key: "1tepv9" }],
      ["path", { d: "M4 12h16", key: "1lakjw" }],
      ["path", { d: "M4 19h16", key: "1djgab" }],
    ],
    props,
  );
const TriangleAlert = (props) =>
  icon(
    "triangle-alert",
    [
      [
        "path",
        {
          d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
          key: "wmoenq",
        },
      ],
      ["path", { d: "M12 9v4", key: "juzpu7" }],
      ["path", { d: "M12 17h.01", key: "p32p05" }],
    ],
    props,
  );
const RefreshCw = (props) =>
  icon(
    "refresh-cw",
    [
      [
        "path",
        {
          d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
          key: "v9h5vc",
        },
      ],
      ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
      [
        "path",
        {
          d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
          key: "3uifl3",
        },
      ],
      ["path", { d: "M8 16H3v5", key: "1cv678" }],
    ],
    props,
  );
const KeyRound = (props) =>
  icon(
    "key-round",
    [
      [
        "path",
        {
          d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
          key: "1s6t7t",
        },
      ],
      [
        "circle",
        { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" },
      ],
    ],
    props,
  );
const FolderOpen = (props) =>
  icon(
    "folder-open",
    [
      [
        "path",
        {
          d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
          key: "usdka0",
        },
      ],
    ],
    props,
  );
const FileText = (props) =>
  icon(
    "file-text",
    [
      [
        "path",
        {
          d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
          key: "1rqfz7",
        },
      ],
      ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
      ["path", { d: "M10 9H8", key: "b1mrlr" }],
      ["path", { d: "M16 13H8", key: "t4e002" }],
      ["path", { d: "M16 17H8", key: "z1uh3a" }],
    ],
    props,
  );
const ChevronDown = (props) =>
  icon("chevron-down", [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]], props);
const Sparkles = (props) =>
  icon(
    "sparkles",
    [
      [
        "path",
        {
          d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
          key: "1s2grr",
        },
      ],
      ["path", { d: "M20 2v4", key: "1rf3ol" }],
      ["path", { d: "M22 4h-4", key: "gwowj6" }],
      ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }],
    ],
    props,
  );
const Link = (props) =>
  icon(
    "link",
    [
      [
        "path",
        {
          d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
          key: "1cjeqo",
        },
      ],
      [
        "path",
        {
          d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
          key: "19qd67",
        },
      ],
    ],
    props,
  );
const ArrowDownLeft = (props) =>
  icon(
    "arrow-down-left",
    [
      ["path", { d: "M17 7 7 17", key: "15tmo1" }],
      ["path", { d: "M17 17H7V7", key: "1org7z" }],
    ],
    props,
  );
export {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coins,
  Database,
  Download,
  FileText,
  FileUp,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Link,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Wallet,
  X,
};
