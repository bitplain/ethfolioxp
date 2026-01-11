"use client";

import { useState } from "react";

type Operator = "+" | "-" | "*" | "/" | null;

type CalcState = {
  display: string;
  pending: number | null;
  operator: Operator;
  resetDisplay: boolean;
};

const initialState: CalcState = {
  display: "0",
  pending: null,
  operator: null,
  resetDisplay: false,
};

function compute(a: number, b: number, op: Operator) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? 0 : a / b;
  return b;
}

export default function CalculatorApp() {
  const [state, setState] = useState<CalcState>(initialState);

  const inputDigit = (digit: string) => {
    setState((prev) => {
      if (prev.resetDisplay) {
        return { ...prev, display: digit, resetDisplay: false };
      }
      if (prev.display === "0" && digit !== ".") {
        return { ...prev, display: digit };
      }
      if (digit === "." && prev.display.includes(".")) {
        return prev;
      }
      return { ...prev, display: prev.display + digit };
    });
  };

  const setOperator = (op: Operator) => {
    setState((prev) => {
      const current = Number(prev.display);
      if (prev.pending === null) {
        return { ...prev, pending: current, operator: op, resetDisplay: true };
      }
      const nextValue = compute(prev.pending, current, prev.operator);
      return {
        ...prev,
        display: String(nextValue),
        pending: nextValue,
        operator: op,
        resetDisplay: true,
      };
    });
  };

  const handleEquals = () => {
    setState((prev) => {
      if (prev.pending === null || !prev.operator) {
        return prev;
      }
      const current = Number(prev.display);
      const nextValue = compute(prev.pending, current, prev.operator);
      return {
        display: String(nextValue),
        pending: null,
        operator: null,
        resetDisplay: true,
      };
    });
  };

  const clearAll = () => setState(initialState);

  const toggleSign = () => {
    setState((prev) => ({
      ...prev,
      display: String(Number(prev.display) * -1),
    }));
  };

  const percent = () => {
    setState((prev) => ({
      ...prev,
      display: String(Number(prev.display) / 100),
    }));
  };

  const buttons = [
    { label: "C", action: clearAll },
    { label: "±", action: toggleSign },
    { label: "%", action: percent },
    { label: "/", action: () => setOperator("/") },
    { label: "7", action: () => inputDigit("7") },
    { label: "8", action: () => inputDigit("8") },
    { label: "9", action: () => inputDigit("9") },
    { label: "*", action: () => setOperator("*") },
    { label: "4", action: () => inputDigit("4") },
    { label: "5", action: () => inputDigit("5") },
    { label: "6", action: () => inputDigit("6") },
    { label: "-", action: () => setOperator("-") },
    { label: "1", action: () => inputDigit("1") },
    { label: "2", action: () => inputDigit("2") },
    { label: "3", action: () => inputDigit("3") },
    { label: "+", action: () => setOperator("+") },
    { label: "0", action: () => inputDigit("0") },
    { label: ".", action: () => inputDigit(".") },
    { label: "=", action: handleEquals, wide: true },
  ];

  return (
    <div className="calculator">
      <div className="calculator-display">{state.display}</div>
      <div className="calculator-grid">
        {buttons.map((button) => (
          <button
            key={button.label}
            className={`xp-button calculator-button ${button.wide ? "wide" : ""}`}
            type="button"
            onClick={button.action}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
