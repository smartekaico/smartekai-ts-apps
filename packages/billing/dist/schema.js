"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.organizations = exports.creditBuckets = void 0;
// Re-export schema from db package for billing package use
var db_1 = require("@smartekai/db");
Object.defineProperty(exports, "creditBuckets", { enumerable: true, get: function () { return db_1.creditBuckets; } });
Object.defineProperty(exports, "organizations", { enumerable: true, get: function () { return db_1.organizations; } });
Object.defineProperty(exports, "auditLogs", { enumerable: true, get: function () { return db_1.auditLogs; } });
