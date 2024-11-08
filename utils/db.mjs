import * as pg from "pg";
const { Pool } = pg.default;

const connectionPool = new Pool({
  connectionString:
    "postgresql://postgres:9236_Thanate@localhost:5432/Personal_Blog_Project",
});

export default connectionPool;
