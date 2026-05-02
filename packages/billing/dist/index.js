"use strict";
// Re-export types and functions from credit-manager
// Note: This package needs access to the database schema from @smartekai/db
// For now, use this as a standalone credit tracking module
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEnoughCredits = exports.getCreditBalance = exports.addCreditsToOrg = exports.consumeCredits = void 0;
var credit_manager_1 = require("./credit-manager");
Object.defineProperty(exports, "consumeCredits", { enumerable: true, get: function () { return credit_manager_1.consumeCredits; } });
Object.defineProperty(exports, "addCreditsToOrg", { enumerable: true, get: function () { return credit_manager_1.addCreditsToOrg; } });
Object.defineProperty(exports, "getCreditBalance", { enumerable: true, get: function () { return credit_manager_1.getCreditBalance; } });
Object.defineProperty(exports, "hasEnoughCredits", { enumerable: true, get: function () { return credit_manager_1.hasEnoughCredits; } });
