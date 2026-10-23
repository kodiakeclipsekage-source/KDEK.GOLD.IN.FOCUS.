// Small native DOM helpers. Views create elements; application state is explicit.
export const Fragment = Symbol("fragment");
let redraw = () => {};
let queued = false;
export function invalidate() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    redraw();
  });
}

export function h(tag, props, ...children) {
  props ||= {};
  const flat = children
    .flat(Infinity)
    .filter((v) => v !== null && v !== undefined && typeof v !== "boolean");
  if (tag === Fragment) return flat;
  if (typeof tag === "function")
    return tag({ ...props, children: flat.length === 1 ? flat[0] : flat });
  const node = document.createElement(tag);
  node._viewKey = props.key;
  node._viewProps = props;
  node._viewEvents = {};
  for (const [name, value] of Object.entries(props)) {
    if (
      name === "key" ||
      name === "children" ||
      value === undefined ||
      value === null
    )
      continue;
    if (name.startsWith("on")) {
      let event = name.slice(2).toLowerCase();
      if (
        event === "change" &&
        tag === "input" &&
        !["file", "checkbox", "radio"].includes(props.type)
      )
        event = "input";
      if (event === "change" && tag === "textarea") event = "input";
      node._viewEvents[event] = value;
    } else if (name === "value" || name === "checked") {
      // Set select values after options have been appended.
    } else if (name === "className") node.setAttribute("class", value);
    else if (name === "htmlFor") node.setAttribute("for", value);
    else if (value === false && !name.startsWith("aria-")) continue;
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of flat)
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  for (const name of ["value", "checked"])
    if (props[name] !== undefined) node[name] = props[name];
  attachEvents(node);
  return node;
}

function attachEvents(node) {
  node._viewListeners ||= {};
  for (const event of Object.keys(node._viewEvents || {})) {
    if (node._viewListeners[event]) continue;
    const listener = (e) => node._viewEvents[event]?.(e);
    node._viewListeners[event] = listener;
    node.addEventListener(event, listener);
  }
}

function compatible(a, b) {
  return (
    a.nodeType === b.nodeType &&
    a.nodeName === b.nodeName &&
    a._viewKey === b._viewKey
  );
}

// Update existing nodes so typing, file selections, scroll and open details survive.
function patch(node, next) {
  if (!compatible(node, next)) {
    node.replaceWith(next);
    return next;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.data !== next.data) node.data = next.data;
    return node;
  }
  for (const attr of [...node.attributes]) {
    if (
      node.tagName === "DETAILS" &&
      attr.name === "open" &&
      !("open" in (next._viewProps || {}))
    )
      continue;
    if (!next.hasAttribute(attr.name)) node.removeAttribute(attr.name);
  }
  for (const attr of next.attributes)
    if (node.getAttribute(attr.name) !== attr.value)
      node.setAttribute(attr.name, attr.value);
  node._viewEvents = next._viewEvents || {};
  node._viewProps = next._viewProps;
  node._closeDialog = next._closeDialog;
  attachEvents(node);
  const oldChildren = [...node.childNodes];
  const used = new Set();
  [...next.childNodes].forEach((child, index) => {
    let old = oldChildren[index];
    if (!old || used.has(old) || !compatible(old, child))
      old = oldChildren.find(
        (candidate) => !used.has(candidate) && compatible(candidate, child),
      );
    const current = old ? patch(old, child) : child;
    if (old) used.add(old);
    if (node.childNodes[index] !== current)
      node.insertBefore(current, node.childNodes[index] || null);
  });
  for (const old of oldChildren) if (!used.has(old)) old.remove();
  const props = next._viewProps || {};
  if (
    "value" in props &&
    node.type !== "file" &&
    node.value !== String(props.value ?? "")
  )
    node.value = props.value ?? "";
  if ("checked" in props) node.checked = props.checked;
  return node;
}

let previousFocus;
let activeDialog;
export function mount(root, view) {
  redraw = () => {
    const next = view();
    if (root.firstChild) patch(root.firstChild, next);
    else root.append(next);
    const dialog = root.querySelector('[role="dialog"]');
    if (dialog && (!activeDialog || !activeDialog.isConnected)) {
      previousFocus = document.activeElement;
      dialog.querySelector("input,select,button")?.focus();
    } else if (!dialog && activeDialog)
      previousFocus?.isConnected && previousFocus.focus();
    activeDialog = dialog;
  };
  document.addEventListener("keydown", (e) => {
    if (!activeDialog) return;
    if (e.key === "Escape") {
      e.preventDefault();
      activeDialog._closeDialog?.();
    }
    if (e.key !== "Tab") return;
    const controls = [
      ...activeDialog.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  });
  redraw();
}
