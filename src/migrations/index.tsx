// @ts-nocheck
import m001 from "./001.sql" with { type: "text" };
import m002 from "./002.sql" with { type: "text" };
import m003 from "./003.sql" with { type: "text" };

export default [
    m001,
    m002,
    m003
] as string[];