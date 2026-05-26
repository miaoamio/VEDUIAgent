// src/engine/skills/block.helpers.ts
var isObject = (value) => typeof value === "object" && value !== null;

// src/engine/skills/table.skill.ts
var extractCellText = (value) => {
  if (value === null || value === void 0)
    return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isObject(value)) {
    const candidates = ["text", "tagText", "statusText", "label", "name", "value", "title", "status", "content"];
    for (const key of candidates) {
      const v = value[key];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        return String(v);
      }
    }
    return "";
  }
  return String(value);
};
var normalizeHeaderToken = (header) => String(header || "").trim().toLowerCase().replace(/[\s_]+/g, "");
var headerIncludes = (header, tokens) => {
  const normalized = normalizeHeaderToken(header);
  return tokens.some((token) => normalized.includes(token));
};
var columnHasActionText = (values) => {
  return values.some((value) => {
    const text = extractCellText(value);
    if (!text)
      return false;
    const normalized = String(text).trim().toLowerCase();
    return normalized.includes("\u7F16\u8F91") || normalized.includes("\u5220\u9664") || normalized.includes("\u67E5\u770B") || normalized.includes("\u8BE6\u60C5") || normalized.includes("\u66F4\u591A") || normalized.includes("\u914D\u7F6E") || normalized.includes("\u8BBE\u7F6E") || normalized.includes("\u542F\u7528") || normalized.includes("\u7981\u7528") || normalized.includes("\u91CD\u7F6E") || normalized.includes("\u4E0B\u8F7D") || normalized.includes("\u5BFC\u51FA") || normalized.includes("\u590D\u5236") || normalized.includes("\u66F4\u65B0") || normalized.includes("\u4FDD\u5B58") || normalized.includes("\u53D1\u5E03") || normalized.includes("\u64A4\u56DE") || normalized.includes("\u5BA1\u6838") || normalized.includes("\u901A\u8FC7") || normalized.includes("\u9A73\u56DE") || normalized.includes("\u62D2\u7EDD") || normalized.includes("\u5206\u914D") || normalized.includes("\u6388\u6743") || normalized.includes("\u89E3\u7ED1") || normalized.includes("\u7ED1\u5B9A") || normalized.includes("\u6253\u5F00") || normalized.includes("\u5173\u95ED") || normalized.includes("\u6682\u505C") || normalized.includes("\u6062\u590D") || normalized.includes("edit") || normalized.includes("delete") || normalized.includes("view") || normalized.includes("detail") || normalized.includes("more") || normalized.includes("config") || normalized.includes("setting") || normalized.includes("enable") || normalized.includes("disable") || normalized.includes("reset") || normalized.includes("download") || normalized.includes("export") || normalized.includes("copy") || normalized.includes("update") || normalized.includes("save") || normalized.includes("publish") || normalized.includes("revoke") || normalized.includes("approve") || normalized.includes("reject") || normalized.includes("assign") || normalized.includes("authorize") || normalized.includes("unbind") || normalized.includes("bind") || normalized.includes("open") || normalized.includes("close") || normalized.includes("pause") || normalized.includes("resume") || normalized.includes("action") || normalized.includes("operate");
  });
};
var columnHasTagObject = (values) => {
  return values.some((value) => {
    if (!isObject(value))
      return false;
    return Object.keys(value).some((key) => /tag|status|badge|state|level/i.test(key));
  });
};
var columnHasStatusText = (values) => {
  return values.some((value) => {
    const text = extractCellText(value);
    if (!text)
      return false;
    const normalized = String(text).trim().toLowerCase();
    return normalized.includes("\u6210\u529F") || normalized.includes("\u5931\u8D25") || normalized.includes("\u544A\u8B66") || normalized.includes("\u542F\u7528") || normalized.includes("\u7981\u7528") || normalized.includes("\u505C\u6B62") || normalized.includes("\u5904\u7406\u4E2D") || normalized.includes("\u7B49\u5F85") || normalized.includes("success") || normalized.includes("error") || normalized.includes("warning") || normalized.includes("pending") || normalized.includes("processing") || normalized.includes("disabled") || normalized.includes("enabled");
  });
};
var NUMBER_UNIT_HEADER_HINTS = [
  "\u7387",
  "\u5360\u6BD4",
  "\u6BD4\u4F8B",
  "\u767E\u5206\u6BD4",
  "\u6BD4\u7387",
  "\u540C\u6BD4",
  "\u73AF\u6BD4",
  "\u91D1\u989D",
  "\u4EF7\u683C",
  "\u5355\u4EF7",
  "\u603B\u4EF7",
  "\u8D39\u7528",
  "\u6210\u672C",
  "\u6536\u5165",
  "\u652F\u51FA",
  "\u5229\u6DA6",
  "\u6BDB\u5229",
  "\u51C0\u5229",
  "\u989D\u5EA6",
  "\u4F59\u989D",
  "\u65F6\u957F",
  "\u8017\u65F6",
  "\u5EF6\u8FDF",
  "\u5927\u5C0F",
  "\u5BB9\u91CF",
  "\u5185\u5B58",
  "\u78C1\u76D8",
  "\u6D41\u91CF",
  "\u5E26\u5BBD",
  "\u901F\u5EA6",
  "\u541E\u5410",
  "QPS",
  "TPS",
  "amount",
  "price",
  "cost",
  "revenue",
  "profit",
  "balance",
  "rate",
  "ratio",
  "percent",
  "percentage",
  "duration",
  "latency",
  "size",
  "memory",
  "disk",
  "storage",
  "bandwidth",
  "throughput"
];
var RATE_HEADER_HINTS = [
  "\u7387",
  "\u5360\u6BD4",
  "\u6BD4\u4F8B",
  "\u767E\u5206\u6BD4",
  "\u6BD4\u7387",
  "\u540C\u6BD4",
  "\u73AF\u6BD4",
  "rate",
  "ratio",
  "percent",
  "percentage"
];
var AMOUNT_HEADER_HINTS = [
  "\u91D1\u989D",
  "\u4EF7\u683C",
  "\u5355\u4EF7",
  "\u603B\u4EF7",
  "\u8D39\u7528",
  "\u6210\u672C",
  "\u6536\u5165",
  "\u652F\u51FA",
  "\u5229\u6DA6",
  "\u6BDB\u5229",
  "\u51C0\u5229",
  "\u989D\u5EA6",
  "\u4F59\u989D",
  "amount",
  "price",
  "cost",
  "revenue",
  "profit",
  "balance"
];
var isDateLikeText = (text) => {
  const normalized = text.trim();
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(normalized) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(normalized) || /^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized);
};
var isNumericLikeText = (value) => {
  if (typeof value === "number")
    return Number.isFinite(value);
  if (typeof value === "boolean" || value === null || value === void 0)
    return false;
  const raw = extractCellText(value).trim();
  if (!raw || isDateLikeText(raw))
    return false;
  let normalized = raw.replace(/\s+/g, "").replace(/^[¥￥$€£]/, "").replace(/^[+-]?\(/, "-").replace(/\)$/, "").replace(/,/g, "");
  normalized = normalized.replace(
    /(万元|亿元|万|亿|元|%|‰|bp|bps|个|人|次|件|台|天|小时|分钟|分|秒|年|月|周|kwh|kw|w|ms|s|kb|mb|gb|tb|cny|rmb|usd)$/i,
    ""
  );
  return /^[+-]?\d+(?:\.\d+)?$/.test(normalized);
};
var resolveTagColumnKind = (columnType, headerText) => {
  const normalized = String(columnType || "").trim().toLowerCase().replace(/[_\\s]+/g, "-");
  if (normalized.includes("type-tag") || normalized.includes("typetag"))
    return "type";
  if (normalized.includes("status-tag") || normalized.includes("statustag"))
    return "status";
  if (normalized.includes("status") || normalized.includes("state") || normalized.includes("badge"))
    return "status";
  const header = String(headerText || "").trim();
  if (header.includes("\u7C7B\u578B") || header.includes("\u5206\u7C7B") || header.includes("\u54C1\u7C7B"))
    return "type";
  return "status";
};
var inferColumnType = (header, values) => {
  const isActionHeader = headerIncludes(header, ["\u64CD\u4F5C", "action", "actions", "operation"]);
  if (isActionHeader || columnHasActionText(values))
    return "ActionText";
  const isUserHeader = headerIncludes(header, ["\u8D1F\u8D23\u4EBA", "\u521B\u5EFA\u4EBA", "\u6210\u5458", "\u7528\u6237", "\u59D3\u540D", "owner", "user", "member", "assignee"]);
  if (isUserHeader)
    return "Avatar";
  const isTagHeader = headerIncludes(header, ["\u72B6\u6001", "\u6807\u7B7E", "\u7C7B\u578B", "\u5206\u7C7B", "\u54C1\u7C7B", "\u7EA7\u522B", "status", "state", "tag", "type", "badge"]);
  const hasTagSignal = isTagHeader || columnHasTagObject(values) || columnHasStatusText(values);
  if (hasTagSignal) {
    const kind = resolveTagColumnKind("Tag", header);
    return kind === "type" ? "TypeTag" : "StatusTag";
  }
  const numberUnitMeta = inferNumberUnitColumnMeta(header, values);
  if (numberUnitMeta.shouldUse)
    return "Number(unit)";
  return "Text";
};
var normalizeNumberUnitLabel = (rawUnit) => {
  const unit = String(rawUnit || "").trim();
  if (!unit)
    return "";
  const upper = unit.toUpperCase();
  if (unit === "HK$" || upper === "HKD")
    return "\u6E2F\u5E01";
  if (unit === "US$" || upper === "USD")
    return "\u7F8E\u5143";
  if (unit === "\xA5" || unit === "\uFFE5")
    return "\u5143";
  if (upper === "CNY" || upper === "RMB" || upper === "CNH")
    return "\u5143";
  if (unit === "$")
    return "\u7F8E\u5143";
  if (unit === "\u20AC" || upper === "EUR")
    return "\u6B27\u5143";
  if (unit === "\xA3" || upper === "GBP")
    return "\u82F1\u9551";
  if (["B", "KB", "MB", "GB", "TB", "PB"].includes(upper))
    return upper;
  return unit;
};
var isNumberUnitValueLike = (parsed) => {
  const value = String(parsed.value || "").trim();
  if (!value)
    return false;
  return isNumericLikeText(value);
};
var parseNumberUnitCell = (rawValue) => {
  if (isObject(rawValue)) {
    const obj = rawValue;
    const explicitValue = extractCellText(obj.value ?? obj.number ?? obj.num ?? obj.amount);
    const explicitUnit = extractCellText(obj.unit ?? obj.suffix);
    if (explicitValue || explicitUnit) {
      return { value: explicitValue || "0", unit: explicitUnit };
    }
    const fallbackText = extractCellText(obj.text ?? obj.label ?? obj.content);
    rawValue = fallbackText;
  }
  const text = extractCellText(rawValue).trim();
  if (!text)
    return { value: "0", unit: "" };
  const prefixCurrencyMatch = text.match(/^(HK\$|US\$|[¥￥$€£])\s*([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (prefixCurrencyMatch) {
    const value2 = (prefixCurrencyMatch[2] || "").trim() || text;
    const trailingUnit = normalizeNumberUnitLabel(prefixCurrencyMatch[3] || "");
    const currencyUnit = normalizeNumberUnitLabel(prefixCurrencyMatch[1] || "");
    return { value: value2, unit: trailingUnit || currencyUnit };
  }
  const match = text.match(/^([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (!match)
    return { value: text, unit: "" };
  const value = (match[1] || "").trim() || text;
  const unit = normalizeNumberUnitLabel(match[2] || "");
  return { value, unit };
};
var inferNumberUnitColumnMeta = (header, values) => {
  const nonEmptyValues = values.filter((value) => String(extractCellText(value) || "").trim() !== "");
  if (nonEmptyValues.length === 0)
    return { shouldUse: false, textAlign: "right", defaultUnit: "" };
  const parsedValues = nonEmptyValues.map((value) => parseNumberUnitCell(value));
  const numericParsed = parsedValues.filter(isNumberUnitValueLike);
  const numericRatio = numericParsed.length / nonEmptyValues.length;
  const units = numericParsed.map((item) => normalizeNumberUnitLabel(item.unit)).filter((unit) => unit);
  const distinctUnits = Array.from(new Set(units));
  const hasExplicitUnit = distinctUnits.length > 0;
  const hasMixedUnits = distinctUnits.length > 1;
  const hasHeaderHint = headerIncludes(header, NUMBER_UNIT_HEADER_HINTS);
  const inferredDefaultUnit = distinctUnits.length === 1 ? distinctUnits[0] : headerIncludes(header, RATE_HEADER_HINTS) ? "%" : headerIncludes(header, AMOUNT_HEADER_HINTS) ? "\u5143" : "";
  if (hasMixedUnits && numericParsed.length >= 2 && numericRatio >= 0.6) {
    return { shouldUse: true, textAlign: "left", defaultUnit: "" };
  }
  if (hasExplicitUnit && numericParsed.length >= 1 && numericRatio >= 0.5) {
    return { shouldUse: true, textAlign: "right", defaultUnit: inferredDefaultUnit };
  }
  if (hasHeaderHint && numericParsed.length >= 1 && numericRatio >= 0.6) {
    return { shouldUse: true, textAlign: "right", defaultUnit: inferredDefaultUnit };
  }
  return { shouldUse: false, textAlign: "right", defaultUnit: "" };
};
var inferColumnTypesFromRows = (headers2, rows2, currentTypes) => {
  const normalizedTypes = Array.isArray(currentTypes) ? currentTypes.map((t) => String(t || "").trim()) : [];
  const hasExplicitNonText = normalizedTypes.some((t) => t && t.toLowerCase() !== "text");
  const allTextOrEmpty = normalizedTypes.every((t) => !t || t.toLowerCase() === "text");
  const shouldInferAll = !hasExplicitNonText && allTextOrEmpty;
  return headers2.map((header, index) => {
    const explicit = normalizedTypes[index];
    if (explicit && explicit.toLowerCase() !== "text")
      return explicit;
    if (!shouldInferAll && explicit && explicit.toLowerCase() === "text")
      return explicit;
    const columnValues = rows2.map((row) => row?.[index]);
    const inferred = inferColumnType(header, columnValues);
    return inferred || explicit || "Text";
  });
};

// repro-number-unit-infer.ts
var headers = ["ID", "\u5229\u7528\u7387", "\u5BB9\u91CF", "\u6210\u672C\u91D1\u989D"];
var rows = [
  ["ECS-2026-001", "78%", "100GB", "\xA52,345"],
  ["ECS-2026-002", "78%", "200GB", "\xA53,120"],
  ["ECS-2026-003", "78%", "50GB", "\xA51,890"]
];
console.log(JSON.stringify({
  inferred: inferColumnTypesFromRows(headers, rows, headers.map(() => "Text"))
}));
