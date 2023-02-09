import express from "express";

import { errorHandler } from "./middleware";
import indexRouter from "./routers/index";
import fileRouter from "./routers/file";

const app = express();

app.use(express.json());
app.use("/", indexRouter);
app.use("/file", fileRouter);
app.use(errorHandler);

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
