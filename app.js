(function () {
  "use strict";

  const displayEl = document.getElementById("display");
  const expressionEl = document.getElementById("expression");
  const keysEl = document.getElementById("keys");

  const OP_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  let current = "0";
  let stored = null;
  let pendingOp = null;
  let overwrite = true;
  let expressionText = "";

  function formatDisplay(value) {
    if (value === "Error") return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return "Error";
    const abs = Math.abs(n);
    const maxDigits = 12;
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
      return n.toExponential(6).replace(/\.?0+e/, "e");
    }
    const s = String(value);
    if (s.includes("e") || s.includes("E")) return String(n);
    const parts = s.split(".");
    const intPart = parts[0];
    const decPart = parts[1];
    if (intPart.replace("-", "").length > maxDigits) {
      return n.toExponential(6).replace(/\.?0+e/, "e");
    }
    const out = decPart !== undefined ? `${intPart}.${decPart.slice(0, maxDigits - intPart.length)}` : intPart;
    return out;
  }

  function updateView() {
    displayEl.textContent = formatDisplay(current);
    expressionEl.textContent = expressionText;
  }

  function setActiveOp(op) {
    keysEl.querySelectorAll(".key-op").forEach((btn) => {
      const v = btn.getAttribute("data-value");
      btn.classList.toggle("is-active", op !== null && v === op);
    });
  }

  function applyPending() {
    if (stored === null || pendingOp === null) return;
    const a = Number(stored);
    const b = Number(current);
    let result;
    switch (pendingOp) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      case "/":
        result = b === 0 ? NaN : a / b;
        break;
      default:
        return;
    }
    if (!Number.isFinite(result)) {
      current = "Error";
    } else {
      current = String(result);
      if (current.includes(".") && current.length > 15) {
        current = String(Number.parseFloat(Number(result).toPrecision(12)));
      }
    }
    stored = null;
    pendingOp = null;
    overwrite = true;
  }

  function inputDigit(d) {
    if (current === "Error") {
      current = "0";
      expressionText = "";
    }
    if (overwrite) {
      current = d;
      overwrite = false;
    } else if (current === "0" && d !== "0") {
      current = d;
    } else if (current.replace(".", "").replace("-", "").length < 12) {
      current += d;
    }
    updateView();
  }

  function inputDecimal() {
    if (current === "Error") {
      current = "0.";
      expressionText = "";
      overwrite = false;
      updateView();
      return;
    }
    if (overwrite) {
      current = "0.";
      overwrite = false;
    } else if (!current.includes(".")) {
      current += ".";
    }
    updateView();
  }

  function inputOperator(op) {
    if (current === "Error") return;
    if (stored !== null && pendingOp !== null && !overwrite) {
      applyPending();
      if (current === "Error") {
        expressionText = "";
        setActiveOp(null);
        updateView();
        return;
      }
    } else if (stored !== null && pendingOp !== null && overwrite) {
      pendingOp = op;
      expressionText = `${formatDisplay(stored)} ${OP_SYMBOL[op]}`;
      setActiveOp(op);
      updateView();
      return;
    }
    stored = current;
    pendingOp = op;
    overwrite = true;
    expressionText = `${formatDisplay(stored)} ${OP_SYMBOL[op]}`;
    setActiveOp(op);
    updateView();
  }

  function inputEquals() {
    if (current === "Error") return;
    if (stored !== null && pendingOp !== null) {
      const left = formatDisplay(stored);
      const sym = OP_SYMBOL[pendingOp];
      const right = formatDisplay(current);
      expressionText = `${left} ${sym} ${right} =`;
      applyPending();
      setActiveOp(null);
    } else {
      expressionText = "";
    }
    updateView();
  }

  function clearAll() {
    current = "0";
    stored = null;
    pendingOp = null;
    overwrite = true;
    expressionText = "";
    setActiveOp(null);
    updateView();
  }

  function toggleSign() {
    if (current === "Error" || overwrite) return;
    if (current === "0") return;
    if (current.startsWith("-")) {
      current = current.slice(1);
    } else {
      current = "-" + current;
    }
    updateView();
  }

  function percent() {
    if (current === "Error") return;
    const n = Number(current);
    if (!Number.isFinite(n)) return;
    current = String(n / 100);
    overwrite = true;
    updateView();
  }

  keysEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (!btn) return;
    const action = btn.getAttribute("data-action");

    switch (action) {
      case "digit":
        inputDigit(btn.getAttribute("data-value"));
        break;
      case "decimal":
        inputDecimal();
        break;
      case "operator":
        inputOperator(btn.getAttribute("data-value"));
        break;
      case "equals":
        inputEquals();
        break;
      case "clear":
        clearAll();
        break;
      case "sign":
        toggleSign();
        break;
      case "percent":
        percent();
        break;
      default:
        break;
    }
  });

  const keyMap = {
    Escape: () => clearAll(),
    c: () => clearAll(),
    C: () => clearAll(),
    Backspace: () => {
      if (current === "Error" || overwrite) return;
      if (current.length <= 1) {
        current = "0";
        overwrite = true;
      } else {
        current = current.slice(0, -1);
      }
      updateView();
    },
    Enter: () => inputEquals(),
    "=": () => inputEquals(),
    "+": () => inputOperator("+"),
    "-": () => inputOperator("-"),
    "*": () => inputOperator("*"),
    "/": () => inputOperator("/"),
    ".": () => inputDecimal(),
    ",": () => inputDecimal(),
    "%": () => percent(),
  };

  for (let d = 0; d <= 9; d++) {
    const ch = String(d);
    keyMap[ch] = () => inputDigit(ch);
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const fn = keyMap[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  });

  updateView();
})();
