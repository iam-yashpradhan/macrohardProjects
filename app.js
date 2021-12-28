var alert=require("alert-node");
var exp=require("express");
var app=exp();
var bodyP=require("body-parser"), mongoose=require("mongoose");
var passport=require("passport"),LocalStrategy=require("passport-local"),
    passportLocalMongoose=require("passport-local-mongoose"),
    User=require("./models/user"),
    Comment=require("./models/comment"),
    methodOverride=require("method-override"),
    flash=require("connect-flash");
mongoose.connect("mongodb://localhost/macrohard");
app.set("view engine","ejs");
app.use(bodyP.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(exp.static('public'));
app.use(flash());

// Authentication stuff

app.use(require("express-session")({
    secret: "abcd",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser=req.user;
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});

// Database SCHEMA
var projectSchema=new mongoose.Schema({
    title:String, description: String, category: Boolean,
    price:Number,
    author:{
        id:{
        type:mongoose.Schema.Types.ObjectId, ref: "User"
    },username:String},
    comments:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Comment"
    }]
});

var project=mongoose.model("project",projectSchema);

app.get("/",function(req,res){
    res.render("home",{currentUser:req.user});
});

//Projects

app.get("/projects/new",isLoggedIn,function(req,res){
   res.render("new");
});

app.get("/Softprojects",function(req,res){
     project.find({category:0},function(err, Allprojects){
         if(err){
             console.log(err);
         }else{
             res.render("Sindex",{projects:Allprojects});
         }
     }
)});    

app.get("/Hardprojects",function(req,res){
     project.find({category:1},function(err, Allprojects){
         if(err){
             console.log(err);
         }else{
             res.render("Hindex",{projects:Allprojects});
         }
     }
)});   

app.post("/projects",isLoggedIn,function(req,res){
    var title=req.body.title;
    var description=req.body.description;
    var cat=req.body.category;
    var price=req.body.price;
    var author={
        id:req.user._id,
        username:req.user.username
    };
    var newProject={title:title,description:description,category:cat,price:price,author:author};
    project.create(newProject,function(err,newP){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.get("/projects/:id",function(req,res){
   project.findById(req.params.id).populate("comments").exec(function(err,proj){
       if(err){
           console.log(err);
       }else{
            User.findById(proj.author.id,function(err,usr){
                if(err){
                    console.log(err);
                }else{
                    res.render("show",{project:proj,user:usr});
                }
            })
           
       }
   });
});

// Edit and Delete

app.get("/projects/:id/edit",isOwner,function(req,res){
	// console.log(project.findById(req.params.id));
	var proj=project.findById(req.params.id,function(err,found){
		if(err){
			console.log(err);
		}else{
			res.render("projEdit",{proj:found});
		}
	});
});

app.put("/projects/:id",isOwner,function(req,res){
	project.findByIdAndUpdate(req.params.id,req.body.Uproj,function(err,nProj){
		if(err){
			console.log(err);
		}else{
			res.redirect("/projects/"+req.params.id);
		}
	})
});

app.delete("/projects/:id",isOwner,function(req,res){
	project.findByIdAndRemove(req.params.id,function(err){
		if(err){
			console.log(err);
		}else{
			res.redirect("/");
		}
	})
})

// SIGN UP Routes

app.get("/register", function(req, res){
   res.render("register"); 
});

app.post("/register", function(req, res){
    User.register(new User({username: req.body.username, email: req.body.email, contact: req.body.contact}), req.body.password, function(err, user){
        if(err){
            alert(err.message);
            // var a=String(err.message);
            // alert("error");
            console.log(err);
            return res.render('register');
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success","Thank you for registering. Welcome to MacroHard "+ user.username);
           res.redirect("/");
        });
    });
});

// LOGIN ROUTES

app.get("/login", function(req, res){
   res.render("login"); 
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
}) ,function(req, res){
});

app.get("/logout", function(req, res){
    req.logout();
    req.flash("success","You have been logged out!!");
    res.redirect("/");
});

// COMMENTS STUFF

app.get("/projects/:id/comments/new",isLoggedIn,function(req,res){
    project.findById(req.params.id,function(err,project){
        if(err){
            console.log(err);
        }else{
            res.render("newC",{project:project});
        }
    });
});

app.post("/projects/:id/comments",isLoggedIn,function(req, res) {
    project.findById(req.params.id,function(err, project){
        if(err){
            console.log(err);
            res.redirect("/projects");
        }else{
            var author={id:req.user._id,username:req.user.username};
            var comment={text:req.body.comment,author};
            Comment.create(comment,function(err,comment){
                if(err){
                    console.log(err);
                }else{
                    project.comments.push(comment);
                    project.save();
                    req.flash("success","Thank you for your feedback");
                    res.redirect("/projects/"+project._id);
                }
            });
        }
    });
});

app.get("/projects/:id/comments/:cid/edit",isCommOwner,function(req,res){
	    Comment.findById(req.params.cid,function(err,comm){
	        if(err){
	            console.log(err);
	        }else{
	            res.render("cedit",{project:req.params.id,comment:comm});
	        }
	});
});
app.put("/projects/:id/comments/:cid",isCommOwner,function(req,res){
    Comment.findByIdAndUpdate(req.params.cid,req.body.comment,function(err,comm){
        if(err){
            console.log(err);
        }else{
            res.redirect("/projects/"+req.params.id);
        }
    });
});

app.delete("/projects/:id/comments/:cid",isCommOwner,function(req,res){
	Comment.findByIdAndRemove(req.params.cid,function(err,comm){
		if(err){
			console.log(err);
		}else{
			req.flash("success","your comment has been deleted!!");
			res.redirect("/projects/"+req.params.id);
		}
	})
})

//CONTACT and About

app.get("/contact",function(req,res){
	res.render("contact");
});

//Auth Functions

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","You must be logged in to do that!");
    res.redirect("/login");
}

function isOwner(req,res,next){
	if(req.isAuthenticated()){
		project.findById(req.params.id,function(err,proj){
			if(err){
				console.log(err);
			}else{
				if(proj.author.id.equals(req.user._id)){
					next();
				}else{
					res.send("ERROR!");
				}
			}
		});
	}else{
		res.redirect("/login");
	}
}

function isCommOwner(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.cid,function(err,comm){
			if(err){
				console.log(err);
			}else{
				console.log(comm.author.id+"    "+req.user._id);
				if(comm.author.id.equals(req.user._id)){
					next();
				}else{
					res.send("ERROR!");
				}
			}
		});
	}else{
		res.redirect("/login");
	}
}

app.listen(1400,function(){
    console.log("Server started");
});

