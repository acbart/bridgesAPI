var mongoose = require('mongoose')
    , User = mongoose.model('User')
    , Account = mongoose.model('Account')
    , Assignment = mongoose.model('Assignment')
    , treemill = require('treemill') 
    , visTypes = require('./visTypes.js')

//API route for ajax requests to change the visual 
//representation of the data they uploaded.
exports.updateVistype = function (req, res, next) {
    
    console.log('update vistype for ' + req.user.email + 
        ' '+req.params.assignmentID)

    Assignment
        .findOne({
            email:req.user.email,
            assignmentID: req.params.assignmentID
        })
        .exec(function (err, assignmentResult) {
            if (err) return next(err)
            if (!assignmentResult) 
                return next("could not find assignment")
            //validate the vis type is implemented..
            vistypes = ["nodelink", "tree", "queue"]
            if (vistypes.indexOf(req.params.value) == -1) 
                return next("specified vistype is not implemented")
            assignmentResult.vistype=req.params.value 
            assignmentResult.save()
            res.send("OK")
        })
}

//API route to toggle the visibility of an assignment 
//between private and public.
exports.updateVisibility = function (req, res, next) {
    Assignment
        .findOne({
            email:req.user.email,
            assignmentID: req.params.assignmentID    
        })
        .exec(function (err, assignmentResult) {
//            console.log((err) ? err : assignmentResult);
            if (err) return next(err)
            if (!assignmentResult) 
                return next("could not find assignment")
            assignmentResult.shared=req.params.value 
            assignmentResult.save()
//            console.log("CHANGED TO " + req.params.value + " " + assignmentResult);
            res.send("OK")
        })
}

//API route to save the position of some (or all) node positions
exports.saveSnapshot = function(req, res, next) {
    Assignment  
        .findOne({
            email:req.user.email,
            assignmentID: req.params.assignmentID    
        })
        .exec(function (err, assignmentResult) {
            if (err) return next(err)
            if (!assignmentResult) 
                return next("could not find assignment")
            console.log("snapshot")
            //Save JSON with modified positions
            //assignmentResult.save()
            //res.send("OK")
    })
}

//API route for uploading assignment data. If the 
//assignment already exists it will be replaced.
exports.upload = function (req, res, next) {
    
    // C++ version posts JSON as object, JAVA posts as plain string
    if(typeof req.body != "object") {
        //console.log("STRING: PARSING");
        try { rawBody = JSON.parse(req.body) } 
        catch (e) { 

            if(typeof req.body != 'object') {
                console.log(e)
                return next(e + " invalid syntax for raw body of request")
            } else {
                rawBody = req.body;   
            }

        }
    } else { 
        //console.log("OBJECT ALREADY"); 
        rawBody = req.body;
    }
    

    var version = rawBody.version;
    
    var assignmentID = req.params.assignmentID;
    var assignmentRaw = assignmentID.split(".");
    var assignmentNumber = assignmentRaw[0];
    var subAssignment = assignmentRaw[1];
   
    var visualizationType = rawBody.visual; //check this against possible ones
    
   
    
    if(version == "0.4.0") { //version with assignmentID as one string
        // set the vis to default type
        if(visualizationType != "tree" && visualizationType != "AList")
           visualizationType = "nodelink";

        //TEMP
        visualizationType = "AList";
        
        //get username from apikey 
        User.findOne({
            apikey:req.query.apikey
        })    
        .exec(function (err, user) {    
            if (err) return next (err)    
            if (!user) return next ("could not find user by apikey: " + 
                            req.query.apikey)

            //if username found, upload or replace 
            replaceAssignment(res, user, assignmentID) 
        })

    } else {// Add version-specific options here
         var validTypes = [
            "Array",
            "Array_Stack",
            "Array_Queue", 
            "LinkedListStack",
            "LinkedListQueue",
            "BinaryTree",
            "BinarySearchTree",
            "SinglyLinkedList",
            "DoublyLinkedList"
        ];
        
        
    }
    
    
    

    function replaceAssignment (res, user, assignmentID) {
    
        
        //if this assignment is #.0, remove all sub assignments from #
        //if(assignmentID.split('.')[1] == "0") {
//        if (((parseFloat(assignmentID)/1.0) % 1.0) == 0) {
//            if(assignmentID.split('.')[1] == "0" || assignmentID.split('.')[1] == "00") // ?????
//                //assignmentID = assignmentID.substr(0, assignmentID.indexOf('.') + 2);
//                assignmentID += "0";
//            
//            Assignment.remove({
//                assignmentID: {$gte: Math.floor(parseFloat(assignmentID)), $lt: Math.floor(parseFloat(assignmentID) + 1) },
//                email: user.email        
//            })
//            .exec(function (err, resp) {
//            })
//        }
        
        if (subAssignment == '0' || subAssignment == '00') {
             Assignment.remove({
                assignmentNumber: assignmentNumber,
                email: user.email        
            })
            .exec(function (err, resp) {
                 if(err)
                    console.log(err);
                console.log("removed (" + resp + ") assignments (" + assignmentNumber + ".*) from user " + user.username);
            })
        }
        
        //TODO: move assignment creation from this into function above; but consider old cases.
        //remove previously uploaded assignment if exists
        Assignment.remove({
            assignmentID: assignmentID,
            email: user.email        
        })
        .exec(function (err, resp) {
            console.log(resp);

            //create a new assignment in the database
            assignment = new Assignment()
            assignment.email = user.email
            assignment.vistype = visualizationType
            assignment.data = rawBody
            assignment.assignmentID = assignmentID
            assignment.assignmentNumber = assignmentNumber
            assignment.subAssignment = subAssignment
            assignment.schoolID = req.params.schoolID || ""
            assignment.classID = req.params.classID || ""
            assignment.save()
            
            //log new assignment
//            console.log("assignment added: "+user.email+
//                " "+assignmentID)
            console.log(assignment)
            
            //report to client
            User.findOne({
                email: user.email
            }).exec(function (err, resp) {
                res.json({"msg":assignmentID+"/"+resp.username}) 
            })
        })
    }
}

var sessionUser = null;

exports.next = null

exports.show = function (req, res, next) {
    //var query = Assignment.find({'username': 'test'});
    //console.log(query);

    this.next = next 
    var assignmentID = req.params.assignmentID
    var schoolID = req.params.schoolID
    var classID = req.params.classID
    var username = req.params.username
    var apikey = req.query.apikey 
    sessionUser = null
    if (typeof req.user != "undefined") sessionUser = req.user
    
    User
        .findOne({username: username})
        .exec(function(err, usr){
            if (err) return next(err) 
            if (!usr) 
                return next("couldn't find the username "+username) 
           
            getAssignment(req, res, next, usr.email, function (assign) {
               
                //Test whether user has permission to view vis
                testByUser(res, req, username, assign, function (){
                    testByKey(res, apikey, username, assign, null)
                })
            })
        })

    function getAssignment (req, res, next, email, cb) {
        assignmentID = req.params.assignmentID
        console.log(req.params);
        next = next
        
        var version = "0.4.0";
        
        findAssignmentNew(assignmentID)
        
        function findAssignmentOld(id) {
            
            //might need to add ".0" to assignmentID if redirecting from gallery
            Assignment.findOne({
                email: email, 
                assignmentID: id
            })
            .exec(function(err, ass) {
                if (err) return next(err);
                if (!ass || ass.length == 0) {
                    return next("Could not find assignment " + assignmentID);  
                }

                //If assignmentNumber is set, the assignment is up-to-date
                if(ass.assignmentNumber == "")
                    getAssignmentOld();
                else
                    getAssignmentNew();
            });
        }
        
        function findAssignmentNew(id) {
            Assignment.findOne({
                email: email, 
                assignmentNumber: id
            })
            .exec(function(err, ass) {
                if (err) return next(err);
                if (!ass || ass.length == 0) {
                    findAssignmentOld(id); // <-----
                    return;
                    //return next("Could not find assignment " + assignmentID);  
                }

                //If assignmentNumber is set, the assignment is up-to-date
                if(ass.assignmentNumber == "")
                    getAssignmentOld();
                else
                    getAssignmentNew();
            });
        }
        
        
        //Old method for finding sub assignments
        function getAssignmentOld() {
            console.log("old");
            Assignment
            .find({
                email: email, 
                assignmentID: {$gte: Math.floor(parseFloat(assignmentID)), $lt: Math.floor(parseFloat(assignmentID) + 1)}
                
            })
            .sort({ 
                assignmentID: 1 
            })
            .exec(function(err, assignments) {
                if (err) return next(err);
                if (!assignments || assignments.length == 0) {
                         return next("Could not find assignment " + assignmentID);   
                } else if (assignments.length == 1) {
                    //console.log(assignments[0]);
                    return renderVis(res, assignments[0]);
                } else 
                    return renderMultiVis(res, assignments);
            });
        }
        
        //New method for finding sub assignments
        function getAssignmentNew() {
            assignmentNumber = assignmentID.split(".")[0];
            Assignment
            .find({
                email: email, 
                assignmentNumber: assignmentNumber
            })
            .sort({ 
                assignmentID: 1 
            })
            .exec(function(err, assignments) {
                if (err) return next(err);
                if (!assignments || assignments.length == 0) {
                         return next("Could not find assignment " + assignmentNumber);   
                } else if (assignments.length == 1) {
                    //console.log(assignments[0]);
                    return renderVis(res, assignments[0]);
                } else 
                    return renderMultiVis(res, assignments);
            });
        }
    }
    
    
    //find whether there is a session, then test
    function testByUser (res, req, username, assign, nextTest) {
        if (sessionUser) {
            return testAndMoveOn(
                res, sessionUser.username, username, assign, nextTest) 
        } else {
            if (nextTest) return nextTest()
            else
                return testAndMoveOn(res, true, false, assign, null) 
        }
    }
    
    //find user by key, then test
    function testByKey (res, apikey, username, assign, nextTest) {
        if (apikey) {
            User
                .findOne({apikey:apikey})
                .exec(function (err, n){
                    if (err) return next (err)
                    if (!n) return next ("Invalid apikey: "+apikey)
                    return testAndMoveOn(
                        res, n.username, username, assign, null) 
                })
        } else {
            if (nextTest) return nextTest()
            else
                return testAndMoveOn(res, true, false, assign, null) 
        }
    }
    
    //compare the usernames and move on
    function testAndMoveOn (res, un1, un2, assign, nextTest) {
        console.log(un1 + " " + un2)
        if (un1 === un2) return renderVis (res, assign)
    
        if (nextTest) return nextTest()
        else return next ("the data you requested is not public")
    }
    
    function renderVis (res, assignment) {
        var owner=false
        if (sessionUser) {
            if (sessionUser.email==assignment.email) owner = true; 
        }
    
        //default visualization
        if (!assignment.vistype) assignment.vistype = "nodelink" 
        //check data for flat vs unflattened representation
        
        var unflatten = function (data) { 
            //check whether the data is already hierachical
            if ("children" in data) return data
            tm = treemill() 
            tree = tm.unflatten(data)       
            return tree
        }
    
        var flatten = function (data) {
            //check whether the data is already flat
            if ("nodes" in data) return data 
            tm = treemill() 
            tree = tm.flatten(data)       
            return tree 
        }
        
        //for(var i = 0; i < assignment.length(); i++)
        data = assignment.data.toObject()
        data = data[0]
        
        if (assignment.vistype == "tree") data = unflatten(data)   
        else data = flatten(data) 
        
        vistype = assignment.vistype 
        if ("error" in data) vistype = "error"  

        return res.render ('assignments/assignment', {
            "title":"assignment",
            "user":sessionUser,
            "data":data,
            "assignmentID":assignmentID,
            "schoolID":assignment.schoolID,
            "classID":assignment.classID,
            "vistype":vistype,
            "shared":assignment.shared,
            "owner":owner
        })
    }

    function renderMultiVis (res, assignments) {
        var owner=false
        var allAssigns = {};
        if (sessionUser) {
            if (sessionUser.email==assignments[0].email) owner = true; 
        }
    
        //default visualization
        //if (!assignments.vistype) assignments.vistype = "nodelink" 
        //check data for flat vs unflattened representation
        
        var unflatten = function (data) { 
            //check whether the data is already hierachical
            if ("children" in data) return data
            tm = treemill() 
            tree = tm.unflatten(data)       
            return tree
        }
    
        var flatten = function (data) {
            //check whether the data is already flat
            if ("nodes" in data) return data 
            tm = treemill() 
            tree = tm.flatten(data)       
            return tree 
        }
        
        for(var i = 0; i < assignments.length; i++) {
            data = assignments[i].data.toObject()[0]
            //console.log("----DATA", data);
            //data = data[0]
        
            if (assignments[i].vistype == "tree") data = unflatten(data)   
            else data = flatten(data) 
        
            vistype = assignments[i].vistype 
            if ("error" in data) vistype = "error" 
            
            allAssigns[i] = data;
            
            //console.log("reading ", i);

        }
        
        return res.render ('assignments/assignmentMulti', {
            "title":"assignmentMulti",
            "user":sessionUser,
            "data":allAssigns,
            "extent":Object.keys(allAssigns).length,
            "assignmentID":assignmentID,
            "schoolID":assignments[0].schoolID,
            "classID":assignments[0].classID,
            "vistype":vistype,
            "shared":assignments[0].shared,
            "owner":owner
        })
    }

    

}

