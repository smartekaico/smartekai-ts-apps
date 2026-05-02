"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Label = Label;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("./utils");
function Label({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("label", { "data-slot": "label", className: (0, utils_1.cn)("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className), ...props }));
}
