var express = require('express');
var router = express.Router();
var user = require('../models/user');
var PasswordCategory = require('../models/password-category')
var Password = require('../models/password')
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')
const {check, validationResult} = require('express-validator')

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}
 
function isEmailExists(req,res,next) {
  user.findOne({email: req.body.email}).exec((err,doc) => {
    if(err) throw err;
    if(doc) {
      return res.status(200).render('signup',{title: 'Signup', msg: 'Email already exists'})
    }
    next();
  });
}

function isUserNameExists(req,res,next) {
  user.findOne({username: req.body.username}).exec((err,doc) => {
    if(err) throw err;
    if(doc) {
      return res.status(200).render('signup',{title: 'Signup', msg: 'Username already exists'})
    }
    next();
  });
}

function isLoggedIn(req,res,next) {
  try {
    var token = localStorage.getItem('user_token');
    var decoded = jwt.verify(token, 'some-salt');
  } catch(err) {
    res.redirect('/')
  }
  next()
}

function handleRedirection(req,res,next) {
  var token = localStorage.getItem('user_token');
  if (token){
    res.redirect('/dashboard')
  }
  next();
}

var passCategory = PasswordCategory.find();
/* GET login page. */
router.get('/', handleRedirection, function(req, res, next) {
  res.render('index', { title: 'Password Management System',msg:'' });
});

/* POST login page. */
router.post('/', function(req, res, next) {
  user.findOne({'username': req.body.username}).exec((err,doc)=> {
    if (err) {
      res.render('index', {title: 'Login', msg: 'Something went wrong'})
    } else {
      if (doc) {
        if(bcrypt.compareSync(req.body.password, doc.password)) {
          var token = jwt.sign({user_id: doc._id},'some-salt');
          localStorage.setItem('user_token', token);
          localStorage.setItem('user_name',doc.username)
          res.redirect('/dashboard')
        } else {
          res.render('index', {title: 'Login', msg: 'Wrong credentials'})
        }
      } else {
        res.render('index', {title: 'Login', msg: 'Wrong credentials'})
      }
    }
  });
});

/* GET signup page. */
router.get('/signup', handleRedirection, function(req, res, next) {
    res.render('signup', { title: 'PMS', msg:'' });
});

router.get('/dashboard', isLoggedIn, function(req,res,next) {
  var loginUser = localStorage.getItem('user_name')
  res.render('dashboard',{name: loginUser});
})
/* POST signup page. */
router.post('/signup', isEmailExists,isUserNameExists, function(req, res, next) {
  var userData = new user({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  });
  if (req.body.password == req.body.confirm_password) {
    userData.save((err,doc) => {
      if(err) 
        throw err;
      else
      res.render('signup', { title: 'Signup', msg:'Registration done successfully' });
    });
  } else {
    res.render('signup', { title: 'Signup', msg:'Password and Confirm Password must match' });
  }
});

/* GET password category list page. */
router.get('/view-password-category', isLoggedIn, function(req, res, next) {
  PasswordCategory.find().exec((err,docs) => {
    if(err) 
      res.render('view-password-category',{categories: null});
    else
      res.render('view-password-category',{categories: docs});
  })
});

/* Show add password category page. */
router.get('/add-password-category', isLoggedIn, function(req, res, next) {
  res.render('add-password-category',{msg: '', errors:''});
});

/* Add password . */
router.post('/add-password-category', isLoggedIn, [
  check('category','Enter password category').isLength({ min: 1 })
], function(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.render('add-password-category', {msg:'',errors:errors.mapped()})
  } else {
    var categoryData = new PasswordCategory({
      category_name: req.body.category
    });
    categoryData.save((err, doc) => {
      if(err)
        res.render('add-password-category', {msg:'Something went wrong',errors:''})
      else
        res.render('add-password-category', {msg:'Password category added',errors:''})
    })
  }
});

/* Delete password category. */
router.get('/add-password-category/:id/delete', isLoggedIn, function(req, res, next) {
  PasswordCategory.findByIdAndDelete({_id: req.params.id}).exec((err,doc) => {
    if(!err)
      res.redirect('/add-password-category');
    else
      res.render('/add-password-category', {msg: 'Something went wrong'});
  })
});

/* Edit password category. */
router.get('/add-password-category/:id/edit', isLoggedIn, function(req, res, next) {
  PasswordCategory.findById({_id: req.params.id}).exec((err,doc) => {
    if(!err)
      res.render('edit-password-category', {msg: '', details: doc, errors:''});
    else
      res.render('edit-password-category', {msg: '', details:'', errors:''});
  })
});

/* Edit password category. */
router.post('/edit-password-category', isLoggedIn, function(req, res, next) {
    PasswordCategory.findByIdAndUpdate(req.body.category_id,{category_name: req.body.category}).exec((err,doc) => {
      if(!err)
        res.redirect('view-password-category');
      else
        res.render('edit-password-category',{msg: 'Something went wrong',details: ''});
    })
});

/* GET password list page. */
router.get('/view-password/:page?', isLoggedIn, function(req, res, next) {
  var query = {}
  if (typeof req.params.page == 'undefined') {
    // First page without query string
    var options = {
      offset:   1, 
      limit:    2
    };
  } else {
    var options = {
      offset:   parseInt(req.params.page), 
      limit:    2
    };
  }
  Password.paginate(query, options).then(function(result) {
    res.render('view-password',{
      records: result.docs,
      current: result.offset,
      pages: Math.ceil(result.total/ result.limit)
    });
  });
});

/* Show add password page. */
router.get('/add-password', isLoggedIn, function(req, res, next) {
  passCategory.find().exec((err,docs) => {
    if (!err)
      res.render('add-password',{msg:'', errors: '', categories: docs});
    else
      throw err;  
  })
});

/* Save password. */
router.post('/add-password', isLoggedIn, [
  check('category','Please select password category').isLength({min:1}),
  check('project','Please enter project name').isLength({min: 1}),
  check('password','Please enter password details').isLength({min:1})
] ,function(req, res, next) {
  PasswordCategory.find().exec((err,docs) => {
    var formData = new Password({
      project_name: req.body.project,
      category_type: req.body.category,
      password_details: req.body.password
    }) 
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.render('add-password',{msg:'', errors: errors.mapped(), categories: docs});
    } else {
      formData.save((err,document) => {
        if (!err)
          res.render('add-password',{msg:'Password added', errors: '', categories: docs});
        else 
          res.render('add-password',{msg:'Something went wrong', errors: '', categories: docs});
      })
    }
  })
});

/* Delete passwor */
router.get('/add-password/:id/delete', isLoggedIn, function(req, res, next) {
  Password.findByIdAndDelete({_id: req.params.id}).exec((err,docs) => {
    if (!err)
      res.redirect('/view-password');
    else
      throw err;  
  })
});

/* Edit password form */
router.get('/add-password/:id/edit', isLoggedIn, function(req, res, next) {
  Password.findById({_id: req.params.id}).exec((err,docs) => {
    if (!err) {
      passCategory.find().exec((err,data) => {
        res.render('edit-password',{msg: '', passwordDetails: docs, categories:data})
      })
    }
    else
      res.render('edit-password',{msg: '', passwordDetails: ''})
  })
});

/* Update password */
router.post('/update-password', isLoggedIn, function(req, res, next) {
  Password.findByIdAndUpdate(req.body.password_id,{project_name: req.body.project,category_type: req.body.category,password_details: req.body.password}).exec((err, doc) => {
    if(!err)
      res.redirect('/view-password')
    else
      res.render('edit-password',{msg: '', passwordDetails: ''})
  })
});

/* Logout */
router.get('/logout', isLoggedIn, function(req, res, next) {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_name')
  res.redirect('/')
});

module.exports = router;