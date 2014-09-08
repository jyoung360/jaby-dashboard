var jenkinsApp = angular.module('jenkinsApp', []);

jenkinsApp.controller('JenkinsCtrl', function ($scope) {
  $scope.applications = [
    {
    	'name': 'PaveXpress',
    	'keepAlive': '/isWorking.php',
    },
    {
    	'name': 'Pavia Aruba',
    	'keepAlive': '/isWorking.php',
    }
  ];

  $scope.doStuff = function() {
    console.log('I am doing stuff');
  }

  $scope.master = {};

    $scope.deploy = function(stuff) {
        $scope.master = angular.copy(stuff);
        console.log("this is "+stuff);
        // var data = {"parameter": [
        //     {"name": "PAVEXPRESS_SHA", "value": stuff.PAVEXPRESS_SHA },
        //     {"name": "RootDbPassword", "value": stuff.RootDbPassword },
        //     {"name": "UserDbPassword", "value": stuff.UserDbPassword },
        //     {"name": "SmtpPassword", "value": stuff.SmtpPassword },
        //     {"name": "ARUBA_SHA", "value": stuff.ARUBA_SHA}]
        // };
        var data = "PAVEXPRESS_SHA="+stuff.PAVEXPRESS_SHA+"&RootDbPassword="+stuff.RootDbPassword +"&UserDbPassword="+stuff.UserDbPassword+"&SmtpPassword="+stuff.SmtpPassword+"&ARUBA_SHA="+stuff.ARUBA_SHA;
        
        $.ajax({
            type: "POST",
            url: '/deploy',
            data: data,
            success: function() { console.log('all done'); }
        });
    };
});