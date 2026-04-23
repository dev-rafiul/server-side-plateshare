const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://plate-shares.netlify.app",
      "https://curious-palmier-ba6203.netlify.app",
      /\.vercel\.app$/,
      /\.netlify\.app$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

// ─── MONGODB (cached connection for serverless) ───────────────────────────────
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.3o3pwj7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let isConnected = false;

async function connectDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("MongoDB connected!");
  }
  const db = client.db("plateShareDB");
  return {
    foodCollection: db.collection("foods"),
    foodRequestsCollection: db.collection("foodRequests"),
    usersCollection: db.collection("users"),
  };
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("PlateShare API Running ✅");
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get("/users", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch users" });
  }
});

app.get("/users/:email", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const user = await usersCollection.findOne({ email: req.params.email });
    res.send(user || {});
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch user" });
  }
});

app.put("/users/:email", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const result = await usersCollection.updateOne(
      { email: req.params.email },
      { $set: req.body },
      { upsert: true }
    );
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to update user" });
  }
});

// ─── FOODS ────────────────────────────────────────────────────────────────────
app.post("/add-food", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    const food = { ...req.body, food_status: "Available", created_at: new Date().toISOString() };
    const result = await foodCollection.insertOne(food);
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to add food" });
  }
});

app.get("/foods", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    const query = req.query.status ? { food_status: req.query.status } : {};
    const foods = await foodCollection.find(query).toArray();
    res.send(foods);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch foods" });
  }
});

app.get("/my-foods", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    if (!req.query.email) return res.status(400).send({ message: "Email is required" });
    const foods = await foodCollection.find({ donator_email: req.query.email }).toArray();
    res.send(foods);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch user foods" });
  }
});

app.get("/foods/:id", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    const food = await foodCollection.findOne({ _id: new ObjectId(req.params.id) });
    res.send(food);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch food" });
  }
});

app.put("/foods/:id", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    const result = await foodCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to update food" });
  }
});

app.delete("/foods/:id", async (req, res) => {
  try {
    const { foodCollection } = await connectDB();
    const result = await foodCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to delete food" });
  }
});

// ─── FOOD REQUESTS ────────────────────────────────────────────────────────────
app.post("/food-requests", async (req, res) => {
  try {
    const { foodRequestsCollection } = await connectDB();
    const request = { ...req.body, status: "pending", created_at: new Date().toISOString() };
    const result = await foodRequestsCollection.insertOne(request);
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to submit request" });
  }
});

// GET all requests (for dashboard stats)
app.get("/food-requests", async (req, res) => {
  try {
    const { foodRequestsCollection } = await connectDB();
    const requests = await foodRequestsCollection.find().toArray();
    res.send(requests);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch requests" });
  }
});

app.get("/food-requests/:foodId", async (req, res) => {
  try {
    const { foodRequestsCollection } = await connectDB();
    const requests = await foodRequestsCollection.find({ foodId: req.params.foodId }).toArray();
    res.send(requests);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch food requests" });
  }
});

app.put("/food-requests/:id", async (req, res) => {
  try {
    const { foodRequestsCollection } = await connectDB();
    const { status } = req.body;
    if (!status) return res.status(400).send({ message: "Status is required" });
    const result = await foodRequestsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } }
    );
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to update request" });
  }
});

// GET requests for foods owned by a specific donator
app.get("/myFoodRequests", async (req, res) => {
  try {
    const { foodCollection, foodRequestsCollection } = await connectDB();
    if (!req.query.email) return res.status(400).send({ message: "Email required" });
    const foods = await foodCollection.find({ donator_email: req.query.email }).toArray();
    const ids = foods.map((f) => f._id.toString());
    const requests = await foodRequestsCollection.find({ foodId: { $in: ids } }).toArray();
    res.send(requests);
  } catch (e) {
    console.error(e);
    res.status(500).send({ message: "Failed to fetch food requests" });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
