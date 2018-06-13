<?php

// ---------------------------------------------------------------------------------------------------------------------
//
// Unified Solutions Hub
// ---------------------
// Uses: Silex, Twig, SwiftMailer and CorsServiceProvider (for CORS)
//
// ---------------------------------------------------------------------------------------------------------------------

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__.'/vendor/autoload.php';

$app = new Silex\Application();
$app['debug'] = true;

// Config
// ------
$env = getenv('APP_ENV') ?: 'prod';
$app->register(new Igorw\Silex\ConfigServiceProvider(__DIR__.'/../config/'.$env.'.yml'));

// Twig
// ----
$app->register(new Silex\Provider\TwigServiceProvider(), array(
	'twig.path' => __DIR__.'/views',
));
$app['twig'] = $app->share($app->extend('twig', function($twig, $app) {
    $twig->addFunction(new \Twig_SimpleFunction('asset', function ($asset) use ($app) {
        return sprintf('%s/%s', trim($app['request']->getBasePath()), ltrim($asset, '/'));
    }));
    return $twig;
}));

$app->before(function ($request) use ($app) {
    $app['twig']->addGlobal('active', $request->get('_route'));
});

// Swift Mailer
// ------------
$app->register(new Silex\Provider\SwiftmailerServiceProvider());
$app['swiftmailer.options'] = array(
	'host' => 'localhost',
	'port' => 25,
	'username' => '',
	'password' => '',
	'encryption' => null,
	'auth_mode' => null
);

$app->register(new Silex\Provider\UrlGeneratorServiceProvider());

// CORS Cross-Origin Resource Sharing
// ----------------------------------
$http_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : NULL;
if (in_array($http_origin, $app['cors_allowed_origins']))
{  
	$app->register(new JDesrosiers\Silex\Provider\CorsServiceProvider(), array(
		'cors.allowOrigin' => $http_origin
	));
	$app->after($app['cors']);
}

// Logging
// -------

$app->register(new Silex\Provider\MonologServiceProvider(), array(
    'monolog.logfile' => __DIR__.'/../logs/development.log',
));

// ---------------------------------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------------------------------

$app->get('/', function() use ($app) {
	return $app['twig']->render('master.twig');
})->bind('home');

$app->get('/mail', function() use ($app) {
	return $app['twig']->render('mail.twig');
})->bind('mail');

$app->post('/mail', function() use ($app) {
	$request = $app['request'];
    $data = json_decode($request->getContent(), true);
    if (!$data) {
        $data = json_decode($request->request->get('notebook'), true); // Test harness
    }

	$subject 	= $data['subject'];
	$reply_to 	= $data['reply_to'];
	$cust_name 	= $data['cust_name'];
	$notebook 	= $data['notebook'];
        
    $mailtemplate = $app['twig']->loadTemplate('email-template.twig');
	$params = array('notebook' => $notebook);
	
	preg_match('/.*(#\d+-\w+).*/m', $notebook, $matches);
	if (isset($matches[1]) && substr($matches[1], -2) == 'OK') {
		$to = $app['email_on_success'];
	} else {
		$to = $app['email_on_failure'];
	}
	
	$html = $mailtemplate->renderBlock('body_html', $params);
	$text = $mailtemplate->renderBlock('body_text', $params);
	$repl = $cust_name ? array($reply_to => $cust_name) : array($reply_to);
	
	$message = \Swift_Message::newInstance()
		->setSubject($subject)
		->setFrom($repl)
		->setTo(array($to))
		->setBcc(array('notebooks@apewave.com'))
		->setReplyTo($repl)
		->setBody($text, 'text/plain')
        ->addPart($html, 'text/html');
        	
	$app['mailer']->send($message);

	// Log the message
	// $app['monolog']->addDebug('Message sent by '.$repl);

	return $app['twig']->render('mail.twig', array('sent' => true));
});

$app->run();