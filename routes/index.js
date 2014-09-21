var express = require('express')
	, router = express.Router()
	, http = require('http')
	, request = require('request')
	, url = require('url')
	, util = require('util')
	, moment = require('moment')
	, redis = require('redis')
	, elasticsearch = require('elasticsearch')
	, async = require('async');

var elasticsearchClient = new elasticsearch.Client({
	host: 'http://elastic.asymptomaticinsanity.com'
});

module.exports = function(app, passport) {
	router.get('/login', function(req, res){
		res.render('login', { title: 'Express', controller: 'JenkinsCtrl' });
	});

	router.post('/login',
	  passport.authenticate('local', { successRedirect: '/',
	                                   failureRedirect: '/login'})
	);

	/* GET home page. */
	router.get('/', function(req, res) {
		res.redirect('/organization');
	});

	router.get('/organization', isLoggedIn, function(req, res) {
		async.parallel({
			organization : function(callback){
				getOrganization(req.user.apiKey, callback);
			},
			messages : function(callback){
				getMessages(1,req.user.apiKey, callback);
			},
			alerts : function(callback){
				getAlerts(1,req.user.apiKey, callback);
			},
			tasks : function(callback){
				getTasks(1,req.user.apiKey, callback);
			}
		},
		function(err, results){
			if(err) {
				return res.render('error', { controller: 'JenkinsCtrl', error: err });
			};
			res.render('organization', { ui: { navbar: { home: true }}, title: 'Express', controller: 'JenkinsCtrl', alerts: results.alerts, messages: results.messages, tasks: results.tasks, organization: results.organization });
		});
	});
	

	/* GET home page. */
	router.get('/services', isLoggedIn, function(req, res) {
		async.parallel({
			services : function(callback){
				getServices(1,req.user.apiKey, callback);
			},
			messages : function(callback){
				getMessages(1,req.user.apiKey, callback);
			},
			alerts : function(callback){
				getAlerts(1,req.user.apiKey, callback);
			},
			tasks : function(callback){
				getTasks(1,req.user.apiKey, callback);
			}
		},
		function(err, results){
			if(err) {
				return res.render('error', { controller: 'JenkinsCtrl', error: err });
			};
			res.render('services', { 
				ui: { 
					navbar: { services: true }
				}, 
				title: 'All services currently running.', 
				controller: 'JenkinsCtrl', 
				alerts: results.alerts, 
				messages: results.messages, 
				tasks: results.tasks, 
				services: results.services 
			});
		});
	});

	router.get('/service/:id', isLoggedIn, function(req, res) {
		async.parallel({
			service : function(callback){
				getServices(1, req.user.apiKey, req.params.id, callback);
			},
			messages : function(callback){
				getMessages(1,req.user.apiKey, callback);
			},
			alerts : function(callback){
				getAlerts(1,req.user.apiKey, callback);
			},
			tasks : function(callback){
				getTasks(1,req.user.apiKey, callback);
			}
		},
		function(err, results){
			if(err) {
				return res.render('error', { controller: 'JenkinsCtrl', error: err });
			};
			res.render('service', { 
				ui: { 
					navbar: { services: true }
				}, 
				title: 'Current status for '+results.service.name, 
				controller: 'JenkinsCtrl', 
				service: results.service,
				chartType:req.query.chartType||"Line",
				charts: [
					{id:"chart_requests",label:"Requests/min for the past 24 hrs"},
					{id:"chart_errors",label:"Errors/min for the past 24 hrs"},
					{id:"chart_disk",label:"Disk Usage for the past 24 hrs"},
					{id:"chart_cpu",label:"CPU Usage for the past 24 hrs"},
					{id:"chart_memory",label:"Memory Usage for the past 24 hrs"},
				],
				alerts: results.alerts, 
				messages: results.messages, 
				tasks: results.tasks
			});
		});
	});

	router.get('/jenkins', isLoggedIn, function(req, res) {
	  res.render('jenkins', { title: 'Express', controller: 'JenkinsCtrl' });
	});

	router.get('/jenkins/:project', isLoggedIn, function(req, res) {
	  res.render('jenkins', { title: 'Express', controller: 'JenkinsCtrl' });
	});

	router.get('/data/service/:id', isLoggedIn, function(req, res) {
		var data = [];
		var backwards = 24;
		for(var i = backwards; i >= 0; i--) {
			//console.log(moment().subtract("d",25-i).format('YYYY-MM-DD'));
			data.push({
	            period: moment().subtract(i,"h").format('YYYY-MM-DD HH:mm:ss'),
	            requests: Math.round(Math.random()*40)+Math.pow(24-i,2),
	            errors: 30+Math.round(Math.random()*10),
	            memory: 10+Math.round(Math.random()*5),
	            cpu: 50+Math.round(Math.random()*50),
	            disk: 50+Math.round(Math.random()*50)
	        });
		}

		var charts = [
		{
			morrisData:{
		        element: "chart_requests",
		        data: data,
		        xkey: 'period',
		        ykeys: ['requests'],
		        labels: ['Requests'],
		        pointSize: 2,
		        hideHover: 'auto',
		        resize: true,
		        lineColors: ['#186E00']
		    },
		    chartType: req.query.chartType
		},
	    {
			morrisData:{
		        element: "chart_errors",
		        data: data,
		        xkey: 'period',
		        ykeys: ['errors'],
		        labels: ['Errors'],
		        pointSize: 2,
		        hideHover: 'auto',
		        resize: true,
		        lineColors: ['#186E00']
		    },
		    chartType: req.query.chartType
		},
	    {
			morrisData:{
		        element: "chart_disk",
		        data: data,
		        xkey: 'period',
		        ykeys: ['disk'],
		        labels: ['Disk'],
		        pointSize: 2,
		        hideHover: 'auto',
		        resize: true,
		        postUnits: '%',
		        goals: [50, 75],
		        goalStrokeWidth: 2,
		        goalLineColors: ['#DB8000','#B00404'],
		        lineColors: ['#186E00']
		    },
		    chartType: req.query.chartType
		},
	    {
			morrisData:{
		        element: "chart_cpu",
		        data: data,
		        xkey: 'period',
		        ykeys: ['cpu'],
		        labels: ['CPU'],
		        pointSize: 2,
		        hideHover: 'auto',
		        resize: true,
		        postUnits: '%',
		        goals: [50, 75],
		        goalStrokeWidth: 2,
		        goalLineColors: ['#DB8000','#B00404'],
		        lineColors: ['#186E00']
		    },
		    chartType: req.query.chartType
		},
	    {
			morrisData:{
		        element: "chart_memory",
		        data: data,
		        xkey: 'period',
		        ykeys: ['memory'],
		        labels: ['Memory'],
		        pointSize: 2,
		        hideHover: 'auto',
		        resize: true,
		        postUnits: 'Gb',
		        goals: [50, 75],
		        goalStrokeWidth: 2,
		        goalLineColors: ['#DB8000','#B00404'],
		        lineColors: ['#186E00']
		    },
		    chartType: req.query.chartType
		}];

		var morrisData = 

		res.render('morris', { charts : charts});
	});
	return router;
};

function populateES() {

		var metrics = ['Bar','Line','Area'];
		var num = 10;
		for(var i = 0;i < num;i++) {
			var state = (Math.random());
			var obj = {
				name:"Service "+i,
				color:(state>.33)?(state>.66)?"green":"yellow":"red",
				icon:(state>.33)?(state>.66)?"fa-check-circle":"fa-warning":"fa-times-circle-o",
				status:(state>.33)?(state>.66)?"Healthy":"Unhealthy":"Failed",
				id:i
			};
			elasticsearchClient.index({
				index: 'client',
				type: 'service',
				id: i,
				body: obj
			}, function (err, resp) {
				if(err) { console.log(err); }
				else {  
					var serviceId = resp._id;
					console.log('Inserted service %j',serviceId);

					for(var j in metrics) {
						var metric = metrics[j];
						var data = [];
						var backwards = 30;
						for(var k = 0; k < backwards; k++) {
							//console.log(moment().subtract("d",25-i).format('YYYY-MM-DD'));
							data.push({
					            period: moment().subtract(backwards-k,"d").format('YYYY-MM-DD'),
					            requests: 100+Math.round(Math.random()*10),
					            errors: 30+Math.round(Math.random()*10),
					            failures: 10+Math.round(Math.random()*5)
					        });
						}
						var morrisData ={
					        element: metric,
					        data: data,
					        xkey: 'period',
					        ykeys: ['requests', 'errors', 'failures'],
					        labels: ['Requests', 'Errors', 'Failures'],
					        pointSize: 2,
					        hideHover: 'auto',
					        resize: true,
					        lineColors: ['#186E00','#B00404','#1504B0']
					    }
						var obj = {
							data:morrisData,
							service_id:serviceId
						};
						elasticsearchClient.index({
							index: 'client',
							type: 'service-metric',
							id: serviceId+"_"+metric,
							body: obj
						}, function (err, resp) {
							if(err) { console.log(err); }
							else {
								console.log("Inserted metric %j for service %j with resp %j",metric,serviceId,resp); 
							}
						});
					}
				}
			});
		}
	}

function getOrganization(apiKey,callback) {
	var options = {
		hostname: 'mocksvc.mulesoft.com',
		port: 80,
		path: '/mocks/2c7cc5e3-d6e3-4e28-8f0c-2c0de6a9ae13/v1/organizations',
		method: 'GET',
		headers: {
			apiKey: '12345'
		}
	};

	http.get(options, function(response) {
		var data = '';
		response.on("data", function(chunk) {
			data += chunk;
		});
		response.on("end",function(){
			var organization = JSON.parse(data).data[0];
			return callback(null,organization);
		})
	}).on('error', function(e) {
		return callback(e);
	});
}

function getMessages(organizationId,apiKey,callback) {
	var options = {
		hostname: 'mocksvc.mulesoft.com',
		port: 80,
		path: '/mocks/2c7cc5e3-d6e3-4e28-8f0c-2c0de6a9ae13/v1/organizations/'+organizationId+'/messages',
		method: 'GET',
		headers: {
			apiKey: apiKey
		}
	};

	http.get(options, function(response) {
		var data = '';
		response.on("data", function(chunk) {
			data += chunk;
		});
		response.on("end",function(){
			return callback(null,JSON.parse(data).data.messages);
		})
	}).on('error', function(e) {
		return callback(e);
	});
}

function getAlerts(organizationId,apiKey,callback) {
	var options = {
		hostname: 'mocksvc.mulesoft.com',
		port: 80,
		path: '/mocks/2c7cc5e3-d6e3-4e28-8f0c-2c0de6a9ae13/v1/organizations/'+organizationId+'/alerts',
		method: 'GET',
		headers: {
			apiKey: apiKey
		}
	};

	http.get(options, function(response) {
		var data = '';
		response.on("data", function(chunk) {
			data += chunk;
		});
		response.on("end",function(){
			return callback(null,JSON.parse(data).data.alerts);
		})
	}).on('error', function(e) {
		return callback(e);
	});
}

function getTasks(organizationId,apiKey,callback) {
	var options = {
		hostname: 'mocksvc.mulesoft.com',
		port: 80,
		path: '/mocks/2c7cc5e3-d6e3-4e28-8f0c-2c0de6a9ae13/v1/organizations/'+organizationId+'/tasks',
		method: 'GET',
		headers: {
			apiKey: apiKey
		}
	};

	http.get(options, function(response) {
		var data = '';
		response.on("data", function(chunk) {
			data += chunk;
		});
		response.on("end",function(){
			return callback(null,JSON.parse(data).data.tasks);
		})
	}).on('error', function(e) {
		return callback(e);
	});
}

function getServices(organizationId,apiKey,serviceId,callback) {
	if(typeof serviceId === 'function') {
		callback = serviceId;
		serviceId = false;
	}
	elasticsearchClient.search({
		index: 'client',
		type: 'service',
		body: {
			"query" : {
		        "match_all" : {}
		    }
		}
	}).then(function (resp) {
		//var hits = resp.body.hits;
		var services = [];
		for(var i in resp.hits.hits) {
			var service = resp.hits.hits[i]._source;
			service.deploymentVersion = '12341234';
			service.deploymentDate = moment('2014-04-01T00:00:00+00:00').from(moment());
			services.push(service);
		}

		if(serviceId) {
			elasticsearchClient.search({
				index: 'client',
				type: 'service',
				body: {
					"query" : {
				        "match" : {
				        	_id : serviceId
				        }
				    }
				}
			}).then(function (resp) {
				return callback(null,resp.hits.hits[0]._source);
			});
		}
		else {
			return callback(null,services);	
		}
		
	});
}

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();
	res.redirect('/login');
}
