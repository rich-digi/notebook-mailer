'use strict';

// ----------------------------------------------------------------------------------------
// Support Notebooks module
// ----------------------------------------------------------------------------------------
// Record form submissions and process form branching logic (settimg the destination URL)
//
// Dependencies: Jquery, Jquery.cookie, Underscore
// ---------------------------------------------------------------------------------------

// Make sure all the console functions we are using are defined,
// but don't overwrite any existing ones (e.g. Opera)
var f = function() {};
var u = 'undefined';
var c = typeof console == u ? {} : console;
if (typeof c.log 	== u) { c.log 		= f; }
if (typeof c.dir 	== u) { c.dir 		= f; }
if (typeof c.assert == u) { c.assert 	= f; }
if (typeof c.info   == u) { c.info 		= f; }
if (typeof console  == u) { console 	= c; }

// ---------------------------------------------------------------------------------------------------------------------
// Modify JQuery to support IE8/9 non-standard implementation of CORS
// REMOVE WHEN SUPPORTING THESE BROWSERS IN NO LONGER NECESSARY

/*!
 * jQuery-ajaxTransport-XDomainRequest - v1.0.4 - 2015-03-05
 * https://github.com/MoonScript/jQuery-ajaxTransport-XDomainRequest
 * Copyright (c) 2015 Jason Moon (@JSONMOON)
 * Licensed MIT (/blob/master/LICENSE.txt)
 */
(function(a){if(typeof define==='function'&&define.amd){define(['jquery'],a)}else if(typeof exports==='object'){module.exports=a(require('jquery'))}else{a(jQuery)}}(function($){if($.support.cors||!$.ajaxTransport||!window.XDomainRequest){return $}var n=/^(https?:)?\/\//i;var o=/^get|post$/i;var p=new RegExp('^(\/\/|'+location.protocol+')','i');$.ajaxTransport('* text html xml json',function(j,k,l){if(!j.crossDomain||!j.async||!o.test(j.type)||!n.test(j.url)||!p.test(j.url)){return}var m=null;return{send:function(f,g){var h='';var i=(k.dataType||'').toLowerCase();m=new XDomainRequest();if(/^\d+$/.test(k.timeout)){m.timeout=k.timeout}m.ontimeout=function(){g(500,'timeout')};m.onload=function(){var a='Content-Length: '+m.responseText.length+'\r\nContent-Type: '+m.contentType;var b={code:200,message:'success'};var c={text:m.responseText};try{if(i==='html'||/text\/html/i.test(m.contentType)){c.html=m.responseText}else if(i==='json'||(i!=='text'&&/\/json/i.test(m.contentType))){try{c.json=$.parseJSON(m.responseText)}catch(e){b.code=500;b.message='parseerror'}}else if(i==='xml'||(i!=='text'&&/\/xml/i.test(m.contentType))){var d=new ActiveXObject('Microsoft.XMLDOM');d.async=false;try{d.loadXML(m.responseText)}catch(e){d=undefined}if(!d||!d.documentElement||d.getElementsByTagName('parsererror').length){b.code=500;b.message='parseerror';throw'Invalid XML: '+m.responseText;}c.xml=d}}catch(parseMessage){throw parseMessage;}finally{g(b.code,b.message,c,a)}};m.onprogress=function(){};m.onerror=function(){g(500,'error',{text:m.responseText})};if(k.data){h=($.type(k.data)==='string')?k.data:$.param(k.data)}m.open(j.type,j.url);m.send(h)},abort:function(){if(m){m.abort()}}}});return $}));

// ---------------------------------------------------------------------------------------
// Support Notebook

var SUPPORT_NOTEBOOK = function($) {

	var my = {
		cookiename	: '_dignostic_path',
		page  		: '',
		submit		: '',
		logic		: [],
		next		: '',
		steps		: [],
		display		: '.digest'
	};
	
	var module = {};

	module.init = function(container)
	{
		console.log('SUPPORT_NOTEBOOK.init');
		my.page = this.getpage();
		var cv = $.cookie(my.cookiename);
		if (typeof cv != 'undefined') my.steps = JSON.parse($.cookie(my.cookiename));
		this.display();
		$('form.record input[type=submit]').click(module.storesubmit);
		$('form.record').on('submit', module.wrapsubmit);
		$('.digest-clear').click(module.clear);
		$('.digest-toggle-all').click(module.toggle_step_visibility);
		
		// Show form under hash, but only on pages with recording forms
		if ($('form.record').length > 0)
		{
			var f = document.location.hash.slice(1);
			this.focusform(f)
			$('.digest-toggle-all').show();
		}
		else
		{
			$('.digest-toggle-all').hide();
		}
	}
	
	module.focusform = function(f)
	{
		if (!f) f = 'A';
		if (f[0] == '#') f = f.slice(1);
		console.log('Stage is ' + f);
		$('.form-in-focus').removeClass('form-in-focus');
		$('a[name='+f+']').closest('div').addClass('form-in-focus').removeClass('hidden');
		$('.maincol div.field-item > div').not('.form-in-focus').addClass('hidden');
	}
	
	module.getpage = function()
	{
		var page = $('#note_number').text().trim();
		return page;
	}
	
	module.toggle_step_visibility = function()
	{
		console.log($('div.sn-step.hidden').length);
		if ($('div.sn-step.hidden').length)
		{
			$('div.sn-step').removeClass('hidden');
			$('.digest-toggle-all').text('Show Single Step');
		}
		else
		{
			module.focusform();
			$('.digest-toggle-all').text('Show All Steps');
		}
	}
	
	module.display = function()
	{
		//var digest = my.steps.map(module.printline);
		var digest = _.map(my.steps, module.printline);
		$(my.display).empty().append(digest);
	}
	
	module.compile = function()
	{
		//var digest = my.steps.map(module.printline);
		var digest = _.map(my.steps, module.printline);
		return digest.join('');
	}
	
	module.printline = function(line)
	{
		console.dir(line);
		var title 		= [[line.note, line.step].join('-'), line.heading].join(' ');
		var step 		= ['<a class="step" href="'+line.link+'">', title, '</a>'].join('');
		var timestamp 	= ['<span class="timestamp">', line.timestamp, '</span>'].join('');
		var choice 		= ['<span class="choice">', line.choice, '</span>'].join('');
		var formvalarr = [];
		for (var key in line.form)
		{
			if (key.toLowerCase() == 'submit') continue;
			if (line.form.hasOwnProperty(key)) formvalarr.push(module.decodevalue(key, line.form[key]))
		};
		var formvals = formvalarr.join('<br>');
		return ['<p>', step, timestamp, formvals, choice, '</p>'].join('');
	}
	
	module.decodevalue = function(key, val)
	{
		var o;
		if (_.isArray(val)) val = val.join(' | ');
		o = [key, ' = ', val].join('');
		return o;
	}
	
	module.get_subject = function()
	{
		var sj = my.steps[0].note + ' ' + my.steps[0].heading;
		return sj;
	}
	
	module.get_reply_to = function()
	{
		var f0 = my.steps[0].form;
		var co = !_.isUndefined(f0.ContactEmail) 	? f0.ContactEmail 	: null;
		var id = !_.isUndefined(f0.DMID) 			? f0.DMID 			: null;
		var rt = co ? co : id;
		return rt;
	}
	
	module.get_cust_name = function()
	{
		var f0 = my.steps[0].form;
		var cn = !_.isUndefined(f0.Name) ? f0.Name 	: '';
		return cn;
	}
	
	module.storesubmit = function(pair)
	{
		my.submit = this.value;
		my.next   = $(this).data('goto');
	}
	
	module.wrapsubmit = function()
	{
		module.record.call(this);
		var destination = module.navigate.call(this);
		return module.jump(destination);
	}
	
	module.record = function()
	{
		var link = document.location.pathname + document.location.hash;
		var step = $(this).prevAll('h2, h1').find('span').text();
		var heading = $(this).prevAll('h2, h1').text().replace(step, '').trim();
		var t = new Date;
		var timestamp = t.toUTCString();
		var temp = $(this).serializeArray();
		var obj = {};
		var cat  = function (pair) { return obj[pair.name] ? obj[pair.name].push(pair.value) : obj[pair.name] = [pair.value]; };
		var flat = function (item) { return item.length == 1 ? item[0] : item; };
		_.map(temp, cat);
		for (var key in obj) { if (obj.hasOwnProperty(key)) { obj[key] = flat(obj[key]) } };
		var formvals = obj;
		var choice = my.submit;
		var rec = {
				link		: link,
				note		: my.page,
				step		: step,
				heading		: heading,
				timestamp	: timestamp,
				choice		: choice,
				form		: formvals
		};
		my.steps.push(rec);
		module.setcookie();
	}
	
	module.navigate = function()
	{
		var destination;
		var formvals = my.steps[my.steps.length - 1].form;
		formvals.Submit = my.submit;

		my.logic = module.compile_branch_logic($(this).data('branch'));
		destination = my.logic(formvals);
		if (!destination && typeof my.next != 'undefined') destination = my.next;
		console.log('Destination is ', destination);
		return destination;
	}
	
	module.jump = function(destination)
	{
		console.log('JUMP', destination);
		if (typeof destination != 'undefined' && destination !== null)
		{
			if (destination[0] == '#') { module.focusform(destination); module.display(); }
			document.location = destination;
			$(window).scrollTop(0);
			return false;
		}
		return true;
	}
	
	module.compile_branch_logic = function(logic)
	{
		console.log('compile_branch_logic - ', logic);
		if (typeof logic == 'undefined') return( function() { return null } );
		
		logic = _.map(logic.split(/\)\s*,\s*\(/), function(expression) { return expression.replace(/[()]/g, ''); });
		console.dir(logic);
		
		var test_functions = _.flatten(_.map(logic, module.compile_test_functions));
		return module.dispatch(test_functions);
	}
	
	module.compile_test_functions = function(expression)
	{
		var type, bits, parts, conds, cond, field, val, dest;
		
		type = 'simple';
		if (expression.indexOf('::') != -1) type = 'switch';
		
		switch(type)
		{	
			case 'simple':
				var funcs;
				bits 	= expression.split('=>');
				dest 	= bits[1].trim();
				if (bits[0].match(/'\s*and\s+/))
				{
					parts = bits[0].split(/'\s*and\s+/);
					conds = _.map(parts, function(c) { return module.parse_condition_and_curry(c, dest); });
					funcs = module.curry_test_function_every(conds, dest);
				}
				else
				{
					cond = bits[0].trim();
					if (cond)
					{
						funcs = module.parse_condition_and_curry(cond, dest);
					}
					else
					{
						funcs = module.curry_test_function_default(dest);
					}
				}
				break;
			
			case 'switch':
				var funcs = [];
				bits = expression.split(/::/);
				field = bits[0].trim();
				conds = bits[1].split(',');
				conds.forEach(function(cond)
				{
					bits = cond.split('=>');
					dest = bits[1].trim();
					parts = bits[0].split(/'\s*or\s*'/);
					parts.forEach(function(part)
					{
						val = part.replace(/\'/g, '').trim();
						funcs.push(module.curry_test_function(field, val, dest));
					});
				});
				break;
		}
		return funcs;
	}
	
	module.parse_condition_and_curry = function(cond, dest)
	{
		var bits = cond.split('=');
		var field = bits[0].trim();
		var val = bits[1].replace(/\'/g, '').trim();
		return module.curry_test_function(field, val, dest);
	}
	
	module.curry_test_function = function(field, val, dest)
	{
		console.log('Currying', field, val, dest);
		return function(formvals)
		{
			return formvals[field] === val ? dest : null;
		}
	}
	
	module.curry_test_function_some = function(conds, dest)
	{
		console.log('Currying Some', conds, dest);
		return function(target /*, args */)
		{
			var args = _.rest(arguments);
			var fun = module.or(conds);
			var ret = fun.apply(fun, module.construct(target, args));
			if (ret) return dest;
			return null;
		}
	}
	module.curry_test_function_every = function(conds, dest)
	{
		console.log('Currying Every', conds, dest);
		return function(target /*, args */)
		{
			var args = _.rest(arguments);
			var fun = module.and(conds);
			var ret = fun.apply(fun, module.construct(target, args));
			if (ret) return dest;
			return null;
		}
	}

	module.curry_test_function_default = function(dest)
	{
		console.log('Currying Default', dest);
		return function() { return dest; }
	}

	module.dispatch = function(functions_array)
	{
		var size = functions_array.length;
		console.log('Dispatch', functions_array, size);

		return function(target /*, args */)
		{
			var ret = undefined;
			var args = _.rest(arguments);

			for (var funIndex = 0; funIndex < size; funIndex++)
			{
				var fun = functions_array[funIndex];
				ret = fun.apply(fun, module.construct(target, args));
				if (module.existy(ret)) return ret;
			}
			return ret;
		};
	}
	
	module.or = function(functions_array)
	{
		console.log('Some', functions_array);
		return function(target /*, args */)
		{
			var args = _.rest(arguments);
			return _.some(_.map(functions_array, function(fun) { return fun.apply(fun, module.construct(target, args)); }));
		};
	}
	
	module.and = function(functions_array)
	{
		console.log('Every', functions_array);
		return function(target /*, args */)
		{
			var args = _.rest(arguments);
			return _.every(_.map(functions_array, function(fun) { return fun.apply(fun, module.construct(target, args)); }));
		};
	}
	
	module.construct = function(head, tail)
	{
  		return module.cat([head], _.toArray(tail));
	}
	
	module.cat = function()
	{
		var head = _.first(arguments);
		if (module.existy(head))
		{
			return head.concat.apply(head, _.rest(arguments));
		}
		else
		{
			return [];
		}
	}
	
	module.existy = function(x)
	{
		return x != null;
	}
	
	module.clear = function()
	{
		my.steps = [];
		module.setcookie();
		document.location = document.location;
	}
	
	module.setcookie = function()
	{
		$.cookie(my.cookiename, JSON.stringify(my.steps), { expires: 7, path: '/' });
	}
	
	return module;
	
}(jQuery);

// ---------------------------------------------------------------------------------------------------------------------

var BACK_BUTTON_BEHAVIOUR = function() {

	var my = {
		subpages	: [''],
		inpage		: null,
		callback	: function(hash){ window.location.hash = hash; },
	};
	
	var module = {};

	module.init = function(callback)
	{
		console.log('BACK_BUTTON_BEHAVIOUR.init');
		
		if (typeof callback == 'function') my.callback = callback;
		my.hist_length = window.history.length;
		
		document.onmouseover  = function() { my.inpage = true; }
		document.onmouseout   = function() { my.inpage = false; }

		var kp = function(e)
		{
			// This swallows backspace keys on any non-input element.
			// stops backspace -> back

			var rx = /INPUT|SELECT|TEXTAREA/i;
			// 8 == backspace
   			var key = (window.event) ? event.keyCode : e.which;
   			if (key == 8)
			{ 
				if (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly)
				{
					e.preventDefault();
				}
			}
		}
		document.onkeydown  = kp;
		document.onkeypress = kp;
		
		window.onhashchange = function()
		{
			console.log('HASH CHANGE to ', document.location.hash);
			if (my.inpage)
			{
				// In-page mechanism triggered the hash change
				module.update_history();
				var hash = document.location.hash;
				my.callback(hash);
			}
			else
			{
				// Browser back or forward was clicked
				if (my.subpages.length > 1)
				{
					// Back to previous hash
					my.subpages.pop();
					var hash = my.subpages[my.subpages.length - 1];
					my.callback(hash);
				}
				else
				{
					// Back to previous page
     				window.history.back();
    			}
			}
		}
	}
	
	module.update_history = function()
	{
		my.subpages.push(document.location.hash);
		console.log(my.subpages);
	}
		
	return module;
	
}();

// ---------------------------------------------------------------------------------------------------------------------

var MAILNOTEBOOK = function($) {

	var my = {
		'messagediv': '#feedback'
	};
	
	var module = {};

	module.init = function()
	{
		$('.digest-email').click(module.go);
	}

	module.go = function(e)
	{
		e.preventDefault();
		$('.digest-email').css({background: '#BBB', borderColor: '#AAA', backgroundImage: 'none', boxShadow: 'none'});
		var sj = SUPPORT_NOTEBOOK.get_subject();
		var rt = SUPPORT_NOTEBOOK.get_reply_to();
		var cn = SUPPORT_NOTEBOOK.get_cust_name();
		var nb = SUPPORT_NOTEBOOK.compile();
		$.ajax({
			type: 'POST',
			url: 'http://ush.dmclub.net/mail',
			crossDomain: true,
			data: JSON.stringify({'subject': sj, 'reply_to': rt, 'cust_name': cn, 'notebook': nb}),
			contentType: 'text/plain',
			dataType: 'html',
			success: function(responseData, textStatus, jqXHR) {
				console.log('MAILNOTEBOOK POST succeeded');
				$(my.messagediv).empty().html('<p><b>Thanks for emailing your notebook to support.<br>They will be in touch shortly.</b></p>').show();
			},
			error: function (responseData, textStatus, errorThrown) {
				console.log('MAILNOTEBOOK POST failed ' + textStatus + ' ' + errorThrown);
			}
		});
	}

	return module;

}(jQuery);

// ---------------------------------------------------------------------------------------------------------------------

(function($)
	{
		$(document).ready(function()
			{
				SUPPORT_NOTEBOOK.init();
				MAILNOTEBOOK.init();
				BACK_BUTTON_BEHAVIOUR.init(SUPPORT_NOTEBOOK.focusform);
		  	}
		);
	}
)(jQuery);
