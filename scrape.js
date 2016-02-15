var request = require('request');
var cheerio = require('cheerio');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
var moment = require('moment');

var mongoDBConnection;

var courtBookingArr = [];
var url = 'mongodb://localhost:27017/tennisApp';

var courtIDArray = [1,2]

var express = require('express');
var app = express();

var bookingTemplate = _.template(fs.readFileSync(__dirname + '/template/bookings.html').toString());

var findBookings = function(mongoDBConnection, callback) {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to tennisApp mongodb.");

    var cursor = db.collection('bookings').find();
    cursor.sort([['slotDt', 'asc'],['slotTime','asc']]);

    cursor.toArray(function(err, results){
     //console.log(results);
     db.close();
     callback(results);
    });
   });
  //  cursor.each(function(err, doc) {
  //     assert.equal(err, null);
  //     if (doc != null) {
  //        console.dir(doc);
  //        callback(doc);
  //     } else {
  //        callback();
  //     }
  //  });
}

app.use(express.static('public'));

app.get('/loadBookings', function(req, res) {

  findBookings(mongoDBConnection, function(doc){
    //console.log('doc', doc);

    var html = bookingTemplate({bookings:doc, courtID:'F1'});
    var html = html + bookingTemplate({bookings:doc, courtID:'F2'});
    res.send(html);
  });

  // res.send(bookingTemplate());
  function callback(){
    res.send(bookingTemplate());
  }

});

app.get('/refreshBookings', function(req, res) {

  var myTennisAppScraper = new tennisAppScraper()
  myTennisAppScraper.init(function(){
    res.json({response:'OK'});
    // res.writeHead(302, {
    //   'Location': '/'
    // });
    // res.end();
  });
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

var tennisAppScraper = function() { }

_.extend( tennisAppScraper.prototype, {
    init : function(finishCB) {
      this.beginScrape(courtIDArray, function(){
        console.log('*****ALL DONE*****');
        finishCB();
      });
    },

    beginScrape : function( queue , callback ) {
      courtBookingArr=[]
        if ( queue.length > 0 ) {
            async.eachLimit( queue, 1, this.scrapeCourtID.bind( this ), function( err ) {
                console.log( 'im done ', err )
                // console.log(courtBookingArr);

                MongoClient.connect(url, function(err, db) {
                  assert.equal(null, err);
                  console.log("Connected correctly to tennisApp mongodb.");
                  courtBookingArr = _.sortBy(courtBookingArr, function(f){
                    return([f.slotDt, f.slotTime]);
                  });
                  // var insertDocument = function(db) {
                     db.collection('bookings').deleteMany({}, function(err, results){
                       console.log('REMOVED ALL BOOKINGS', err)
                       db.collection('bookings').insert(
                         courtBookingArr
                         , function(err, result) {
                           assert.equal(err, null);
                           console.log("Inserted a document into the bookings collection.");
                           db.close();
                           //console.log(result);
                           callback(result);
                         });

                     });
                  // };

                });

                return
            })
        } else {
            console.log( 'Nothing to process queue = ' + queue.length  )
            return
        }
    },
    scrapeCourtID : function( courtID , callback ) {
        this.requestURL( courtID , function( err, status ) {
            if ( err ) {
               return callback( err )
            }
            return callback();
        }, this )
    },
    requestURL : function( courtID, callback , ctx ) {
      var sourceUrl = 'http://www.clubwww.co.uk/ClubWWWFacilities.php?CLUB=FRINTON&SelectedView=WEEK&Facility=' + courtID + '&Activ';
      console.log(sourceUrl);
      var url = 'http://www.clubwww.co.uk/ClubWWWFacilities.php?CLUB=FRINTON';
      request(sourceUrl, function(err, resp, body) {
        if (err)
        throw err;
        $ = cheerio.load(body);
        $('td.NormalSlotAvailable, td.BookedWaitFull, td.Special_A, td.Special_R, td.Special_V, td.Special_N, td.ClosedSlot').each(function() {
          var slotID = $(this).attr('id');
          if(slotID){
            var slotArr = slotID.split('_');
            var slotDate = moment(slotArr[0]).format('dddd MMMM Do YYYY');
            var slotTime = slotArr[1];
            var slotCourtID = slotArr[2];
            var slotContent = $(this).text().slice(0,-9);
            var slotClass = $(this).attr('class');

            var slot = {
              slotDate:slotDate,
              slotTime:slotTime,
              slotCourtID:slotCourtID,
              slotContent:slotContent,
              slotClass:slotClass,
              slotDt:slotArr[0]
            }
            courtBookingArr.push(slot);
          }
        });

        return  ( err ) ? callback.call( ctx, err, null ) : callback.call( ctx,  null, courtBookingArr )
    });
  }
})




// function scrapeBookings(){
//   var sourceUrl = 'http://www.clubwww.co.uk/ClubWWWFacilities.php?CLUB=FRINTON&SelectedView=WEEK&Facility=2&Activ';
//   //var url = 'http://www.clubwww.co.uk/ClubWWWFacilities.php?CLUB=FRINTON';
//   request(sourceUrl, function(err, resp, body) {
//     if (err)
//     throw err;
//     $ = cheerio.load(body);
//     $('td.NormalSlotAvailable, td.BookedWaitFull, td.Special_A, td.Special_R, td.Special_V, td.Special_N, td.ClosedSlot').each(function() {
//       var slotID = $(this).attr('id');
//       if(slotID){
//         var slotArr = slotID.split('_');
//         var slotDate = slotArr[0];
//         var slotTime = slotArr[1];
//         var slotCourtID = slotArr[2];
//         var slotContent = $(this).text();
//         var slotClass = $(this).attr('class');
//
//         var slot = {
//           slotDate:slotDate,
//           slotTime:slotTime,
//           slotCourtID:slotCourtID,
//           slotContent:slotContent,
//           slotClass:slotClass
//         }
//         courtBookingArr.push(slot);
//       }
//     });
//     console.log('Total Bookings : ');
//     console.log(courtBookingArr.length);
//
//     MongoClient.connect(url, function(err, db) {
//       assert.equal(null, err);
//       console.log("Connected correctly to tennisApp mongodb.");
//
//       // var insertDocument = function(db) {
//          db.collection('bookings').insert(
//             courtBookingArr
//          , function(err, result) {
//           assert.equal(err, null);
//           console.log("Inserted a document into the bookings collection.");
//           db.close();
//           console.log(result);
//           //callback(result);
//         });
//       // };
//
//     });
//
//   });
//
// }
//
// function doMongo(){
//
//   MongoClient.connect(url, function(err, db) {
//     assert.equal(null, err);
//     console.log("Connected correctly to tennisApp mongodb.");
//     db.close();
//   });
// }

//scrapeBookings();

//curl 'http://www.clubwww.co.uk/ClubWWWFacilities.php' -H 'Cookie: PHPSESSID=382bd4e2041680c80c588cb5d73340e5' -H 'Origin: http://www.clubwww.co.uk' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'Upgrade-Insecure-Requests: 1' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' -H 'Cache-Control: max-age=0' -H 'Referer: http://www.clubwww.co.uk/ClubWWWFacilities.php' -H 'Connection: keep-alive' --data 'ActivitySelect=1&FacilitySelect=2&WeekSelect=20160210&ThisDayDate=&Activity=1&Facility=2&SelectedDate=20160210&SelectedView=WEEK' --compressed
