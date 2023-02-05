const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Start -->

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { json } = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log("Connected to Mongo");
});

mongoose.connection.on('error', (err) => {
  console.log("Error", err);
});

const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true }
});

const userModel = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});

const exerciseModel = mongoose.model('Exercise', exerciseSchema);

const logSchema = new Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  count: { type: Number },
  log: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
});

const logModel = mongoose.model('Log', logSchema);


app.post('/api/users', (req, res) => {
  let username = req.body['username'];
  let myResponse = {};
  myResponse["username"] = username;

  const newUser = new userModel({
    'username': username
  });

  newUser.save().then(result => {
    myResponse["_id"] = result["_id"];

    const newLog = new logModel({
      "username": result["_id"],
      "count": 0,
      "log": []
    });

    newLog.save()
      .then((data) => {
        // console.log("Successful");
        res.send(myResponse);
      });

  })
    .catch(err => {
      console.log(err);
    });
});

app.get('/api/users', (req, res) => {

  userModel.find().then(result => {
    res.send(result);
  }).
    catch(err => {
      res.status(400).json('No user found');
    });
});


app.post('/api/exercises', (req, res) => {

  const username = req.body.username;
  const description = req.body.description;
  const duration = Number(req.body.duration);
  const date = req.body.date;

  const newExercise = new exerciseModel({
    username,
    description,
    duration,
    date
  });

  newExercise.save()
    .then((data) => res.send(data))
    .catch(err => res.status(400).json('Error: ' + err));
});



app.post('/api/users/:_id/exercises', (req, res) => {

  let username = req.params._id;
  let description = req.body['description'];
  let duration = req.body['duration'];
  let date = req.body['date'];

  if (date === "") {
    date = new Date();
  }
  else {
    date = new Date(date);
  }

  let myResponse = {};

  myResponse["_id"] = '';
  myResponse["username"] = '';
  myResponse["date"] = date.toDateString();
  myResponse["duration"] = duration;
  myResponse["description"] = description;

  userModel.findById(username).then((data) => myResponse["username"] = data.username);

  const newExercise = new exerciseModel({
    username,
    description,
    duration,
    date
  });

  newExercise.save()
    .then((exerciseData) => {
      // console.log("Successful");

      logModel.findOneAndUpdate(
        { username: username },
        {
          $push: { log: exerciseData._id },
          $inc: { count: 1 }
        },
        function (err, response) {
          if (err) {
            res.json(err);
          }
          else {
            myResponse["_id"] = response._id;
            //res.json(response);
            res.send(myResponse);
          }
        })
    })
    .catch(err => res.status(400).json('Error: ' + err));
});

app.get('/api/users/:_id/logs', (req, res) => {

  let myResponse = {};

  logModel.findOne({ username: req.params._id })
    .populate("username", "username")
    .populate("log", "description duration date")
    .then(result => {
      myResponse["_id"] = result._id;
      myResponse["username"] = result.username.username;
      myResponse["count"] = result.count;

      let logArr = [];
      result.log.forEach(element => {
        let logRes = {};

        logRes["description"] = element.description;
        logRes["duration"] = element.duration;
        logRes["date"] = element.date.toDateString();

        logArr.push(logRes);
      });

      myResponse["log"] = logArr;

      res.send(myResponse);
    })
    .catch(err => {
      console.log(err);
    })

});

// End  <--


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
