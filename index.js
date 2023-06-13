const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;
// middle ware
app.use(cors());
app.use(express.json());

// verify token

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const e = require("express");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.16yxiu9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("RainbowFeastDB").collection("users");
    const menuCollection = client.db("RainbowFeastDB").collection("menu");
    const reviewCollection = client.db("RainbowFeastDB").collection("reviews");
    const cartCollection = client.db("RainbowFeastDB").collection("carts");
    const bookingCollection = client.db("RainbowFeastDB").collection("bookings");
    const paymentCollection = client
      .db("RainbowFeastDB")
      .collection("payments");

    // SECURE APIS
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

    //user related apis

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };



    //menu related apis--------------------
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // admin related apis ---------------
    // add menu -----------
    app.post("/menu", verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    });
    
    // delete a menu----------
    app.delete("/menu/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // update a menu 
    app.patch('/update-recipe/:id', async(req,res)=>{
      const {updatedRecipe} = req.body;
      const id = req.params.id;
      console.log(updatedRecipe)
      const query = {_id:new ObjectId(id)};
      const updateDoc = {
        $set: {
          name:updatedRecipe.name,price:updatedRecipe.price,recipe:updatedRecipe.recipe
        },
      }; 
      const result = await menuCollection.updateOne(query,updateDoc);
      res.send(result)
    })



    //review related apis---------------

    // get reviews ---------
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // add review 
    app.post('/add-review', verifyJWT, async(req,res)=>{
      const review  = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    })

    // get all payment 
    app.get('/payments',verifyJWT,verifyAdmin, async(req,res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })

    // get all bookings
    app.get('/bookings',verifyJWT,verifyAdmin, async(req,res)=>{
      const result = await bookingCollection.find().toArray();
      res.send(result)
    })

    // update booking status 
    app.patch('/update-booking-status/:id', async(req,res)=>{
      const status = req.query.status;
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
         status:status
        },
      };
      const result = await bookingCollection.updateOne(query,updateDoc)
      res.send(result);
    })



    /**
     * 0. do not show secure links to those who should not see the links
     * 1. use jwt token: verifyJWT
     * 2. use verifyAdmin middleware
     */



    // get all users
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // add a user
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      // console.log(existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // check admin
    // secure layer verify jwt
    // email same
    // then check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // make admin users
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    

    // user related apis ---------------------------------
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/carts", async (req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // book a table 
    app.post('/book-table',verifyJWT, async(req,res)=>{
      const {table} = req.body;
      const result = await bookingCollection.insertOne(table);
      res.send(result);
    })
    // get bookings
    app.get('/my-bookings',verifyJWT, async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    // payment related api
    // create payment intent-----------------------
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // get payment history 
    app.get('/payment-history',verifyJWT, async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const result = await paymentCollection.find(query).sort({date:-1}).toArray();
      res.send(result)
    })

    // stats-----------

    // admin stats 
    app.get("/admin-stats",verifyJWT,verifyAdmin, async (req, res) => {
      const query = {role:"user"}
      const users = await userCollection.countDocuments(query);
      const products = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      //best way to get sum of a price field is to use group and sum operator
      /*
        await paymentCollection.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: '$price' }
            }
          }
        ]).toArray()
      */

        const payments = await paymentCollection.find().toArray();
        const revenue = (payments.reduce((sum,payment)=> sum + payment.price,0)).toFixed(2)


      res.send({
        revenue,
        users,
        products,
        orders,
      });
    });

    // user states-------
    app.get('/user-stats',verifyJWT,async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const orders = await paymentCollection.countDocuments(query);
      const reviews = await reviewCollection.countDocuments(query);
      const bookings = await bookingCollection.countDocuments(query);
      res.send({orders,reviews,bookings})
    })

     /**
     * ---------------
     * BANGLA SYSTEM(second best solution)
     * ---------------
     * 1. load all payments
     * 2. for each payment, get the menuItems array
     * 3. for each item in the menuItems array get the menuItem from the menu collection
     * 4. put them in an array: allOrderedItems
     * 5. separate allOrderedItems by category using filter
     * 6. now get the quantity by using length: pizzas.length
     * 7. for each category use reduce to get the total amount spent on this category
     * 
    */

     // use pipeline
     app.get('/order-stats', verifyJWT,verifyAdmin, async(req, res) =>{
      const pipeline = [
        {
          $addFields: {
            menuItemsObjectIds: {
              $map: {
                input: '$menuItems',
                as: 'itemId',
                in: { $toObjectId: '$$itemId' }
              }
            }
          }
        },
        {
          $lookup:{
            from:'menu', 
            localField:'menuItemsObjectIds',
            foreignField:'_id',
            as:'menuItemsData'
          }
        },
        {
          $unwind: '$menuItemsData'
        },
        {
          $group: {
            _id: '$menuItemsData.category',
            count: { $sum: 1 },
            total: { $sum: '$menuItemsData.price' }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            total: { $round: ['$total', 2] },
            _id: 0
          }
        }
      ];

      const result = await paymentCollection.aggregate(pipeline).toArray()
      console.log(result);
      res.send(result)

    })

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ insertResult, deleteResult });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Rainbow Feast in setting ");
});

app.listen(port, () => {
  console.log(`Rainbow Feast setting on port:${port}`);
});
