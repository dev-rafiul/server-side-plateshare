const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://plate-shares.netlify.app",
      "https://curious-palmier-ba6203.netlify.app",
      "https://plateshare-server-mu.vercel.app",
      /\.vercel\.app$/,
      /\.netlify\.app$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.3o3pwj7.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db("plateShareDB");
    const foodCollection = db.collection("foods");
    const foodRequestsCollection = db.collection("foodRequests");
    const usersCollection = db.collection("users");

    // ─── USERS ────────────────────────────────────────────────────────────────

    // Get all users (for dashboard stats)
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    // Upsert user profile
    app.put("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const userData = req.body;
        const result = await usersCollection.updateOne(
          { email },
          { $set: userData },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update user" });
      }
    });

    // Get single user by email
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        res.send(user || {});
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // ─── FOODS ────────────────────────────────────────────────────────────────

    app.post("/add-food", async (req, res) => {
      try {
        const food = req.body;
        food.food_status = "Available";
        food.created_at = new Date().toISOString();
        const result = await foodCollection.insertOne(food);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add food" });
      }
    });

    app.get("/foods", async (req, res) => {
      try {
        const status = req.query.status;
        let query = {};
        if (status) query.food_status = status;
        const foods = await foodCollection.find(query).toArray();
        res.send(foods);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch foods" });
      }
    });

    app.get("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const food = await foodCollection.findOne({ _id: new ObjectId(id) });
        res.send(food);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch food" });
      }
    });

    app.put("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        const result = await foodCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update food" });
      }
    });

    app.delete("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to delete food" });
      }
    });

    app.get("/my-foods", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }
        const foods = await foodCollection
          .find({ donator_email: email })
          .toArray();
        res.send(foods);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch user foods" });
      }
    });

    // ─── FOOD REQUESTS ────────────────────────────────────────────────────────

    app.post("/food-requests", async (req, res) => {
      try {
        const request = req.body;
        request.status = "pending";
        request.created_at = new Date().toISOString();
        const result = await foodRequestsCollection.insertOne(request);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to submit request" });
      }
    });

    // Get ALL food requests (for dashboard stats)
    app.get("/food-requests", async (req, res) => {
      try {
        const requests = await foodRequestsCollection.find().toArray();
        res.send(requests);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch requests" });
      }
    });

    // Get requests for a specific food item
    app.get("/food-requests/:foodId", async (req, res) => {
      try {
        const foodId = req.params.foodId;
        const requests = await foodRequestsCollection.find({ foodId }).toArray();
        res.send(requests);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch food requests" });
      }
    });

    app.put("/food-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        if (!status)
          return res.status(400).send({ message: "Status is required" });
        const result = await foodRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update request" });
      }
    });

    // Get requests for foods owned by a specific user (donator)
    app.get("/myFoodRequests", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ message: "Email required" });

        const foods = await foodCollection
          .find({ donator_email: email })
          .toArray();
        const ids = foods.map((f) => f._id.toString());
        const requests = await foodRequestsCollection
          .find({ foodId: { $in: ids } })
          .toArray();

        res.send(requests);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch food requests" });
      }
    });

    console.log("All routes registered successfully!");
  } catch (e) {
    console.error("Database connection error:", e);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("PlateShare CRUD API Running ✅");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
