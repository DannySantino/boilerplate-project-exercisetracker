const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const Schema = mongoose.Schema
require('dotenv').config()
const dbUrl = process.env['MONGO_URI']

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [
    {
      _id: { id: false },
      description: String,
      duration: Number,
      date: String
    }
  ]
});

const User = mongoose.model("User", userSchema);

app.route("/api/users")
  .post((req, res) => {
    const user = new User({ username: req.body.username });
    user.save((err, data) => err ? res.json({ err }) : res.json({ "username": data.username, "_id": data._id }));
  })
  .get((req, res) => {
    User.find({}, 'username _id').exec((err, data) => err ? res.json({ err }) : res.json(data));
  });

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.body[":_id"] || req.params._id;
  const { description, duration, date } = req.body;
  let exercise = {
    description,
    duration: parseInt(duration),
    date: !date ? (new Date()).toDateString() : new Date(date).toDateString()
  };
  User.findById(id, (err, data) => {
    data.log.push(exercise);
    data.count = data.log.length;
    data.save((err, data) => {
      if (err) {
        res.json({ err });
      };
      let i = data.log.length - 1;
      res.json({
        "_id": data._id,
        "username": data.username,
        "description": data.log[i].description,
        "duration": data.log[i].duration,
        "date": data.log[i].date
      });
    });
  });
});

app.get("/api/users/:_id/logs", (req, res) => {
  const { _id: id } = req.params;
  let startDate = !req.query.from ? new Date(0) : new Date(req.query.from);
  let endDate = !req.query.to ? new Date() : new Date(req.query.to);
  let limit = req.query.limit;
  User.findById(id, (err, data) => {
    if (err) {
      res.json({ err });
    } else {
      if (req.query.from || req.query.to) {
        data.log = data.log.filter(e => {
          let d = new Date(e.date);
          return d >= startDate && d <= endDate;
        }).map(e => {
          return {
            description: e.description,
            duration: e.duration,
            date: new Date(e.date).toDateString()
          }
        });
      }
      if (limit) {
        data.log = data.log.slice(0, limit);
      };
      data.count = data.log.length;
      res.json(data);
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
