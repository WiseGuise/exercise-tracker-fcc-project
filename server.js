const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require("path")
const app = express();
const port = process.env.PORT || 5000;
const User = require("./models/User")
const Exercise = require("./models/Exercise")

// regex for filtering input data for logs
const regex = {
  duration: /^\d+$/,
  date: /^\d{4}-\d{1,2}-\d{1,2}$/
}

app.use(cors( { optionsSuccessStatus: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html")
});

// Create mongodb connection
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true }
);
const connection = mongoose.connection;

// Verify mongodb connection
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});

/* User Story #1 -- You can POST to /api/users with form data username 
to create a new user. The returned response will be an object with username and _id properties. */

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if(!username){
    return res.send("Path 'username' is required.");
  }

  try{
    let user = await User.findOne({ username });
    if(user){
      return res.send('Username already taken.');
    }

    user = await new User({ username });
    await user.save();
    return res.json({ username, _id: user._id })

  } catch (e) {
    return res.send('Something went wrong');
  }
  return res.redirect('/');
})

/* User Story #2 -- You can make a GET request to /api/users 
to get an array of all users. Each element in the array is an object 
containing a user's username and _id. */

app.get("/api/users", async (req, res) => {
  const users = await User.find().select("_id username")
  return res.json(users)
})

/* User Story #3 -- You can POST to /api/users/:_id/exercises with 
form data description, duration, and optionally date. If no date is supplied, 
the current date will be used. The response returned will be the user object 
with the exercise fields added. */

app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body
  const { _id } = req.params
  try {
    if (!description) {
      return res.send("Description is required")
    } else if (!duration) {
      return res.send("Duration is required")
    } else if (!regex.duration.test(duration)) {
      return res.send("Duration property must be an integer")
    } else if (date == "") {
      date = new Date()
    }
    let user = await User.findOne({ _id })
    if (!user) {
      return res.send("User not registered in database")
    }
    let obj = {
      user: _id,
      duration: duration,
      description: description,
      date: date
    }
    
    const exercise = await new Exercise(obj)
    await exercise.save()
    console.log(user.username + " has been busy! Look what they did: " + exercise.description)
    return res.json({
      _id: _id,
      username: user.username,
      date: new Date(exercise.date).toDateString(),
      duration: exercise.duration,
      description: exercise.description
    })
  } catch (err) {
    return res.send(err)
  }
  return res.redirect("/")
})

/* User Story #4 -- You can make a GET request to /api/users/:_id/logs 
to retrieve a full exercise log of any user. The returned response will 
be the user object with a log array of all the exercises added. Each log 
item has the description, duration, and date properties. */

/* User Story #5 -- A request to a user's log (/api/users/:_id/logs) returns an object 
with a count property representing the number of exercises returned. */

/* User Story #6 -- You can add from, to and limit parameters to a /api/users/:_id/logs 
request to retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. 
limit is an integer of how many logs to send back. */


app.get("/api/users/:_id/logs", async (req, res) => {
  const { to, from, limit } = req.query
  try {
    User.findById(req.params._id, (async(err, user) => {
      if (!user) return res.json({
        count: 0,
        log: []
      })
      if (err) {
        return res.json({ error: err })
      }
      
      let log = await Exercise.find({ user: user._id }).select(["date", "description", "duration"])
      
/* User Story #5 -- A request to a user's log (/api/users/:_id/logs) returns an object 
with a count property representing the number of exercises returned. */
      
      log = log.map(({
        description,
        duration,
        date
      }) => {
        return ({
          count: log.length
        },        
        {
          description,
          duration,
          date: new Date(date).toDateString()
        })
      })
      
      if (regex.date.test(to)) {
        log = log.filter(ex => {
          return Date.parse(ex.date) <= Date.parse(to)
        })
      }
      
      if (regex.date.test(req.query.from)) {
        log = log.filter(ex => {
          return Date.parse(ex.date) >= Date.parse(req.query.from)
        })
      }
      
      log = log.slice(0, parseInt(limit) || log.length)
      
      const response = {
        user,
        count: log.length,
        log
      }
      // console.log(response)
      return res.json(response)
    }))
  } catch (err) {
    console.log("Error finding logs, check input provided", err)
  }
  
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});