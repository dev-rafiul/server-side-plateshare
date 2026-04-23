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
      "http://localhost:3000",
      "https://plate-shares.netlify.app",
    ],
    credentials: true,
  })
);
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
    // await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db("plateShareDB");
    const foodCollection = db.collection("foods");
    const foodRequestsCollection = db.collection("foodRequests");

    app.post("/add-food", async (req, res) => {
      const food = req.body;
      food.food_status = "Available";
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    app.get("/foods", async (req, res) => {
      const status = req.query.status;
      let query = {};
      if (status) query.food_status = status;
      const foods = await foodCollection.find(query).toArray();
      res.send(foods);
    });

    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const food = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(food);
    });

    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/my-foods", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const foods = await foodCollection
        .find({ donator_email: email })
        .toArray();
      res.send(foods);
    });

    app.post("/food-requests", async (req, res) => {
      try {
        const request = req.body;
        request.status = "pending";
        const result = await foodRequestsCollection.insertOne(request);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to submit request" });
      }
    });

    app.get("/food-requests/:foodId", async (req, res) => {
      const foodId = req.params.foodId;
      const requests = await foodRequestsCollection.find({ foodId }).toArray();
      res.send(requests);
    });

    app.put("/food-requests/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      if (!status)
        return res.status(400).send({ message: "Status is required" });

      const result = await foodRequestsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );
      res.send(result);
    });

    app.get("/myFoodRequests", async (req, res) => {
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
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (e) {
    console.error(
      "An error occurred in the database connection or server routes:",
      e
    );
  }
}

run().catch(console.dir);

// Rot
app.get("/", (req, res) => {
  res.send("PlateShare CRUD API Running");
});

//server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});



