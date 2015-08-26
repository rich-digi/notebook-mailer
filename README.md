# notebook-mailer

**A micro app to allow Support Notesbooks to be emailed to support.**

Two email addresses supported (one for successful problem resolutions, one for those who want more help).

## Technologies

Uses:

* Silex
* Symphony Components
* Swift Mailer
* Twig
* CORS (for cross-domain AJAX)

Built-in test harness @ /mail also uses uses Foundation 5

## Config

See config/prod.yml

This YAML file allows you to set the recipient emails addresses and acceptable access doamin for CORS.
