var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Account = mongoose.model('Account'),
    Assignment = mongoose.model('Assignment')

exports.try = function(req, res) {
  Assignment
      .find({
      })
      .exec(function(err, assignmentResult) {
        if(err) return next(err);

        var ID = [];
        var Numbers = {};

        var both, one, neither;
        both = one = neither = 0;

        for(assignment in assignmentResult) {
          if(assignmentResult[assignment].assignmentNumber == "" && assignmentResult[assignment].subAssignment == "")
            both++;
          else if(assignmentResult[assignment].assignmentNumber == "" || assignmentResult[assignment].subAssignment == "") {
            one++;
          } else
            neither++;

          ID.push(assignmentResult[assignment].assignmentID)

          if(Numbers.hasOwnProperty(assignmentResult[assignment].assignmentNumber)) {
            Numbers[assignmentResult[assignment].assignmentNumber] += 1;
          } else {
            Numbers[assignmentResult[assignment].assignmentNumber] = 0;
          }
        }

        console.log("Unique IDs " + ID.length)
        // for(i in ID) {
        //   console.log(ID[i])
        // }

        console.log("Groups of Assignment IDS ")
        for(var i in Numbers) {
          console.log(i, Numbers[i]);
        }

        console.log("--");
        console.log("With both: ", both)
        console.log("With one: ", one)
        console.log("With neither: ", neither)

      })
}

exports.testing = function(req, res, next) {

  Assignment
      .find({
        assignmentNumber: {$exists: false}
        subAssignment: {$exists: false}
      })
      .exec(function(err, assignmentResult) {
        if(err) return next(err);

        return next("total: " + assignmentResult.length);

        var numUpdated = 0;
        var numDeleted = 0;
        var numTotal = assignmentResult.length;
        var numToModify = 0;

        for(assignment in assignmentResult) {
          if(assignmentResult[assignment].assignmentNumber == "" || assignmentResult[assignment].subAssignment == "") {
            numToModify++;
            var assignmentID = assignmentResult[assignment].assignmentID;
            var assignmentRaw = assignmentID.split(".");
            var assignmentNumber = assignmentRaw[0];
            var subAssignment = assignmentRaw[1];

              // Update assignments, deleting any with erroneous assignmentID

              if(subAssignment.length > 2) {
                 //remove all assignments with ridiculous decimal subAssignment
                Assignment
                  .remove({
                    assignmentID: assignmentID
                  })
                  .exec(function(err, result){
                      if(err) return next(err)
                      numDeleted++;
                  })
                } else {


                //Update assignments to all use assignmentNumber and subAssignment number! (Won't delete anything)

                Assignment
                  .update(
                      {
                        assignmentID: assignmentID
                      },
                      {
                        $set: {assignmentNumber: assignmentNumber, subAssignment: subAssignment}
                      }
                    ).exec(function(err, result) {
                      if(err) return next(err)
                      //console.log("updated assignment ", assignmentID)
                      numUpdated++;

                    })

                }

          }
        }

        return next("Started with " + numTotal + ", Num to modify: " + numToModify + ", Num deleted " + numDeleted + ", Number updated " + numUpdated)
      });

}
