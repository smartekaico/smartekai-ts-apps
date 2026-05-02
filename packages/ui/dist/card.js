"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardFooter = CardFooter;
exports.CardTitle = CardTitle;
exports.CardAction = CardAction;
exports.CardDescription = CardDescription;
exports.CardContent = CardContent;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("./utils");
function Card({ className, size = "default", ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card", "data-size": size, className: (0, utils_1.cn)("group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl", className), ...props }));
}
function CardHeader({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-header", className: (0, utils_1.cn)("group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3", className), ...props }));
}
function CardTitle({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-title", className: (0, utils_1.cn)("font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm", className), ...props }));
}
function CardDescription({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-description", className: (0, utils_1.cn)("text-sm text-muted-foreground", className), ...props }));
}
function CardAction({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-action", className: (0, utils_1.cn)("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className), ...props }));
}
function CardContent({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-content", className: (0, utils_1.cn)("px-4 group-data-[size=sm]/card:px-3", className), ...props }));
}
function CardFooter({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "card-footer", className: (0, utils_1.cn)("flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3", className), ...props }));
}
