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
		var digest = my.steps.map(module.printline);
		$(my.display).empty().append(digest);
	}
	
	module.compile = function()
	{
		var digest = my.steps.map(module.printline);
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
		
		logic = logic.split(/\)\s*,\s*\(/).map(function(expression) { return expression.replace(/[()]/g, ''); });
		console.dir(logic);
		
		var test_functions = _.flatten(logic.map(module.compile_test_functions));
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
					conds = parts.map(function(c) { return module.parse_condition_and_curry(c, dest); });
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
			return _.some(functions_array.map(function(fun) { return fun.apply(fun, module.construct(target, args)); }));
		};
	}
	
	module.and = function(functions_array)
	{
		console.log('Every', functions_array);
		return function(target /*, args */)
		{
			var args = _.rest(arguments);
			return _.every(functions_array.map(function(fun) { return fun.apply(fun, module.construct(target, args)); }));
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
			if (e.which == 8)
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

	module.go = function()
	{
		var nb = SUPPORT_NOTEBOOK.compile();
		console.log(nb);
		$.ajax({
			type: 'POST',
			url: 'http://ush.dmclub.net/mail',
			crossDomain: true,
			data: {'notebook': nb},
			dataType: 'text',
			success: function(responseData, textStatus, jqXHR) {
				$(my.messagediv).empty().html('<p>Thanks for emailing your notebook to support<br>They will be in touch shortly.</p>').show();
			},
			error: function (responseData, textStatus, errorThrown) {
				alert('POST failed ' + textStatus + ' ' + errorThrown);
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
