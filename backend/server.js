
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://kalande521.github.io"
}));

app.use(express.json());

const {
  DARAJA_CONSUMER_KEY,
  DARAJA_CONSUMER_SECRET,
  DARAJA_SHORTCODE,
  DARAJA_PASSKEY
} = process.env;

const BASE_URL = "https://sandbox.safaricom.co.ke";

app.get("/", (req, res) => {
  res.send("KALANDE M-Pesa backend is running!");
});

async function getAccessToken() {
  const credentials = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error("Could not authenticate with Daraja");
  }

  return data.access_token;
}

app.post("/api/mpesa/stkpush", async (req, res) => {
  try {
    if (
      !DARAJA_CONSUMER_KEY ||
      !DARAJA_CONSUMER_SECRET ||
      !DARAJA_SHORTCODE ||
      !DARAJA_PASSKEY
    ) {
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured"
      });
    }

    const { phone, amount } = req.body;

    if (
      typeof phone !== "string" ||
      !/^2547\d{8}$/.test(phone) ||
      !Number.isInteger(Number(amount)) ||
      Number(amount) < 1 ||
      Number(amount) > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Safaricom number and amount"
      });
    }

    const token = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`
    ).toString("base64");

    const response = await fetch(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          BusinessShortCode: DARAJA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Number(amount),
          PartyA: phone,
          PartyB: DARAJA_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: "https://kalande-mpesa.onrender.com/api/mpesa/callback",
          AccountReference: "KALANDE",
          TransactionDesc: "Website support payment"
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== "0") {
      return res.status(400).json({
        success: false,
        message: data.errorMessage || data.ResponseDescription || "STK Push failed"
      });
    }

    res.json({
      success: true,
      message: "STK Push sent. Check your phone.",
      checkoutRequestID: data.CheckoutRequestID,
      merchantRequestID: data.MerchantRequestID
    });

  } catch (error) {
    console.error("STK Push error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to start payment. Please try again."
    });
  }
});

app.post("/api/mpesa/callback", (req, res) => {
  console.log("M-Pesa callback:", JSON.stringify(req.body));

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KALANDE backend running on port ${PORT}`);
});
