"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbCars = exports.dbMedical = exports.dbLegal = exports.db = void 0;
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const schema = __importStar(require("./schema"));
function requireEnv(...names) {
    for (const name of names) {
        const value = process.env[name];
        if (value)
            return value;
    }
    throw new Error(`None of [${names.join(", ")}] is set`);
}
// Support separate databases per application
const legalSql = (0, serverless_1.neon)(requireEnv("DATABASE_LEGAL_URL", "DATABASE_URL"));
const medicalSql = (0, serverless_1.neon)(requireEnv("DATABASE_MEDICAL_URL", "DATABASE_URL"));
const carsSql = (0, serverless_1.neon)(requireEnv("DATABASE_NEONDB_SMARTEKAI"));
// Default database (uses DATABASE_URL or DATABASE_LEGAL_URL for backward compatibility)
const sql = (0, serverless_1.neon)(requireEnv("DATABASE_URL", "DATABASE_LEGAL_URL"));
exports.db = (0, neon_http_1.drizzle)({ client: sql, schema });
// Dedicated database connections
exports.dbLegal = (0, neon_http_1.drizzle)({ client: legalSql, schema });
exports.dbMedical = (0, neon_http_1.drizzle)({ client: medicalSql, schema });
exports.dbCars = (0, neon_http_1.drizzle)({ client: carsSql, schema });
