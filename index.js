const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const cors = require("cors");
const app = express();
require('dotenv').config()
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser")


const port = process.env.PORT || 5000;


// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        "https://blog-website-e0127.firebaseapp.com",
        "https://blog-website-e0127.web.app",
    ],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());


//create middleware instance
const logger = (req, res, next) => {
    // console.log('log info', req.method, req.url);
    next();
}

const verify = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log("token in the middle ware", token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorize access' });
    }
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorize access' });
        }
        req.user = decoded;
        next();
    })
};


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
        const commentCollection = await client.db('blogsDB').collection('comment')


        //jwt token create
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '100000h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true })
        })

        // clear cookies
        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log(user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        // all blogs post collections
        app.post('/allBlogs', async (req, res) => {
            const blog = req.body;
            console.log(req.body.email);
            const result = await allBlogsCollection.insertOne(blog)
            res.send(result)
        })

        // recent and all blogs collection
        //All blogs filter by category and search
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

        app.put('/allBlogs/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;

            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedBlog = {
                $set: {
                    title: data.title,
                    category: data.category,
                    date: data.date,
                    time: data.time,
                    bl_st_details: data.bl_st_details,
                    bl_lg_details: data.bl_lg_details,
                    image: data.image,
                },
            };
            const result = await allBlogsCollection.updateOne(filter, updatedBlog, options)
            res.send(result)
        })



        // all blogs post in wishlist collections
        app.post('/wishlist', async (req, res) => {
            const cart = req.body;
            // console.log(req.body);
            const result = await wishlistCollection.insertOne(cart)
            res.send(result)
        })


        app.get('/wishlist', /* logger, verify, */ async (req, res) => {

            // if (req.user.email !== req.query.email) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const result = await wishlistCollection.find().toArray();
            res.send(result);
        })

        app.delete('/wishlist/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const result = await wishlistCollection.deleteOne(query);
            res.send(result)
        })


        //comment collection
        app.post('/comment', async (req, res) => {
            const comment = req.body;
            const result = await commentCollection.insertOne(comment);
            res.send(result)
        })

        app.get('/comment', async (req, res) => {
            const result = await commentCollection.find().toArray();
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