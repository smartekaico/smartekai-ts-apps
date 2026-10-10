import * as schema from "./schema";
/** Lazy: importing this module never requires the env var; first use does. */
export declare function getDbCars(): import("drizzle-orm/neon-http").NeonHttpDatabase<typeof schema> & {
    $client: import("@neondatabase/serverless").NeonQueryFunction<false, false>;
};
export type CarsDatabase = ReturnType<typeof getDbCars>;
