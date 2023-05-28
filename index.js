const express = require('express');
const cors = require('cors');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
// middle ware 
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.16yxiu9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("RainbowFeastDB").collection('menu');
    const reviewCollection = client.db('RainbowFeastDB').collection('reviews');
    const cartCollection = client.db('RainbowFeastDB').collection('carts');

    app.get('/menu', async(req,res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result)
    })
    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result)
    })

    // cart collection  apis
    app.get('/carts', async(req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([]);
      }
      else{
        const query = {email:email};
        const result = await cartCollection.find(query).toArray();
        res.send(result)
      }
    })
    app.post('/carts', async (req,res)=>{
      const item = req.body;
      console.log(item)
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id',)


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('Rainbow Feast in setting ')
})


app.listen(port,()=>{
    console.log(`Rainbow Feast setting on port:${port}`)
})