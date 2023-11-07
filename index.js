const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require("express");
const cors = require("cors");
const app = express();
require('dotenv').config()

const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fgd8wc9.mongodb.net/?retryWrites=true&w=majority`;

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

        const allBlogsCollection = await client.db('blogsDB').collection('allBlogs')
        const wishlistCollection = await client.db('blogsDB').collection('wishlist')


        // all blogs post collections
        app.post('/allBlogs', async (req, res) => {
            const blog = req.body;
            const result = await allBlogsCollection.insertOne(blog)
            res.send(result)
        })


        // recent and all blogs collection
        //All blogs filter by category
        app.get('/allBlogs', async (req, res) => {
            let queryObj = {};

            const category = req.query.category;
            const title = req.query.title;

            const titleResult = { title: { $regex: title, $options: 'i' } };

            if (category) {
                queryObj.category = category;
            }

            const result = await allBlogsCollection.find(queryObj, titleResult).sort({}).toArray();

            const data = result.sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.time}`);
                const dateB = new Date(`${b.date} ${b.time}`);
                return dateB - dateA;
            });

            res.send(data);
        })


        // all blogs post in wishlist collections
        app.post('/wishlist', async (req, res) => {
            const cart = req.body;
            const result = await wishlistCollection.insertOne(cart)
            res.send(result)
        })

        app.get('/wishlist', async (req, res) => {
            const result = await wishlistCollection.find().toArray();
            res.send(result);
        })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Blog website server run on port ${port}`)
})