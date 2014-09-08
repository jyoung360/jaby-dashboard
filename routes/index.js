var express = require('express');
var router = express.Router();
var http = require('http');
var request = require('request');
var url = require('url');
var util = require('util');
var moment = require('moment');
var redis = require('redis');
var elasticsearch = require('elasticsearch');

var elasticsearchClient = new elasticsearch.Client({
	host: 'http://54.187.197.244'
});

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

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express', controller: 'JenkinsCtrl' });
});

/* GET home page. */
router.get('/services', function(req, res) {
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
		res.render('services', { title: 'Express', controller: 'JenkinsCtrl', services: services });
	});
});

router.get('/service/:id', function(req, res) {
	console.log(req.params.id);
	elasticsearchClient.search({
		index: 'client',
		type: 'service',
		body: {
			"query" : {
		        "match" : {
		        	_id : req.params.id
		        }
		    }
		}
	}).then(function (resp) {
		//var hits = resp.body.hits;
		console.log(resp.hits.hits[0]._source)
	});
  res.render('service', { 
  	title: 'Express', 
  	controller: 'JenkinsCtrl', 
  	service: {name:"My Service",id:req.params.id},
  	chartType:req.query.chartType||"Line",
  	charts: [
  		{id:"chart_requests",label:"Requests/min for the past 24 hrs"},
  		{id:"chart_errors",label:"Errors/min for the past 24 hrs"},
  		{id:"chart_disk",label:"Disk Usage for the past 24 hrs"},
  		{id:"chart_cpu",label:"CPU Usage for the past 24 hrs"},
  		{id:"chart_memory",label:"Memory Usage for the past 24 hrs"},
  	]
  });
});

router.get('/jenkins', function(req, res) {
  res.render('jenkins', { title: 'Express', controller: 'JenkinsCtrl' });
});

router.get('/jenkins/:project', function(req, res) {
	//console.log(req.params.project);
  res.render('jenkins', { title: 'Express', controller: 'JenkinsCtrl' });
});

router.get('/data/service/:id', function(req, res) {
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

module.exports = router;
