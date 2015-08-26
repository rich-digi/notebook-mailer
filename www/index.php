<?php

// ---------------------------------------------------------------------------------------------------------------------
//
// Notebook Mailer
// ---------------
// Uses: Silex, Twig, SwiftMailer and CORS
//
// ---------------------------------------------------------------------------------------------------------------------

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
$app->register(new JDesrosiers\Silex\Provider\CorsServiceProvider(), array(
    'cors.allowOrigin' => $app['cors_allowed_origin'],
));
$app->after($app['cors']);


// ---------------------------------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------------------------------

$app->get('/', function() use ($app) {
	return $app['twig']->render('layout.twig');
})->bind('home');

$app->get('/mail', function() use ($app) {
	return $app['twig']->render('mail.twig');
})->bind('mail');

$app->post('/mail', function() use ($app) {
	$request = $app['request'];
	
	$notebook = $request->get('notebook');
	
	$mailtemplate = $app['twig']->loadTemplate('email-template.twig');
	$params = array('notebook' => $notebook);
	
	preg_match('/.*(#\d+-\w+).*/m', $notebook, $matches);
	if (isset($matches[1]) && substr($matches[1], -2) == 'OK') {
		$to = $app['email_on_success'];
	} else {
		$to = $app['email_on_failure'];
	}
	
	$subj = $mailtemplate->renderBlock('subject', 	$params);
	$html = $mailtemplate->renderBlock('body_html', $params);
	$text = $mailtemplate->renderBlock('body_text', $params);
	
	$message = \Swift_Message::newInstance()
		->setSubject($subj)
		->setFrom(array('server@'.$_SERVER['HTTP_HOST'] => 'Support Notebook System'))
		->setTo(array($to))
		->setBody($text, 'text/plain')
        ->addPart($html, 'text/html');
	
	$app['mailer']->send($message);
	return $app['twig']->render('mail.twig', array('sent' => true));
});

$app->run();