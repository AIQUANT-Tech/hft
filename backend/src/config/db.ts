import { Sequelize } from "sequelize";
import config from "./environment.js";

const sequelize = new Sequelize(
  config.DATABASE.NAME!,
  config.DATABASE.USER!,
  config.DATABASE.PASSWORD!,
  {
    host: config.DATABASE.HOST,
    port: config.DATABASE.PORT,
    dialect: "mysql",

    logging: (msg) => {
      // Only log actual SQL error messages, not column names containing "error"
      if (
        msg.toLowerCase().includes("sql error") ||
        msg.toLowerCase().includes("mysql error") ||
        msg.toLowerCase().includes("syntax error")
      ) {
        console.error("Sequelize Error:", msg);
      }
    },

    pool: {
      max: config.NODE_ENV === "production" ? 20 : 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
