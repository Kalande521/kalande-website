import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://kalande521.github.io"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("KALANDE M-Pesa backend is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KALANDE backend running on port ${PORT}`);
});
