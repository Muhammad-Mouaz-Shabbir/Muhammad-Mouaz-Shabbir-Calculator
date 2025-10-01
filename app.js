(function () {
  "use strict";

  /**
   * Calculator State
   */
  const displayInput = document.getElementById("calc-display");
  const keypad = document.querySelector("nav[aria-label='Calculator keypad']");

  if (!displayInput || !keypad) return;

  let currentValue = ""; // the number currently being typed
  let previousValue = null; // previous operand as number
  let pendingOperator = null; // "+", "-", "×", "÷", "%"
  let justEvaluated = false; // used to allow chaining after equals
  let displayExpression = ""; // full expression shown to the user

  function formatNumberForDisplay(value) {
    if (value === "" || value === "-") return value;
    const num = Number(value);
    if (!Number.isFinite(num)) return "Error";
    // Limit precision to avoid long floats
    const rounded = Math.round(num * 1e12) / 1e12;
    return String(rounded);
  }

  function updateDisplay(text) {
    displayInput.value = text;
  }

  function clearAll() {
    currentValue = "";
    previousValue = null;
    pendingOperator = null;
    justEvaluated = false;
    displayExpression = "";
    updateDisplay(displayExpression);
  }

  function inputDigit(d) {
    if (justEvaluated) {
      // start a new expression when digit is pressed after equals
      currentValue = "";
      previousValue = null;
      pendingOperator = null;
      displayExpression = "";
      justEvaluated = false;
    }
    if (currentValue === "0") {
      currentValue = d; // replace leading zero
      // replace last digit in expression if last token is a single 0 not part of a larger number
      if (/(^|\s)0$/.test(displayExpression)) {
        displayExpression = displayExpression.replace(/0$/, d);
      } else {
        displayExpression += d;
      }
    } else {
      currentValue += d;
      displayExpression += d;
    }
    updateDisplay(displayExpression);
  }

  function inputDecimal() {
    if (justEvaluated) {
      currentValue = "0";
      displayExpression = "0";
      previousValue = null;
      pendingOperator = null;
      justEvaluated = false;
    }
    if (currentValue === "") {
      currentValue = "0.";
      displayExpression += (displayExpression && /\d$/.test(displayExpression) ? "." : "0.");
    } else if (!currentValue.includes(".")) {
      currentValue += ".";
      displayExpression += ".";
    }
    updateDisplay(displayExpression);
  }

  function toggleSign() {
    if (justEvaluated) {
      // toggle sign of result to start a new expression
      displayExpression = displayInput.value || "";
      currentValue = displayExpression;
      previousValue = null;
      pendingOperator = null;
      justEvaluated = false;
    }
    if (currentValue === "") {
      currentValue = "-"; // allow typing negative numbers
      displayExpression += "-";
    } else if (currentValue === "-") {
      currentValue = "";
      displayExpression = displayExpression.replace(/-$/, "");
    } else if (currentValue.startsWith("-")) {
      currentValue = currentValue.slice(1);
      // replace last number occurrence in expression by removing leading '-'
      displayExpression = displayExpression.replace(/(-)(\d+(?:\.\d+)?)$/, "$2");
    } else {
      currentValue = "-" + currentValue;
      displayExpression = displayExpression.replace(/(\d+(?:\.\d+)?)$/, "-$1");
    }
    updateDisplay(displayExpression);
  }

  function applyPercent() {
    // percent acts on current typed value; update expression to reflect the transformed number
    const targetStr = currentValue !== "" && currentValue !== "-" ? currentValue : (previousValue !== null ? String(previousValue) : "");
    if (!targetStr) return;
    const num = Number(targetStr);
    if (!Number.isFinite(num)) return;
    const result = num / 100;
    currentValue = String(result);
    // replace the last numeric token in expression with its percent value
    displayExpression = displayExpression.replace(/(-?\d+(?:\.\d+)?)(?!.*-?\d)/, formatNumberForDisplay(currentValue));
    updateDisplay(displayExpression);
    justEvaluated = false;
  }

  function commitPendingOperation() {
    if (pendingOperator === null || previousValue === null) return;
    const a = Number(previousValue);
    const b = Number(currentValue);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      displayExpression = "Error";
      updateDisplay(displayExpression);
      currentValue = "";
      previousValue = null;
      pendingOperator = null;
      return;
    }
    let result;
    switch (pendingOperator) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "×":
        result = a * b;
        break;
      case "÷":
        if (b === 0) {
          displayExpression = "Cannot divide by 0";
          updateDisplay(displayExpression);
          currentValue = "";
          previousValue = null;
          pendingOperator = null;
          return;
        }
        result = a / b;
        break;
      case "%":
        // If user sets % as binary op (rare), interpret as a % of b
        result = (a / 100) * b;
        break;
      default:
        result = b;
    }
    previousValue = result;
    currentValue = "";
    // Do not change the typed expression; only internal state and allow the display to continue showing expression
    updateDisplay(displayExpression);
  }

  function setOperator(op) {
    // Normalize minus sign for internal state but display pretty operator
    const displayOp = op === "-" ? "−" : op;

    // If user just pressed equals and then an operator, continue from result
    if (justEvaluated) {
      justEvaluated = false;
      currentValue = "";
      // Start new expression from the result shown
      displayExpression = formatNumberForDisplay(previousValue !== null ? previousValue : displayExpression);
      displayExpression += ` ${displayOp} `;
      pendingOperator = op;
      updateDisplay(displayExpression);
      return;
    }

    // If pressing operator first or replacing last operator
    if ((currentValue === "" || currentValue === "-") && previousValue === null) {
      // If the expression already ends with an operator, replace it
      if (/\s[+−×÷]%?\s$/.test(displayExpression)) {
        displayExpression = displayExpression.replace(/\s[+−×÷]%?\s$/, ` ${displayOp} `);
      } else if (displayExpression) {
        displayExpression += ` ${displayOp} `;
      }
      pendingOperator = op;
      updateDisplay(displayExpression);
      return;
    }

    // First operator after a number
    if (previousValue === null) {
      previousValue = Number(currentValue || "0");
      currentValue = "";
      pendingOperator = op;
      // Append operator to expression
      if (!/\s[+−×÷]\s$/.test(displayExpression)) {
        displayExpression += ` ${displayOp} `;
      } else {
        displayExpression = displayExpression.replace(/\s[+−×÷]\s$/, ` ${displayOp} `);
      }
      updateDisplay(displayExpression);
      return;
    }

    // Chaining: we already have previous + operator
    if (currentValue !== "" && currentValue !== "-") {
      // Complete current operation internally for left-to-right behavior
      commitPendingOperation();
    }
    // Append or replace operator visually
    if (/\s[+−×÷]\s$/.test(displayExpression)) {
      displayExpression = displayExpression.replace(/\s[+−×÷]\s$/, ` ${displayOp} `);
    } else {
      displayExpression += ` ${displayOp} `;
    }
    pendingOperator = op;
    updateDisplay(displayExpression);
  }

  function evaluate() {
    // Build tokens from the expression for left-to-right evaluation
    const expr = displayExpression.trim().replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    if (!expr) return;

    // Disallow ending with operator
    if (/[+\-*/]$/.test(expr)) {
      // Remove trailing operator for evaluation
      const trimmed = expr.replace(/[+\-*/]\s*$/, "");
      if (!trimmed) return;
      performEvaluation(trimmed);
    } else {
      performEvaluation(expr);
    }
  }

  function performEvaluation(expr) {
    try {
      // Tokenize by space to preserve negative numbers (we always space around operators)
      const tokens = expr.split(/\s+/);
      if (tokens.length === 0) return;
      let acc = parseFloat(tokens[0]);
      for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i];
        const right = parseFloat(tokens[i + 1]);
        if (!Number.isFinite(acc) || !Number.isFinite(right)) {
          throw new Error("Invalid number");
        }
        switch (op) {
          case "+":
            acc = acc + right;
            break;
          case "-":
            acc = acc - right;
            break;
          case "*":
            acc = acc * right;
            break;
          case "/":
            if (right === 0) throw new Error("Cannot divide by 0");
            acc = acc / right;
            break;
          default:
            throw new Error("Unknown operator");
        }
      }
      const resultStr = formatNumberForDisplay(String(acc));
      displayExpression = resultStr;
      updateDisplay(displayExpression);
      previousValue = acc;
      currentValue = "";
      pendingOperator = null;
      justEvaluated = true;
    } catch (e) {
      const msg = e && typeof e.message === "string" ? e.message : "Error";
      displayExpression = msg;
      updateDisplay(displayExpression);
      currentValue = "";
      previousValue = null;
      pendingOperator = null;
      justEvaluated = false;
    }
  }

  function handleButton(text, ariaLabel) {
    const label = ariaLabel || "";
    if (/^\d$/.test(text)) {
      inputDigit(text);
      return;
    }
    switch (text) {
      case ".":
        inputDecimal();
        return;
      case "C":
        clearAll();
        return;
      case "±":
        toggleSign();
        return;
      case "%":
        applyPercent();
        return;
      case "=":
        evaluate();
        return;
      case "+":
      case "−":
      case "×":
      case "÷":
        setOperator(text === "−" ? "-" : text);
        return;
      default:
        if (label === "Add") setOperator("+");
        else if (label === "Subtract") setOperator("-");
        else if (label === "Multiply") setOperator("×");
        else if (label === "Divide") setOperator("÷");
        else if (label === "Equals") evaluate();
        else if (label === "Decimal point") inputDecimal();
        break;
    }
  }

  // Event delegation for all buttons inside keypad
  keypad.addEventListener("click", function (e) {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName.toLowerCase() !== "button") return;
    handleButton(target.textContent?.trim() || "", target.getAttribute("aria-label") || "");
  });

  // Touch support: tap highlight already handled by CSS/Bootstrap; click is sufficient on mobile.

  // Initialize empty display
  updateDisplay("");
})();


