'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var spawn = require('child_process').spawn;
var fs = require('fs');

var SttiGenerator = module.exports = function SttiGenerator(args, options, config) {
    yeoman.generators.Base.apply(this, arguments);

     // setup the test-framework property, Gruntfile template will need this
  this.testFramework = options['test-framework'] || 'mocha';

  // for hooks to resolve on mocha by default
  if (!options['test-framework']) {
    options['test-framework'] = 'mocha';
  }

  // resolved to mocha by default (could be switched to jasmine for instance)
  this.hookFor('test-framework', { as: 'app' });

    this.on('end', function () {
        this.installDependencies({
            skipInstall: options['skip-install'],
            skipMessage: options['skip-install-message']
        });
    });

    //The appname and Gakey funcitons are a way we can link information from prompts to other pages in templates directory.
    //appname is for Site name in package.js and Gakey is to help put the GA key into the index.html when we run the generator 
    this.appname = path.basename(process.cwd());
    this.appGakey = path.basename(process.cwd());

    this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};


util.inherits(SttiGenerator, yeoman.generators.Base);

SttiGenerator.prototype.askFor = function askFor() {
    var cb = this.async();
    // have Yeoman greet the user.
    console.log(this.yeoman);

    //prompts to get information we desire when we run the generator
    var prompts = [
        {
            type      : 'confirm',
            name      : 'StaticSite',
            message   : 'Is this a static site?',
            default   : true
        },
        {
            type      : 'input',
            name      : 'GaKey',
            message   : 'What is the Google Analytics Key (Do not put in UA, just the numbers):'
        },
        {
            type      : 'input',
            name      : 'SiteName',
            message   : 'What is the site name?',
        }, {
            type      : 'input',
            name      : 'HostedZone',
            message   : 'what is the zone you want to host this site in?',
            default   : 'nursingsociety.org'
        }, {
            type      : 'input',
            name      : 'Subdomain',
            message   : 'What is the subdomain of the site?',
        }, {
            type      : 'input',
            name      : 'TestSite',
            message   : 'What is the test site identifier?',
            default   : 'test-'
        }, {
            type      : 'input',
            name      : 'DevSite',
            message   : 'What is the dev site identifier?',
            default   : 'dev-'
        },{
            type      : 'input',
            name      : 'JiraProjectKey',
            message   : 'What is the Jira Project Key?',
        },  
        
    ];

    //Checkbox to find out which humans to add to our humans.txt to give credit to who wrote the site
    var humans = fs.readdirSync(__dirname + '/templates/humans');
    prompts.push(
        {
            type: 'checkbox',
            name: 'humans',
            message: 'Select those who will be working on the project.',
            choices: humans
        }
    );

    //binding funciton to link all the prompts from above with calls for the future
    this.prompt(prompts, function (props) {
        // `props` is an object passed in containing the response values, named in
        // accordance with the `name` property from your prompt object. So, for us:
        this.StaticSite = props.StaticSite;
        this.SiteName = props.SiteName;
        this.HostedZone = props.HostedZone;
        this.Subdomain = props.Subdomain;
        this.TestSite = props.TestSite;
        this.DevSite = props.DevSite;
        this.JiraProjectKey = props.JiraProjectKey;
        this.humanlist = props.humans;
        this.appname = props.SiteName;
        this.ProdDomain = props.Subdomain + '.' + props.HostedZone;
        this.TestDomain = props.TestSite + this.ProdDomain; 
        this.DevDomain = props.DevSite + this.ProdDomain;
        this.GaKey = props.GaKey;
        this.appGakey = props.GaKey;

        cb();
    }.bind(this));

};

//function to run our bower and package.json files 
SttiGenerator.prototype.app = function app() {

    this.template('./config/_package.json', 'package.json');
    
	//files needed for bower
	this.copy('./config/_bower.json', 'bower.json');
    this.copy('./config/.bowerrc', '.bowerrc');

	//files needed for git
	this.copy('./git/gitignore', '.gitignore');
    this.copy('./git/gitattributes', '.gitattributes');

	//files to make sure that we have coding standards
    this.copy('./config/editorconfig', '.editorconfig');
    this.copy('./config/jshintrc', '.jshintrc');

	//the Gruntfile
	this.copy('Gruntfile.js', 'Gruntfile.js');
};

SttiGenerator.prototype.dir = function dir() {

    this.directory('site', 'site');

};

SttiGenerator.prototype.writeIndex = function writeIndex() {
    this.indexFile = this.readFileAsString(path.join(this.sourceRoot(), './site/index.html'));
    this.indexFile = this.engine(this.indexFile, this);

    this.indexFile = this.appendScripts(this.indexFile, './site/scripts/main.js', [
      './site/scripts/main.js']);

    this.indexFile = this.appendScripts(this.indexFile, 'scripts/plugins.js', [
      'bower_components/bootstrap/js/affix.js',
      'bower_components/bootstrap/js/alert.js',
      'bower_components/bootstrap/js/dropdown.js',
      'bower_components/bootstrap/js/tooltip.js',
      'bower_components/bootstrap/js/modal.js',
      'bower_components/bootstrap/js/transition.js',
      'bower_components/bootstrap/js/button.js',
      'bower_components/bootstrap/js/popover.js',
      'bower_components/bootstrap/js/carousel.js',
      'bower_components/bootstrap/js/scrollspy.js',
      'bower_components/bootstrap/js/collapse.js',
      'bower_components/bootstrap/js/tab.js'
    ]);
};

SttiGenerator.prototype.requirejs = function requiresjs(){
    this.includeRequireJS 

    this.indexFile = this.appendScripts(this.indexFile, './site/scripts/main.js', ['bower_components/requirejs/require.js'], {
    'data-main': './site/scripts/main'
  });

  this.template('./site/scripts/require_main.js', 'app/scripts/main.js');

};

SttiGenerator.prototype._createAWSFiles = function _createAWSFiles(AWSKey,AWSSecret, Region, ProductionBucket, TestBucket, DevelopmentBucket ) {
    
    var writeAWSFiles = String();

    writeAWSFiles += '{ \n';
    writeAWSFiles += '  "accessKeyId": "' + AWSKey + '",\n';
    writeAWSFiles += '  "secretAccessKey": "' + AWSSecret + '",\n';
    writeAWSFiles += '  "region": "' + Region + '",\n';
    writeAWSFiles += '  "bucketProduction": "' + ProductionBucket + '",\n';
    writeAWSFiles += '  "bucketTest": "' + TestBucket + '",\n';
    writeAWSFiles += '  "bucketDevelopment": "' + DevelopmentBucket + '"\n';
    writeAWSFiles += '} \n';         

    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
	console.log('$$    AWSSettings.json       $$');
	console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
	console.log(writeAWSFiles);

    this.write('AWSSettings.json', writeAWSFiles);

};

SttiGenerator.prototype._describeStack = function _describeStack(cf,g, setI){
	cf.describeStacks({ StackName: this.JiraProjectKey }, function (err, data) {
		if (err) {
			console.log('********************************************');
			console.log('**         error on describe stack        **');
			console.log('********************************************');
			console.log(err);
			if(setI != null) {
				//don't need to keep trying every time
				clearInterval(setI);
			}
		}
		data = data.Stacks[0];
		console.log(data); 
		console.log(data.StackStatus);
		if (data.StackStatus === 'CREATE_IN_PROGRESS') {
			console.log('**** Still GOING ******');
			return;
		}

		if( data.StackStatus === 'CREATE_COMPLETE'){
			console.log('*********************************************************');
			
			if(setI != null){
				clearInterval(setI);
			}

			var AccessKeyId, AccessKeySecret, DevBucket, TestBucket, ProdBucket;
			data.Outputs.forEach(function(item) {
				console.log(item.OutputKey + ':' + item.OutputValue);
				switch(item.OutputKey){
					case 'AccessKey':
						AccessKeyId = item.OutputValue;
					break;
					case 'SecretKey':
						AccessKeySecret = item.OutputValue;
					break;
					case 'Development':
						DevBucket = item.OutputValue.substring(12,item.OutputValue.indexOf('Bucket URL:') -1).trim() ;
					break;
					case 'Test':
						TestBucket = item.OutputValue.substring(12,item.OutputValue.indexOf('Bucket URL:') -1).trim() ;
					break;
					case 'Production':
						ProdBucket = item.OutputValue.substring(12,item.OutputValue.indexOf('Bucket URL:') -1).trim() ;
					break;

				};
			});

			//call the fucntion to write out the file here.
			g._createAWSFiles(AccessKeyId,AccessKeySecret,'DJ-Region' ,DevBucket,TestBucket, ProdBucket);	
		}

	});
};

//DJs cloudformation function
SttiGenerator.prototype.cloudformation = function () {
    var AWS = require('aws-sdk');

    var g = this;

    var AWSSettings = JSON.parse(this.read('AWSSettings.json'));

    //AWS.config.loadFromPath('AWSSettings.json');
    var cf = new AWS.CloudFormation({secretAccessKey: AWSSettings.secretAccessKey, accessKeyId: AWSSettings.accessKeyId, region: 'us-east-1'});

    var template = this.read('StaticSiteCloudFormation.json');

	console.log( '********************************************************************');
	console.log( '**                          Template                              **');
	console.log( '********************************************************************');
	console.log(template);
    console.log('*********************************************************************');
	
	if(this.StaticSite) {
		console.log( '********************************************************************');
		console.log( '**                         Creating Stack                         **');
		console.log( '********************************************************************')
		
		var i = 0;

		cf.createStack(
			{
				StackName: this.JiraProjectKey,
				TemplateBody: template,
				Parameters: [
					{
						ParameterKey: 'JiraKey',
						ParameterValue: this.JiraProjectKey
					},
					{
						ParameterKey: 'HostedZone',
						ParameterValue: this.HostedZone
					},
					{
						ParameterKey: 'ProdDomain',
						ParameterValue: this.ProdDomain
					},
					{
						ParameterKey: 'TestDomain',
						ParameterValue: this.TestDomain
					},
					{
						ParameterKey: 'DevDomain',
						ParameterValue: this.DevDomain
					}
				],
				Capabilities: ['CAPABILITY_IAM']
			},
			function (err, data)
			{
				/*ok so this returns when the request to create the stack has been accepted not when the stack was created.
				 * so we now have to check to see if this is done, before we start the next steps. 
				 */
				if (err) {
					//awe snap we have a problem.
					if(err.code !== 'AlreadyExistsException') {
						console.log('********************************************');
						console.log('**         error on create stack          **');
						console.log('********************************************');
						console.log(err);
					} else {
						g._describeStack(cf,g,null);
					}
				} else {

					console.log('***********************************');
					console.log('**   setting up interval         **');
					console.log('***********************************');

					var setI = setInterval( function() {
						i = i + 1;
						if( i > 20 ){
							clearInterval(setI);
							console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
							console.log('%%      Interval Limit Hit          %%');
							console.log('%%    AWS is slow, or errored       %%')
							console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
						}

						console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
						console.log('%%         Interval running ' + i.toString() + '                    %%');
						console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
						g._describeStack(cf,g,setI);
						console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
						console.log('%%         Interval Done                   %%');
						console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
					},600000);
				}
			}
		);
	}else {
		//no need to create.
		this._describeStack(cf,g, null);
	}
};

//Custom to Function to display humans folder (this way we can give credit to who worked on the site)
SttiGenerator.prototype.humanwrite = function humanwrite() {

    var humanstxt = String();
    var g = this;

    humanstxt += '  ______\n';
    humanstxt += '  /_ __/__  ____ _____ ___ \n';
    humanstxt += '  / / / _ \\/ __ `/ __ `__ \\\n';
    humanstxt += ' / / /  __/ /_/ / / / / / /\n';
    humanstxt += '/_/  \\___/\\__,_/_/ /_/ /_/ \n\n';

    this.humanlist.forEach(
         function (item) {
            humanstxt += g.read('humans/' + item, 'utf8');
            humanstxt += '\n\n';
        }
    );
    humanstxt += '   _____ _ __      \n';
    humanstxt += '  / ___/(_) /____ \n';
    humanstxt += '  \\__ \\/ / __/ _ \\ \n';
    humanstxt += ' ___/ / / /_/  __/\n';
    humanstxt += '/____/_/\\__/\\___/ \n\n';

    humanstxt += 'Site Name: ' + this.SiteName;
    humanstxt += '\n';
    humanstxt += 'Subdomain: ' + this.Subdomain;
    humanstxt += '\n';
    humanstxt += 'Hosted Zone: ' + this.HostedZone;
    humanstxt += '\n';
    humanstxt +=  this.DevSite + this.Subdomain + this.HostedZone;
    humanstxt += '\n';
    humanstxt +=  this.TestSite + this.Subdomain + this.HostedZone;
    humanstxt += '\n';
    humanstxt += 'The Jira Project key is: ' + this.JiraProjectKey;

    this.write('humans.txt', humanstxt);

};

SttiGenerator.prototype.gitpush = function gitpush() {

    var x = 'ssh://git@jira.nursingsociety.org:7999/' + this.JiraProjectKey + '/site.git';

    var exec = require('child_process').exec, child, 
    git_init_child, 
    git_origin_child, 
    git_add_child, 
    git_commit_child, 
    git_push_master_child, 
    git_checkout_b_dev_child, 
    git_push_dev_child, 
    git_checkout_test_child, 
    git_push_test_child, 
    git_flow_child,
    git_config_child,
    git_dev_child;


    var git_init_cmd = 'git init';
    var git_origin_cmd = 'git remote add origin ' + x;
    var git_add_cmd = 'git add --all';
    var git_commit_cmd = 'git commit -m \"Initial Commit\"';
    var git_push_master_cmd = 'git push origin master';
    var git_checkout_b_dev_cmd = 'git checkout -b develop';
    var git_push_dev_cmd =  'git push origin develop';
    var git_checkout_test_cmd = 'git checkout -b test';
    var git_push_test_cmd = 'git push origin test';
    var git_flow_cmd = 'git flow init -d';
    var git_dev_cmd = 'git checkout develop';
    var git_config_cmd = 'git config core.autocrlf false';


    

    console.log(git_init_cmd);    
        
    git_init_child = exec(git_init_cmd,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stdeer: ' + stderr);
        
        console.log(git_config_cmd);

        git_config_child = exec(git_config_cmd,
            function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stdeer: ' + stderr);

            console.log(git_origin_cmd);

            git_origin_child = exec(git_origin_cmd,
                function (error, stdout, stderr) {
                    console.log('stdout: ' + stdout);
                    console.log('stdeer: ' + stderr);

                console.log(git_add_cmd);

                git_add_child = exec(git_add_cmd,
                    function (error, stdout, stderr) {
                        console.log('stdout: ' + stdout);
                        console.log('stdeer: ' + stderr);

                
                    console.log(git_commit_cmd);

                    git_commit_child = exec(git_commit_cmd,
                        function (error, stdout, stderr) {
                            console.log('stdout: ' + stdout);
                            console.log('stdeer: ' + stderr);

      
                        console.log(git_push_master_cmd);

                        git_push_master_child = exec(git_push_master_cmd,
                            function (error, stdout, stderr) {
                                console.log('stdout: ' + stdout);
                                console.log('stdeer: ' + stderr);
          

                            console.log(git_checkout_b_dev_cmd);

                            git_checkout_b_dev_child = exec(git_checkout_b_dev_cmd,
                                function (error, stdout, stderr) {
                                    console.log('stdout: ' + stdout);
                                    console.log('stdeer: ' + stderr)
         
                                console.log(git_push_dev_cmd);

                                git_push_dev_child = exec(git_push_dev_cmd,
                                    function (error, stdout, stderr) {
                                        console.log('stdout: ' + stdout);
                                        console.log('stdeer: ' + stderr);

                                    console.log(git_checkout_test_cmd);

                                    git_checkout_test_child = exec(git_checkout_test_cmd,
                                        function (error, stdout, stderr) {
                                            console.log('stdout: ' + stdout);
                                            console.log('stdeer: ' + stderr);      

                                        console.log(git_push_test_cmd);

                                        git_push_test_child = exec(git_push_test_cmd,
                                            function (error, stdout, stderr) {
                                                console.log('stdout: ' + stdout);
                                                console.log('stdeer: ' + stderr);
                
                                            console.log(git_flow_cmd);

                                            git_flow_child = exec(git_flow_cmd,
                                                function (error, stdout, stderr) {
                                                    console.log('stdout: ' + stdout);
                                                    console.log('stdeer: ' + stderr);

                                                console.log(git_dev_cmd);

                                                git_dev_child = exec(git_dev_cmd,
                                                    function (error, stdout, stderr) {
                                                        console.log('stdout: ' + stdout);
                                                        console.log('stdeer: ' + stderr);

                                                    });
                                            });                                           
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};           
 